-- Add app_settings table for global settings

CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  settings_json JSON NOT NULL DEFAULT '{}'::json,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

