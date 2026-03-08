/**
 * WealthWings — Borç Yönetimi Sayfası
 */

let selectedDebtId = null;
let currentSavings = 0;

// ───────────────────────────────── Init ────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    if (!Api.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    initNavbar();
    initDebtForm();
    initPayModal();
    initDeleteModal();
    await loadDebtData();

    document.getElementById('showPaidToggle')?.addEventListener('change', loadDebtData);
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

// ──────────────────────────── Ana Veri Yükleme ─────────────────────────────

async function loadDebtData() {
    try {
        const includePaid = document.getElementById('showPaidToggle')?.checked || false;
        const [debts, summary] = await Promise.all([
            Api.get(`/debts?include_paid=${includePaid}`),
            Api.get('/debts/summary/all'),
        ]);
        renderDebtSummary(summary);
        renderDebtList(debts, summary);
    } catch (err) {
        Toast.error('Veriler yüklenemedi: ' + err.message);
    }
}

function renderDebtSummary(summary) {
    const currency = Utils.getCurrency();
    document.getElementById('totalRemaining').textContent =
        summary.total_remaining > 0
            ? Utils.formatCurrency(summary.total_remaining, currency)
            : '✅ Borçsuz!';
    document.getElementById('monthlyPayments').textContent =
        Utils.formatCurrency(summary.monthly_payments || 0, currency);
    document.getElementById('paidCount').textContent = `${summary.paid_count || 0} borç`;
}

