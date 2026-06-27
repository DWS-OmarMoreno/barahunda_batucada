// Conexión a MySQL usando un pool de promesas (mysql2/promise)
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'escuela_musica',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // evita desfaces de zona horaria al leer DATE/DATETIME
});

// Prueba de conexión al iniciar el servidor (no detiene el arranque si falla)
async function probarConexion() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✓ Conexión a MySQL establecida correctamente');
  } catch (err) {
    console.error('✗ No se pudo conectar a MySQL:', err.message);
  }
}

module.exports = { pool, probarConexion };
