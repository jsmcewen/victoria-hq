create table if not exists family_settings (
  user_id text primary key,
  company_name text not null default 'Home Company',
  hq_pin_hash text,
  auto_approve boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists kids (
  id text primary key,
  user_id text not null,
  name text not null,
  avatar_key text not null,
  stars integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists kids_user_id_idx on kids (user_id);

create table if not exists chores (
  id text primary key,
  user_id text not null,
  kid_id text,
  title text not null,
  notes text not null default '',
  stars integer not null default 1,
  cadence text not null default 'daily',
  active boolean not null default true,
  created_by text not null default 'parent',
  created_at timestamptz not null default now()
);
create index if not exists chores_user_id_idx on chores (user_id);

create table if not exists chore_logs (
  id text primary key,
  user_id text not null,
  chore_id text not null,
  kid_id text not null,
  due_date date not null,
  status text not null default 'open',
  completed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists chore_logs_uniq
  on chore_logs (user_id, chore_id, kid_id, due_date);
create index if not exists chore_logs_user_status_idx on chore_logs (user_id, status);

create table if not exists rewards (
  id text primary key,
  user_id text not null,
  title text not null,
  notes text not null default '',
  cost integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists rewards_user_id_idx on rewards (user_id);

create table if not exists redemptions (
  id text primary key,
  user_id text not null,
  reward_id text not null,
  kid_id text not null,
  cost integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists redemptions_user_id_idx on redemptions (user_id);

create table if not exists victoria_log (
  id text primary key,
  user_id text not null,
  kind text not null,
  body text not null,
  kid_id text,
  created_at timestamptz not null default now()
);
create index if not exists victoria_log_user_idx on victoria_log (user_id, created_at desc);
