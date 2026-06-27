-- =====================================================================
-- Sistema de Administración de Proceso Educativo Musical
-- Script de base de datos: estructura completa + datos iniciales (seed)
-- Motor sugerido: MySQL 8.0+ / MariaDB 10.5+
-- =====================================================================

CREATE DATABASE IF NOT EXISTS escuela_musica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE escuela_musica;

SET NAMES utf8mb4;

-- =====================================================================
-- 1. CONFIGURACION — Parámetros globales del sistema
-- =====================================================================
CREATE TABLE IF NOT EXISTS configuracion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escuela_nombre VARCHAR(150) NOT NULL DEFAULT 'Escuela de Música',
  escuela_logo VARCHAR(255) NULL,
  escuela_telefono VARCHAR(30) NULL,
  escuela_direccion VARCHAR(255) NULL,
  fecha_go_live DATE NULL COMMENT 'Fecha desde la cual se calculan ausencias; antes de esta fecha no se generan filas sintéticas AUSENTE',
  multa_valor_por_tardanza DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
  asistencia_tolerancia_minutos INT NOT NULL DEFAULT 10,
  color_primario VARCHAR(7) NOT NULL DEFAULT '#2563eb',
  color_secundario VARCHAR(7) NOT NULL DEFAULT '#64748b',
  color_acento VARCHAR(7) NOT NULL DEFAULT '#f59e0b',
  color_texto VARCHAR(7) NOT NULL DEFAULT '#1e293b',
  color_fondo VARCHAR(7) NOT NULL DEFAULT '#f8fafc',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- 2. USUARIOS — Administradores del sistema
-- =====================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuarios_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. NIVELES — Niveles musicales
-- =====================================================================
CREATE TABLE IF NOT EXISTS niveles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_niveles_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- 4. INSTRUMENTOS — Catálogo de instrumentos
-- =====================================================================
CREATE TABLE IF NOT EXISTS instrumentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_instrumentos_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- 5. HORARIOS — Horarios por nivel
-- =====================================================================
CREATE TABLE IF NOT EXISTS horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nivel_id INT NOT NULL,
  dia_semana ENUM('LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO') NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  tolerancia_minutos INT NOT NULL DEFAULT 10,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_horarios_nivel FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE RESTRICT,
  INDEX idx_horarios_nivel (nivel_id),
  INDEX idx_horarios_dia (dia_semana),
  INDEX idx_horarios_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- 6. MIEMBROS — Datos personales y médicos
-- =====================================================================
CREATE TABLE IF NOT EXISTS miembros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombres_completos VARCHAR(200) NOT NULL,
  tipo_documento ENUM('CC','TI','CE','PASAPORTE') NOT NULL DEFAULT 'CC',
  numero_documento VARCHAR(30) NOT NULL UNIQUE,
  whatsapp VARCHAR(30) NOT NULL,
  email VARCHAR(150) NULL,
  fecha_nacimiento DATE NULL,
  direccion VARCHAR(255) NULL,
  -- Información médica
  tipo_sangre VARCHAR(5) NULL,
  eps VARCHAR(150) NULL,
  padece_enfermedad TINYINT(1) NOT NULL DEFAULT 0,
  enfermedad_cual VARCHAR(255) NULL,
  sufre_alergia TINYINT(1) NOT NULL DEFAULT 0,
  alergia_cual VARCHAR(255) NULL,
  toma_medicamentos TINYINT(1) NOT NULL DEFAULT 0,
  medicamentos_cuales VARCHAR(255) NULL,
  restricciones_fisicas TEXT NULL,
  -- Excepciones administrativas
  exento_pago TINYINT(1) NOT NULL DEFAULT 0,
  asistencia_obligatoria TINYINT(1) NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_miembros_documento (numero_documento),
  INDEX idx_miembros_nombre (nombres_completos),
  INDEX idx_miembros_activo (activo),
  INDEX idx_miembros_exento_pago (exento_pago)
) ENGINE=InnoDB;

