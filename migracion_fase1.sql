-- =====================================================================
-- MIGRACIÓN FASE 1 — Zona horaria, dominio, SMTP, roles, correo
-- institucional, edición de asistencias, plantillas de correo
-- Ejecutar: mysql -u barahunda_app -p escuela_musica < migracion_fase1.sql
-- =====================================================================

-- 1. CONFIGURACION — nuevos campos
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS zona_horaria VARCHAR(100) NOT NULL DEFAULT 'America/Bogota' AFTER fecha_go_live,
  ADD COLUMN IF NOT EXISTS dominio VARCHAR(255) NULL AFTER zona_horaria,
  ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255) NULL AFTER dominio,
  ADD COLUMN IF NOT EXISTS smtp_port SMALLINT NULL DEFAULT 587 AFTER smtp_host,
  ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255) NULL AFTER smtp_port,
  ADD COLUMN IF NOT EXISTS smtp_password VARCHAR(255) NULL AFTER smtp_user,
  ADD COLUMN IF NOT EXISTS smtp_from VARCHAR(255) NULL AFTER smtp_password,
  ADD COLUMN IF NOT EXISTS smtp_secure TINYINT(1) NOT NULL DEFAULT 0 AFTER smtp_from;

-- 2. USUARIOS — ampliar rol para incluir MIEMBRO + FK a miembros
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('ADMIN','MIEMBRO') NOT NULL DEFAULT 'ADMIN';

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS miembro_id INT NULL AFTER rol;

-- Agregar FK solo si no existe
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND CONSTRAINT_NAME = 'fk_usuarios_miembro'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Agregar índice solo si no existe
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND INDEX_NAME = 'idx_usuarios_miembro'
);
SET @sql2 = IF(@idx_exists = 0,
  'ALTER TABLE usuarios ADD INDEX idx_usuarios_miembro (miembro_id)',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 3. MIEMBROS — correo institucional
ALTER TABLE miembros
  ADD COLUMN IF NOT EXISTS correo_institucional VARCHAR(150) NULL AFTER email;

SET @idx2_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'miembros'
    AND INDEX_NAME = 'idx_miembros_correo_inst'
);
SET @sql3 = IF(@idx2_exists = 0,
  'ALTER TABLE miembros ADD INDEX idx_miembros_correo_inst (correo_institucional)',
  'SELECT 1'
);
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- 4. ASISTENCIAS — campos para edición manual por admin
ALTER TABLE asistencias
  ADD COLUMN IF NOT EXISTS modificado_manualmente TINYINT(1) NOT NULL DEFAULT 0 AFTER activo,
  ADD COLUMN IF NOT EXISTS motivo_modificacion VARCHAR(255) NULL AFTER modificado_manualmente,
  ADD COLUMN IF NOT EXISTS modificado_por INT NULL AFTER motivo_modificacion,
  ADD COLUMN IF NOT EXISTS fecha_modificacion DATETIME NULL AFTER modificado_por;

SET @fk2_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'asistencias'
    AND CONSTRAINT_NAME = 'fk_asistencias_modificado_por'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql4 = IF(@fk2_exists = 0,
  'ALTER TABLE asistencias ADD CONSTRAINT fk_asistencias_modificado_por FOREIGN KEY (modificado_por) REFERENCES usuarios(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt4 FROM @sql4; EXECUTE stmt4; DEALLOCATE PREPARE stmt4;

-- 5. AUDITORIA — agregar usuario_email para trazabilidad sin JOIN
ALTER TABLE auditoria
  ADD COLUMN IF NOT EXISTS usuario_email VARCHAR(150) NULL AFTER usuario_id;

-- 6. PLANTILLAS_CORREO — nueva tabla
CREATE TABLE IF NOT EXISTS plantillas_correo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  clave VARCHAR(100) NOT NULL UNIQUE COMMENT 'Identificador técnico: bienvenida, tarea_asignada, tarea_calificada, recordatorio_mensual',
  asunto VARCHAR(255) NOT NULL,
  cuerpo TEXT NOT NULL COMMENT 'HTML con variables entre llaves: {nombre}, {nivel}, etc.',
  variables_disponibles VARCHAR(500) NULL COMMENT 'Lista de variables disponibles separadas por coma',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plantillas_correo_clave (clave)
) ENGINE=InnoDB;

-- Seed plantillas de correo (solo si no existen)
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
  '<h2>Hola, {nombre}</h2><p>Te recordamos que tienes pendiente el pago de tu mensualidad correspondiente a <strong>{mes_pendiente}</strong> por un valor de <strong>{valor_mensualidad}</strong>.</p><p>Por favor realiza tu pago a la brevedad posible.</p>',
  '{nombre},{mes_pendiente},{valor_mensualidad}');
