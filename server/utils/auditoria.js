// =====================================================================
// Servicio global de auditoría.
//
// Se usa desde cualquier controlador para dejar registro en la tabla
// `auditoria`. La regla de negocio (ver REGLAS GENERALES #10) es que el
// estado anterior de un registro debe capturarse ANTES de ejecutar el
// UPDATE/DELETE en base de datos, por eso `registrarCambios` recibe
// `anterior` y `nuevo` ya calculados por el controlador y se encarga de
// comparar campo por campo e insertar una fila de auditoría por cada
// campo que cambió.
// =====================================================================
const { pool } = require('../config/db');

/**
 * Inserta una fila individual en auditoria.
 */
async function registrar({ modulo, accion, entidadId = null, campo = null, valorAnterior = null, valorNuevo = null, usuarioId = null, ip = null }) {
  try {
    await pool.query(
      `INSERT INTO auditoria (modulo, accion, entidad_id, campo_modificado, valor_anterior, valor_nuevo, usuario_id, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        modulo,
        accion,
        entidadId,
        campo,
        valorAnterior === null || valorAnterior === undefined ? null : String(valorAnterior),
        valorNuevo === null || valorNuevo === undefined ? null : String(valorNuevo),
        usuarioId,
        ip,
      ]
    );
  } catch (err) {
    // La auditoría nunca debe tumbar la operación principal
    console.error('Error registrando auditoría:', err.message);
  }
}

/**
 * Compara dos objetos plano (anterior vs nuevo) y registra una fila de
 * auditoría por cada campo que cambió. Ideal para UPDATE.
 */
async function registrarCambios({ modulo, entidadId, anterior = {}, nuevo = {}, usuarioId, ip, accion = 'UPDATE' }) {
  const campos = new Set([...Object.keys(anterior || {}), ...Object.keys(nuevo || {})]);
  const tareas = [];
  for (const campo of campos) {
    const valorAnterior = anterior ? anterior[campo] : undefined;
    const valorNuevo = nuevo ? nuevo[campo] : undefined;
    if (String(valorAnterior ?? '') !== String(valorNuevo ?? '')) {
      tareas.push(
        registrar({ modulo, accion, entidadId, campo, valorAnterior, valorNuevo, usuarioId, ip })
      );
    }
  }
  await Promise.all(tareas);
}

/**
 * Registra una acción simple (CREATE, DELETE, LOGIN, IMPORT, EXPORT) sin
 * comparación campo a campo.
 */
async function registrarAccion({ modulo, accion, entidadId = null, detalle = null, usuarioId, ip }) {
  await registrar({
    modulo,
    accion,
    entidadId,
    campo: null,
    valorAnterior: null,
    valorNuevo: detalle ? JSON.stringify(detalle) : null,
    usuarioId,
    ip,
  });
}

module.exports = { registrar, registrarCambios, registrarAccion };
