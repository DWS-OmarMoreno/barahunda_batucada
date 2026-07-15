-- Migración: canal de comunicaciones (WHATSAPP | EMAIL | AMBOS)
-- Ejecutar en el servidor: mysql -u [usuario] -p [base_de_datos] < migracion_comunicaciones_email.sql

ALTER TABLE comunicaciones
  ADD COLUMN canal ENUM('WHATSAPP','EMAIL','AMBOS') NOT NULL DEFAULT 'WHATSAPP'
  AFTER total_destinatarios;
