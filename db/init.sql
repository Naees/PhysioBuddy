-- db/init.sql

-- Create a 'users' table (not 'user', which is a reserved keyword)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- Seed with example data
INSERT INTO users (name) VALUES
('Alice'),
('Bob'),
('Charlie');