-- =====================================================================
-- 7. MIEMBRO_NIVELES — Relación miembro ↔ nivel ↔ instrumento ↔ progreso
-- =====================================================================
CREATE TABLE IF NOT EXISTS miembro_niveles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  miembro_id INT NOT NULL,
  nivel_id INT NOT NULL,
  instrumento_id INT NOT NULL,
  progreso TEXT NULL,
  fecha_inicio DATE NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_miembro_niveles_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id) ON DELETE CASCADE,
  CONSTRAINT fk_miembro_niveles_nivel FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_miembro_niveles_instrumento FOREIGN KEY (instrumento_id) REFERENCES instrumentos(id) ON DELETE RESTRICT,
  INDEX idx_miembro_niveles_miembro (miembro_id),
  INDEX idx_miembro_niveles_nivel (nivel_id),
  INDEX idx_miembro_niveles_instrumento (instrumento_id),
  INDEX idx_miembro_niveles_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- 8. CONTACTOS_EMERGENCIA — Contactos por miembro
-- =====================================================================
CREATE TABLE IF NOT EXISTS contactos_emergencia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  miembro_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  parentesco VARCHAR(100) NULL,
  telefono VARCHAR(30) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_contactos_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id) ON DELETE CASCADE,
  INDEX idx_contactos_miembro (miembro_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 9. MENSUALIDADES — Configuración de mensualidad por miembro
-- =====================================================================
CREATE TABLE IF NOT EXISTS mensualidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  miembro_id INT NOT NULL UNIQUE,
  valor_mensualidad DECIMAL(10,2) NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mensualidades_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 10. PAGOS — Registro de pagos realizados
-- =====================================================================
CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  miembro_id INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  fecha_pago DATE NOT NULL,
  mes_correspondiente TINYINT NOT NULL,
  anio_correspondiente SMALLINT NOT NULL,
  soporte_url VARCHAR(255) NULL,
  observaciones VARCHAR(255) NULL,
  registrado_por INT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagos_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id) ON DELETE CASCADE,
  CONSTRAINT fk_pagos_usuario FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_pagos_miembro (miembro_id),
  INDEX idx_pagos_periodo (anio_correspondiente, mes_correspondiente),
  INDEX idx_pagos_fecha (fecha_pago)
) ENGINE=InnoDB;

-- =====================================================================
-- 11. ASISTENCIAS — Registro de asistencias
-- =====================================================================
CREATE TABLE IF NOT EXISTS asistencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  miembro_id INT NOT NULL,
  nivel_id INT NOT NULL,
  horario_id INT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado ENUM('A_TIEMPO','TARDE','AUSENTE') NOT NULL,
  minutos_retraso INT NOT NULL DEFAULT 0,
  -- Anulación (registro inválido: se anula en vez de borrarse, no cuenta en reportes)
  motivo_anulacion VARCHAR(255) NULL,
  anulado_por INT NULL,
  fecha_anulacion DATETIME NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_asistencias_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id) ON DELETE CASCADE,
  CONSTRAINT fk_asistencias_nivel FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asistencias_horario FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_asistencias_anulado_por FOREIGN KEY (anulado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_asistencias_miembro (miembro_id),
  INDEX idx_asistencias_nivel (nivel_id),
  INDEX idx_asistencias_fecha (fecha),
  INDEX idx_asistencias_estado (estado)
) ENGINE=InnoDB;

-- =====================================================================
-- 12. MULTAS — Multas generadas
-- =====================================================================
CREATE TABLE IF NOT EXISTS multas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  miembro_id INT NOT NULL,
  asistencia_id INT NULL,
  tipo ENUM('TARDANZA','OTRA') NOT NULL DEFAULT 'TARDANZA',
  valor DECIMAL(10,2) NOT NULL,
  estado ENUM('PENDIENTE','PAGADA','CONDONADA') NOT NULL DEFAULT 'PENDIENTE',
  fecha_generada DATE NOT NULL,
  fecha_pago DATE NULL,
  motivo_condonacion VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_multas_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id) ON DELETE CASCADE,
  CONSTRAINT fk_multas_asistencia FOREIGN KEY (asistencia_id) REFERENCES asistencias(id) ON DELETE SET NULL,
  INDEX idx_multas_miembro (miembro_id),
  INDEX idx_multas_estado (estado),
  INDEX idx_multas_fecha (fecha_generada)
) ENGINE=InnoDB;

