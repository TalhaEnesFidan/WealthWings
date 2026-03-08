/**
 * WealthWings — Dashboard mantığı
 * Özet kartları, Chart.js grafikleri, son işlemler
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Auth kontrolü app.js tarafından yapılır
    // Dashboard verilerini yükle
    setTimeout(loadDashboard, 300);
});

async function loadDashboard() {
    try {
        const data = await Api.get('/summary/dashboard');
        if (!data) return;

        updateStatCards(data.this_month);
        renderIncomeExpenseChart(data.monthly_chart);
        renderExpenseDistChart(data.expense_by_category);
        renderSavingsTrendChart(data.savings_trend);
        renderRecentTransactions(data.recent_transactions);

        // Borç kartı (Bölüm 3)
        loadDebtStatCard();

        // Birikim widget (Bölüm 3)
        loadSavingsWidget();
    } catch (err) {
        console.error('Dashboard yükleme hatasi:', err);
    }
}

// ─── Borç Bakiyesi Kartı (Bölüm 3) ─────────────────────
async function loadDebtStatCard() {
    try {
        const summary = await Api.get('/debts/summary/all');
        const el = document.getElementById('stat-debt');
        const card = document.getElementById('debt-stat-card');
        const meta = document.getElementById('debt-stat-meta');
        const currency = Utils.getCurrency();
        if (!el || !card) return;

        if (summary.total_remaining > 0) {
            el.textContent = Utils.formatCurrency(summary.total_remaining, currency);
            card.classList.remove('is-safe');
            const iconEl = card.querySelector('.stat-icon');
            if (iconEl) iconEl.textContent = '🛡️';
            if (meta) meta.textContent = `${summary.active_count} Aktif Borç`;
        } else {
            el.textContent = 'Borçsuz!';
            card.classList.add('is-safe');
            const iconEl = card.querySelector('.stat-icon');
            if (iconEl) iconEl.textContent = '🛡️';
            if (meta) meta.textContent = 'Harikasın!';
        }
    } catch (_) { }
}

// ─── Birikim Widget (Bölüm 3) ───────────────────────────
async function loadSavingsWidget() {
    try {
        const now = new Date();
        const data = await Api.get(`/savings/rate/${now.getFullYear()}/${now.getMonth() + 1}`);
        const widgetCard = document.getElementById('savings-widget-card');
        const widgetBody = document.getElementById('savings-widget-body');
        if (!widgetCard || !widgetBody || data.total_income === 0) return;

        widgetCard.style.display = '';
        const currency = Utils.getCurrency();
        const pct = data.savings_rate_pct || 0;
        const badge = data.badge || {};
        const barColor = pct >= 60 ? 'var(--success)' : pct >= 30 ? 'var(--warning)' : 'var(--danger)';

        widgetBody.innerHTML = `
            <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                <div style="font-size:40px;">${badge.emoji || '📊'}</div>
                <div style="flex:1">
                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">${data.motivation || ''}</div>
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                        <div style="flex:1;height:10px;background:var(--border);border-radius:99px;overflow:hidden;">
                            <div style="height:100%;width:${Math.min(pct, 100)}%;background:${barColor};border-radius:99px;transition:width 0.5s;"></div>
                        </div>
                        <strong style="font-size:16px;color:${barColor}">%${pct.toFixed(1)}</strong>
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);">
                        Gelir: <strong>${Utils.formatCurrency(data.total_income, currency)}</strong> &nbsp;|&nbsp;
                        Gider: <strong>${Utils.formatCurrency(data.total_expense, currency)}</strong> &nbsp;|&nbsp;
                        Net: <strong>${Utils.formatCurrency(data.net_savings, currency)}</strong>
                    </div>
                </div>
                ${data.goal_rate_pct != null ? `<div style="text-align:center;"><div style="font-size:11px;color:var(--text-tertiary);">Hedef</div><div style="font-size:18px;font-weight:700;color:var(--warning)">%${data.goal_rate_pct.toFixed(0)}</div></div>` : ''}
            </div>`;
    } catch (_) { }
}


// ─── Özet Kartları ──────────────────────────────────────

function updateStatCards(data) {
    const currency = Utils.getCurrency();

    document.getElementById('stat-income').textContent = Utils.formatCurrency(data.income, currency);
    document.getElementById('stat-expense').textContent = Utils.formatCurrency(data.expense, currency);
    document.getElementById('stat-savings').textContent = Utils.formatCurrency(data.net_savings, currency);

    // Kümülatif (Genel Toplam) Birikim
    const totalEl = document.getElementById('stat-total-savings');
    if (totalEl) {
        totalEl.textContent = Utils.formatCurrency(data.cumulative_savings, currency);
        if (data.cumulative_savings < 0) {
            totalEl.style.color = 'var(--danger)';
        } else {
            totalEl.style.color = 'var(--text-primary)';
        }
    }

    const ratePercent = Math.round(data.savings_rate * 100);
    const rateEl = document.getElementById('stat-rate');
    rateEl.textContent = `%${ratePercent}`;

    // Renk kodu
    if (ratePercent >= 60) rateEl.style.color = 'var(--success)';
    else if (ratePercent >= 30) rateEl.style.color = 'var(--warning)';
    else rateEl.style.color = 'var(--danger)';
}

// ─── Gelir vs Gider Çubuk Grafiği ───────────────────────

function renderIncomeExpenseChart(monthlyData) {
    const container = document.getElementById('chart-income-expense');
    if (!monthlyData || monthlyData.every(d => d.income === 0 && d.expense === 0)) {
        return; // Boş durum mesajını göster
    }

    container.innerHTML = '<canvas id="canvas-income-expense"></canvas>';
    const ctx = document.getElementById('canvas-income-expense').getContext('2d');

    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthlyData.map(d => d.label),
            datasets: [
                {
                    label: 'Gelir',
                    data: monthlyData.map(d => d.income),
                    backgroundColor: '#22c55e',
                    borderRadius: 6,
                    barPercentage: 0.7,
                },
                {
                    label: 'Gider',
                    data: monthlyData.map(d => d.expense),
                    backgroundColor: '#ef4444',
                    borderRadius: 6,
                    barPercentage: 0.7,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor, font: { family: 'Inter', size: 12 }, boxWidth: 12, borderRadius: 3 }
                }
            },
            scales: {
                x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false } },
                y: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } }
            }
        }
    });
}

// ─── Gider Dağılımı Halka Grafiği ───────────────────────

function renderExpenseDistChart(categoryData) {
    const container = document.getElementById('chart-expense-dist');
    if (!categoryData || categoryData.length === 0) {
        return; // Boş durum mesajını göster
    }

    container.innerHTML = '<canvas id="canvas-expense-dist" style="max-height:280px;"></canvas>';
    const ctx = document.getElementById('canvas-expense-dist').getContext('2d');

    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryData.map(d => `${d.icon} ${d.name}`),
            datasets: [{
                data: categoryData.map(d => d.total),
                backgroundColor: categoryData.map(d => d.color),
                borderWidth: 2,
                borderColor: isDark ? '#1e293b' : '#ffffff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: textColor,
                        font: { family: 'Inter', size: 11 },
                        boxWidth: 10,
                        padding: 10,
                    }
                }
            }
        }
    });
}

// ─── Birikim Oranı Trend Grafiği ────────────────────────

function renderSavingsTrendChart(trendData) {
    const container = document.getElementById('chart-savings-trend');
    if (!trendData || trendData.every(d => d.rate === 0)) {
        return;
    }

    container.innerHTML = '<canvas id="canvas-savings-trend"></canvas>';
    const ctx = document.getElementById('canvas-savings-trend').getContext('2d');

    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(d => d.label),
            datasets: [{
                label: 'Birikim Oranı (%)',
                data: trendData.map(d => d.rate),
                borderColor: '#6366f1',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: isDark ? '#1e293b' : '#fff',
                pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `%${context.parsed.y}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false } },
                y: {
                    ticks: { color: textColor, font: { size: 11 }, callback: (v) => `%${v}` },
                    grid: { color: gridColor },
                    min: 0,
                    max: 100,
                }
            }
        }
    });
}

// ─── Son İşlemler Listesi ───────────────────────────────

function renderRecentTransactions(transactions) {
    const emptyEl = document.getElementById('recent-transactions-empty');
    const listEl = document.getElementById('recent-transactions');

    if (!transactions || transactions.length === 0) {
        if (emptyEl) emptyEl.style.display = '';
        if (listEl) listEl.style.display = 'none';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (listEl) listEl.style.display = '';

    const currency = Utils.getCurrency();

    listEl.innerHTML = transactions.map(t => `
        <li class="transaction-item">
            <div class="transaction-icon" style="background: ${t.category_color}15;">
                ${t.category_icon}
            </div>
            <div class="transaction-info">
                <div class="transaction-name">${t.description || t.category_name}</div>
                <div class="transaction-category">${t.category_name}</div>
            </div>
            <div style="text-align: right;">
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount, currency)}
                </div>
                <div class="transaction-date">${Utils.formatDateShort(t.transaction_date)}</div>
            </div>
        </li>
    `).join('');
}
