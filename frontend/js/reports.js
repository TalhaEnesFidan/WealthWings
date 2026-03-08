/**
 * WealthWings — Raporlar & Dışa Aktar JS
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!Api.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    initNavbar();
    initForms();
});

function initNavbar() {
    const user = JSON.parse(localStorage.getItem('ww_user') || '{}');
    const greetEl = document.getElementById('userGreeting');
    if (greetEl) greetEl.textContent = `Merhaba, ${user.full_name || user.username || 'Kullanıcı'}!`;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        Api.removeToken();
        localStorage.removeItem('ww_user');
        window.location.href = '/login.html';
    });

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('sidebar-open');
    });
}

function initForms() {
    const now = new Date();

    // Varsayılan değerler
    document.getElementById('pdfMonth').value = now.getMonth() + 1;
    document.getElementById('pdfYear').value = now.getFullYear();

    // Excel İndir
    document.getElementById('excelForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const month = document.getElementById('excelMonth').value;
        const year = document.getElementById('excelYear').value;

        let url = `/api/export/excel`;
        let params = [];
        if (year) params.push(`year=${year}`);
        if (month) params.push(`month=${month}`);

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        downloadFile(url, 'excel');
    });

    // PDF İndir
    document.getElementById('pdfForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const month = document.getElementById('pdfMonth').value;
        const year = document.getElementById('pdfYear').value;

        let url = `/api/export/pdf?year=${year}&month=${month}`;
        downloadFile(url, 'pdf');
    });
}

/**
 * Fetch ile dosyayı indirip kullanıcıya sunar (Token gönderilir)
 */
async function downloadFile(url, type) {
    try {
        const token = Api.getToken();
        Toast.info(`${type.toUpperCase()} dosyası hazırlanıyor, lütfen bekleyin...`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            let errorMsg = 'Dosya indirilemedi.';
            try {
                const errData = await response.json();
                if (errData.detail) errorMsg = errData.detail;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        // Content-Disposition header'ından dosya adını al
        const disposition = response.headers.get('Content-Disposition');
        let filename = `wealthwings_rapor.${type === 'excel' ? 'xlsx' : 'pdf'}`;
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const matches = /filename="([^"]*)"/.exec(disposition);
            if (matches != null && matches[1]) filename = matches[1];
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Temizlik
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();

        Toast.success('Dosya başarıyla indirildi!');

    } catch (err) {
        Toast.error(err.message);
    }
}