-- =====================================================================
-- 13. EVENTOS — Eventos / conciertos
-- =====================================================================
CREATE TABLE IF NOT EXISTS eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT NULL,
  tipo ENUM('PAGO','BENEFICO') NOT NULL DEFAULT 'PAGO',
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  quien_contrata_nombre VARCHAR(150) NULL,
  quien_contrata_contacto VARCHAR(100) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_eventos_fecha (fecha),
  INDEX idx_eventos_tipo (tipo),
  INDEX idx_eventos_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- 14. EVENTO_MIEMBROS — Miembros por evento + valor individual
-- =====================================================================
CREATE TABLE IF NOT EXISTS evento_miembros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evento_id INT NOT NULL,
  miembro_id INT NOT NULL,
  valor_individual DECIMAL(10,2) NOT NULL DEFAULT 0,
  notas VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_evento_miembros_evento FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
  CONSTRAINT fk_evento_miembros_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id) ON DELETE CASCADE,
  UNIQUE KEY uq_evento_miembro (evento_id, miembro_id),
  INDEX idx_evento_miembros_evento (evento_id),
  INDEX idx_evento_miembros_miembro (miembro_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 15. PLANTILLAS_WHATSAPP — Plantillas configurables de mensajes
-- =====================================================================
CREATE TABLE IF NOT EXISTS plantillas_whatsapp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  contenido TEXT NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plantillas_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- 16. COMUNICACIONES — Historial de mensajes enviados
-- =====================================================================
CREATE TABLE IF NOT EXISTS comunicaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plantilla_id INT NULL,
  destinatarios_tipo ENUM('TODOS','POR_NIVEL','MANUAL') NOT NULL,
  nivel_id INT NULL,
  mensaje_generado TEXT NOT NULL,
  total_destinatarios INT NOT NULL DEFAULT 0,
  enviado_por INT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comunicaciones_plantilla FOREIGN KEY (plantilla_id) REFERENCES plantillas_whatsapp(id) ON DELETE SET NULL,
  CONSTRAINT fk_comunicaciones_nivel FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE SET NULL,
  CONSTRAINT fk_comunicaciones_usuario FOREIGN KEY (enviado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_comunicaciones_fecha (created_at)
) ENGINE=InnoDB;

-- =====================================================================
-- 17. AUDITORIA — Tabla global de auditoría
-- =====================================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modulo VARCHAR(50) NOT NULL,
  accion ENUM('CREATE','UPDATE','DELETE','LOGIN','IMPORT','EXPORT') NOT NULL,
  entidad_id INT NULL,
  campo_modificado VARCHAR(100) NULL,
  valor_anterior TEXT NULL,
  valor_nuevo TEXT NULL,
  usuario_id INT NULL,
  ip VARCHAR(45) NULL,
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_auditoria_modulo (modulo),
  INDEX idx_auditoria_entidad (entidad_id),
  INDEX idx_auditoria_fecha (fecha_hora)
) ENGINE=InnoDB;

-- =====================================================================
-- 18. IMPORTACIONES — Log de importaciones / exportaciones
-- =====================================================================
CREATE TABLE IF NOT EXISTS importaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modulo VARCHAR(50) NOT NULL,
  tipo ENUM('IMPORTACION','EXPORTACION') NOT NULL,
  usuario_id INT NULL,
  nombre_archivo VARCHAR(255) NULL,
  registros_procesados INT NOT NULL DEFAULT 0,
  registros_exitosos INT NOT NULL DEFAULT 0,
  registros_error INT NOT NULL DEFAULT 0,
  detalle_errores TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_importaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_importaciones_modulo (modulo),
  INDEX idx_importaciones_fecha (created_at)
) ENGINE=InnoDB;

