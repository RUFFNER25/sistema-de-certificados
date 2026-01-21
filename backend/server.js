const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Directorio para PDFs
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer para subir PDFs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'));
    }
    cb(null, true);
  },
});

// Base de datos PostgreSQL
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/sistema_certificados',
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS certificados (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      dni TEXT NOT NULL,
      archivo TEXT NOT NULL,
      creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

initDb().catch((err) => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});

// Servir PDFs estáticos
app.use('/files', express.static(uploadsDir));

// Endpoint para crear certificado (admin)
app.post('/api/certificados', upload.single('archivo'), async (req, res) => {
  try {
    const { nombre, dni } = req.body;

    if (!nombre || !dni) {
      return res.status(400).json({ error: 'nombre y dni son obligatorios' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'archivo PDF obligatorio' });
    }

    const result = await pool.query(
      'INSERT INTO certificados (nombre, dni, archivo) VALUES ($1, $2, $3) RETURNING id, creado_en',
      [nombre.trim(), dni.trim(), req.file.filename]
    );
    const row = result.rows[0];

    return res.status(201).json({
      id: row.id,
      nombre,
      dni,
      archivo: req.file.filename,
      creado_en: row.creado_en,
      url: `/files/${req.file.filename}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear certificado' });
  }
});

// Endpoint para buscar certificados por nombre o dni
app.get('/api/certificados', async (req, res) => {
  try {
    const { q } = req.query;

    let rows;
    if (!q) {
      const result = await pool.query(
        'SELECT id, nombre, dni, archivo, creado_en FROM certificados ORDER BY creado_en DESC LIMIT 50'
      );
      rows = result.rows;
    } else {
      const like = `%${q.trim()}%`;
      const result = await pool.query(
        `SELECT id, nombre, dni, archivo, creado_en
         FROM certificados
         WHERE nombre ILIKE $1 OR dni ILIKE $1
         ORDER BY creado_en DESC`,
        [like]
      );
      rows = result.rows;
    }

    const mapped = rows.map((row) => ({
      ...row,
      url: `/files/${row.archivo}`,
    }));

    return res.json(mapped);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al buscar certificados' });
  }
});

// Salud / estado
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});


