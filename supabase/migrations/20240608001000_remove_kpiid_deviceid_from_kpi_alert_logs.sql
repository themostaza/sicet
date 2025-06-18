-- MIGRATION: Rimuovi kpi_id e device_id da kpi_alert_logs

ALTER TABLE public.kpi_alert_logs DROP CONSTRAINT IF EXISTS kpi_alert_logs_kpi_id_fkey;
ALTER TABLE public.kpi_alert_logs DROP CONSTRAINT IF EXISTS kpi_alert_logs_device_id_fkey;
ALTER TABLE public.kpi_alert_logs DROP COLUMN IF EXISTS kpi_id;
ALTER TABLE public.kpi_alert_logs DROP COLUMN IF EXISTS device_id;
DROP INDEX IF EXISTS kpi_alert_logs_kpi_id_idx;
DROP INDEX IF EXISTS kpi_alert_logs_device_id_idx; 