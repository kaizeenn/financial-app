-- Hapus kolom payment_method_id yang lama dari tabel income
ALTER TABLE income DROP COLUMN payment_method_id;

-- Hapus kolom payment_method_id yang lama dari tabel expense
ALTER TABLE expense DROP COLUMN payment_method_id;

-- Tambah kolom payment_method_id yang baru ke tabel income
ALTER TABLE income 
ADD COLUMN payment_method_id int(11) DEFAULT NULL,
ADD CONSTRAINT income_payment_method_fk 
FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id);

-- Tambah kolom payment_method_id yang baru ke tabel expense
ALTER TABLE expense 
ADD COLUMN payment_method_id int(11) DEFAULT NULL,
ADD CONSTRAINT expense_payment_method_fk 
FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id);

-- Insert data metode pembayaran default jika belum ada
INSERT IGNORE INTO payment_methods (method_name) VALUES 
('Tunai'),
('Transfer Bank'),
('Kartu Debit'),
('Kartu Kredit'),
('E-Wallet'),
('QRIS');
