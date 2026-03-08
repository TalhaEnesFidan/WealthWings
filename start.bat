@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   💰 WealthWings Baslatiliyor...        ║
echo ╚══════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM Sanal ortam yoksa oluştur
if not exist "venv" (
    echo [1/3] Python sanal ortami olusturuluyor...
    python -m venv venv
    if errorlevel 1 (
        echo HATA: Python bulunamadi! Lutfen Python yukleyin.
        pause
        exit /b
    )
)

REM Sanal ortamı aktifleştir
call venv\Scripts\activate

REM Bağımlılıkları yükle
echo [2/3] Bagimliliklar kontrol ediliyor...
pip install -r requirements.txt -q

REM Tarayıcıyı aç ve sunucuyu başlat
echo [3/3] Sunucu baslatiliyor...
echo.
echo ✅ Uygulama hazir: http://localhost:8000
echo    Kapatmak icin bu pencereyi kapatin veya Ctrl+C basin.
echo.

start "" http://localhost:8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

pause
