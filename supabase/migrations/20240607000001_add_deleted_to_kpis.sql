-- Migration: aggiungi colonna deleted a kpis
alter table public.kpis add column if not exists deleted boolean not null default false; 