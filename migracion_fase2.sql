-- =====================================================================
-- MIGRACIÓN FASE 2 — Módulo Escuela: tareas, guías y entregas
-- Ejecutar: mysql -u barahunda_app -p escuela_musica < migracion_fase2.sql
-- =====================================================================

-- 1. TAREAS
CREATE TABLE IF NOT EXISTS tareas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  nivel_id INT NOT NULL,
  fecha_limite DATE,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tareas_nivel FOREIGN KEY (nivel_id) REFERENCES niveles(id),
  INDEX idx_tareas_nivel (nivel_id)
) ENGINE=InnoDB;

-- 2. GUÍAS
CREATE TABLE IF NOT EXISTS guias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  nivel_id INT NOT NULL,
  tipo ENUM('VIDEO','DOCUMENTO','TEXTO') NOT NULL DEFAULT 'TEXTO',
  contenido LONGTEXT,
  url_video VARCHAR(500),
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_guias_nivel FOREIGN KEY (nivel_id) REFERENCES niveles(id),
  INDEX idx_guias_nivel (nivel_id)
) ENGINE=InnoDB;

-- 3. ENTREGAS
CREATE TABLE IF NOT EXISTS entregas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tarea_id INT NOT NULL,
  miembro_id INT NOT NULL,
  url_evidencia VARCHAR(500),
  observaciones TEXT,
  fecha_entrega DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  calificacion DECIMAL(5,2),
  retroalimentacion TEXT,
  calificado_por INT,
  fecha_calificacion DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_entregas_tarea FOREIGN KEY (tarea_id) REFERENCES tareas(id),
  CONSTRAINT fk_entregas_miembro FOREIGN KEY (miembro_id) REFERENCES miembros(id),
  CONSTRAINT fk_entregas_calificador FOREIGN KEY (calificado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  UNIQUE KEY uq_entrega_tarea_miembro (tarea_id, miembro_id),
  INDEX idx_entregas_tarea (tarea_id),
  INDEX idx_entregas_miembro (miembro_id)
) ENGINE=InnoDB;
