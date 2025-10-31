# 🔧 Install GitHub CLI & Upload ke GitHub

## STEP 1: Install GitHub CLI

### Windows (PowerShell)

Buka PowerShell sebagai Administrator, lalu jalankan:

```powershell
# Install via winget (Windows 10/11)
winget install --id GitHub.cli

# Atau download manual dari:
# https://github.com/cli/cli/releases/latest
# Download: gh_windows_amd64.msi
# Install dengan double-click
```

**Atau download manual:**
1. Buka: https://github.com/cli/cli/releases/latest
2. Download: `gh_windows_amd64.msi`
3. Double-click untuk install
4. **Restart terminal/PowerShell** setelah install

### Verifikasi Install

```powershell
gh --version
```

Jika muncul versi, berarti sudah terinstall!

## STEP 2: Login ke GitHub

Setelah GitHub CLI terinstall, jalankan:

```powershell
gh auth login
```

Ini akan menanyakan beberapa pertanyaan:

1. **What account do you want to log into?**
   - Pilih: `GitHub.com`

2. **What is your preferred protocol for Git operations?**
   - Pilih: `HTTPS` (lebih mudah)

3. **Authenticate Git credential helper?**
   - Pilih: `Yes`

4. **How would you like to authenticate GitHub CLI?**
   - Pilih: `Login with a web browser` (paling mudah)

5. Browser akan terbuka, klik "Authorize GitHub"
6. Copy kode yang muncul, paste di terminal
7. Login berhasil! ✅

## STEP 3: Upload Project ke GitHub

Setelah login, jalankan perintah berikut:

```powershell
# Masuk ke folder project
cd C:\Users\Administrator\Pictures\pet

# Inisialisasi Git (jika belum)
git init

# Tambahkan semua file
git add .

# Buat commit pertama
git commit -m "Initial commit: FROTH PET dApp"

# Buat repository dan push ke GitHub (otomatis!)
gh repo create froth-pet --public --source=. --remote=origin --push
```

**Atau jika ingin membuat repository private:**

```powershell
gh repo create froth-pet --private --source=. --remote=origin --push
```

## ✅ Setelah Upload Berhasil

Repository akan tersedia di: `https://github.com/USERNAME/froth-pet`

Semua file sudah ter-upload dengan aman! 🎉

