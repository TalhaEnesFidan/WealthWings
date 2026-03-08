# 💰 Finans & Birikim Uygulaması — Proje Dokümantasyonu

> **Versiyon:** 1.0  
> **Hazırlayan:** Proje Planlama Aşaması  
> **Hedef:** Yerel (localhost) çalışan, tek kullanıcılı, tam özellikli kişisel finans takip ve birikim yönetim uygulaması

---

## 📌 Proje Özeti

Öğrenciden ev hanımına, serbest çalışandan maaşlıya herkesin kullanabileceği, gelir/gider takibi yapan, oransal birikim hedefleri belirleyen ve geçmiş dönemlerle rekabet mantığıyla kullanıcıyı motive eden bir web tabanlı kişisel finans uygulaması.

Uygulama tamamen **yerel (localhost)** çalışır. İnternet bağlantısı gerekmez. Tüm veriler kullanıcının kendi cihazında bir **SQLite veritabanı dosyasında** saklanır. Tek bir `start.bat` (Windows) veya `start.sh` (macOS/Linux) dosyasıyla terminal açılmadan çift tıklamayla başlatılabilir ve tarayıcıda otomatik açılır.

---

## 🛠️ Teknoloji Stack'i

| Katman | Teknoloji | Açıklama |
|---|---|---|
| Backend | **Python + FastAPI** | Hızlı, modern, async destekli REST API |
| Veritabanı | **SQLite** | Tek `.db` dosyası, kurulum gerektirmez |
| ORM | **SQLAlchemy** | Veritabanı işlemleri için |
| Frontend | **HTML + CSS + Vanilla JS** | Framework bağımlılığı yok, hızlı açılır |
| Grafikler | **Chart.js** | Pasta, çubuk, çizgi grafikleri |
| Raporlama | **ReportLab (PDF) + openpyxl (Excel)** | Export özellikleri için |
| Başlatıcı | **start.bat / start.sh** | Çift tıkla, tarayıcıda aç |

> **Neden Python + FastAPI?** Kurulumu basit, tek sanal ortam (`venv`), SQLite ile mükemmel uyum, PDF/Excel kütüphaneleri kolayca entegre edilebilir. Windows/macOS/Linux'ta aynı şekilde çalışır.

---

## 📁 Proje Klasör Yapısı

```
finans-app/
│
├── start.bat                  # Windows başlatıcı
├── start.sh                   # macOS/Linux başlatıcı
├── requirements.txt           # Python bağımlılıkları
├── README.txt                 # Kullanım kılavuzu
│
├── backend/
│   ├── main.py                # FastAPI uygulama giriş noktası
│   ├── database.py            # SQLite bağlantısı ve session yönetimi
│   ├── models.py              # SQLAlchemy veritabanı modelleri
│   ├── schemas.py             # Pydantic istek/yanıt şemaları
│   ├── routers/
│   │   ├── auth.py            # Giriş/kayıt endpoint'leri
│   │   ├── transactions.py    # Gelir/gider CRUD
│   │   ├── categories.py      # Kategori yönetimi
│   │   ├── summary.py         # Özet ve istatistik endpoint'leri
│   │   ├── savings.py         # Birikim hedefi ve oransal analiz
│   │   ├── debts.py           # Borç ekleme, ödeme, listeleme
│   │   ├── analysis.py        # Geçmiş finansal analiz endpoint'leri
│   │   └── export.py          # PDF/Excel export
│   └── utils/
│       ├── pdf_generator.py   # ReportLab PDF oluşturma
│       └── excel_generator.py # openpyxl Excel oluşturma
│
├── frontend/
│   ├── index.html             # Ana sayfa (Dashboard)
│   ├── login.html             # Giriş / Kayıt sayfası
│   ├── transactions.html      # Gelir/gider işlemleri sayfası
│   ├── categories.html        # Kategori yönetim sayfası
│   ├── savings.html           # Birikim hedefleri ve skor sayfası
│   ├── debts.html             # Borç yönetimi sayfası
│   ├── analysis.html          # Geçmiş finansal analiz sayfası
│   ├── reports.html           # Raporlar ve export sayfası
│   ├── settings.html          # Ayarlar (dil, tema vb.)
│   ├── css/
│   │   ├── main.css           # Ana stil dosyası
│   │   └── dark.css           # Karanlık mod stilleri
│   └── js/
│       ├── api.js             # Backend API çağrıları
│       ├── dashboard.js       # Dashboard grafik ve özet mantığı
│       ├── transactions.js    # İşlem ekleme/listeleme/silme
│       ├── categories.js      # Kategori yönetimi
│       ├── savings.js         # Birikim oranı hesaplama ve skor
│       ├── debts.js           # Borç ekleme, ödeme, listeleme
│       ├── analysis.js        # Geçmiş analiz grafikleri ve tablolar
│       ├── reports.js         # Rapor ve export işlemleri
│       ├── auth.js            # Giriş/çıkış işlemleri
│       └── theme.js           # Karanlık/aydınlık mod toggle
│
└── data/
    └── finans.db              # SQLite veritabanı (otomatik oluşur)
```

