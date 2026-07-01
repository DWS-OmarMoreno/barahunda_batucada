-- =====================================================================
-- MIGRACIÓN FASE 1 — Compatible con MySQL 5.7+ y 8.0+
-- Zona horaria, dominio, SMTP, roles, correo institucional,
-- edición de asistencias, plantillas de correo
-- Ejecutar: mysql -u barahunda_app -p escuela_musica < migracion_fase1.sql
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. CONFIGURACION — nuevos campos
-- ─────────────────────────────────────────────────────────────────────

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'zona_horaria') = 0,
  "ALTER TABLE configuracion ADD COLUMN zona_horaria VARCHAR(100) NOT NULL DEFAULT 'America/Bogota' AFTER fecha_go_live",
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'dominio') = 0,
  'ALTER TABLE configuracion ADD COLUMN dominio VARCHAR(255) NULL AFTER zona_horaria',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'smtp_host') = 0,
  'ALTER TABLE configuracion ADD COLUMN smtp_host VARCHAR(255) NULL AFTER dominio',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'smtp_port') = 0,
  'ALTER TABLE configuracion ADD COLUMN smtp_port SMALLINT NULL DEFAULT 587 AFTER smtp_host',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'smtp_user') = 0,
  'ALTER TABLE configuracion ADD COLUMN smtp_user VARCHAR(255) NULL AFTER smtp_port',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'smtp_password') = 0,
  'ALTER TABLE configuracion ADD COLUMN smtp_password VARCHAR(255) NULL AFTER smtp_user',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'smtp_from') = 0,
  'ALTER TABLE configuracion ADD COLUMN smtp_from VARCHAR(255) NULL AFTER smtp_password',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'smtp_secure') = 0,
  'ALTER TABLE configuracion ADD COLUMN smtp_secure TINYINT(1) NOT NULL DEFAULT 0 AFTER smtp_from',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ─────────────────────────────────────────────────────────────────────
-- 2. USUARIOS — ampliar rol + FK a miembros
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('ADMIN','MIEMBRO') NOT NULL DEFAULT 'ADMIN';

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'miembro_id') = 0,
  'ALTER TABLE usuarios ADD COLUMN miembro_id INT NULL AFTER rol',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- FK fk_usuarios_miembro
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND CONSTRAINT_NAME = 'fk_usuarios_miembro' AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0,
  'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id) ON DELETE SET NULL',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Índice idx_usuarios_miembro
SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'idx_usuarios_miembro') = 0,
  'ALTER TABLE usuarios ADD INDEX idx_usuarios_miembro (miembro_id)',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ─────────────────────────────────────────────────────────────────────
-- 3. MIEMBROS — correo institucional
-- ─────────────────────────────────────────────────────────────────────

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'miembros' AND COLUMN_NAME = 'correo_institucional') = 0,
  'ALTER TABLE miembros ADD COLUMN correo_institucional VARCHAR(150) NULL AFTER email',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'miembros' AND INDEX_NAME = 'idx_miembros_correo_inst') = 0,
  'ALTER TABLE miembros ADD INDEX idx_miembros_correo_inst (correo_institucional)',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ─────────────────────────────────────────────────────────────────────
-- 4. ASISTENCIAS — campos de edición manual
-- ─────────────────────────────────────────────────────────────────────

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asistencias' AND COLUMN_NAME = 'modificado_manualmente') = 0,
  'ALTER TABLE asistencias ADD COLUMN modificado_manualmente TINYINT(1) NOT NULL DEFAULT 0 AFTER activo',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asistencias' AND COLUMN_NAME = 'motivo_modificacion') = 0,
  'ALTER TABLE asistencias ADD COLUMN motivo_modificacion VARCHAR(255) NULL AFTER modificado_manualmente',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asistencias' AND COLUMN_NAME = 'modificado_por') = 0,
  'ALTER TABLE asistencias ADD COLUMN modificado_por INT NULL AFTER motivo_modificacion',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asistencias' AND COLUMN_NAME = 'fecha_modificacion') = 0,
  'ALTER TABLE asistencias ADD COLUMN fecha_modificacion DATETIME NULL AFTER modificado_por',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'asistencias' AND CONSTRAINT_NAME = 'fk_asistencias_modificado_por' AND CONSTRAINT_TYPE = 'FOREIGN KEY') = 0,
  'ALTER TABLE asistencias ADD CONSTRAINT fk_asistencias_modificado_por FOREIGN KEY (modificado_por) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ─────────────────────────────────────────────────────────────────────
-- 5. AUDITORIA — usuario_email para trazabilidad
-- ─────────────────────────────────────────────────────────────────────

SET @s = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auditoria' AND COLUMN_NAME = 'usuario_email') = 0,
  'ALTER TABLE auditoria ADD COLUMN usuario_email VARCHAR(150) NULL AFTER usuario_id',
  'SELECT 1'
); PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ─────────────────────────────────────────────────────────────────────
-- 6. PLANTILLAS_CORREO — nueva tabla
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plantillas_correo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  clave VARCHAR(100) NOT NULL UNIQUE,
  asunto VARCHAR(255) NOT NULL,
  cuerpo TEXT NOT NULL,
  variables_disponibles VARCHAR(500) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plantillas_correo_clave (clave)
) ENGINE=InnoDB;

INSERT IGNORE INTO plantillas_correo (nombre, clave, asunto, cuerpo, variables_disponibles) VALUES
('Bienvenida al miembro', 'bienvenida',
  'Bienvenido/a a {escuela_nombre}, {nombre}',
  '<h2>¡Bienvenido/a, {nombre}!</h2><p>Tu cuenta en <strong>{escuela_nombre}</strong> ha sido creada exitosamente.</p><p>Tu correo institucional es: <strong>{correo_institucional}</strong></p><p>Nivel: <strong>{nivel}</strong></p><p>Nos alegra tenerte con nosotros. ¡Mucho éxito!</p>',
  '{nombre},{escuela_nombre},{correo_institucional},{nivel}'),
('Nueva tarea asignada', 'tarea_asignada',
  'Nueva tarea: {titulo_tarea}',
  '<h2>Hola, {nombre}</h2><p>Se te ha asignado una nueva tarea: <strong>{titulo_tarea}</strong></p><p>Fecha límite: <strong>{fecha_limite}</strong></p><p>Nivel: <strong>{nivel}</strong></p>',
  '{nombre},{titulo_tarea},{fecha_limite},{nivel}'),
('Tarea calificada', 'tarea_calificada',
  'Tu tarea "{titulo_tarea}" ha sido calificada',
  '<h2>Hola, {nombre}</h2><p>Tu tarea <strong>{titulo_tarea}</strong> ha sido calificada.</p><p>Nota: <strong>{calificacion}</strong></p><p>Comentario: <strong>{comentario}</strong></p>',
  '{nombre},{titulo_tarea},{calificacion},{comentario}'),
('Recordatorio de mensualidad', 'recordatorio_mensual',
  'Recordatorio: Mensualidad pendiente - {mes_pendiente}',
  '<h2>Hola, {nombre}</h2><p>Te recordamos que tienes pendiente el pago de tu mensualidad correspondiente a <strong>{mes_pendiente}</strong> por un valor de <strong>{valor_mensualidad}</strong>.</p>',
  '{nombre},{mes_pendiente},{valor_mensualidad}');