-- =====================================================================
-- 19. PUNTOS_REGISTRO — Enlaces fijos (no rotativos) de autoregistro de
-- asistencia para un punto físico de la sede (p. ej. una tablet en la
-- entrada). A diferencia del QR rotativo por horario (ver horarios.qr),
-- este token NO expira ni rota: la seguridad depende de que el enlace
-- nunca se entregue a los miembros, solo al dispositivo fijo del punto
-- de registro. El horario/nivel del miembro se resuelve automáticamente
-- según la hora y el día en que se registra (ver asistencias.publica vs
-- asistencias.puntoFijo).
-- =====================================================================
CREATE TABLE IF NOT EXISTS puntos_registro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL DEFAULT 'Punto de registro principal',
  token VARCHAR(64) NOT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_puntos_registro_token (token),
  INDEX idx_puntos_registro_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- DATOS INICIALES (SEED)
-- =====================================================================

-- Usuario administrador por defecto
-- Email: admin@escuela.com  |  Password: Admin123*  (cambiar tras el primer login)
INSERT INTO usuarios (nombre, email, password_hash, rol)
VALUES ('Administrador', 'admin@escuela.com', '$2a$10$NxUMP9vhBc6O0ONpulvq5OVHU7OYM36cmVwe8G8WLhC.Fm2VtAspK', 'ADMIN');

-- Configuración inicial
INSERT INTO configuracion (escuela_nombre, multa_valor_por_tardanza, asistencia_tolerancia_minutos, color_primario, color_secundario, color_acento, color_texto, color_fondo)
VALUES ('Escuela de Música', 5000.00, 10, '#2563eb', '#64748b', '#f59e0b', '#1e293b', '#f8fafc');

-- Instrumentos base
INSERT INTO instrumentos (nombre) VALUES
  ('Repe'), ('Redoblante'), ('Dobra'), ('Surdo medio'), ('Surdo Grave');

-- Niveles base
INSERT INTO niveles (nombre) VALUES
  ('Hoplitas'), ('Hippeis'), ('Espartanos');

-- Plantillas de WhatsApp predeterminadas
-- Variables disponibles: {nombre} {nivel} {valor_mensualidad} {mes_pendiente} {valor_multa} {fecha_evento}
INSERT INTO plantillas_whatsapp (nombre, contenido) VALUES
  ('Recordatorio de mensualidad', 'Hola {nombre} 👋, te recordamos que tienes pendiente el pago de la mensualidad de {nivel} correspondiente a {mes_pendiente} por un valor de {valor_mensualidad}. ¡Gracias por tu atención!'),
  ('Aviso de multa por tardanza', 'Hola {nombre}, se ha generado una multa por tardanza de {valor_multa}. Por favor acércate a coordinación para más información.'),
  ('Invitación a evento', 'Hola {nombre}, te invitamos a participar en nuestro próximo evento el {fecha_evento}. ¡Te esperamos!');

-- Nota: el tipo de documento (CC, TI, CE, Pasaporte) se maneja como ENUM en la tabla `miembros`.

-- =====================================================================
-- MIGRACIÓN: aplicar sobre una base de datos ya existente (creada antes
-- de añadir estas columnas). En una instalación nueva, `database.sql`
-- ya crea las tablas con estas columnas incluidas, así que este bloque
-- es un no-op (cada ADD COLUMN/CONSTRAINT usa IF NOT EXISTS).
-- =====================================================================
ALTER TABLE miembros
  ADD COLUMN IF NOT EXISTS exento_pago TINYINT(1) NOT NULL DEFAULT 0 AFTER restricciones_fisicas,
  ADD COLUMN IF NOT EXISTS asistencia_obligatoria TINYINT(1) NOT NULL DEFAULT 0 AFTER exento_pago;

ALTER TABLE asistencias
  ADD COLUMN IF NOT EXISTS motivo_anulacion VARCHAR(255) NULL AFTER minutos_retraso,
  ADD COLUMN IF NOT EXISTS anulado_por INT NULL AFTER motivo_anulacion,
  ADD COLUMN IF NOT EXISTS fecha_anulacion DATETIME NULL AFTER anulado_por;

-- Fecha de "Go Live": fecha a partir de la cual el sistema calcula
-- ausencias (filas sintéticas AUSENTE en reportes y en el listado admin
-- de Asistencias). Antes de esta fecha la escuela no usaba el sistema,
-- así que no deben generarse ausencias previas a ella. NULL = sin límite
-- (comportamiento anterior, usa solo la ventana de días por defecto).
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS fecha_go_live DATE NULL AFTER escuela_direccion;
