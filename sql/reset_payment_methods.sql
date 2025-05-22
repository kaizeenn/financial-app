-- Nonaktifkan foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Hapus constraint foreign key pada tabel income dan expense yang mengacu ke payment_methods
ALTER TABLE income DROP FOREIGN KEY income_payment_method_fk;
ALTER TABLE expense DROP FOREIGN KEY expense_payment_method_fk;

-- Hapus kolom payment_method_id dari income dan expense
ALTER TABLE income DROP COLUMN payment_method_id;
ALTER TABLE expense DROP COLUMN payment_method_id;

-- Hapus tabel payment_methods
DROP TABLE IF EXISTS payment_methods;

-- Buat ulang tabel payment_methods
CREATE TABLE payment_methods (
  id int(11) NOT NULL AUTO_INCREMENT,
  method_name varchar(100) NOT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY (method_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Masukkan data default payment methods
INSERT INTO payment_methods (method_name) VALUES
('Tunai'),
('Transfer Bank'),
('Kartu Debit'),
('Kartu Kredit'),
('E-Wallet'),
('QRIS');

-- Tambah kolom payment_method_id kembali ke income dan expense dengan foreign key
ALTER TABLE income 
ADD COLUMN payment_method_id int(11) DEFAULT NULL,
ADD CONSTRAINT income_payment_method_fk 
FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id);

ALTER TABLE expense 
ADD COLUMN payment_method_id int(11) DEFAULT NULL,
ADD CONSTRAINT expense_payment_method_fk 
FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id);

-- Aktifkan kembali foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
