/**
 * WealthWings — Borç Yönetimi Sayfası
 */

let selectedDebtId = null;

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
                    <span class="debt-icon">${debt.is_paid ? '✅' : isOverdue ? '⚠️' : '�️'}</span>
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
                ${!debt.is_paid ? `<button class="btn btn-sm btn-success" onclick="openPayModal(${debt.id}, '${debt.title}', ${debt.remaining})">💳 Ödeme Yap</button>` : ''}
                <button class="btn btn-sm btn-ghost" onclick="openPaymentsModal(${debt.id}, '${debt.title}')">📋 Geçmiş</button>
                <button class="btn btn-sm btn-danger" onclick="openDeleteModal(${debt.id}, '${debt.title}')">🗑️</button>
            </div>
        </div>`;
    }).join('');
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

        const payload = {
            amount: parseFloat(document.getElementById('payAmount').value),
            paid_at: document.getElementById('payDate').value,
            note: document.getElementById('payNote').value.trim() || null,
        };

        try {
            await Api.post(`/debts/${selectedDebtId}/pay`, payload);
            Toast.success('💳 Ödeme kaydedildi!');
            closePayModal();
            await loadDebtData();
        } catch (err) {
            Toast.error('Ödeme yapılamadı: ' + err.message);
        }
    });
}

function openPayModal(debtId, title, remaining) {
    selectedDebtId = debtId;
    document.getElementById('payModalTitle').textContent = `💳 Ödeme — ${title}`;
    document.getElementById('payAmount').value = '';
    document.getElementById('payAmount').max = remaining;
    document.getElementById('payDate').value = Utils.today();
    document.getElementById('payNote').value = '';
    document.getElementById('payMaxHint').textContent = `Kalan: ${Utils.formatCurrency(remaining, Utils.getCurrency())}`;
    document.getElementById('payModal').style.display = 'flex';
}

function closePayModal() {
    document.getElementById('payModal').style.display = 'none';
    selectedDebtId = null;
}

// ───────────────────────────── Ödeme Geçmişi ───────────────────────────────

async function openPaymentsModal(debtId, title) {
    document.getElementById('paymentModalTitle').textContent = `📋 Ödeme Geçmişi — ${title}`;
    document.getElementById('paymentsModal').style.display = 'flex';
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

function openDeleteModal(debtId, title) {
    selectedDebtId = debtId;
    document.getElementById('deleteMessage').textContent = `"${title}" borcunu silmek istediğinizden emin misiniz? Tüm ödeme geçmişi de silinecek!`;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    selectedDebtId = null;
}

// Modal dışına tıklayınca kapat
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
        selectedDebtId = null;
    }
});
