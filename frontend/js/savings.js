/**
 * WealthWings — Birikim & Skorkart Sayfası
 */

const MONTH_NAMES = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

let savingsTrendChart = null;

// ─────────────────────────────────── Init ──────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    if (!Api.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    initNavbar();
    initGoalForm();
    await loadScorecardData();
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

// ─────────────────────────────── Scorecard ─────────────────────────────────

async function loadScorecardData() {
    try {
        const data = await Api.get('/savings/scorecard');
        populateStats(data);
        populateScorecardTable(data.history);
        renderTrendChart(data.history);
        loadCurrentMonthWidget();

        // Öneri kutusu
        if (data.suggestion) {
            document.getElementById('suggestionBox').style.display = 'block';
            document.getElementById('suggestionText').textContent = data.suggestion;
        }

        // Hedef form default değerleri
        const now = new Date();
        document.getElementById('goalMonth').value = now.getMonth() + 1;
        document.getElementById('goalYear').value = now.getFullYear();
        if (data.suggested_rate) {
            document.getElementById('goalRateRange').value = data.suggested_rate;
            document.getElementById('rangeValue').textContent = `%${data.suggested_rate}`;
            document.getElementById('goalTitle').value = `Bu ay %${data.suggested_rate} biriktir!`;
        }

    } catch (err) {
        Toast.error('Veri yüklenirken hata: ' + err.message);
    }
}

function populateStats(data) {
    const stats = data.stats || {};
    const currency = Utils.getCurrency();

    document.getElementById('avgRate').textContent = `%${stats.avg_rate?.toFixed(1) || 0}`;

    // Kümülatif Genel Toplam Birikim
    const totalEl = document.getElementById('totalSavings');
    const totalVal = stats.overall_savings || 0;
    totalEl.textContent = Utils.formatCurrency(totalVal, currency);
    if (totalVal < 0) {
        totalEl.classList.add('text-danger');
    } else {
        totalEl.classList.remove('text-danger');
    }

    document.getElementById('goalStreak').textContent = `${stats.goal_streak || 0} ay`;

    if (stats.best_month) {
        document.getElementById('bestRate').textContent =
            `%${stats.best_month.savings_rate_pct} (${MONTH_NAMES[stats.best_month.month]} ${stats.best_month.year})`;
    }
}

async function loadCurrentMonthWidget() {
    const now = new Date();
    try {
        const d = await Api.get(`/savings/rate/${now.getFullYear()}/${now.getMonth() + 1}`);
        const currency = Utils.getCurrency();
        const pct = d.savings_rate_pct || 0;

        document.getElementById('currentRate').textContent = `%${pct.toFixed(1)}`;
        document.getElementById('currentGoal').textContent = d.goal_rate_pct != null
            ? `%${d.goal_rate_pct.toFixed(1)}` : 'Hedef yok';

        // Badge
        const badge = d.badge || {};
        document.getElementById('currentBadge').textContent = badge.emoji || '';
        document.getElementById('bigBadge').textContent = badge.emoji || '';
        document.getElementById('badgeInfo').textContent = badge.label || '';

        // Progress bar
        const bar = document.getElementById('savingsProgressBar');
        bar.style.width = `${Math.min(pct, 100)}%`;
        bar.className = `progress-bar ${pct >= 60 ? 'progress-success' : pct >= 30 ? 'progress-warning' : 'progress-danger'}`;

        document.getElementById('pIncome').textContent = Utils.formatCurrency(d.total_income, currency);
        document.getElementById('pExpense').textContent = Utils.formatCurrency(d.total_expense, currency);
        document.getElementById('pNet').textContent = Utils.formatCurrency(d.net_savings, currency);

        // Motivasyon
        const bannerEl = document.getElementById('motivationBanner');
        if (d.motivation) {
            document.getElementById('motivationText').textContent = d.motivation;
            if (d.goal_met === true) bannerEl.classList.add('motivation-success');
            else if (d.goal_met === false) bannerEl.classList.add('motivation-warning');
        }

    } catch (err) {
        // Bu ay veri yoksa kart boş kalır
        document.getElementById('currentRate').textContent = '%0';
    }
}

