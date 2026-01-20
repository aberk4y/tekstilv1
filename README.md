# Cristobal E-Commerce

Bu proje Node.js, Express ve SQLite kullanılarak geliştirilmiştir.

## Kurulum

Sisteminizde Node.js kurulu olmadığı tespit edildi. Projeyi çalıştırmak için lütfen aşağıdaki adımları izleyin:

1. [Node.js](https://nodejs.org/) adresinden Node.js'i indirin ve kurun.
2. Komut satırını (CMD veya PowerShell) açın.
3. Proje klasörüne gidin:
   ```bash
   cd c:\Users\Berkay\Desktop\webkuafor
   ```
4. Gerekli paketleri yükleyin:
   ```bash
   npm install
   ```
5. Veritabanını oluşturun:
   ```bash
   npm run init-db
   ```
6. Uygulamayı başlatın:
   ```bash
   npm start
   ```
7. Tarayıcıda `http://localhost:3000` adresine gidin.

## Özellikler

- **Yönetici Paneli**: `/admin` (Giriş yaptıktan sonra erişilebilir)
- **Kullanıcı Paneli**: Sipariş takibi, Profil yönetimi.
- **Çoklu Dil**: TR/EN desteği.