---

## 💳 Borç Yönetim Sistemi — Genel Mantık

Borç, kullanıcının **ödemek zorunda olduğu toplam para miktarıdır.** Gelir/gider gibi bağımsız bir bakiye olarak tutulur.

- Yeni borç eklendikçe toplam borç **artar**
- Ödeme yapıldıkça toplam borç **azalır**
- Borç sıfırlanana kadar aktif kalır
- Borç bakiyesi dashboard'da ayrı bir kart olarak gösterilir
- Finansal analizde borç ödemeleri gider olarak **sayılmaz**, ayrı takip edilir (net birikim hesabını bozmaz)

---

## 🗄️ Veritabanı Şeması

### Tablo: `users`
```sql
CREATE TABLE users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT NOT NULL UNIQUE,
    email       TEXT UNIQUE,
    password    TEXT NOT NULL,           -- bcrypt hash
    full_name   TEXT,
    currency    TEXT DEFAULT 'TRY',      -- Para birimi (TRY / USD / EUR)
    language    TEXT DEFAULT 'tr',       -- Dil tercihi (tr / en)
    theme       TEXT DEFAULT 'light',    -- Tema (light / dark)
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tablo: `categories`
```sql
CREATE TABLE categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,           -- 'income' veya 'expense'
    icon        TEXT,                    -- Emoji veya ikon kodu
    color       TEXT,                    -- Hex renk kodu (#FF5733)
    is_default  BOOLEAN DEFAULT FALSE,   -- Sistem varsayılanı mı?
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tablo: `transactions`
```sql
CREATE TABLE transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id),
    category_id     INTEGER REFERENCES categories(id),
    type            TEXT NOT NULL,       -- 'income' veya 'expense'
    amount          REAL NOT NULL,
    description     TEXT,
    note            TEXT,                -- Opsiyonel not
    transaction_date DATE NOT NULL,      -- İşlem tarihi
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tablo: `savings_goals`
```sql
CREATE TABLE savings_goals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id),
    title           TEXT NOT NULL,       -- Hedef adı (örn: "Bu ay %70 biriktir")
    target_rate     REAL NOT NULL,       -- Hedef birikim oranı (0.70 = %70)
    month           INTEGER NOT NULL,    -- Hedef ay (1-12)
    year            INTEGER NOT NULL,    -- Hedef yıl
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tablo: `debts`
```sql
CREATE TABLE debts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id),
    title           TEXT NOT NULL,       -- Borç adı (örn: "Kredi kartı", "Ahmet'e borç")
    total_amount    REAL NOT NULL,        -- Başlangıç borç miktarı
    remaining       REAL NOT NULL,        -- Kalan borç (ödemelerle azalır)
    description     TEXT,                -- Açıklama / not
    due_date        DATE,                -- Son ödeme tarihi (opsiyonel)
    is_paid         BOOLEAN DEFAULT FALSE,-- Tamamen ödendi mi?
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tablo: `debt_payments`
```sql
CREATE TABLE debt_payments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    debt_id     INTEGER REFERENCES debts(id),
    user_id     INTEGER REFERENCES users(id),
    amount      REAL NOT NULL,           -- Ödenen miktar
    note        TEXT,                    -- Ödeme notu
    paid_at     DATE NOT NULL,           -- Ödeme tarihi
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tablo: `monthly_summaries` *(cache/snapshot tablosu)*
```sql
CREATE TABLE monthly_summaries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id),
    month           INTEGER NOT NULL,
    year            INTEGER NOT NULL,
    total_income    REAL DEFAULT 0,
    total_expense   REAL DEFAULT 0,
    net_savings     REAL DEFAULT 0,      -- total_income - total_expense
    savings_rate    REAL DEFAULT 0,      -- net_savings / total_income (0.0 - 1.0)
    goal_rate       REAL,                -- O ay için hedeflenen oran
    goal_met        BOOLEAN,             -- Hedefe ulaşıldı mı?
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month, year)
);
```

