require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_cambiar_en_prod';

// Confiar en el proxy (necesario para obtener la IP real tras Nginx/Load Balancers)
app.set('trust proxy', 1);

// Rate limiter para el login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limitar cada IP a 5 intentos de login por ventana de 15 minutos
  message: { error: 'Demasiados intentos de inicio de sesión, intente de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
  // Asegurar UTF-8
  options: '-c client_encoding=UTF8'
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
        tipo TEXT,
        codigo TEXT,
        certificado_nombre TEXT,
        duracion TEXT,
        fecha_emision DATE,
        fecha_caducidad DATE,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Agregar nuevas columnas si no existen (para migración de datos existentes)
    const columnChecks = [
      { name: 'tipo', type: 'TEXT' },
      { name: 'codigo', type: 'TEXT' },
      { name: 'certificado_nombre', type: 'TEXT' },
      { name: 'duracion', type: 'TEXT' },
      { name: 'fecha_emision', type: 'DATE' },
      { name: 'fecha_caducidad', type: 'DATE' },
    ];

    for (const col of columnChecks) {
      try {
        await client.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'certificados' AND column_name = '${col.name}'
            ) THEN
              ALTER TABLE certificados ADD COLUMN ${col.name} ${col.type};
            END IF;
          END $$;
        `);
      } catch (err) {
        // Si falla, la columna probablemente ya existe, continuar
        console.log(`Columna ${col.name} ya existe o error al agregar:`, err.message);
      }
    }

    // Tabla usuarios (admin)
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
app.post('/api/login', loginLimiter, async (req, res) => {
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

// Función para obtener la fecha actual en formato YYYY-MM-DD usando la zona horaria local del servidor
const getLocalDate = () => {
  const now = new Date();
  // Restar el timezoneOffset para obtener la fecha en la zona horaria local
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Crear certificado (PROTEGIDO)
app.post('/api/certificados', authenticateToken, upload.single('archivo'), async (req, res) => {
  try {
    const { 
      nombre, 
      dni, 
      tipo, 
      codigo, 
      certificado_nombre, 
      duracion, 
      fecha_emision, 
      fecha_caducidad 
    } = req.body;

    if (!nombre || !dni) {
      return res.status(400).json({ error: 'nombre y dni son obligatorios' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'archivo PDF obligatorio' });
    }

    // Validar documento de identidad (DNI o pasaporte)
    const dniTrim = String(dni).trim();
    if (!dniTrim) {
      return res.status(400).json({ error: 'El documento de identidad es obligatorio' });
    }
    if (dniTrim.length > 20) {
      return res.status(400).json({ error: 'El documento de identidad no puede superar 20 caracteres' });
    }

    // Nombre: longitud razonable
    const nombreTrim = nombre.trim();
    if (nombreTrim.length > 200) {
      return res.status(400).json({ error: 'El nombre no puede superar 200 caracteres' });
    }

    // Código único: si se envía código, no puede repetirse
    const codigoTrim = codigo && typeof codigo === 'string' ? codigo.trim() : '';
    if (codigoTrim) {
      const existCodigo = await pool.query(
        'SELECT id FROM certificados WHERE codigo = $1',
        [codigoTrim]
      );
      if (existCodigo.rows.length > 0) {
        return res.status(400).json({ error: 'Ya existe un certificado con ese código. Use un código distinto.' });
      }
    }

    // Fecha de emisión: no puede ser futura
    if (fecha_emision) {
      const hoy = getLocalDate();
      if (fecha_emision > hoy) {
        return res.status(400).json({ error: 'La fecha de emisión no puede ser futura' });
      }
    }

    // Si hay ambas fechas, caducidad debe ser >= emisión
    const fechaEmisionVal = fecha_emision || null;
    let fechaCaducidadFinal = (!fecha_caducidad || String(fecha_caducidad).trim() === '' || fecha_caducidad === '-')
      ? null
      : String(fecha_caducidad).trim();
    if (fechaEmisionVal && fechaCaducidadFinal && fechaCaducidadFinal < fechaEmisionVal) {
      return res.status(400).json({ error: 'La fecha de caducidad no puede ser anterior a la fecha de emisión' });
    }

    const result = await pool.query(
      `INSERT INTO certificados (
        nombre, dni, archivo, tipo, codigo, certificado_nombre, 
        duracion, fecha_emision, fecha_caducidad
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id, creado_en, fecha_emision, fecha_caducidad`,
      [
        nombreTrim,
        dniTrim,
        req.file.filename,
        tipo?.trim() || null,
        codigoTrim || null,
        certificado_nombre?.trim() || null,
        duracion?.trim() || null,
        fecha_emision || null,
        fechaCaducidadFinal
      ]
    );
    const row = result.rows[0];

    return res.status(201).json({
      id: row.id,
      nombre,
      dni,
      archivo: req.file.filename,
      tipo: row.tipo,
      codigo: row.codigo,
      certificado_nombre: row.certificado_nombre,
      duracion: row.duracion,
      fecha_emision: row.fecha_emision,
      fecha_caducidad: row.fecha_caducidad,
      creado_en: row.creado_en,
      url: `/files/${req.file.filename}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear certificado' });
  }
});

