# Financial-App

## Deskripsi  
Financial-App adalah aplikasi untuk membantu pengguna mengelola keuangan pribadi / finansial — mencatat pemasukan & pengeluaran, mengelola data keuangan, dan memudahkan pengguna dalam melihat ringkasan finansial.  

## Fitur Utama  
- Tambah pemasukan & pengeluaran  
- Simpan data transaksi (tanggal, kategori, nominal, deskripsi)  
- Melihat daftar transaksi  
- Fitur edit / hapus transaksi  
- Ringkasan keuangan (misalnya total pemasukan, total pengeluaran, saldo bersih)  
- (Opsional) Filter / pencarian berdasarkan tanggal atau kategori  

## Teknologi / Stack  
- Node.js & Express (backend)  
- EJS / HTML + CSS + JS (frontend)  
- Database: MySQL
- Struktur folder: `src/`, `routes/`, `views/`, `public/`, dll.  

## Investasi (Crypto & Emas)
Modul investasi memungkinkan penyimpanan aset crypto (provider: CoinGecko) dan emas (provider: MetalPriceAPI). Data aset tersimpan di tabel `investment_assets`, sedangkan kepemilikan pengguna di `investment_portfolio`.

### Harga Realtime
- Crypto: diambil dari CoinGecko endpoint `simple/price` (IDR & USD).
- Emas: diambil dari MetalPriceAPI endpoint:
	`https://api.metalpriceapi.com/v1/latest?api_key=METALAPI_KEY&base=USD&symbols=XAU`
	Logika harga USD per troy ounce: `1 / rates.XAU` sesuai spesifikasi.

### Konversi IDR
- Menggunakan `USD_IDR_RATE` dari `.env` jika tersedia.
- Jika tidak ada, fallback ambil kurs dari `https://api.exchangerate.host/latest?base=USD&symbols=IDR`.
- Jika itu gagal, fallback nilai tetap 15000.

### Variabel Lingkungan
Tambahkan ke file `.env` (jangan commit ke repo):
```
METALAPI_KEY=YOUR_METALPRICEAPI_KEY
USD_IDR_RATE=15500        # opsional, untuk konversi cepat
```
`GOLDAPI_TOKEN` sudah tidak lagi digunakan setelah migrasi ke MetalPriceAPI (hapus dari .env bila masih ada).

### Contoh Respons Harga Emas
```
{
	"usd": 2024.50,
	"idr": 30367500,
	"rate": 0.0004941
}
```

### Endpoint Harga Aset
`GET /invest/get-price?asset_id=<id>`
- Mengembalikan JSON price realtime untuk aset crypto atau emas.

### Satuan Input
- Crypto disimpan dalam satuan koin.
- Emas disimpan dalam satuan troy ounce; jika pengguna input gram, sistem otomatis konversi (1 ozt = 31.1034768 g). Kolom `input_unit` menyimpan satuan asli yang diinput.

## Migrasi GoldAPI ke MetalPriceAPI
Gunakan skrip: `node scripts/migrate_gold_to_metal.js`
Langkah yang dilakukan:
- Menambahkan kolom `input_unit` (jika belum ada) ke tabel `investment_portfolio`.
- Mengubah semua baris `provider_source='goldapi'` menjadi `yellow_metal`.
- Bersihkan `GOLDAPI_TOKEN` dari `.env`.

Perintah:
```bash
node scripts/migrate_gold_to_metal.js
```
Pastikan koneksi database di `config/db.js` sudah benar sebelum menjalankan.

## Persyaratan (Requirements)  
- Database MySQL
- (Opsional) Paket npm: lihat `package.json`  

## Instalasi & Setup Lokal  
```bash
git clone https://github.com/kaizeenn/financial-app.git  
cd financial-app  
npm install  
# jika menggunakan database: konfigurasi koneksi di config / .env  
npm start  
