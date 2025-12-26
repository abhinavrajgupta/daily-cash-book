-- Daily Cash Book Database Schema
-- PostgreSQL schema for Neon/Supabase/ElephantSQL

-- Create users table
CREATE TABLE users (
    id          serial PRIMARY KEY,
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Insert default user (Dad)
INSERT INTO users (name) VALUES ('Dad');

-- Create entries table
CREATE TABLE entries (
    id          bigserial PRIMARY KEY,
    user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date        date NOT NULL,
    type        text NOT NULL CHECK (type IN ('income', 'expense')),
    category    text NOT NULL,
    amount      numeric(12,2) NOT NULL CHECK (amount > 0),
    note        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_entries_user_date ON entries (user_id, date);
CREATE INDEX idx_entries_user_type ON entries (user_id, type);
CREATE INDEX idx_entries_user_category ON entries (user_id, category);
CREATE INDEX idx_entries_date_range ON entries (user_id, date DESC);

-- Sample data (optional - for testing)
/*
INSERT INTO entries (user_id, date, type, category, amount, note)
VALUES
    (1, CURRENT_DATE, 'income', 'Shop sales', 5000.00, 'Daily sales'),
    (1, CURRENT_DATE, 'expense', 'House (Mom)', 1000.00, 'Grocery'),
    (1, CURRENT_DATE, 'expense', 'Shop expenses', 500.00, 'Tobacco inventory');
*/
