create table todos (
    id uuid primary key,
    title varchar not null,
    completed boolean not null,
    created_at timestamptz not null
);
