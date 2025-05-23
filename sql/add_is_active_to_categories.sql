-- Add is_active column to categories table to represent release/active status
ALTER TABLE categories
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
