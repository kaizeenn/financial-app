-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 29, 2025 at 10:22 AM
-- Server version: 8.0.30
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `catatan`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `user_id`, `name`, `balance`, `created_at`) VALUES
(10, 4, 'Bank BCA', '7800000.00', '2025-10-25 01:00:00'),
(11, 4, 'E-Wallet Dana', '4500000.00', '2025-10-25 01:00:00'),
(12, 4, 'Tabungan Mandiri', '6550000.00', '2025-10-25 01:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `type` enum('income','expense') COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `type`) VALUES
(1, 'Gaji', 'income'),
(2, 'Bonus', 'income'),
(3, 'Investasi', 'income'),
(4, 'Penjualan', 'income'),
(5, 'Hadiah', 'income'),
(6, 'Makanan & Minuman', 'expense'),
(7, 'Transportasi', 'expense'),
(8, 'Belanja', 'expense'),
(9, 'Tagihan', 'expense'),
(10, 'Hiburan', 'expense'),
(11, 'Kesehatan', 'expense'),
(12, 'Pendidikan', 'expense');

-- --------------------------------------------------------

--
-- Table structure for table `credit_categories`
--

CREATE TABLE `credit_categories` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `credit_categories`
--

INSERT INTO `credit_categories` (`id`, `name`) VALUES
(1, 'Piutang Dagang'),
(2, 'Piutang Teman'),
(3, 'Piutang Karyawan'),
(4, 'Sewa Belum Dibayar'),
(5, 'Penjualan Belum Lunas'),
(6, 'Piutang Usaha'),
(7, 'Uang Dipinjam Orang'),
(8, 'Deposit'),
(9, 'Pembayaran Tertunda'),
(10, 'Piutang Lainnya');

-- --------------------------------------------------------

--
-- Table structure for table `debts`
--

CREATE TABLE `debts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` enum('debt','credit') COLLATE utf8mb4_general_ci NOT NULL COMMENT 'debt = hutang, credit = piutang',
  `creditor_debtor_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'nama pemberi hutang atau penerima piutang',
  `amount` decimal(15,2) NOT NULL,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT '0.00' COMMENT 'jumlah yang sudah dibayar',
  `remaining_amount` decimal(15,2) GENERATED ALWAYS AS ((`amount` - `paid_amount`)) STORED,
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('pending','partial','paid','overdue') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `account_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `debt_category_id` int DEFAULT NULL,
  `credit_category_id` int DEFAULT NULL,
  `last_payment_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `debts`
--

INSERT INTO `debts` (`id`, `user_id`, `type`, `creditor_debtor_name`, `amount`, `paid_amount`, `description`, `due_date`, `status`, `account_id`, `created_at`, `updated_at`, `debt_category_id`, `credit_category_id`, `last_payment_date`) VALUES
(5, 4, 'debt', 'PT Sariwangi Agricultural Estate Agency (SAEA):', '20000000.00', '1000000.00', '', '2026-03-31', 'partial', NULL, '2025-11-20 10:26:41', '2025-11-21 01:24:49', 2, NULL, NULL),
(6, 4, 'debt', 'Paylater', '1000000.00', '1000000.00', '', '2025-12-31', 'paid', NULL, '2025-11-21 01:30:52', '2025-11-29 09:16:50', 7, NULL, NULL),
(7, 4, 'credit', 'Anggris', '300000.00', '100000.00', '', '2025-12-31', 'partial', NULL, '2025-11-21 01:31:33', '2025-11-21 01:31:58', NULL, 2, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `debt_categories`
--

CREATE TABLE `debt_categories` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `debt_categories`
--

INSERT INTO `debt_categories` (`id`, `name`) VALUES
(1, 'Pinjaman Bank'),
(2, 'Kredit Motor'),
(3, 'Kredit Mobil'),
(4, 'Pinjaman Teman'),
(5, 'Kartu Kredit'),
(6, 'Utang Toko'),
(7, 'Pinjaman Online'),
(8, 'Cicilan Barang'),
(9, 'Utang Medis'),
(10, 'Utang Usaha');

-- --------------------------------------------------------

--
-- Table structure for table `debt_payments`
--

CREATE TABLE `debt_payments` (
  `id` int NOT NULL,
  `debt_id` int NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` date NOT NULL,
  `account_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `debt_payments`
--

INSERT INTO `debt_payments` (`id`, `debt_id`, `amount`, `payment_date`, `account_id`, `created_at`) VALUES
(1, 5, '1000000.00', '2025-11-21', 12, '2025-11-21 01:24:49'),
(2, 7, '100000.00', '2025-11-21', 11, '2025-11-21 01:31:58'),
(3, 6, '1000000.00', '2025-11-29', 12, '2025-11-29 09:16:50');

-- --------------------------------------------------------

--
-- Table structure for table `expense`
--

CREATE TABLE `expense` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `account_id` int DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `entry_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_method_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expense`
--

INSERT INTO `expense` (`id`, `user_id`, `category_id`, `account_id`, `amount`, `description`, `entry_date`, `created_at`, `payment_method_id`) VALUES
(101, 4, 6, 11, '65000.00', 'Makan Siang Kantor', '2025-10-25', '2025-10-25 05:00:00', 5),
(102, 4, 7, 10, '150000.00', 'Bensin & Parkir', '2025-10-26', '2025-10-26 11:00:00', 1),
(103, 4, 8, 11, '300000.00', 'Belanja Bulanan di Alfamart', '2025-10-27', '2025-10-27 09:00:00', 6),
(104, 4, 9, 10, '450000.00', 'Bayar Tagihan Listrik PLN', '2025-10-28', '2025-10-28 03:00:00', 2),
(105, 4, 10, 11, '100000.00', 'Nonton Bioskop', '2025-10-29', '2025-10-29 12:00:00', 5),
(106, 4, 11, 10, '120000.00', 'Beli Obat Flu', '2025-10-30', '2025-10-30 02:30:00', 5),
(107, 4, 12, 12, '200000.00', 'Kursus Online', '2025-10-29', '2025-10-31 01:45:00', 2),
(110, 4, 8, 10, '200000.00', 'beli baju\n', '2025-11-07', '2025-11-07 03:30:47', 2);

-- --------------------------------------------------------

--
-- Table structure for table `income`
--

CREATE TABLE `income` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `account_id` int DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `entry_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_method_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `income`
--

INSERT INTO `income` (`id`, `user_id`, `category_id`, `account_id`, `amount`, `description`, `entry_date`, `created_at`, `payment_method_id`) VALUES
(101, 4, 1, 10, '7500000.00', 'Gaji Akhir Bulan Oktober', '2025-10-25', '2025-10-25 03:30:00', 2),
(102, 4, 2, 10, '1000000.00', 'Bonus Penjualan Mingguan', '2025-10-26', '2025-10-26 02:00:00', 2),
(103, 4, 3, 12, '500000.00', 'Dividen Investasi Saham', '2025-10-27', '2025-10-27 01:00:00', 2),
(104, 4, 4, 11, '300000.00', 'Penjualan Barang Bekas Online', '2025-10-29', '2025-10-29 04:00:00', 6),
(105, 4, 5, 11, '200000.00', 'Hadiah dari Teman', '2025-10-31', '2025-10-31 07:00:00', 5),
(106, 4, 1, 12, '3000000.00', 'gaji di bulan ini', '2025-11-04', '2025-11-04 02:23:01', 2),
(107, 4, 2, 11, '3000000.00', 'gaji', '2025-11-07', '2025-11-07 06:34:23', 2);

-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--

CREATE TABLE `payment_methods` (
  `id` int NOT NULL,
  `method_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_methods`
--

INSERT INTO `payment_methods` (`id`, `method_name`) VALUES
(5, 'E-Wallet'),
(3, 'Kartu Debit'),
(4, 'Kartu Kredit'),
(6, 'QRIS'),
(2, 'Transfer Bank'),
(1, 'Tunai');

-- --------------------------------------------------------

--
-- Table structure for table `recurring_transactions`
--

CREATE TABLE `recurring_transactions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `category_id` int DEFAULT NULL,
  `account_id` int DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `frequency` enum('daily','weekly','monthly','yearly') NOT NULL,
  `next_run_date` date NOT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `recurring_transactions`
--

INSERT INTO `recurring_transactions` (`id`, `user_id`, `type`, `category_id`, `account_id`, `amount`, `description`, `frequency`, `next_run_date`, `active`, `created_at`) VALUES
(1, 4, 'income', 1, 10, '3000000.00', '', 'monthly', '2025-11-01', 1, '2025-11-20 12:08:04');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `level` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `level`, `created_at`) VALUES
(1, 'atmin', 'atmin@gmail.com', '$2a$10$Y/lquhBB7CFx/X6BxhnPMeII59Xqwk05JPToC4n1GX06fHlzF.zAq', 1, '2025-11-03 12:22:55'),
(4, 'iril', 'khairil@gmail.com', '$2a$10$zT4ExfLEOJKQ2UZiySVzw.jcvqshlRBF9tFu0VzMooVchO..jsmue', 2, '2025-10-30 11:01:49');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `credit_categories`
--
ALTER TABLE `credit_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `debts`
--
ALTER TABLE `debts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `fk_debt_category` (`debt_category_id`),
  ADD KEY `fk_credit_category` (`credit_category_id`);

--
-- Indexes for table `debt_categories`
--
ALTER TABLE `debt_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `debt_payments`
--
ALTER TABLE `debt_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `debt_id` (`debt_id`),
  ADD KEY `account_id` (`account_id`);

--
-- Indexes for table `expense`
--
ALTER TABLE `expense`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `expense_payment_method_fk` (`payment_method_id`);

--
-- Indexes for table `income`
--
ALTER TABLE `income`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `income_payment_method_fk` (`payment_method_id`);

--
-- Indexes for table `payment_methods`
--
ALTER TABLE `payment_methods`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `method_name` (`method_name`);

--
-- Indexes for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `account_id` (`account_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `credit_categories`
--
ALTER TABLE `credit_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `debts`
--
ALTER TABLE `debts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `debt_categories`
--
ALTER TABLE `debt_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `debt_payments`
--
ALTER TABLE `debt_payments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `expense`
--
ALTER TABLE `expense`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `income`
--
ALTER TABLE `income`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=109;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounts`
--
ALTER TABLE `accounts`
  ADD CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `debts`
--
ALTER TABLE `debts`
  ADD CONSTRAINT `fk_credit_category` FOREIGN KEY (`credit_category_id`) REFERENCES `credit_categories` (`id`),
  ADD CONSTRAINT `fk_debt_category` FOREIGN KEY (`debt_category_id`) REFERENCES `debt_categories` (`id`);

--
-- Constraints for table `debt_payments`
--
ALTER TABLE `debt_payments`
  ADD CONSTRAINT `debt_payments_ibfk_1` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`),
  ADD CONSTRAINT `debt_payments_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`);

--
-- Constraints for table `expense`
--
ALTER TABLE `expense`
  ADD CONSTRAINT `expense_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `expense_ibfk_3` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`),
  ADD CONSTRAINT `expense_payment_method_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  ADD CONSTRAINT `fk_expense_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

--
-- Constraints for table `income`
--
ALTER TABLE `income`
  ADD CONSTRAINT `fk_income_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `income_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `income_ibfk_3` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`),
  ADD CONSTRAINT `income_payment_method_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`);

--
-- Constraints for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  ADD CONSTRAINT `recurring_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `recurring_transactions_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `recurring_transactions_ibfk_3` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