---

## 🔌 API Endpoint'leri

### Auth
| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı |
| POST | `/api/auth/login` | Giriş (JWT token döner) |
| POST | `/api/auth/logout` | Çıkış |
| GET | `/api/auth/me` | Aktif kullanıcı bilgisi |

### İşlemler (Transactions)
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/transactions` | Tüm işlemler (filtreli) |
| POST | `/api/transactions` | Yeni işlem ekle |
| PUT | `/api/transactions/{id}` | İşlem güncelle |
| DELETE | `/api/transactions/{id}` | İşlem sil |
| GET | `/api/transactions/daily` | Günlük özet |
| GET | `/api/transactions/weekly` | Haftalık özet |
| GET | `/api/transactions/monthly` | Aylık özet |

### Kategoriler
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/categories` | Tüm kategoriler |
| POST | `/api/categories` | Yeni kategori ekle |
| PUT | `/api/categories/{id}` | Güncelle |
| DELETE | `/api/categories/{id}` | Sil |

### Birikim & Özetler
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/savings/rate/{year}/{month}` | O aya ait birikim oranı |
| GET | `/api/savings/history` | Tüm aylık birikim oranı geçmişi |
| GET | `/api/savings/scorecard` | Skorkart (aylık oranlar + hedef karşılaştırması) |
| POST | `/api/savings/goal` | Aylık oran hedefi belirle |
| GET | `/api/summary/dashboard` | Dashboard için tüm özet veriler |

### Borç Yönetimi
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/debts` | Tüm borçları listele |
| POST | `/api/debts` | Yeni borç ekle |
| PUT | `/api/debts/{id}` | Borç bilgisini güncelle |
| DELETE | `/api/debts/{id}` | Borç sil |
| POST | `/api/debts/{id}/pay` | Borca ödeme yap (miktar belirt) |
| GET | `/api/debts/{id}/payments` | Borcun ödeme geçmişi |
| GET | `/api/debts/summary` | Toplam borç bakiyesi özeti |

### Geçmiş Analiz
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/analysis/monthly-comparison` | Ay ay gelir/gider/birikim karşılaştırması |
| GET | `/api/analysis/peak-periods` | En çok harcanan / kazanılan dönemler |
| GET | `/api/analysis/category-totals?year=` | Yıllık kategori bazlı toplamlar |

### Export
| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/export/pdf?month=&year=` | PDF rapor indir |
| GET | `/api/export/excel?month=&year=` | Excel rapor indir |
| GET | `/api/export/pdf/all` | Tüm zamanlar PDF |
| GET | `/api/export/excel/all` | Tüm zamanlar Excel |

---

## 🖥️ Sayfalar ve Özellikler

