-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: May 24, 2025 at 07:58 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

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
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `user_id`, `name`, `balance`, `created_at`) VALUES
(4, 2, 'BRI', 2720000.00, '2025-05-22 17:08:29'),
(5, 2, 'Dana', 1459000.00, '2025-05-22 17:08:45'),
(9, 2, 'BANK Jago', 3500000.00, '2025-05-22 17:09:44');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('income','expense') NOT NULL
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
-- Table structure for table `expense`
--

CREATE TABLE `expense` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `entry_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_method_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expense`
--

INSERT INTO `expense` (`id`, `user_id`, `category_id`, `account_id`, `amount`, `description`, `entry_date`, `created_at`, `payment_method_id`) VALUES
(1, 2, 10, 9, 1232052.74, 'Transaksi Expense 259', '2025-01-13', '2025-05-24 05:38:27', 1),
(2, 2, 7, 5, 516038.48, 'Transaksi Expense 945', '2025-01-04', '2025-05-24 05:38:27', 2),
(3, 2, 9, 9, 1715840.29, 'Transaksi Expense 230', '2025-01-27', '2025-05-24 05:38:27', 2),
(4, 2, 9, 9, 1199410.48, 'Transaksi Expense 883', '2025-01-17', '2025-05-24 05:38:27', 3),
(5, 2, 8, 5, 388358.91, 'Transaksi Expense 172', '2025-01-24', '2025-05-24 05:38:27', 2),
(6, 2, 6, 5, 403801.68, 'Transaksi Expense 112', '2025-01-10', '2025-05-24 05:38:27', 1),
(7, 2, 6, 9, 1808398.31, 'Transaksi Expense 129', '2025-01-15', '2025-05-24 05:38:27', 2),
(8, 2, 6, 5, 1332441.52, 'Transaksi Expense 326', '2025-01-24', '2025-05-24 05:38:27', 3),
(9, 2, 10, 4, 1409849.69, 'Transaksi Expense 694', '2025-01-28', '2025-05-24 05:38:27', 2),
(10, 2, 6, 5, 434721.17, 'Transaksi Expense 378', '2025-01-28', '2025-05-24 05:38:27', 3),
(11, 2, 8, 4, 1262556.71, 'Transaksi Expense 860', '2025-01-28', '2025-05-24 05:38:27', 2),
(12, 2, 10, 4, 1453498.88, 'Transaksi Expense 519', '2025-01-27', '2025-05-24 05:38:27', 3),
(13, 2, 7, 4, 729749.62, 'Transaksi Expense 934', '2025-01-05', '2025-05-24 05:38:27', 2),
(14, 2, 10, 9, 380508.11, 'Transaksi Expense 502', '2025-01-16', '2025-05-24 05:38:27', 2),
(15, 2, 10, 4, 1218021.44, 'Transaksi Expense 512', '2025-01-29', '2025-05-24 05:38:27', 1),
(16, 2, 10, 4, 55863.96, 'Transaksi Expense 662', '2025-01-09', '2025-05-24 05:38:27', 2),
(17, 2, 7, 5, 196828.16, 'Transaksi Expense 725', '2025-01-29', '2025-05-24 05:38:27', 1),
(18, 2, 10, 4, 1736728.86, 'Transaksi Expense 720', '2025-01-19', '2025-05-24 05:38:27', 3),
(19, 2, 7, 4, 1738821.67, 'Transaksi Expense 282', '2025-01-08', '2025-05-24 05:38:27', 1),
(20, 2, 8, 5, 1751293.91, 'Transaksi Expense 671', '2025-01-14', '2025-05-24 05:38:27', 1),
(21, 2, 9, 5, 81553.29, 'Transaksi Expense 665', '2025-02-08', '2025-05-24 05:38:27', 2),
(22, 2, 8, 9, 681327.28, 'Transaksi Expense 977', '2025-02-11', '2025-05-24 05:38:27', 2),
(23, 2, 9, 9, 1278024.32, 'Transaksi Expense 355', '2025-02-11', '2025-05-24 05:38:27', 1),
(24, 2, 8, 5, 625960.26, 'Transaksi Expense 390', '2025-02-20', '2025-05-24 05:38:27', 2),
(25, 2, 8, 4, 75607.34, 'Transaksi Expense 271', '2025-02-17', '2025-05-24 05:38:27', 1),
(26, 2, 8, 4, 641013.34, 'Transaksi Expense 184', '2025-02-27', '2025-05-24 05:38:27', 3),
(27, 2, 8, 9, 1113865.79, 'Transaksi Expense 602', '2025-02-20', '2025-05-24 05:38:27', 1),
(28, 2, 9, 5, 138122.45, 'Transaksi Expense 471', '2025-02-07', '2025-05-24 05:38:27', 3),
(29, 2, 10, 9, 72455.87, 'Transaksi Expense 337', '2025-02-28', '2025-05-24 05:38:27', 1),
(30, 2, 9, 9, 297089.09, 'Transaksi Expense 254', '2025-02-19', '2025-05-24 05:38:27', 3),
(31, 2, 9, 5, 858476.94, 'Transaksi Expense 157', '2025-02-15', '2025-05-24 05:38:27', 3),
(32, 2, 8, 4, 434767.40, 'Transaksi Expense 365', '2025-02-14', '2025-05-24 05:38:27', 2),
(33, 2, 9, 4, 1223685.58, 'Transaksi Expense 457', '2025-02-10', '2025-05-24 05:38:27', 1),
(34, 2, 9, 9, 1936224.79, 'Transaksi Expense 304', '2025-02-25', '2025-05-24 05:38:27', 3),
(35, 2, 9, 5, 642913.95, 'Transaksi Expense 970', '2025-02-06', '2025-05-24 05:38:27', 3),
(36, 2, 10, 5, 935577.44, 'Transaksi Expense 383', '2025-02-26', '2025-05-24 05:38:27', 3),
(37, 2, 10, 5, 452983.62, 'Transaksi Expense 606', '2025-02-12', '2025-05-24 05:38:27', 1),
(38, 2, 9, 9, 1962719.59, 'Transaksi Expense 232', '2025-02-05', '2025-05-24 05:38:27', 3),
(39, 2, 7, 4, 1950805.16, 'Transaksi Expense 791', '2025-02-17', '2025-05-24 05:38:27', 2),
(40, 2, 10, 4, 1585942.77, 'Transaksi Expense 861', '2025-02-25', '2025-05-24 05:38:27', 3),
(41, 2, 7, 5, 599027.04, 'Transaksi Expense 287', '2025-03-04', '2025-05-24 05:38:27', 3),
(42, 2, 10, 5, 1669465.11, 'Transaksi Expense 884', '2025-03-16', '2025-05-24 05:38:27', 1),
(43, 2, 10, 4, 473439.65, 'Transaksi Expense 387', '2025-03-21', '2025-05-24 05:38:27', 2),
(44, 2, 6, 4, 1981019.52, 'Transaksi Expense 486', '2025-03-07', '2025-05-24 05:38:27', 2),
(45, 2, 9, 4, 1068310.61, 'Transaksi Expense 942', '2025-03-11', '2025-05-24 05:38:27', 3),
(46, 2, 10, 5, 813389.99, 'Transaksi Expense 617', '2025-03-27', '2025-05-24 05:38:27', 1),
(47, 2, 7, 4, 784060.33, 'Transaksi Expense 809', '2025-03-10', '2025-05-24 05:38:27', 3),
(48, 2, 8, 4, 815868.88, 'Transaksi Expense 161', '2025-03-28', '2025-05-24 05:38:27', 2),
(49, 2, 6, 5, 1292470.63, 'Transaksi Expense 661', '2025-03-05', '2025-05-24 05:38:27', 2),
(50, 2, 9, 4, 272463.32, 'Transaksi Expense 370', '2025-03-16', '2025-05-24 05:38:27', 2),
(51, 2, 8, 5, 1102608.81, 'Transaksi Expense 302', '2025-03-09', '2025-05-24 05:38:27', 2),
(52, 2, 10, 9, 89087.27, 'Transaksi Expense 646', '2025-03-08', '2025-05-24 05:38:27', 1),
(53, 2, 7, 4, 907410.01, 'Transaksi Expense 357', '2025-03-26', '2025-05-24 05:38:27', 3),
(54, 2, 8, 4, 885459.15, 'Transaksi Expense 832', '2025-03-09', '2025-05-24 05:38:27', 2),
(55, 2, 9, 4, 472429.64, 'Transaksi Expense 728', '2025-03-16', '2025-05-24 05:38:27', 3),
(56, 2, 7, 4, 707279.08, 'Transaksi Expense 560', '2025-03-15', '2025-05-24 05:38:27', 1),
(57, 2, 9, 9, 1503086.55, 'Transaksi Expense 647', '2025-03-08', '2025-05-24 05:38:27', 2),
(58, 2, 10, 5, 756803.76, 'Transaksi Expense 258', '2025-03-25', '2025-05-24 05:38:27', 2),
(59, 2, 9, 4, 1442183.87, 'Transaksi Expense 906', '2025-03-08', '2025-05-24 05:38:27', 2),
(60, 2, 10, 5, 681875.87, 'Transaksi Expense 333', '2025-03-12', '2025-05-24 05:38:27', 3),
(61, 2, 9, 5, 1984779.92, 'Transaksi Expense 436', '2025-04-16', '2025-05-24 05:38:27', 2),
(62, 2, 6, 9, 1524123.61, 'Transaksi Expense 116', '2025-04-07', '2025-05-24 05:38:27', 3),
(63, 2, 9, 4, 629699.54, 'Transaksi Expense 347', '2025-04-12', '2025-05-24 05:38:27', 1),
(64, 2, 6, 9, 1613144.09, 'Transaksi Expense 318', '2025-04-05', '2025-05-24 05:38:27', 2),
(65, 2, 8, 4, 1066995.66, 'Transaksi Expense 392', '2025-04-16', '2025-05-24 05:38:27', 3),
(66, 2, 9, 5, 541606.28, 'Transaksi Expense 660', '2025-04-13', '2025-05-24 05:38:27', 2),
(67, 2, 10, 5, 919292.75, 'Transaksi Expense 659', '2025-04-15', '2025-05-24 05:38:27', 2),
(68, 2, 6, 4, 1817416.22, 'Transaksi Expense 467', '2025-04-06', '2025-05-24 05:38:27', 1),
(69, 2, 6, 4, 1745911.10, 'Transaksi Expense 347', '2025-04-30', '2025-05-24 05:38:27', 1),
(70, 2, 6, 9, 1212553.84, 'Transaksi Expense 158', '2025-04-01', '2025-05-24 05:38:27', 1),
(71, 2, 10, 4, 1108868.67, 'Transaksi Expense 491', '2025-04-11', '2025-05-24 05:38:27', 2),
(72, 2, 6, 5, 1335762.22, 'Transaksi Expense 740', '2025-04-04', '2025-05-24 05:38:27', 2),
(73, 2, 7, 5, 284729.80, 'Transaksi Expense 915', '2025-04-25', '2025-05-24 05:38:27', 2),
(74, 2, 9, 4, 1431423.21, 'Transaksi Expense 996', '2025-04-19', '2025-05-24 05:38:27', 2),
(75, 2, 6, 9, 332559.54, 'Transaksi Expense 121', '2025-04-07', '2025-05-24 05:38:27', 2),
(76, 2, 7, 9, 924452.56, 'Transaksi Expense 463', '2025-04-01', '2025-05-24 05:38:27', 1),
(77, 2, 8, 4, 1110924.07, 'Transaksi Expense 306', '2025-04-09', '2025-05-24 05:38:27', 3),
(78, 2, 10, 4, 159467.68, 'Transaksi Expense 371', '2025-04-14', '2025-05-24 05:38:27', 2),
(79, 2, 10, 5, 104616.78, 'Transaksi Expense 352', '2025-04-15', '2025-05-24 05:38:27', 3),
(80, 2, 8, 4, 563651.00, 'Transaksi Expense 282', '2025-04-11', '2025-05-24 05:38:27', 1),
(81, 2, 7, 4, 1707936.81, 'Transaksi Expense 193', '2025-05-03', '2025-05-24 05:38:27', 1),
(82, 2, 6, 5, 848635.34, 'Transaksi Expense 470', '2025-05-13', '2025-05-24 05:38:27', 3),
(83, 2, 6, 5, 868663.23, 'Transaksi Expense 284', '2025-05-19', '2025-05-24 05:38:27', 3),
(84, 2, 10, 5, 1651767.74, 'Transaksi Expense 546', '2025-05-05', '2025-05-24 05:38:27', 2),
(85, 2, 8, 4, 1111709.49, 'Transaksi Expense 609', '2025-05-12', '2025-05-24 05:38:27', 2),
(86, 2, 7, 5, 816678.88, 'Transaksi Expense 762', '2025-05-16', '2025-05-24 05:38:27', 1),
(87, 2, 10, 9, 1835222.59, 'Transaksi Expense 533', '2025-05-24', '2025-05-24 05:38:27', 2),
(88, 2, 6, 9, 1224049.01, 'Transaksi Expense 682', '2025-05-25', '2025-05-24 05:38:27', 3),
(89, 2, 9, 5, 433112.02, 'Transaksi Expense 826', '2025-05-26', '2025-05-24 05:38:27', 1),
(90, 2, 6, 5, 1875834.25, 'Transaksi Expense 264', '2025-05-20', '2025-05-24 05:38:27', 1),
(91, 2, 7, 4, 1804063.76, 'Transaksi Expense 587', '2025-05-06', '2025-05-24 05:38:27', 3),
(92, 2, 6, 5, 1648448.80, 'Transaksi Expense 683', '2025-05-25', '2025-05-24 05:38:27', 1),
(93, 2, 8, 5, 206304.22, 'Transaksi Expense 435', '2025-05-22', '2025-05-24 05:38:27', 2),
(94, 2, 8, 9, 1422871.23, 'Transaksi Expense 735', '2025-05-10', '2025-05-24 05:38:27', 3),
(95, 2, 6, 9, 1115818.26, 'Transaksi Expense 510', '2025-05-25', '2025-05-24 05:38:27', 2),
(96, 2, 9, 4, 1098794.76, 'Transaksi Expense 645', '2025-05-30', '2025-05-24 05:38:27', 1),
(97, 2, 9, 5, 1767041.86, 'Transaksi Expense 730', '2025-05-24', '2025-05-24 05:38:27', 1),
(98, 2, 7, 9, 464302.42, 'Transaksi Expense 309', '2025-05-14', '2025-05-24 05:38:27', 2),
(99, 2, 9, 5, 1893902.31, 'Transaksi Expense 681', '2025-05-31', '2025-05-24 05:38:27', 2),
(100, 2, 6, 5, 510429.99, 'Transaksi Expense 705', '2025-05-09', '2025-05-24 05:38:27', 2);

