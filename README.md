# 📱 WA Service — WhatsApp API

REST API untuk WhatsApp menggunakan Express.js dan Baileys dengan arsitektur MVC.

## ✨ Fitur

- 📤 Kirim pesan teks, gambar, dan dokumen
- 🔐 API Key authentication
- 🔄 Auto-reconnect dengan exponential backoff
- 📋 Session management (QR code via API)
- 📝 Log rotation otomatis (hapus log > 30 hari)
- 📱 Notifikasi Telegram saat session expired
- 🛡️ Rate limiting & security headers
- 🚀 Production-ready dengan PM2

## 📋 Prerequisites

- Node.js >= 18 (LTS)
- npm atau yarn
- PM2 (untuk production): `npm install -g pm2`

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd wa-service
npm install
```

### 2. Konfigurasi

```bash
cp .env.example .env
```

Edit `.env` sesuai kebutuhan:

```env
NODE_ENV=development
PORT=3000
API_KEY=your-secret-api-key

# Telegram (opsional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Logging
LOG_LEVEL=info
LOG_MAX_DAYS=30d
```

### 3. Jalankan (Development)

```bash
npm run dev
```

### 4. Scan QR Code

Buka browser atau gunakan curl:

```bash
curl http://localhost:3000/api/session/qr \
  -H "x-api-key: your-secret-api-key"
```

Atau scan QR code yang muncul di terminal.

## 📡 API Endpoints

### Health Check

```
GET /health
```

### Session

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/session/status` | Cek status koneksi |
| GET | `/api/session/qr` | Dapatkan QR code (base64) |
| POST | `/api/session/logout` | Logout & hapus session |
| POST | `/api/session/restart` | Restart koneksi |

### Messages

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/message/send-text` | Kirim pesan teks |
| POST | `/api/message/send-image` | Kirim gambar |
| POST | `/api/message/send-document` | Kirim dokumen |

### Contoh Request

**Header (wajib):**
```
x-api-key: your-secret-api-key
Content-Type: application/json
```

**Kirim Pesan Teks:**
```bash
curl -X POST http://localhost:3000/api/message/send-text \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
    "phone": "628123456789",
    "message": "Hello dari WA Service! 🚀"
  }'
```

**Kirim Gambar:**
```bash
curl -X POST http://localhost:3000/api/message/send-image \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
    "phone": "628123456789",
    "image": "https://example.com/image.jpg",
    "caption": "Foto dari API"
  }'
```

**Kirim Dokumen:**
```bash
curl -X POST http://localhost:3000/api/message/send-document \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
    "phone": "628123456789",
    "document": "https://example.com/file.pdf",
    "filename": "document.pdf",
    "mimetype": "application/pdf"
  }'
```

### Format Response

**Sukses:**
```json
{
  "success": true,
  "message": "Text message sent successfully",
  "data": {
    "messageId": "3EB0...",
    "to": "628123456789@s.whatsapp.net"
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "WhatsApp is not connected"
}
```

## 🔔 Telegram Notification

### Setup Bot Telegram

1. Buka [@BotFather](https://t.me/botfather) di Telegram
2. Kirim `/newbot` dan ikuti instruksinya
3. Copy **Bot Token** yang diberikan
4. Kirim pesan apapun ke bot yang baru dibuat
5. Buka `https://api.telegram.org/bot<TOKEN>/getUpdates` untuk mendapatkan **Chat ID**
6. Set `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` di `.env`

### Event yang Dikirim

- ✅ Service started
- ✅ WhatsApp connected
- 🔌 Session expired / logged out
- 🚨 Max reconnection retries reached

## 🚀 Production Deployment

### Menggunakan PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start production
npm run prod

# Monitor
pm2 monit

# Lihat logs
npm run prod:logs

# Restart
npm run prod:restart

# Stop
npm run prod:stop

# Auto-start on reboot
pm2 save
pm2 startup
```

### Checklist Production

- [x] Set `NODE_ENV=production` di `.env`
- [x] Set `API_KEY` yang kuat
- [x] Konfigurasi Telegram notification
- [x] Gunakan reverse proxy (Nginx)
- [x] Setup SSL/TLS
- [x] Set `LOG_LEVEL=warn` (opsional, untuk mengurangi log)
- [x] Aktifkan firewall (hanya allow port yang dibutuhkan)

### Contoh Nginx Config

```nginx
server {
    listen 80;
    server_name wa-api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📁 Struktur Direktori

```
wa-service/
├── src/
│   ├── config/          # Konfigurasi (env, logger, express)
│   ├── controllers/     # Request handlers
│   ├── middlewares/      # Auth, error handler, rate limit
│   ├── models/          # Data models
│   ├── routes/          # API routing
│   ├── services/        # Business logic
│   ├── utils/           # Helpers & validators
│   └── app.js           # Entry point
├── sessions/            # WhatsApp auth files (gitignored)
├── logs/                # Log files (gitignored)
├── .env.example
├── ecosystem.config.js  # PM2 config
└── package.json
```

## ⚠️ Catatan Penting

1. **Jangan spam** — WhatsApp bisa ban nomor yang mengirim terlalu banyak pesan
2. **Satu instance = satu nomor** — Baileys tidak support multi-session per instance
3. **Session files sensitif** — Jangan commit ke git (sudah di `.gitignore`)
4. **QR code expire** — Scan dalam 2 menit setelah muncul
5. **Gunakan dengan bijak** — Patuhi ToS WhatsApp

## 📄 License

ISC
