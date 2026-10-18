create table users (
    id            uuid primary key default gen_random_uuid(),
    name          text not null check (char_length(name) between 1 and 80),
    email         text not null,
    password_hash text not null,
    avatar_color  text not null default '#0E4D3A',
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create unique index users_email_uidx on users (lower(email));

create table communities (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,
    name        text not null check (char_length(name) between 1 and 80),
    city        text not null,
    sport       text not null check (sport in ('padel', 'tennis')),
    description text not null default '',
    created_by  uuid not null references users (id) on delete restrict,
    created_at  timestamptz not null default now()
);

create table community_members (
    community_id uuid not null references communities (id) on delete cascade,
    user_id      uuid not null references users (id) on delete cascade,
    role         text not null default 'member' check (role in ('owner', 'moderator', 'member')),
    joined_at    timestamptz not null default now(),
    primary key (community_id, user_id)
);

create index community_members_user_idx on community_members (user_id);

create table events (
    id           uuid primary key default gen_random_uuid(),
    community_id uuid not null references communities (id) on delete cascade,
    organizer_id uuid not null references users (id) on delete restrict,
    title        text not null check (char_length(title) between 1 and 120),
    sport        text not null check (sport in ('padel', 'tennis')),
    format       text not null default 'doubles' check (format in ('doubles', 'singles')),
    venue        text not null,
    city         text not null,
    starts_at    timestamptz not null,
    ends_at      timestamptz not null,
    capacity     int not null check (capacity > 0),
    fee          int not null default 0 check (fee >= 0),
    level_min    int not null default 1 check (level_min between 1 and 7),
    level_max    int not null default 7 check (level_max between 1 and 7),
    status       text not null default 'published'
                 check (status in ('draft', 'published', 'closed', 'cancelled')),
    notes        text not null default '',
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    check (level_max >= level_min),
    check (ends_at > starts_at)
);

create index events_community_idx on events (community_id);
create index events_starts_at_idx on events (starts_at);
create index events_status_idx on events (status);
create index events_sport_idx on events (sport);

create table event_registrations (
    id         uuid primary key default gen_random_uuid(),
    event_id   uuid not null references events (id) on delete cascade,
    user_id    uuid not null references users (id) on delete cascade,
    status     text not null default 'joined'
               check (status in ('joined', 'waitlist', 'cancelled')),
    checked_in boolean not null default false,
    joined_at  timestamptz not null default now(),
    unique (event_id, user_id)
);

create index event_registrations_event_idx on event_registrations (event_id, status);
create index event_registrations_user_idx on event_registrations (user_id);

create table matches (
    id        uuid primary key default gen_random_uuid(),
    event_id  uuid not null references events (id) on delete cascade,
    court     int not null default 1,
    round     int not null default 1,
    status    text not null default 'scheduled'
              check (status in ('scheduled', 'finished', 'disputed', 'cancelled')),
    played_at timestamptz,
    created_at timestamptz not null default now()
);

create index matches_event_idx on matches (event_id);

create table match_players (
    match_id uuid not null references matches (id) on delete cascade,
    user_id  uuid not null references users (id) on delete cascade,
    team     text not null check (team in ('A', 'B')),
    primary key (match_id, user_id)
);

create index match_players_user_idx on match_players (user_id);

create table score_submissions (
    id             uuid primary key default gen_random_uuid(),
    match_id       uuid not null references matches (id) on delete cascade,
    submitted_by   uuid not null references users (id) on delete restrict,
    sets           jsonb not null,
    status         text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'disputed')),
    confirmed_by   uuid references users (id) on delete set null,
    confirmed_at   timestamptz,
    dispute_reason text not null default '',
    created_at     timestamptz not null default now()
);

create unique index score_submissions_match_uidx on score_submissions (match_id);

-- Rating disimpan terpisah dari skor mentah supaya bisa dihitung ulang
-- ketika rumus berubah tanpa menyentuh riwayat pertandingan.
create table player_ratings (
    user_id        uuid not null references users (id) on delete cascade,
    community_id   uuid not null references communities (id) on delete cascade,
    sport          text not null check (sport in ('padel', 'tennis')),
    skill_rating   numeric(8,2) not null default 1200,
    season_points  int not null default 0,
    participation  int not null default 0,
    matches        int not null default 0,
    wins           int not null default 0,
    losses         int not null default 0,
    reliability    numeric(4,3) not null default 0,
    updated_at     timestamptz not null default now(),
    primary key (user_id, community_id, sport)
);

create index player_ratings_leaderboard_idx
    on player_ratings (community_id, sport, skill_rating desc);

create table audit_logs (
    id         bigserial primary key,
    actor_id   uuid references users (id) on delete set null,
    entity     text not null,
    entity_id  text not null,
    action     text not null,
    before     jsonb,
    after      jsonb,
    created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on audit_logs (entity, entity_id);

create table notifications (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references users (id) on delete cascade,
    type       text not null,
    title      text not null,
    body       text not null default '',
    link       text not null default '',
    read_at    timestamptz,
    created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);