function populateScorecardTable(history) {
    const tbody = document.getElementById('scorecardBody');
    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">📭 Henüz veri yok. İşlem ekleyerek başla!</td></tr>';
        return;
    }

    const currency = Utils.getCurrency();
    const rows = [...history].reverse(); // En yeni önce

    tbody.innerHTML = rows.map(row => {
        const badge = row.badge || {};
        const goalStatus = row.goal_met === true ? '✅' : row.goal_met === false ? '❌' : '—';
        const goalCell = row.goal_rate_pct != null ? `%${row.goal_rate_pct.toFixed(1)}` : '—';
        const rateClass = row.savings_rate_pct >= 60 ? 'text-success' : row.savings_rate_pct >= 30 ? 'text-warning' : 'text-danger';

        return `<tr>
            <td><strong>${MONTH_NAMES[row.month]} ${row.year}</strong></td>
            <td class="text-success">${Utils.formatCurrency(row.total_income, currency)}</td>
            <td class="text-danger">${Utils.formatCurrency(row.total_expense, currency)}</td>
            <td>${Utils.formatCurrency(row.net_savings, currency)}</td>
            <td class="${rateClass}"><strong>%${row.savings_rate_pct?.toFixed(1) || 0}</strong></td>
            <td>${goalCell}</td>
            <td title="${badge.label || ''}">${badge.emoji || '—'}</td>
            <td>${goalStatus}</td>
        </tr>`;
    }).join('');
}

function renderTrendChart(history) {
    const ctx = document.getElementById('savingsTrendChart');
    if (!ctx || !history || history.length === 0) return;

    const labels = history.map(h => `${MONTH_NAMES[h.month].substring(0, 3)} ${h.year}`);
    const rates = history.map(h => h.savings_rate_pct || 0);
    const goalRates = history.map(h => h.goal_rate_pct || null);
    const colors = history.map(h => {
        if (h.savings_rate_pct >= 70) return '#22c55e';
        if (h.savings_rate_pct >= 50) return '#6366f1';
        if (h.savings_rate_pct >= 30) return '#f59e0b';
        return '#ef4444';
    });

    if (savingsTrendChart) savingsTrendChart.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    savingsTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Birikim Oranı (%)',
                    data: rates,
                    backgroundColor: colors,
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: 'Hedef (%)',
                    data: goalRates,
                    type: 'line',
                    borderColor: '#f59e0b',
                    borderDash: [6, 3],
                    borderWidth: 2,
                    pointBackgroundColor: '#f59e0b',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 4,
                }
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: %${ctx.parsed.y?.toFixed(1) || 0}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: {
                    ticks: { color: textColor, callback: v => `%${v}` },
                    grid: { color: gridColor },
                    min: 0,
                    max: 100,
                }
            }
        }
    });
}

// ─────────────────────────────── Goal Form ─────────────────────────────────

function initGoalForm() {
    const rangeInput = document.getElementById('goalRateRange');
    const rangeValue = document.getElementById('rangeValue');

    rangeInput?.addEventListener('input', () => {
        rangeValue.textContent = `%${rangeInput.value}`;
        document.getElementById('goalTitle').value = `Bu ay %${rangeInput.value} biriktir!`;
    });

    document.getElementById('goalForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const month = parseInt(document.getElementById('goalMonth').value);
        const year = parseInt(document.getElementById('goalYear').value);
        const rate = parseInt(rangeInput.value) / 100;
        const title = document.getElementById('goalTitle').value.trim() || `%${rangeInput.value} hedefi`;

        try {
            await Api.post('/savings/goal', { title, target_rate: rate, month, year });
            Toast.success(`🎯 ${MONTH_NAMES[month]} ${year} için %${rangeInput.value} hedefi kaydedildi!`);
            await loadScorecardData();
        } catch (err) {
            Toast.error('Hedef kaydedilemedi: ' + err.message);
        }
    });
}
