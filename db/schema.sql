-- Teacher's Little Helper initial Neon Postgres schema
-- Run this in the Neon SQL editor once the project is ready.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text unique,
  full_name text,
  email text unique,
  role text not null default 'teacher',
  plan_name text not null default 'teacher_monthly',
  subscription_status text not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  school_id uuid references schools(id) on delete set null,
  name text not null,
  grade text,
  academic_year text,
  term text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learners (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  full_name text not null,
  preferred_name text,
  pronouns text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  learner_id uuid not null references learners(id) on delete cascade,
  observation_type text not null check (observation_type in ('typed', 'voice')),
  original_text text not null,
  cleaned_text text,
  ai_summary text,
  category text,
  subject text,
  sentiment text,
  importance text default 'normal',
  used_in_report boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists observation_embeddings (
  observation_id uuid primary key references observations(id) on delete cascade,
  embedding vector(768),
  model text,
  created_at timestamptz not null default now()
);

create table if not exists voice_usage (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  week_start_date date not null,
  voice_note_count integer not null default 0,
  seconds_used integer not null default 0,
  unique(profile_id, week_start_date)
);

create table if not exists report_structures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  name text not null,
  tone text,
  sections_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists style_guides (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  name text not null default 'Default style guide',
  style_summary text,
  rules_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists report_drafts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  learner_id uuid not null references learners(id) on delete cascade,
  report_structure_id uuid references report_structures(id) on delete set null,
  draft_json jsonb not null default '{}'::jsonb,
  final_text text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_classes_profile_id on classes(profile_id);
create index if not exists idx_learners_class_id on learners(class_id);
create index if not exists idx_observations_profile_id on observations(profile_id);
create index if not exists idx_observations_learner_id on observations(learner_id);
create index if not exists idx_observations_class_id on observations(class_id);
create index if not exists idx_voice_usage_profile_week on voice_usage(profile_id, week_start_date);
