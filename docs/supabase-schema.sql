create table if not exists programs (
  id text primary key,
  name text not null,
  program_type text not null,
  utility_partner text not null,
  state text not null,
  owner text not null,
  executive_sponsor text not null,
  status text not null check (status in ('active', 'monitor', 'paused', 'complete', 'archived')),
  contract_value numeric not null default 0,
  period text not null,
  objective text not null,
  target_audience text not null,
  metrics jsonb not null default '{}'::jsonb,
  monthly_trend jsonb not null default '[]'::jsonb,
  deleted_at timestamptz,
  deleted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists data_sources (
  id text primary key,
  name text not null,
  source_type text not null,
  owner text not null,
  status text not null check (status in ('fresh', 'stale', 'failed')),
  last_sync_at timestamptz,
  freshness_hours numeric not null default 0,
  records integer not null default 0,
  quality_score numeric not null default 0,
  program_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists executive_reports (
  id text primary key,
  title text not null,
  focus text not null,
  audience text not null,
  mode text not null,
  summary text not null,
  risks jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tracked_actions (
  id text primary key,
  program_id text,
  alert_id text,
  title text not null,
  reason text not null default '',
  owner text not null,
  due text not null,
  status text not null check (status in ('open', 'in-progress', 'done')),
  priority integer not null default 0,
  completion_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists alerts (
  id text primary key,
  program_id text,
  severity text not null check (severity in ('low', 'medium', 'high')),
  category text not null,
  title text not null,
  detail text not null default '',
  status text not null check (status in ('open', 'acknowledged', 'resolved')),
  source text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  deleted_at timestamptz,
  deleted_by text
);

create table if not exists sync_runs (
  id text primary key,
  data_source_id text,
  data_source_name text not null,
  status text not null check (status in ('success', 'failed')),
  imported_at timestamptz not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  processed_program_count integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb
);

create table if not exists report_templates (
  id text primary key,
  name text not null,
  focus text not null,
  audience text not null,
  include_actions boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_events (
  id text primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  detail text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  actor_id text,
  actor_name text,
  actor_role text,
  created_at timestamptz not null default now()
);

create table if not exists kpi_snapshots (
  id text primary key,
  program_id text not null,
  period_label text not null,
  recorded_at timestamptz not null,
  households_served numeric not null default 0,
  households_target numeric not null default 0,
  staffing_capacity_pct numeric not null default 0,
  backlog_count numeric not null default 0,
  compliance_score numeric not null default 0,
  data_freshness_hours numeric not null default 0
);

create table if not exists optimization_thresholds (
  id text primary key,
  delivery_warning_pct numeric not null default 85,
  delivery_critical_pct numeric not null default 78,
  staffing_target_pct numeric not null default 82,
  staffing_critical_pct numeric not null default 72,
  open_roles_warning numeric not null default 10,
  equity_gap_warning_pct numeric not null default 5,
  compliance_minimum_score numeric not null default 90,
  data_freshness_warning_hours numeric not null default 48,
  data_quality_minimum_pct numeric not null default 90,
  data_quality_critical_pct numeric not null default 85,
  healthy_score_minimum numeric not null default 85,
  monitor_score_minimum numeric not null default 72,
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists programs_status_idx on programs(status);
create index if not exists programs_partner_idx on programs(utility_partner);
create index if not exists data_sources_status_idx on data_sources(status);
create index if not exists executive_reports_created_idx on executive_reports(created_at desc);
create index if not exists tracked_actions_program_idx on tracked_actions(program_id);
create index if not exists tracked_actions_status_idx on tracked_actions(status);
create index if not exists alerts_program_idx on alerts(program_id);
create index if not exists alerts_status_idx on alerts(status);
create index if not exists sync_runs_started_idx on sync_runs(started_at desc);
create index if not exists report_templates_name_idx on report_templates(name);
create index if not exists audit_events_entity_idx on audit_events(entity_type, entity_id);
create index if not exists kpi_snapshots_program_idx on kpi_snapshots(program_id, recorded_at desc);
