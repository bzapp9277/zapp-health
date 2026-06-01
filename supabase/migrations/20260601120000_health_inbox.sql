-- ============================================================
-- health_inbox: health-email to-dos from the Gmail poller
-- ============================================================
create table if not exists health_inbox (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null default 'eb3d4470-3f8b-436a-94db-783d9a744491',
  gmail_message_id text        not null unique,
  received_at      timestamptz,
  sender           text,
  subject          text,
  snippet          text,
  category         text,
  has_attachment   bool        not null default false,
  action_needed    text,
  status           text        not null default 'new',
  created_at       timestamptz not null default now()
);
