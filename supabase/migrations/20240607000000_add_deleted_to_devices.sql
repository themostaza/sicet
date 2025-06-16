-- Migration: aggiungi colonna deleted a devices
alter table public.devices add column if not exists deleted boolean not null default false; 