/**
 * WealthWings — Geçmiş Analiz JS
 */

let compareChartInstance = null;
let trendChartInstance = null;

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
    document.getElementById('yearSelect').addEventListener('change', loadHeatmap);
    document.getElementById('compareBtn').addEventListener('click', loadCompareData);
    document.getElementById('trendCategorySelect').addEventListener('change', loadTrendData);
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
    const currentMonth = now.getMonth() + 1;

    // Yıl Dropdown (Isı haritası)
    const yearSelect = document.getElementById('yearSelect');
    for (let y = currentYear; y >= currentYear - 5; y--) {
        yearSelect.add(new Option(y, y));
    }

    // Karşılaştırma formları
    document.getElementById('p1Month').value = currentMonth === 1 ? 12 : currentMonth - 1;
    document.getElementById('p1Year').value = currentMonth === 1 ? currentYear - 1 : currentYear;

    document.getElementById('p2Month').value = currentMonth;
    document.getElementById('p2Year').value = currentYear;

    // Trend Kategorileri
    try {
        const cats = await Api.get('/categories');
        const sel = document.getElementById('trendCategorySelect');
        cats.forEach(c => {
            sel.add(new Option(c.name, c.id));
        });
    } catch (err) {
        console.error("Kategoriler yüklenemedi", err);
    }
}

async function loadHeatmap() {
    const year = document.getElementById('yearSelect').value;
    const grid = document.getElementById('heatmapGrid');

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
        Toast.error("Isı haritası yüklenemedi: " + err.message);
    }
}

async function loadCompareData() {
    const m1 = document.getElementById('p1Month').value;
    const y1 = document.getElementById('p1Year').value;
    const m2 = document.getElementById('p2Month').value;
    const y2 = document.getElementById('p2Year').value;

    try {
        const res = await Api.get(`/analysis/compare?m1=${m1}&y1=${y1}&m2=${m2}&y2=${y2}`);
        renderCompareChart(res.period1, res.period2);
    } catch (err) {
        Toast.error("Karşılaştırma verisi alınamadı: " + err.message);
    }
}

function renderCompareChart(p1, p2) {
    const ctx = document.getElementById('compareChart');
    if (compareChartInstance) compareChartInstance.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    compareChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Toplam Gelir', 'Toplam Gider', 'Net Bakiye'],
            datasets: [
                {
                    label: p1.period,
                    data: [p1.income, p1.expense, p1.net],
                    backgroundColor: '#94a3b8',
                    borderRadius: 4
                },
                {
                    label: p2.period,
                    data: [p2.income, p2.expense, p2.net],
                    backgroundColor: '#6366f1',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${Utils.formatCurrency(ctx.raw, Utils.getCurrency())}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        }
    });
}

async function loadTrendData() {
    const catId = document.getElementById('trendCategorySelect').value;
    if (!catId) return;

    try {
        const res = await Api.get(`/analysis/category-trend/${catId}`);
        renderTrendChart(res);
    } catch (err) {
        Toast.error("Kategori trendi alınamadı: " + err.message);
    }
}

function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (trendChartInstance) trendChartInstance.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const labels = data.trend.map(t => `${MONTH_NAMES[t.month]} ${t.year}`);
    const amounts = data.trend.map(t => t.amount);

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${data.category} Harcamaları`,
                data: amounts,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#ef4444'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } },
                tooltip: {
                    callbacks: {
                        label: ctx => `Tutar: ${Utils.formatCurrency(ctx.raw, Utils.getCurrency())}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
            }
        }
    });
}
