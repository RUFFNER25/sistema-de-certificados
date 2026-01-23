require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_cambiar_en_prod';

// Middlewares
app.use(cors());
app.use(express.json());

// Directorio para PDFs
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer
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

// Inicialización de DB
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Tabla certificados
    await client.query(`
      CREATE TABLE IF NOT EXISTS certificados (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        dni TEXT NOT NULL,
        archivo TEXT NOT NULL,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla usuarios (admin)
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed Admin si no existe
    const res = await client.query('SELECT count(*) FROM usuarios');
    if (parseInt(res.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO usuarios (username, password_hash) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
      console.log('Usuario admin creado por defecto: admin / admin123');
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

initDb().catch((err) => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});

// Middleware de Autenticación
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// --- RUTAS ---

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Servir PDFs estáticos
app.use('/files', express.static(uploadsDir));

// Crear certificado (PROTEGIDO)
app.post('/api/certificados', authenticateToken, upload.single('archivo'), async (req, res) => {
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

// Buscar certificados (PÚBLICO)
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