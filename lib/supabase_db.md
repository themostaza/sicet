-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.devices (
  id text NOT NULL CHECK (id ~ '^D[A-Z0-9]{7}$'::text),
  name text NOT NULL,
  location text,
  model text,
  type text,
  qrcode_url text,
  created_at timestamp with time zone DEFAULT now(),
  description text,
  tags ARRAY,
  deleted boolean NOT NULL DEFAULT false,
  category_analysis text,
  CONSTRAINT devices_pkey PRIMARY KEY (id)
);
CREATE TABLE public.export_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  template_name text,
  file_url text,
  field_mapping jsonb,
  email_autosend text,
  CONSTRAINT export_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.kpi_alert_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL,
  triggered_value jsonb NOT NULL,
  triggered_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamp with time zone,
  error_message text,
  CONSTRAINT kpi_alert_logs_pkey PRIMARY KEY (id),
  CONSTRAINT kpi_alert_logs_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.kpi_alerts(id)
);
CREATE TABLE public.kpi_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kpi_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  email text NOT NULL,
  conditions jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  todolist_id uuid NOT NULL,
  CONSTRAINT kpi_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT kpi_alerts_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES public.kpis(id),
  CONSTRAINT kpi_alerts_todolist_id_fkey FOREIGN KEY (todolist_id) REFERENCES public.todolist(id)
);
CREATE TABLE public.kpis (
  id text NOT NULL CHECK (id ~ '^K[A-Z0-9]{7}$'::text),
  name text NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT kpis_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['operator'::text, 'admin'::text, 'referrer'::text])),
  status text NOT NULL DEFAULT 'registered'::text CHECK (status = ANY (ARRAY['registered'::text, 'activated'::text, 'reset-password'::text, 'deleted'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  auth_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id)
);
CREATE TABLE public.report_to_excel (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  description text,
  todolist_params_linked jsonb,
  mapping_excel jsonb,
  CONSTRAINT report_to_excel_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tasks (
  id text NOT NULL,
  kpi_id text NOT NULL,
  value jsonb,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'discarded'::text])),
  created_at timestamp with time zone DEFAULT now(),
  alert_checked boolean DEFAULT false,
  created_by_user_id uuid,
  completed_by_user_id uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  todolist_id uuid NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT fk_kpi FOREIGN KEY (kpi_id) REFERENCES public.kpis(id),
  CONSTRAINT tasks_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES public.kpis(id),
  CONSTRAINT tasks_todolist_id_fkey FOREIGN KEY (todolist_id) REFERENCES public.todolist(id)
);
CREATE TABLE public.todolist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  scheduled_execution timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completion_date timestamp with time zone,
  time_slot_type text NOT NULL DEFAULT 'standard'::text CHECK (time_slot_type = ANY (ARRAY['standard'::text, 'custom'::text])),
  time_slot_start integer,
  time_slot_end integer,
  completed_by uuid,
  end_day_time timestamp with time zone,
  todolist_category text,
  CONSTRAINT todolist_pkey PRIMARY KEY (id),
  CONSTRAINT todolist_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id),
  CONSTRAINT todolist_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.todolist_alert (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  todolist_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT todolist_alert_pkey PRIMARY KEY (id),
  CONSTRAINT todolist_alert_todolist_id_fkey FOREIGN KEY (todolist_id) REFERENCES public.todolist(id)
);
CREATE TABLE public.todolist_alert_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  todolist_id uuid NOT NULL,
  alert_id uuid NOT NULL,
  email text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT todolist_alert_logs_pkey PRIMARY KEY (id),
  CONSTRAINT todolist_alert_logs_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.todolist_alert(id),
  CONSTRAINT todolist_alert_logs_todolist_id_fkey FOREIGN KEY (todolist_id) REFERENCES public.todolist(id)
);
CREATE TABLE public.user_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type USER-DEFINED NOT NULL,
  entity_type USER-DEFINED NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_activities_pkey PRIMARY KEY (id),
  CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);