// Actualizar certificado (PROTEGIDO, sin cambiar PDF)
app.put('/api/certificados/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      dni, 
      tipo, 
      codigo, 
      certificado_nombre, 
      duracion, 
      fecha_emision, 
      fecha_caducidad 
    } = req.body;

    if (!nombre || !dni) {
      return res.status(400).json({ error: 'nombre y dni son obligatorios' });
    }

    // Validar documento de identidad (DNI o pasaporte)
    const dniTrim = String(dni).trim();
    if (!dniTrim) {
      return res.status(400).json({ error: 'El documento de identidad es obligatorio' });
    }
    if (dniTrim.length > 20) {
      return res.status(400).json({ error: 'El documento de identidad no puede superar 20 caracteres' });
    }

    // Nombre: longitud razonable
    const nombreTrim = String(nombre).trim();
    if (nombreTrim.length > 200) {
      return res.status(400).json({ error: 'El nombre no puede superar 200 caracteres' });
    }

    // Código único: si se envía código, no puede repetirse (salvo en el mismo id)
    const codigoTrim = codigo && typeof codigo === 'string' ? codigo.trim() : '';
    if (codigoTrim) {
      const existCodigo = await pool.query(
        'SELECT id FROM certificados WHERE codigo = $1 AND id <> $2',
        [codigoTrim, id]
      );
      if (existCodigo.rows.length > 0) {
        return res.status(400).json({ error: 'Ya existe un certificado con ese código. Use un código distinto.' });
      }
    }

    // Fecha de emisión: no puede ser futura
    if (fecha_emision) {
      const hoy = getLocalDate();
      if (fecha_emision > hoy) {
        return res.status(400).json({ error: 'La fecha de emisión no puede ser futura' });
      }
    }

    // Si hay ambas fechas, caducidad debe ser >= emisión
    const fechaEmisionVal = fecha_emision || null;
    let fechaCaducidadFinal = (!fecha_caducidad || String(fecha_caducidad).trim() === '' || fecha_caducidad === '-')
      ? null
      : String(fecha_caducidad).trim();
    if (fechaEmisionVal && fechaCaducidadFinal && fechaCaducidadFinal < fechaEmisionVal) {
      return res.status(400).json({ error: 'La fecha de caducidad no puede ser anterior a la fecha de emisión' });
    }

    const result = await pool.query(
      `UPDATE certificados
       SET nombre = $1,
           dni = $2,
           tipo = $3,
           codigo = $4,
           certificado_nombre = $5,
           duracion = $6,
           fecha_emision = $7,
           fecha_caducidad = $8
       WHERE id = $9
       RETURNING id, nombre, dni, archivo, tipo, codigo, certificado_nombre, duracion, fecha_emision, fecha_caducidad, creado_en`,
      [
        nombreTrim,
        dniTrim,
        tipo?.trim() || null,
        codigoTrim || null,
        certificado_nombre?.trim() || null,
        duracion?.trim() || null,
        fecha_emision || null,
        fechaCaducidadFinal,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }

    const row = result.rows[0];

    return res.json({
      id: row.id,
      nombre: row.nombre,
      dni: row.dni,
      archivo: row.archivo,
      tipo: row.tipo,
      codigo: row.codigo,
      certificado_nombre: row.certificado_nombre,
      duracion: row.duracion,
      fecha_emision: row.fecha_emision,
      fecha_caducidad: row.fecha_caducidad,
      creado_en: row.creado_en,
      url: `/files/${row.archivo}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar certificado' });
  }
});

// Eliminar certificado (PROTEGIDO)
app.delete('/api/certificados/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT archivo FROM certificados WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }

    const archivo = result.rows[0].archivo;

    await pool.query('DELETE FROM certificados WHERE id = $1', [id]);

    if (archivo) {
      const filePath = path.join(uploadsDir, archivo);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error al eliminar archivo PDF:', err);
        }
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al eliminar certificado' });
  }
});

// Buscar certificados (PÚBLICO) - con filtros opcionales: q, fecha_desde, fecha_hasta, tipo
app.get('/api/certificados', async (req, res) => {
  try {
    const { q, fecha_desde, fecha_hasta, tipo } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (q && String(q).trim()) {
      conditions.push(`(nombre ILIKE $${paramIndex} OR dni ILIKE $${paramIndex} OR codigo ILIKE $${paramIndex})`);
      params.push(`%${String(q).trim()}%`);
      paramIndex++;
    }
    if (fecha_desde) {
      conditions.push(`fecha_emision >= $${paramIndex}`);
      params.push(fecha_desde);
      paramIndex++;
    }
    if (fecha_hasta) {
      conditions.push(`fecha_emision <= $${paramIndex}`);
      params.push(fecha_hasta);
      paramIndex++;
    }
    if (tipo && String(tipo).trim()) {
      const tipoVal = String(tipo).trim();
      if (tipoVal === 'Otro') {
        conditions.push(`(tipo IS NULL OR tipo NOT IN ('Curso', 'Taller', 'Programa', 'Diplomado', 'Inducción'))`);
      } else {
        conditions.push(`tipo = $${paramIndex}`);
        params.push(tipoVal);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT id, nombre, dni, archivo, tipo, codigo, certificado_nombre,
             duracion, fecha_emision, fecha_caducidad, creado_en
      FROM certificados
      ${whereClause}
      ORDER BY creado_en DESC
    `;
    const result = await pool.query(sql, params);
    const rows = result.rows;

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