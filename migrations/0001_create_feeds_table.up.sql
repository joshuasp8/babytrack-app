CREATE TABLE feeds (
    id                     UUID PRIMARY KEY,
    user_id                VARCHAR NOT NULL,
    start_time             TIMESTAMPTZ NOT NULL,
    duration_minutes       INT NOT NULL DEFAULT 0,
    duration_left_minutes  INT NOT NULL DEFAULT 0,
    duration_right_minutes INT NOT NULL DEFAULT 0,
    type                   VARCHAR NOT NULL,
    breast_side_started_on VARCHAR,
    notes                  TEXT NOT NULL DEFAULT '',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feeds_user_id ON feeds(user_id);
CREATE INDEX idx_feeds_user_start_time ON feeds(user_id, start_time DESC);
