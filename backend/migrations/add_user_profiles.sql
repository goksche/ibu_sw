-- V1.7 Phase 3: User-Profile
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    club VARCHAR(200),
    bio TEXT,
    avatar_url VARCHAR(500),
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    participant_match_checked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_user_profiles_user_id ON user_profiles(user_id);
