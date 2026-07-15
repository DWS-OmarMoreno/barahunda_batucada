-- =====================================================================
-- MIGRACIÓN — Secciones del Plan de Estudios
-- Ejecutar DESPUÉS de migracion_planes_estudio.sql
-- mysql -u barahunda_app -p escuela_musica < migracion_secciones.sql
-- =====================================================================

-- 1. Tabla de secciones (nivel intermedio entre plan e ítems)
CREATE TABLE IF NOT EXISTS plan_secciones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  plan_id      INT NOT NULL,
  nombre       VARCHAR(200) NOT NULL DEFAULT 'Sección',
  orden        INT NOT NULL DEFAULT 0,
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ps_plan FOREIGN KEY (plan_id) REFERENCES planes_estudio(id) ON DELETE CASCADE,
  INDEX idx_ps_plan_orden (plan_id, orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Agregar columna seccion_id en plan_items
ALTER TABLE plan_items
  ADD COLUMN seccion_id INT NULL AFTER plan_id,
  ADD CONSTRAINT fk_pi_seccion FOREIGN KEY (seccion_id) REFERENCES plan_secciones(id) ON DELETE SET NULL;
