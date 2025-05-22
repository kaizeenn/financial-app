-- Hapus data lama jika ada
TRUNCATE TABLE payment_methods;

-- Insert data metode pembayaran default
INSERT INTO payment_methods (method_name) VALUES 
('Tunai'),
('Transfer Bank'),
('Kartu Debit'),
('Kartu Kredit'),
('E-Wallet'),
('QRIS');
