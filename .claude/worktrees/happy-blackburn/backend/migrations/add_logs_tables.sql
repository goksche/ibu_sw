-- Add log tables for admin logging

CREATE TABLE IF NOT EXISTS page_view_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL,
  path VARCHAR(512) NOT NULL,
  query VARCHAR(1024) NULL,
  referrer VARCHAR(1024) NULL,
  title VARCHAR(255) NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_view_logs_created_at ON page_view_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_page_view_logs_user_id ON page_view_logs(user_id);

CREATE TABLE IF NOT EXISTS login_event_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL,
  username VARCHAR(100) NULL,
  email VARCHAR(200) NULL,
  event_type VARCHAR(32) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  reason VARCHAR(255) NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_event_logs_created_at ON login_event_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_event_logs_user_id ON login_event_logs(user_id);

CREATE TABLE IF NOT EXISTS api_request_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(512) NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_user_id ON api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_status_code ON api_request_logs(status_code);

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(512) NOT NULL,
  status_code INTEGER NOT NULL,
  action VARCHAR(255) NOT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON admin_action_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_user_id ON admin_action_logs(user_id);
