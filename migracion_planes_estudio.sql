-- =====================================================================
-- MIGRACIÓN — Módulo Plan de Estudios
-- Ejecutar: mysql -u barahunda_app -p escuela_musica < migracion_planes_estudio.sql
-- =====================================================================

-- 1. PLAN DE ESTUDIOS (uno o más por nivel, solo uno activo a la vez)
CREATE TABLE IF NOT EXISTS planes_estudio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nivel_id INT NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  -- tipo_calificacion es INMUTABLE después de crear el plan
  tipo_calificacion ENUM('NUMERICA','CATEGORICA','SIMPLE') NOT NULL,
  -- nota_minima_aprobacion solo aplica cuando tipo_calificacion = 'NUMERICA'
  nota_minima_aprobacion DECIMAL(5,2) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 0,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pe_nivel FOREIGN KEY (nivel_id) REFERENCES niveles(id) ON DELETE RESTRICT,
  INDEX idx_pe_nivel (nivel_id),
  INDEX idx_pe_activo (nivel_id, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. ÍTEMS DEL PLAN (actividades y exámenes en orden)
CREATE TABLE IF NOT EXISTS plan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  tipo ENUM('ACTIVIDAD','EXAMEN') NOT NULL DEFAULT 'ACTIVIDAD',
  -- orden define la secuencia; los exámenes se desbloquean cuando todas
  -- las ACTIVIDADES con orden < este ítem tienen al menos una entrega del miembro.
  orden INT NOT NULL DEFAULT 0,
  -- ponderado solo aplica cuando el plan es NUMERICA; debe sumar 100 por plan.
  ponderado DECIMAL(5,2) NULL,
  fecha_limite DATE NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pi_plan FOREIGN KEY (plan_id) REFERENCES planes_estudio(id) ON DELETE CASCADE,
  INDEX idx_pi_plan_orden (plan_id, orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. EXTEND TABLE entregas
--    tarea_id pasa a ser nullable (las entregas de plan no tienen tarea_id)
ALTER TABLE entregas
  MODIFY COLUMN tarea_id INT NULL,
  ADD COLUMN plan_item_id INT NULL AFTER tarea_id,
  ADD COLUMN calificacion_categorica ENUM('EXCELENTE','POR_MEJORAR') NULL AFTER calificacion,
  ADD CONSTRAINT fk_e_plan_item FOREIGN KEY (plan_item_id) REFERENCES plan_items(id) ON DELETE SET NULL,
  -- garantiza máx. una entrega por (ítem de plan, miembro)
  ADD UNIQUE KEY uq_entrega_item_miembro (plan_item_id, miembro_id);
