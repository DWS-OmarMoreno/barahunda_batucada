-- Migración: agregar url_recurso a plan_items
-- Ejecutar en producción antes de desplegar el backend actualizado.

ALTER TABLE plan_items
  ADD COLUMN url_recurso VARCHAR(500) NULL COMMENT 'Enlace a recursos del ítem (Drive, YouTube, Notion, etc.)'
  AFTER descripcion;