function renderDebtList(debts, summary) {
    const container = document.getElementById('debtList');
    if (!debts || debts.length === 0) {
        container.innerHTML = '<div class="empty-state">🎉 Hiç borcunuz yok!</div>';
        return;
    }

    const currency = Utils.getCurrency();
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = debts.map(debt => {
        const paidPct = debt.total_amount > 0
            ? Math.round((1 - debt.remaining / debt.total_amount) * 100)
            : 100;
        const isOverdue = debt.due_date && debt.due_date < today && !debt.is_paid;
        const barColor = debt.is_paid ? 'progress-success' : debt.remaining / debt.total_amount > 0.7 ? 'progress-danger' : debt.remaining / debt.total_amount > 0.3 ? 'progress-warning' : 'progress-success';

        return `
        <div class="debt-card ${debt.is_paid ? 'debt-paid' : ''} ${isOverdue ? 'debt-overdue' : ''}" data-id="${debt.id}">
            <div class="debt-card-header">
                <div class="debt-title-row">
                    <span class="debt-icon">${debt.is_paid ? '✅' : isOverdue ? '⚠️' : '🛡️'}</span>
                    <div>
                        <strong class="debt-name">${debt.title}</strong>
                        ${isOverdue ? '<span class="overdue-badge">VADESİ GEÇMİŞ</span>' : ''}
                        ${debt.description ? `<div class="debt-desc">${debt.description}</div>` : ''}
                    </div>
                </div>
                <div class="debt-amounts">
                    <span class="debt-remaining ${debt.is_paid ? 'text-success' : 'text-danger'}">
                        ${debt.is_paid ? 'Ödendi' : Utils.formatCurrency(debt.remaining, currency)}
                    </span>
                    <span class="debt-total">/ ${Utils.formatCurrency(debt.total_amount, currency)}</span>
                </div>
            </div>

            <div class="progress-bar-container mt-sm">
                <div class="progress-bar ${barColor}" style="width:${paidPct}%"></div>
            </div>
            <div class="debt-progress-label">
                <span>%${paidPct} ödendi</span>
                ${debt.due_date ? `<span>Son ödeme: ${Utils.formatDateShort(debt.due_date)}</span>` : ''}
            </div>

            <div class="debt-actions">
                ${!debt.is_paid ? `<button class="btn btn-sm btn-success action-pay-btn" data-id="${debt.id}" data-title="${debt.title.replace(/"/g, '&quot;')}" data-remaining="${debt.remaining}">💳 Ödeme Yap</button>` : ''}
                <button class="btn btn-sm btn-ghost action-history-btn" data-id="${debt.id}" data-title="${debt.title.replace(/"/g, '&quot;')}">📋 Geçmiş</button>
                <button class="btn btn-sm btn-danger action-delete-btn" data-id="${debt.id}" data-title="${debt.title.replace(/"/g, '&quot;')}">🗑️</button>
            </div>
        </div>`;
    }).join('');

    // Attach event delegation for action buttons
    container.removeEventListener('click', handleDebtActionClick); // Avoid duplicate listeners
    container.addEventListener('click', handleDebtActionClick);
}

function handleDebtActionClick(e) {
    const payBtn = e.target.closest('.action-pay-btn');
    if (payBtn) {
        const id = payBtn.dataset.id;
        const title = payBtn.dataset.title;
        const remaining = parseFloat(payBtn.dataset.remaining);
        openPayModal(id, title, remaining);
        return;
    }

    const historyBtn = e.target.closest('.action-history-btn');
    if (historyBtn) {
        const id = historyBtn.dataset.id;
        const title = historyBtn.dataset.title;
        openPaymentsModal(id, title);
        return;
    }

    const deleteBtn = e.target.closest('.action-delete-btn');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const title = deleteBtn.dataset.title;
        openDeleteModal(id, title);
        return;
    }
}

// ─────────────────────────────── Borç Formu ────────────────────────────────

function initDebtForm() {
    document.getElementById('debtForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            title: document.getElementById('debtTitle').value.trim(),
            total_amount: parseFloat(document.getElementById('debtAmount').value),
            due_date: document.getElementById('debtDueDate').value || null,
            description: document.getElementById('debtDescription').value.trim() || null,
        };

        try {
            await Api.post('/debts', payload);
            Toast.success('✅ Borç eklendi!');
            e.target.reset();
            await loadDebtData();
        } catch (err) {
            Toast.error('Borç eklenemedi: ' + err.message);
        }
    });
}

// ────────────────────────────── Ödeme Modalı ───────────────────────────────

function initPayModal() {
    document.getElementById('closePayModal')?.addEventListener('click', closePayModal);
    document.getElementById('cancelPayBtn')?.addEventListener('click', closePayModal);

    document.getElementById('payForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedDebtId) return;

        const amount = parseFloat(document.getElementById('payAmount').value);

        if (amount > currentSavings) {
            Toast.error(`Yetersiz birikim! Maksimum ${Utils.formatCurrency(currentSavings, Utils.getCurrency())} ödeyebilirsiniz.`);
            return;
        }

        const payload = {
            amount: amount,
            paid_at: document.getElementById('payDate').value,
            note: document.getElementById('payNote').value.trim() || null,
        };

        try {
            await Api.post(`/debts/${selectedDebtId}/pay`, payload);
            Toast.success('💳 Ödeme kaydedildi!');
            closePayModal();
            await loadDebtData();
            // Refresh app-wide savings data if implemented elsewhere
        } catch (err) {
            Toast.error('Ödeme yapılamadı: ' + err.message);
        }
    });

    document.getElementById('paySavingsHint')?.addEventListener('click', () => {
        const remaining = parseFloat(document.getElementById('payAmount').max);
        const maxPayable = Math.min(remaining, currentSavings);
        if (maxPayable > 0) {
            document.getElementById('payAmount').value = maxPayable.toFixed(2);
        } else {
            Toast.error('Kullanılabilir birikiminiz yok.');
        }
    });
}

window.openPayModal = async function (debtId, title, remaining) {
    selectedDebtId = debtId;
    document.getElementById('payModalTitle').textContent = `💳 Ödeme — ${title}`;
    document.getElementById('payAmount').value = '';
    document.getElementById('payAmount').max = remaining;
    document.getElementById('payDate').value = Utils.today();
    document.getElementById('payNote').value = '';
    document.getElementById('payMaxHint').textContent = `Kalan: ${Utils.formatCurrency(remaining, Utils.getCurrency())}`;

    // Fetch current savings
    try {
        const savingsData = await Api.get('/savings/scorecard');
        currentSavings = savingsData.stats.overall_savings > 0 ? savingsData.stats.overall_savings : 0;
    } catch (err) {
        console.error('Savings fetch error:', err);
        currentSavings = 0;
    }

    document.getElementById('paySavingsHint').textContent = `Birikim: ${Utils.formatCurrency(currentSavings, Utils.getCurrency())} (Tümünü Kullan)`;
    document.getElementById('payModal').style.display = 'flex';
    document.getElementById('payModal').classList.add('show');
};

window.closePayModal = function () {
    document.getElementById('payModal').style.display = 'none';
    document.getElementById('payModal').classList.remove('show');
    selectedDebtId = null;
    currentSavings = 0;
};

// ───────────────────────────── Ödeme Geçmişi ───────────────────────────────

window.openPaymentsModal = async function (debtId, title) {
    document.getElementById('paymentModalTitle').textContent = `📋 Ödeme Geçmişi — ${title}`;
    document.getElementById('paymentsModal').style.display = 'flex';
    document.getElementById('paymentsModal').classList.add('show');
    document.getElementById('paymentHistoryList').innerHTML = '<div class="loading">Yükleniyor...</div>';

    try {
        const payments = await Api.get(`/debts/${debtId}/payments`);
        const currency = Utils.getCurrency();
        if (!payments || payments.length === 0) {
            document.getElementById('paymentHistoryList').innerHTML = '<div class="empty-state">Henüz ödeme yapılmamış.</div>';
            return;
        }
        document.getElementById('paymentHistoryList').innerHTML = payments.map(p => `
            <div class="payment-item">
                <div class="payment-info">
                    <span class="payment-date">${Utils.formatDateShort(p.paid_at)}</span>
                    ${p.note ? `<span class="payment-note">${p.note}</span>` : ''}
                </div>
                <span class="payment-amount text-success">+${Utils.formatCurrency(p.amount, currency)}</span>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('paymentHistoryList').innerHTML = '<div class="empty-state text-danger">Ödeme geçmişi yüklenemedi.</div>';
    }
}

document.getElementById('closePaymentsModal')?.addEventListener('click', () => {
    document.getElementById('paymentsModal').style.display = 'none';
    document.getElementById('paymentsModal').classList.remove('show');
});

// ─────────────────────────────── Silme Modalı ──────────────────────────────

function initDeleteModal() {
    document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
        if (!selectedDebtId) return;
        try {
            await Api.delete(`/debts/${selectedDebtId}`);
            Toast.success('🗑️ Borç silindi');
            closeDeleteModal();
            await loadDebtData();
        } catch (err) {
            Toast.error('Silinemedi: ' + err.message);
        }
    });
}

window.openDeleteModal = function (debtId, title) {
    selectedDebtId = debtId;
    document.getElementById('deleteMessage').textContent = `"${title}" borcunu silmek istediğinizden emin misiniz? Tüm ödeme geçmişi de silinecek!`;
    document.getElementById('deleteModal').style.display = 'flex';
    document.getElementById('deleteModal').classList.add('show');
};

window.closeDeleteModal = function () {
    document.getElementById('deleteModal').style.display = 'none';
    document.getElementById('deleteModal').classList.remove('show');
    selectedDebtId = null;
};

// Modal dışına tıklayınca kapat
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
        e.target.classList.remove('show');
        selectedDebtId = null;
    }
});
