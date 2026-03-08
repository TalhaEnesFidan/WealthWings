# WealthWings 💰

WealthWings, kişisel finansınızı yönetmenizi, gelir-gider takibi yapmanızı, borçlarınızı organize etmenizi ve birikim hedeflerinize ulaşmanızı sağlayan modern ve kullanıcı dostu bir finansal yönetim uygulamasıdır.

## 🚀 Özellikler

- **Gelişmiş Dashboard:** Aylık/yıllık finansal özetler ve interaktif grafikler (Chart.js).
- **Gelir & Gider Yönetimi:** İşlem ekleme, silme, kategorileştirme ve filtreleme özellikleri.
- **Kategori Takibi:** Özelleştirilebilir harcama kategorileri (Renk kodlu ikonlar ile).
- **Borç Yönetimi (🛡️):** Borç ekleme, taksit/kısmi ödeme yapabilme, ilerleme çubukları ile görsel takip.
- **Birikim & Skor:** Tasarruf hedefleri belirleme, "Aylık Birikim Oranı" Widget'ı ve motivasyon bildirimleri.
- **Geçmiş Analiz:** Yıllık nakit akışı ısı haritası (Heatmap) ve genel trend analizleri.
- **Dışa Aktarma:** CSV formatında geçmiş işlem kayıtlarını indirebilme.
- **Karanlık/Aydınlık Tema:** Göz yormayan modern arayüz tasarımı.

## 🛠️ Teknolojiler

- **Backend:** Python, FastAPI, SQLAlchemy (SQLite)
- **Frontend:** Vanilla CSS, JavaScript, HTML5
- **Görselleştirme:** Chart.js
- **Çoklu Dil (i18n):** Türkçe / İngilizce desteği

## 📦 Kurulum ve Çalıştırma

### Windows Kullanıcıları İçin (Tek Tıkla Kurulum)
Proje kök dizinindeki `start.bat` dosyasına çift tıklayarak uygulamayı başlatabilirsiniz. Bu script; otomatik olarak sanal ortam (`venv`) oluşturur, gerekli paketleri yükler ve sunucuyu başlatarak http://localhost:8000 adresini tarayıcınızda açar.

### Manuel Kurulum (Manuel)
1. Python sanal ortamı oluşturun:
```bash
python -m venv venv
venv\Scripts\activate    # Windows
source venv/bin/activate # Mac/Linux
```
2. Bağımlılıkları yükleyin:
```bash
pip install -r requirements.txt
```
3. Sunucuyu başlatın:
```bash
uvicorn backend.main:app --reload
```
4. Tarayıcınızda `http://127.0.0.1:8000` adresine gidin.

## 🔒 Güvenlik Notu
`data` klasörü (kullanıcıların veritabanı `finans.db`) ve `venv` gibi özel dosyalar **`.gitignore`** ile göz ardı edilmiştir. Depoya sadece kaynak kodlar yüklenir. Açık kaynak kodlu kullanım içindir.
