# Troubleshooting - Server Tidak Bisa Jalan

## Cek Masalah Umum

### 1. Port Sudah Digunakan

Jika port 3000 sudah digunakan:

```powershell
# Cek proses yang menggunakan port 3000
netstat -ano | findstr :3000

# Atau ubah port di vite.config.js
```

Edit `vite.config.js`:
```js
server: {
  port: 3001, // atau port lain yang tersedia
}
```

### 2. Error Compile/Import

Jika ada error saat compile:

```powershell
# Clear cache dan install ulang
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .vite
npm install
npm run dev
```

### 3. Error Wagmi/RainbowKit

Jika ada error terkait wagmi atau RainbowKit:

```powershell
# Update dependencies
npm install wagmi@latest viem@latest @rainbow-me/rainbowkit@latest
npm run dev
```

### 4. Error Environment Variables

Pastikan file `.env` ada dan isinya benar:

```powershell
# Cek file .env
Get-Content .env

# Jika tidak ada, copy dari env.example.txt
Copy-Item env.example.txt .env
```

### 5. Browser Console Error

Buka browser console (F12) dan cek error:
- Jika ada error CORS → pastikan RPC URL benar
- Jika ada error module → clear cache browser
- Jika ada error network → cek koneksi internet

## Jalankan Manual dengan Output Error

Untuk melihat error detail:

```powershell
cd frontend
npm run dev
```

Jangan tutup terminal, biarkan error message muncul.

## Alternatif: Gunakan Port Lain

Jika masalah port:

1. Edit `vite.config.js`
2. Ubah port ke 5173 (default Vite) atau port lain
3. Restart server

## Cek Log Error

Cek apakah ada file error log:
- Browser console (F12)
- Terminal output
- Network tab di browser DevTools

Jika masih error, kirimkan screenshot error message atau copy error text.