### 1. Giriş / Kayıt Sayfası (`login.html`)
- Kullanıcı adı + şifre ile kayıt
- Giriş formu
- İlk girişte dil seçimi (Türkçe / İngilizce)
- Şifre hash'lenerek saklanır (bcrypt)
- JWT ile oturum yönetimi (localStorage'da token)

---

### 2. Dashboard (`index.html`) ⭐ Ana Sayfa

**Üst Bilgi Kartları (4 adet):**
- 💵 Bu Ay Toplam Gelir
- 💸 Bu Ay Toplam Gider
- 💰 Net Birikim (Gelir - Gider)
- 📊 Birikim Oranı (%) — Renk kodlu: Kırmızı < %30, Sarı %30–%60, Yeşil > %60

**Grafikler:**
- **Aylık Gelir vs Gider Çubuk Grafiği** — Son 6 ayın karşılaştırması (Chart.js Bar)
- **Gider Dağılımı Pasta Grafiği** — Kategorilere göre bu ayın giderleri (Chart.js Doughnut)
- **Birikim Oranı Trend Grafiği** — Son 12 ayın birikim oranı çizgi grafiği (Chart.js Line)

**Birikim Skorkartı Widget'ı:**
- Geçen ay oranı vs bu ay oranı karşılaştırması
- "Geçen ay %58 biriktirdin, bu ay hedefin %65!" mesajı
- İlerleme çubuğu (progress bar)

**Son İşlemler Listesi:**
- En son 5-10 işlem özet listesi
- Tarih, kategori ikonu, tutar, açıklama
- "Tümünü Gör" butonu

---

### 3. Gelir & Gider İşlemleri (`transactions.html`)

**İşlem Ekleme Formu:**
- Tür seçimi: Gelir / Gider (toggle buton)
- Tutar girişi (sayısal, para birimi sembolü ile)
- Kategori seçimi (dropdown, ikonlu)
- Tarih seçimi (varsayılan: bugün)
- Açıklama (zorunlu değil)
- Not alanı (opsiyonel)
- Kaydet butonu

**İşlem Listesi:**
- Tarih bazlı gruplandırma (bugün, dün, bu hafta...)
- Her işlemde: kategori ikonu, isim, tutar (gelir yeşil / gider kırmızı), tarih
- Satır üzerinde düzenleme ve silme butonları
- Onaylı silme dialog'u

**Filtreleme & Arama:**
- Tarih aralığı filtresi
- Gelir / Gider / Tümü filtresi
- Kategori filtresi
- Metin araması (açıklama içinde)
- Sıralama: Tarihe göre, Tutara göre

**Özet Paneli (sağ kenar veya üst):**
- Seçili dönem toplam gelir
- Seçili dönem toplam gider
- Net fark

---

### 4. Kategoriler (`categories.html`)

**Hazır Gelir Kategorileri (sistem varsayılanı):**
- 💼 Maaş / Ücret
- 💻 Serbest Çalışma / Freelance
- 🏠 Kira Geliri
- 📈 Yatırım Getirisi
- 🎁 Hediye / Bağış
- 💰 Diğer Gelir

**Hazır Gider Kategorileri (sistem varsayılanı):**
- 🛒 Market / Gıda
- 🏠 Kira / Aidat
- ⚡ Faturalar (elektrik, su, doğalgaz, internet)
- 🚗 Ulaşım
- 🏥 Sağlık
- 🎓 Eğitim
- 👗 Giyim
- 🎬 Eğlence / Hobi
- 🍽️ Yemek / Restoran
- 📱 Abonelikler
- 💊 Eczane
- 🏋️ Spor
- 💸 Diğer Gider

**Özel Kategori Ekleme:**
- Kategori adı
- Tür (Gelir / Gider)
- İkon seçimi (emoji picker)
- Renk seçimi (color picker)
- Kaydet

**Kategori Yönetimi:**
- Özel kategorileri düzenleme ve silme
- Varsayılan kategoriler silinemez, sadece gizlenebilir

---

### 5. Birikim & Skorkart (`savings.html`) ⭐ Temel Özellik

**Oransal Birikim Sistemi:**
- Birikim oranı = (Gelir - Gider) / Gelir × 100
- Her ay için bu oran hesaplanır ve saklanır

**Aylık Hedef Belirleme:**
- Kullanıcı bu ay için hedef oran girer (örn: %70)
- Uygulama "Geçen ay %58 biriktirdin, bu ay en az %65 hedefle!" şeklinde öneri sunar
- Öneri: Geçen ayın oranı + %5 ile %10 arası artış

**Skorkart Tablosu:**
| Ay | Gelir | Gider | Birikim | Oran | Hedef | Durum |
|---|---|---|---|---|---|---|
| Ocak 2025 | 15.000₺ | 8.000₺ | 7.000₺ | %46 | %50 | ❌ |
| Şubat 2025 | 15.000₺ | 6.500₺ | 8.500₺ | %56 | %45 | ✅ |
| Mart 2025 | 16.000₺ | 7.200₺ | 8.800₺ | %55 | %60 | ❌ |

**Performans Rozet Sistemi:**
- 🥇 **Altın** — Oran > %70
- 🥈 **Gümüş** — Oran %50–%70
- 🥉 **Bronz** — Oran %30–%50
- 🔴 **Kritik** — Oran < %30

**İstatistikler:**
- En yüksek birikim oranı ayı
- En düşük birikim oranı ayı
- Tüm zamanlar ortalama birikim oranı
- Toplam birikmiş net tutar (tüm zamanlar)
- Üst üste hedef tutturma serisi (streak)

**Motivasyon Mesajları:**
- Hedef tutturulduysa: "Harika! Bu ay hedefini aştın 🎉"
- Tutturulmadıysa: "Bu ay %4 eksik kaldın. Gelecek ay dene! 💪"
- Yeni rekor kırıldıysa: "Bu senin en yüksek birikim oranın! 🏆"

---

**Borç Bakiyesi Kartı (Dashboard'a eklenir):**
- 🔴 Toplam Aktif Borç — kalan borç toplamı
- Borç varsa kırmızı uyarı rengi, borç yoksa yeşil "Borçsuz!" mesajı
- "Borçları Yönet" hızlı erişim butonu

---

### 6. Borç Yönetimi (`debts.html`) ⭐ Yeni Özellik

**Borç Ekleme Formu:**
- Borç adı / açıklaması (örn: "Kredi kartı Ocak", "Ali'den alınan")
- Toplam borç miktarı
- Son ödeme tarihi (opsiyonel, hatırlatıcı için)
- Not alanı
- Kaydet

**Aktif Borçlar Listesi:**
- Her borç satırında: isim, başlangıç tutarı, kalan tutar, ilerleme çubuğu (% kaç ödendi)
- Kalan tutar yeşilden kırmızıya renk skalası
- Vadesi geçmiş borçlar ⚠️ işaretiyle vurgulanır
- **"Ödeme Yap" butonu** — miktar gir, onayla, kalan otomatik güncellenir
- Tamamen ödenen borçlar ✅ ile işaretlenir ve "Tamamlanan Borçlar" arşivine düşer

**Ödeme Geçmişi (her borç için):**
- Tarih, ödenen miktar, not
- Toplam ödenen / kalan özeti

**Borç Özet Kartları:**
- Toplam aktif borç
- Bu ay yapılan borç ödemeleri
- Tamamlanan borç sayısı

---

### 7. Geçmiş Finansal Analiz (`analysis.html`) ⭐ Yeni Özellik

**Ay ay Karşılaştırma Tablosu:**

| Ay | Gelir | Gider | Net Birikim | Birikim Oranı | Borç Ödemesi |
|---|---|---|---|---|---|
| Ocak 2025 | 15.000₺ | 8.000₺ | 7.000₺ | %46 | 500₺ |
| Şubat 2025 | 15.000₺ | 6.500₺ | 8.500₺ | %56 | 1.000₺ |
| Mart 2025 | 16.000₺ | 7.200₺ | 8.800₺ | %55 | 0₺ |

- Tüm zamanlar ya da yıl bazlı filtre
- Sütun başlıklarına tıklayarak sıralama
- En yüksek/düşük değerler renk ile vurgulanır

**Zirve Dönem Analizi:**
- 🏆 En çok kazanılan ay — tutar ve tarih
- 💸 En çok harcanan ay — tutar ve tarih
- 💰 En yüksek birikim oranı ayı
- 📉 En düşük birikim oranı ayı
- 📊 Yıllık ortalamalar (gelir / gider / oran)

**Gelir vs Gider Yıllık Karşılaştırma Grafiği:**
- Tip: Chart.js Grouped Bar
- Yılları yan yana karşılaştır (2024 vs 2025)
- Gelir, gider ve net birikim üç ayrı çubuk

**Birikim Oranı Isı Haritası (Heatmap):**
- Takvim görünümünde her ayın birikim oranı
- Koyu yeşil = yüksek oran, kırmızı = düşük oran

---

### 8. Raporlar (`reports.html`)

**Dönem Seçimi:**
- Belirli ay/yıl seçimi
- "Bu ay", "Geçen ay", "Bu yıl", "Tüm zamanlar" hızlı seçenekleri

**Rapor İçeriği (Ekranda):**
- Dönem özet kartları (gelir/gider/birikim/oran)
- Kategori bazlı gider dağılımı tablosu
- Kategori bazlı gelir dağılımı tablosu
- Günlük harcama grafiği (seçili ay için)

**Export Butonları:**
- 📄 PDF Olarak İndir
- 📊 Excel Olarak İndir

**PDF Rapor İçeriği:**
- Başlık: "Finans Raporu — [Ay] [Yıl]"
- Kullanıcı adı ve tarih
- Özet tablosu
- Kategori dağılım tabloları
- Birikim oranı ve hedef karşılaştırması
- Grafik görselleri (Chart.js canvas → base64 → PDF)

**Excel Rapor İçeriği:**
- Sayfa 1: Özet
- Sayfa 2: Tüm işlemler listesi
- Sayfa 3: Kategori bazlı dağılım
- Sayfa 4: Aylık birikim geçmişi

---

### 9. Ayarlar (`settings.html`)

- **Dil:** Türkçe / İngilizce
- **Tema:** Aydınlık / Karanlık mod toggle
- **Para Birimi:** TRY (₺) / USD ($) / EUR (€)
- **Profil:** Ad soyad güncelleme, şifre değiştirme
- **Veritabanı:** Yedek al (`.db` dosyasını indir), Yedekten geri yükle
- **Tehlike Bölgesi:** Tüm verileri sil (onaylı)

---

## 🌗 Karanlık Mod

- Sistem teması otomatik algılanır (prefers-color-scheme)
- Manuel toggle butonu (her sayfada header'da)
- Tercih `users` tablosunda saklanır, her oturumda hatırlanır
- Tüm grafikler (Chart.js) karanlık mod renklerine uyum sağlar

---

## 🌍 Çok Dil Desteği (i18n)

- Türkçe ve İngilizce tam destek
- Dil dosyaları: `frontend/js/i18n/tr.json` ve `frontend/js/i18n/en.json`
- Kullanıcı ayarlarından değiştirilebilir, anında yansır
- Tüm sayfa metinleri, hata mesajları, buton etiketleri çevrilir
- Para birimi ve tarih formatları dile göre uyarlanır

---

## 🚀 Başlatma Sistemi

### `start.bat` (Windows)
```bat
@echo off
echo Finans Uygulamasi Baslatiliyor...
cd /d "%~dp0"
python -m venv venv 2>nul
call venv\Scripts\activate
pip install -r requirements.txt -q
start "" http://localhost:8000
python backend/main.py
pause
```

### `start.sh` (macOS / Linux)
```bash
#!/bin/bash
echo "Finans Uygulaması Başlatılıyor..."
cd "$(dirname "$0")"
python3 -m venv venv 2>/dev/null
source venv/bin/activate
pip install -r requirements.txt -q
sleep 1
open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null
python3 backend/main.py
```

### İlk Kurulum Akışı
1. Kullanıcı `start.bat` veya `start.sh` dosyasına çift tıklar
2. Terminal açılır, Python sanal ortamı oluşturulur
3. Bağımlılıklar yüklenir (sadece ilk seferinde)
4. `data/finans.db` SQLite dosyası otomatik oluşturulur
5. Tarayıcı otomatik `http://localhost:8000` adresini açar
6. Kayıt/giriş sayfası karşılar
7. Sonraki başlatmalarda sadece 2-3 saniye sürer

---

## 📦 `requirements.txt`

```
fastapi==0.115.0
uvicorn==0.30.0
sqlalchemy==2.0.36
pydantic==2.9.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
reportlab==4.2.5
openpyxl==3.1.5
python-dotenv==1.0.1
aiofiles==24.1.0
```

---

## 🔐 Güvenlik

- Şifreler **bcrypt** ile hash'lenir, düz metin saklanmaz
- Oturum yönetimi **JWT (JSON Web Token)** ile yapılır
- Token süresi: 30 gün (ayarlanabilir)
- Tüm API endpoint'leri auth middleware ile korunur
- Sadece localhost'ta çalıştığı için dış erişim yoktur

---

## 📊 Dashboard Grafik Detayları

### Gelir vs Gider Çubuk Grafiği
- **Tip:** Chart.js `Bar`
- **Veri:** Son 6 ay
- **Renkler:** Gelir → Yeşil (`#22c55e`), Gider → Kırmızı (`#ef4444`)
- **X ekseni:** Ay isimleri
- **Y ekseni:** Tutar (para birimi)

### Gider Dağılımı Halka Grafiği
- **Tip:** Chart.js `Doughnut`
- **Veri:** Bu ayın kategorilere göre giderleri
- **Ortada:** Toplam gider tutarı
- **Hover:** Kategori adı ve yüzde

### Birikim Oranı Trend Grafiği
- **Tip:** Chart.js `Line`
- **Veri:** Son 12 ayın birikim oranları (%)
- **Renk:** Gradient mavi-yeşil
- **Noktalarda:** O ayın rozeti (🥇🥈🥉)
- **Yatay çizgi:** Kullanıcının aktif hedef oranı

---

## 🎨 Tasarım Rehberi

### Renk Paleti (Aydınlık Mod)
```css
--primary:       #6366f1;   /* İndigo — ana butonlar, vurgu */
--success:       #22c55e;   /* Yeşil — gelir, pozitif */
--danger:        #ef4444;   /* Kırmızı — gider, negatif */
--warning:       #f59e0b;   /* Sarı — uyarı, orta oran */
--background:    #f8fafc;   /* Açık gri arka plan */
--card:          #ffffff;   /* Kart arka planı */
--text-primary:  #1e293b;   /* Ana metin */
--text-secondary:#64748b;   /* İkincil metin */
--border:        #e2e8f0;   /* Kenarlık */
```

### Renk Paleti (Karanlık Mod)
```css
--background:    #0f172a;   /* Koyu lacivert arka plan */
--card:          #1e293b;   /* Kart arka planı */
--text-primary:  #f1f5f9;   /* Ana metin */
--text-secondary:#94a3b8;   /* İkincil metin */
--border:        #334155;   /* Kenarlık */
```

### Tipografi
- **Font:** `Inter` (Google Fonts) — Tüm platformlarda temiz görünüm
- **Başlıklar:** 600–700 font-weight
- **Tutar gösterimi:** Monospace font, büyük punto

### Layout
- **Sol kenar menüsü** (sidebar) — Sabit, ikonlu navigasyon
- **Üst bar** (topbar) — Kullanıcı adı, dil, tema toggle
- **Ana içerik** — Kart tabanlı grid layout
- **Mobil:** Hamburger menü, tek sütun layout

---

## 🔄 Uygulama Akışı

```
Başlatma
   ↓
Giriş / Kayıt Sayfası
   ↓ (ilk kayıt → dil seçimi)
Dashboard
   ├── Gelir/Gider/Borç Ekle → İlgili sayfa
   ├── Özet Grafikleri İncele
   ├── Birikim Oranı Gör
   └── Navigasyon Menüsü
         ├── 📊 Dashboard
         ├── 💰 İşlemler
         ├── 🏷️ Kategoriler
         ├── 🏆 Birikim & Skor
         ├── 🔴 Borç Yönetimi
         ├── 📈 Geçmiş Analiz
         ├── 📄 Raporlar
         └── ⚙️ Ayarlar
```

---

## ✅ Geliştirme Öncelik Sırası (MVP → Tam Sürüm)

### Aşama 1 — Temel (MVP)
- [ ] Backend kurulumu (FastAPI + SQLite)
- [ ] Kullanıcı kaydı ve girişi
- [ ] Gelir/gider ekleme, listeleme, silme
- [ ] Varsayılan kategoriler
- [ ] Basit dashboard (kartlar)

### Aşama 2 — Temel Özellikler
- [ ] Aylık/haftalık/günlük özet API'leri
- [ ] Chart.js grafikleri (bar, doughnut, line)
- [ ] Kategori yönetimi (özel kategori ekleme)
- [ ] Birikim oranı hesaplama
- [ ] Karanlık mod
- [ ] Borç ekleme ve ödeme sistemi
- [ ] Borç bakiyesi dashboard kartı

### Aşama 3 — İleri Özellikler
- [ ] Skorkart sistemi (rozet, hedef, motivasyon)
- [ ] Çok dil desteği (tr/en)
- [ ] Geçmiş finansal analiz sayfası (ay karşılaştırma, zirve dönemler)
- [ ] Yıllık karşılaştırma grafiği
- [ ] Birikim oranı ısı haritası
- [ ] PDF export
- [ ] Excel export
- [ ] Ayarlar sayfası

### Aşama 4 — Cilalama
- [ ] Animasyonlar ve geçişler
- [ ] Hata yönetimi ve validasyon mesajları
- [ ] Veritabanı yedekleme arayüzü
- [ ] `start.bat` / `start.sh` başlatıcılar
- [ ] `README.txt` kullanım kılavuzu

---

## 📝 Notlar

- Uygulama **tek kullanıcı** için tasarlanmıştır; kayıt sistemi sadece kişisel hesap içindir.
- `data/finans.db` dosyası silinirse tüm veriler gider. Kullanıcıya yedekleme hatırlatması yapılmalıdır.
- İnternet bağlantısı sadece Google Fonts ve Chart.js CDN için gereklidir (opsiyonel olarak bundle edilebilir).
- Tüm tutar hesaplamaları `REAL` (float) tipinde yapılır; büyük tutarlarda hassasiyet için `DECIMAL` kütüphanesi kullanılabilir.
