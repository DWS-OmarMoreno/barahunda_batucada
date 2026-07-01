// =====================================================================
// Servicio global de auditoría.
// =====================================================================
const { pool } = require('../config/db');

async function registrar({ modulo, accion, entidadId = null, campo = null, valorAnterior = null, valorNuevo = null, usuarioId = null, usuarioEmail = null, ip = null }) {
  try {
    await pool.query(
      `INSERT INTO auditoria (modulo, accion, entidad_id, campo_modificado, valor_anterior, valor_nuevo, usuario_id, usuario_email, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        modulo,
        accion,
        entidadId,
        campo,
        valorAnterior === null || valorAnterior === undefined ? null : String(valorAnterior),
        valorNuevo === null || valorNuevo === undefined ? null : String(valorNuevo),
        usuarioId,
        usuarioEmail,
        ip,
      ]
    );
  } catch (err) {
    console.error('Error registrando auditoría:', err.message);
  }
}

async function registrarCambios({ modulo, entidadId, anterior = {}, nuevo = {}, usuarioId, usuarioEmail, ip, accion = 'UPDATE' }) {
  const campos = new Set([...Object.keys(anterior || {}), ...Object.keys(nuevo || {})]);
  const tareas = [];
  for (const campo of campos) {
    const valorAnterior = anterior ? anterior[campo] : undefined;
    const valorNuevo = nuevo ? nuevo[campo] : undefined;
    if (String(valorAnterior ?? '') !== String(valorNuevo ?? '')) {
      tareas.push(registrar({ modulo, accion, entidadId, campo, valorAnterior, valorNuevo, usuarioId, usuarioEmail, ip }));
    }
  }
  await Promise.all(tareas);
}

async function registrarAccion({ modulo, accion, entidadId = null, detalle = null, usuarioId, usuarioEmail, ip }) {
  await registrar({
    modulo,
    accion,
    entidadId,
    campo: null,
    valorAnterior: null,
    valorNuevo: detalle ? JSON.stringify(detalle) : null,
    usuarioId,
    usuarioEmail,
    ip,
  });
}

module.exports = { registrar, registrarCambios, registrarAccion };
