-- Ejecuta esto en Supabase > SQL Editor
create table if not exists guesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 120),
  guess_date date not null,
  lang text not null default 'es' check (lang in ('es','en','fil')),
  created_at timestamptz not null default now()
);

-- Un correo = una apuesta
create unique index if not exists guesses_email_uniq on guesses (lower(email));

-- Máximo 3 personas por fecha (atómico, evita carreras)
create or replace function enforce_max_per_date() returns trigger as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.guess_date::text));
  if (select count(*) from guesses where guess_date = new.guess_date) >= 3 then
    raise exception 'date_full';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists guesses_max_per_date on guesses;
create trigger guesses_max_per_date before insert on guesses
  for each row execute function enforce_max_per_date();

-- Sin políticas: solo la service key (funciones del servidor) puede acceder.
alter table guesses enable row level security;

-- =====================================================================
-- Pizarrón de mensajes (post-its para los papás y el bebé)
-- Ejecuta SOLO este bloque en Supabase > SQL Editor si ya creaste la tabla guesses.
-- =====================================================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),          -- la firma
  message text not null check (char_length(message) between 1 and 280),
  color text not null default 'yellow' check (color in ('yellow','pink','blue','green','orange')),
  guess_email text not null,                                              -- privado: nunca se muestra en la página
  lang text not null default 'es' check (lang in ('es','en','fil')),
  created_at timestamptz not null default now()
);

create index if not exists messages_created_idx on messages (created_at desc);
create index if not exists messages_email_idx on messages (lower(guess_email));

-- Máximo 3 mensajes por correo (atómico)
create or replace function enforce_max_messages() returns trigger as $$
begin
  perform pg_advisory_xact_lock(hashtext(lower(new.guess_email)));
  if (select count(*) from messages where lower(guess_email) = lower(new.guess_email)) >= 3 then
    raise exception 'too_many_messages';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists messages_limit on messages;
create trigger messages_limit before insert on messages
  for each row execute function enforce_max_messages();

alter table messages enable row level security;