-- --------------------------------------------------------

--
-- Table structure for table `income`
--

CREATE TABLE `income` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `entry_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_method_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `income`
--

INSERT INTO `income` (`id`, `user_id`, `category_id`, `account_id`, `amount`, `description`, `entry_date`, `created_at`, `payment_method_id`) VALUES
(1, 2, 4, 9, 1877869.66, 'Transaksi Income 355', '2025-01-19', '2025-05-24 05:38:27', 1),
(2, 2, 2, 9, 1668010.20, 'Transaksi Income 668', '2025-01-28', '2025-05-24 05:38:27', 1),
(3, 2, 1, 9, 225460.13, 'Transaksi Income 919', '2025-01-20', '2025-05-24 05:38:27', 2),
(4, 2, 5, 9, 798782.29, 'Transaksi Income 246', '2025-01-16', '2025-05-24 05:38:27', 3),
(5, 2, 5, 4, 487741.23, 'Transaksi Income 305', '2025-01-12', '2025-05-24 05:38:27', 3),
(6, 2, 1, 9, 1655429.41, 'Transaksi Income 266', '2025-01-09', '2025-05-24 05:38:27', 2),
(7, 2, 5, 4, 718662.45, 'Transaksi Income 982', '2025-01-15', '2025-05-24 05:38:27', 3),
(8, 2, 5, 5, 1057587.36, 'Transaksi Income 282', '2025-01-19', '2025-05-24 05:38:27', 1),
(9, 2, 4, 5, 1895563.29, 'Transaksi Income 796', '2025-01-11', '2025-05-24 05:38:27', 2),
(10, 2, 3, 9, 1997415.00, 'Transaksi Income 460', '2025-01-22', '2025-05-24 05:38:27', 3),
(11, 2, 5, 5, 960684.27, 'Transaksi Income 904', '2025-01-31', '2025-05-24 05:38:27', 1),
(12, 2, 2, 9, 1636049.79, 'Transaksi Income 974', '2025-01-24', '2025-05-24 05:38:27', 3),
(13, 2, 2, 9, 1834616.02, 'Transaksi Income 379', '2025-01-24', '2025-05-24 05:38:27', 1),
(14, 2, 3, 4, 418058.89, 'Transaksi Income 179', '2025-01-05', '2025-05-24 05:38:27', 2),
(15, 2, 1, 5, 801969.20, 'Transaksi Income 325', '2025-01-25', '2025-05-24 05:38:27', 2),
(16, 2, 2, 4, 503361.11, 'Transaksi Income 758', '2025-01-02', '2025-05-24 05:38:27', 3),
(17, 2, 5, 4, 1208133.80, 'Transaksi Income 652', '2025-01-22', '2025-05-24 05:38:27', 3),
(18, 2, 1, 5, 664679.54, 'Transaksi Income 840', '2025-01-22', '2025-05-24 05:38:27', 3),
(19, 2, 2, 9, 1328835.77, 'Transaksi Income 113', '2025-01-13', '2025-05-24 05:38:27', 2),
(20, 2, 3, 9, 999779.03, 'Transaksi Income 235', '2025-01-24', '2025-05-24 05:38:27', 3),
(21, 2, 4, 5, 1421523.92, 'Transaksi Income 722', '2025-02-08', '2025-05-24 05:38:27', 1),
(22, 2, 5, 5, 91729.57, 'Transaksi Income 578', '2025-02-01', '2025-05-24 05:38:27', 3),
(23, 2, 4, 4, 1984362.06, 'Transaksi Income 152', '2025-02-03', '2025-05-24 05:38:27', 2),
(24, 2, 2, 4, 681288.07, 'Transaksi Income 927', '2025-02-09', '2025-05-24 05:38:27', 1),
(25, 2, 5, 9, 207385.63, 'Transaksi Income 977', '2025-02-05', '2025-05-24 05:38:27', 2),
(26, 2, 5, 4, 756514.34, 'Transaksi Income 179', '2025-02-05', '2025-05-24 05:38:27', 1),
(27, 2, 2, 9, 738299.77, 'Transaksi Income 954', '2025-02-01', '2025-05-24 05:38:27', 3),
(28, 2, 1, 9, 715208.47, 'Transaksi Income 658', '2025-02-11', '2025-05-24 05:38:27', 3),
(29, 2, 1, 5, 162270.70, 'Transaksi Income 852', '2025-02-05', '2025-05-24 05:38:27', 2),
(30, 2, 1, 5, 1507301.24, 'Transaksi Income 561', '2025-02-14', '2025-05-24 05:38:27', 3),
(31, 2, 5, 9, 869603.48, 'Transaksi Income 495', '2025-02-24', '2025-05-24 05:38:27', 1),
(32, 2, 3, 9, 522624.43, 'Transaksi Income 459', '2025-02-14', '2025-05-24 05:38:27', 3),
(33, 2, 3, 5, 255282.46, 'Transaksi Income 121', '2025-02-26', '2025-05-24 05:38:27', 1),
(34, 2, 3, 4, 1947358.20, 'Transaksi Income 213', '2025-02-19', '2025-05-24 05:38:27', 2),
(35, 2, 5, 4, 1842264.71, 'Transaksi Income 412', '2025-02-25', '2025-05-24 05:38:27', 2),
(36, 2, 2, 9, 360161.21, 'Transaksi Income 403', '2025-02-09', '2025-05-24 05:38:27', 3),
(37, 2, 5, 4, 1553245.89, 'Transaksi Income 994', '2025-02-15', '2025-05-24 05:38:27', 3),
(38, 2, 1, 9, 1141114.53, 'Transaksi Income 630', '2025-02-03', '2025-05-24 05:38:27', 2),
(39, 2, 4, 5, 359052.18, 'Transaksi Income 701', '2025-02-18', '2025-05-24 05:38:27', 3),
(40, 2, 4, 4, 1579226.25, 'Transaksi Income 762', '2025-02-01', '2025-05-24 05:38:27', 1),
(41, 2, 5, 5, 542347.56, 'Transaksi Income 976', '2025-03-21', '2025-05-24 05:38:27', 1),
(42, 2, 3, 5, 1895035.84, 'Transaksi Income 510', '2025-03-17', '2025-05-24 05:38:27', 1),
(43, 2, 2, 4, 1444365.85, 'Transaksi Income 552', '2025-03-20', '2025-05-24 05:38:27', 3),
(44, 2, 1, 5, 120895.91, 'Transaksi Income 744', '2025-03-31', '2025-05-24 05:38:27', 1),
(45, 2, 4, 5, 1981996.36, 'Transaksi Income 864', '2025-03-21', '2025-05-24 05:38:27', 1),
(46, 2, 5, 5, 806545.02, 'Transaksi Income 778', '2025-03-07', '2025-05-24 05:38:27', 2),
(47, 2, 3, 5, 692227.11, 'Transaksi Income 848', '2025-03-01', '2025-05-24 05:38:27', 2),
(48, 2, 4, 4, 1118663.71, 'Transaksi Income 900', '2025-03-08', '2025-05-24 05:38:27', 1),
(49, 2, 2, 9, 1538697.77, 'Transaksi Income 335', '2025-03-30', '2025-05-24 05:38:27', 2),
(50, 2, 3, 5, 749513.84, 'Transaksi Income 553', '2025-03-26', '2025-05-24 05:38:27', 3),
(51, 2, 4, 5, 923875.07, 'Transaksi Income 651', '2025-03-26', '2025-05-24 05:38:27', 1),
(52, 2, 1, 5, 1957925.91, 'Transaksi Income 716', '2025-03-14', '2025-05-24 05:38:27', 2),
(53, 2, 2, 4, 1153815.49, 'Transaksi Income 921', '2025-03-29', '2025-05-24 05:38:27', 1),
(54, 2, 2, 9, 491698.55, 'Transaksi Income 673', '2025-03-14', '2025-05-24 05:38:27', 2),
(55, 2, 3, 5, 265593.44, 'Transaksi Income 903', '2025-03-07', '2025-05-24 05:38:27', 2),
(56, 2, 1, 9, 1192040.31, 'Transaksi Income 676', '2025-03-25', '2025-05-24 05:38:27', 2),
(57, 2, 5, 9, 967279.54, 'Transaksi Income 794', '2025-03-05', '2025-05-24 05:38:27', 2),
(58, 2, 3, 5, 809279.91, 'Transaksi Income 436', '2025-03-17', '2025-05-24 05:38:27', 2),
(59, 2, 2, 5, 198321.03, 'Transaksi Income 478', '2025-03-30', '2025-05-24 05:38:27', 3),
(60, 2, 1, 4, 133559.60, 'Transaksi Income 772', '2025-03-04', '2025-05-24 05:38:27', 2),
(61, 2, 2, 5, 881265.08, 'Transaksi Income 146', '2025-04-01', '2025-05-24 05:38:27', 3),
(62, 2, 2, 4, 1499075.33, 'Transaksi Income 113', '2025-04-13', '2025-05-24 05:38:27', 3),
(63, 2, 3, 4, 1506730.89, 'Transaksi Income 935', '2025-04-14', '2025-05-24 05:38:27', 2),
(64, 2, 2, 9, 1621840.37, 'Transaksi Income 116', '2025-04-17', '2025-05-24 05:38:27', 1),
(65, 2, 4, 5, 886813.44, 'Transaksi Income 491', '2025-04-15', '2025-05-24 05:38:27', 3),
(66, 2, 4, 9, 1518561.64, 'Transaksi Income 829', '2025-04-24', '2025-05-24 05:38:27', 3),
(67, 2, 4, 9, 983234.81, 'Transaksi Income 592', '2025-04-18', '2025-05-24 05:38:27', 3),
(68, 2, 4, 5, 252054.92, 'Transaksi Income 828', '2025-04-28', '2025-05-24 05:38:27', 2),
(69, 2, 5, 5, 555581.87, 'Transaksi Income 739', '2025-04-15', '2025-05-24 05:38:27', 1),
(70, 2, 5, 9, 1552235.85, 'Transaksi Income 742', '2025-04-22', '2025-05-24 05:38:27', 1),
(71, 2, 5, 4, 450846.58, 'Transaksi Income 255', '2025-04-05', '2025-05-24 05:38:27', 1),
(72, 2, 2, 4, 179906.28, 'Transaksi Income 949', '2025-04-15', '2025-05-24 05:38:27', 3),
(73, 2, 3, 5, 279983.77, 'Transaksi Income 338', '2025-04-15', '2025-05-24 05:38:27', 1),
(74, 2, 3, 4, 571502.06, 'Transaksi Income 765', '2025-04-20', '2025-05-24 05:38:27', 1),
(75, 2, 2, 5, 127383.43, 'Transaksi Income 862', '2025-04-11', '2025-05-24 05:38:27', 2),
(76, 2, 1, 5, 1510123.79, 'Transaksi Income 603', '2025-04-04', '2025-05-24 05:38:27', 3),
(77, 2, 2, 9, 1130730.00, 'Transaksi Income 258', '2025-04-20', '2025-05-24 05:38:27', 2),
(78, 2, 1, 5, 1536055.26, 'Transaksi Income 955', '2025-04-25', '2025-05-24 05:38:27', 3),
(79, 2, 5, 5, 1234599.25, 'Transaksi Income 485', '2025-04-15', '2025-05-24 05:38:27', 2),
(80, 2, 5, 4, 1261683.01, 'Transaksi Income 736', '2025-04-12', '2025-05-24 05:38:27', 2),
(81, 2, 3, 9, 1791990.78, 'Transaksi Income 331', '2025-05-01', '2025-05-24 05:38:27', 2),
(82, 2, 4, 5, 163607.71, 'Transaksi Income 694', '2025-05-03', '2025-05-24 05:38:27', 1),
(83, 2, 4, 5, 153191.05, 'Transaksi Income 257', '2025-05-22', '2025-05-24 05:38:27', 2),
(84, 2, 3, 9, 1055768.29, 'Transaksi Income 486', '2025-05-04', '2025-05-24 05:38:27', 3),
(85, 2, 2, 5, 1406618.48, 'Transaksi Income 478', '2025-05-31', '2025-05-24 05:38:27', 2),
(86, 2, 5, 9, 218775.35, 'Transaksi Income 423', '2025-05-24', '2025-05-24 05:38:27', 3),
(87, 2, 1, 5, 1535265.89, 'Transaksi Income 830', '2025-05-19', '2025-05-24 05:38:27', 1),
(88, 2, 4, 9, 685971.66, 'Transaksi Income 887', '2025-05-16', '2025-05-24 05:38:27', 3),
(89, 2, 3, 5, 1632808.70, 'Transaksi Income 922', '2025-05-27', '2025-05-24 05:38:27', 1),
(90, 2, 3, 9, 1691921.41, 'Transaksi Income 744', '2025-05-14', '2025-05-24 05:38:27', 2),
(91, 2, 3, 4, 901213.89, 'Transaksi Income 334', '2025-05-09', '2025-05-24 05:38:27', 3),
(92, 2, 5, 4, 1513520.34, 'Transaksi Income 305', '2025-05-31', '2025-05-24 05:38:27', 2),
(93, 2, 3, 9, 1875049.84, 'Transaksi Income 124', '2025-05-18', '2025-05-24 05:38:27', 3),
(94, 2, 3, 5, 437791.52, 'Transaksi Income 600', '2025-05-08', '2025-05-24 05:38:27', 2),
(95, 2, 5, 9, 537477.04, 'Transaksi Income 723', '2025-05-27', '2025-05-24 05:38:27', 3),
(96, 2, 4, 9, 775200.86, 'Transaksi Income 592', '2025-05-17', '2025-05-24 05:38:27', 3),
(97, 2, 3, 9, 1102579.97, 'Transaksi Income 536', '2025-05-19', '2025-05-24 05:38:27', 3),
(98, 2, 5, 5, 510652.19, 'Transaksi Income 909', '2025-05-21', '2025-05-24 05:38:27', 1),
(99, 2, 5, 5, 1719921.46, 'Transaksi Income 492', '2025-05-07', '2025-05-24 05:38:27', 3),
(100, 2, 2, 9, 491881.52, 'Transaksi Income 519', '2025-05-27', '2025-05-24 05:38:27', 3);

-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--

CREATE TABLE `payment_methods` (
  `id` int(11) NOT NULL,
  `method_name` varchar(100) NOT NULL
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
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('fWzekjVCu45aspT7AoCgvuP59oia3OaY', 1747738262, '{\"cookie\":{\"originalMaxAge\":3600000,\"expires\":\"2025-05-20T10:50:18.509Z\",\"httpOnly\":true,\"path\":\"/\"},\"userId\":1,\"username\":\"atmin\"}');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `created_at`) VALUES
(2, 'atmin', 'atmin@gmail.com', '$2b$10$8u2uqkLGS2XZ5ETjfaP68.23PYjO/bHNcGGxlegYFt0TH1e1G2slO', '2025-05-20 11:48:06');

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `expense`
--
ALTER TABLE `expense`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;

--
-- AUTO_INCREMENT for table `income`
--
ALTER TABLE `income`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounts`
--
ALTER TABLE `accounts`
  ADD CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
