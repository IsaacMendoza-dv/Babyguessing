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
