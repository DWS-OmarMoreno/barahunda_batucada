-- Migración: Plantillas de correo para notificaciones de planes de estudio
-- Ejecutar en producción ANTES de desplegar el backend actualizado.

INSERT INTO plantillas_correo (clave, nombre, asunto, cuerpo, activo, variables_disponibles)
VALUES
(
  'notif_plan',
  'Notificación de plan de estudios',
  'Plan de estudios activo: {plan_nombre}',
  '<div style="font-family:sans-serif;max-width:600px;padding:20px">
  <h2 style="color:#333">¡Hola, {nombre}! 👋</h2>
  <p>Tienes un <strong>plan de estudios activo</strong> en <strong>{escuela_nombre}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Plan</td>
        <td style="padding:8px;border:1px solid #ddd">{plan_nombre}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Nivel</td>
        <td style="padding:8px;border:1px solid #ddd">{nivel_nombre}</td></tr>
  </table>
  <p>Recuerda revisar tus actividades pendientes y entregarlas a tiempo.</p>
  <p style="color:#888;font-size:12px;margin-top:24px">{escuela_nombre}</p>
</div>',
  1,
  '{nombre}, {plan_nombre}, {nivel_nombre}, {escuela_nombre}'
),
(
  'notif_item',
  'Recordatorio de actividad o examen',
  'Actividad pendiente: {item_titulo}',
  '<div style="font-family:sans-serif;max-width:600px;padding:20px">
  <h2 style="color:#333">¡Hola, {nombre}! 📝</h2>
  <p>Tienes una <strong>actividad pendiente</strong> en tu plan de estudios.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Actividad</td>
        <td style="padding:8px;border:1px solid #ddd">{item_titulo}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Plan</td>
        <td style="padding:8px;border:1px solid #ddd">{plan_nombre}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold">Fecha límite</td>
        <td style="padding:8px;border:1px solid #ddd">{fecha_limite}</td></tr>
  </table>
  <p>¡Recuerda entregar a tiempo para no perder tu progreso!</p>
  <p style="color:#888;font-size:12px;margin-top:24px">{escuela_nombre}</p>
</div>',
  1,
  '{nombre}, {item_titulo}, {plan_nombre}, {fecha_limite}, {escuela_nombre}'
)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  asunto = VALUES(asunto),
  activo = 1,
  variables_disponibles = VALUES(variables_disponibles);
