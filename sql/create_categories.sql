-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
  id int(11) NOT NULL AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  type enum('income','expense') NOT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default income categories
INSERT INTO categories (name, type) VALUES
('Gaji', 'income'),
('Bonus', 'income'),
('Investasi', 'income'),
('Penjualan', 'income'),
('Hadiah', 'income');

-- Insert default expense categories
INSERT INTO categories (name, type) VALUES
('Makanan & Minuman', 'expense'),
('Transportasi', 'expense'),
('Belanja', 'expense'),
('Tagihan', 'expense'),
('Hiburan', 'expense'),
('Kesehatan', 'expense'),
('Pendidikan', 'expense');
