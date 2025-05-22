-- Drop existing payment_methods table if exists
DROP TABLE IF EXISTS payment_methods;

-- Create payment_methods table similar to categories
CREATE TABLE payment_methods (
  id int(11) NOT NULL AUTO_INCREMENT,
  method_name varchar(100) NOT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY (method_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default payment methods data
INSERT INTO payment_methods (method_name) VALUES
('Tunai'),
('Transfer Bank'),
('Kartu Debit'),
('Kartu Kredit'),
('E-Wallet'),
('QRIS');
