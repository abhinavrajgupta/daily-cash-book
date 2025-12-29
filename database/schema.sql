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

-- ============================================
-- LOAN TRACKING TABLES
-- ============================================

-- Create loans_given table (loans given to others)
CREATE TABLE loans_given (
    id bigserial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    borrower_name text NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    due_date date NOT NULL,
    reminder_date date NOT NULL, -- Date to remind (1 week before due)
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'fully_paid', 'in_danger', 'expected_late')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create monthly payment tracking for loans given
CREATE TABLE loan_given_payments (
    id bigserial PRIMARY KEY,
    loan_id integer NOT NULL REFERENCES loans_given(id) ON DELETE CASCADE,
    payment_month date NOT NULL, -- First day of month (e.g., 2025-01-01)
    amount_paid numeric(12,2) DEFAULT 0 CHECK (amount_paid >= 0),
    payment_date date,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(loan_id, payment_month)
);

-- Indexes for loans_given
CREATE INDEX idx_loans_given_user_date ON loans_given (user_id, due_date);
CREATE INDEX idx_loans_given_status ON loans_given (status);
CREATE INDEX idx_loans_given_reminder ON loans_given (reminder_date) WHERE status NOT IN ('fully_paid');
CREATE INDEX idx_loan_given_payments_loan ON loan_given_payments (loan_id, payment_month);

-- Create loans_to_pay table (loans you need to repay)
CREATE TABLE loans_to_pay (
    id bigserial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lender_name text NOT NULL,
    original_principal numeric(12,2) NOT NULL CHECK (original_principal > 0),
    current_principal numeric(12,2) NOT NULL CHECK (current_principal >= 0),
    interest_rate numeric(5,2) NOT NULL CHECK (interest_rate >= 0), -- percentage
    due_date date,
    status text DEFAULT 'active' CHECK (status IN ('active', 'paid_off')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create payment history for loans to pay
CREATE TABLE loan_to_pay_payments (
    id bigserial PRIMARY KEY,
    loan_id integer NOT NULL REFERENCES loans_to_pay(id) ON DELETE CASCADE,
    principal_before numeric(12,2) NOT NULL,
    principal_paid numeric(12,2) NOT NULL CHECK (principal_paid > 0),
    principal_after numeric(12,2) NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for loans_to_pay
CREATE INDEX idx_loans_to_pay_user ON loans_to_pay (user_id, status);
CREATE INDEX idx_loan_to_pay_payments_loan ON loan_to_pay_payments (loan_id, payment_date DESC);
