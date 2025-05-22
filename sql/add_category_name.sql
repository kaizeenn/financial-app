-- Add category_name column to expense table
ALTER TABLE expense
ADD COLUMN category_name varchar(100) DEFAULT NULL;

-- Add category_name column to income table
ALTER TABLE income
ADD COLUMN category_name varchar(100) DEFAULT NULL;
