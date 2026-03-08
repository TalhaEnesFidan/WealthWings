/**
 * WealthWings — Geçmiş Analiz JS
 */

let compareChartInstance = null;

const MONTH_NAMES = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

document.addEventListener('DOMContentLoaded', async () => {
    if (!Api.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    initNavbar();
    await initFilters();
    await loadHeatmap();

    // Event listeners
    document.getElementById('yearSelect')?.addEventListener('change', loadHeatmap);
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

async function initFilters() {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Yıl Dropdown (Isı haritası)
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
        for (let y = currentYear; y >= currentYear - 5; y--) {
            yearSelect.add(new Option(y, y));
        }
    }

}

async function loadHeatmap() {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect) return;
    const year = yearSelect.value;
    const grid = document.getElementById('heatmapGrid');
    if (!grid) return;

    // Skeleton
    grid.innerHTML = Array(12).fill('<div class="heatmap-cell" style="background:var(--bg-input)"></div>').join('');

    try {
        const res = await Api.get(`/analysis/yearly/${year}`);
        const data = res.data;
        const currency = Utils.getCurrency();

        let html = '';
        data.forEach(m => {
            let colorClass = 'heatmap-level-neutral';
            if (m.net > 0) colorClass = m.net > 2000 ? 'heatmap-level-great' : 'heatmap-level-positive';
            else if (m.net < 0) colorClass = 'heatmap-level-negative';

            // Eğer o ay hiç islem yoksa (gelir 0, gider 0)
            if (m.income === 0 && m.expense === 0) colorClass = 'heatmap-level-neutral';

            const title = `${MONTH_NAMES[m.month]} ${year}\nNet: ${Utils.formatCurrency(m.net, currency)}\nGelir: ${Utils.formatCurrency(m.income, currency)}\nGider: ${Utils.formatCurrency(m.expense, currency)}`;

            let displayVal = '';
            if (m.income !== 0 || m.expense !== 0) {
                // Her zaman tam sayı göster (Mart 1700 için 1700 basar)
                displayVal = Math.round(m.net).toString();
            }

            html += `<div class="heatmap-cell ${colorClass}" title="${title}">${m.net > 0 && displayVal !== '0' ? '+' : ''}${displayVal}</div>`;
        });

        grid.innerHTML = html;

    } catch (err) {
        console.error("Isı haritası hatası:", err);
        Toast.error("Isı haritası yüklenemedi.");
    }
}
