CREATE TABLE IF NOT EXISTS sleeps (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sleeps_user_id_start_time ON sleeps(user_id, start_time DESC);
