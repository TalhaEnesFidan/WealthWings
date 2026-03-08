/**
 * WealthWings — İşlemler Sayfası Mantığı
 * İşlem ekleme, listeleme, düzenleme, silme, filtreleme
 */
let allCategories = [];
let currentType = 'expense';
let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(initTransactions, 300);
});

async function initTransactions() {
    await loadCategories();
    await loadTransactions();
    setupForm();
    setupFilters();
}

// ─── Kategorileri Yükle ─────────────────────────────────

async function loadCategories() {
    try {
        allCategories = await Api.get('/categories');
    } catch (err) {
        console.error('Kategori yuklenemedi:', err);
    }
}

function getCategoriesByType(type) {
    return allCategories.filter(c => c.type === type);
}

function updateCategoryDropdown() {
    const select = document.getElementById('tx-category');
    const cats = getCategoriesByType(currentType);
    select.innerHTML = '<option value="">Kategori seçin</option>' +
        cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

// ─── Form Ayarları ──────────────────────────────────────

function setupForm() {
    // Tür toggle
    const incomeBtn = document.getElementById('type-income');
    const expenseBtn = document.getElementById('type-expense');

    incomeBtn.addEventListener('click', () => {
        currentType = 'income';
        incomeBtn.className = 'toggle-btn active-income';
        expenseBtn.className = 'toggle-btn';
        updateCategoryDropdown();
    });

    expenseBtn.addEventListener('click', () => {
        currentType = 'expense';
        expenseBtn.className = 'toggle-btn active-expense';
        incomeBtn.className = 'toggle-btn';
        updateCategoryDropdown();
    });

    // Varsayılan olarak gider seçili
    expenseBtn.className = 'toggle-btn active-expense';
    updateCategoryDropdown();

    // Bugünün tarihini varsayılan yap
    document.getElementById('tx-date').value = Utils.today();

    // Form gönderme
    document.getElementById('transaction-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTransaction();
    });

    // İptal butonu
    const cancelBtn = document.getElementById('tx-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetForm);
    }
}

async function saveTransaction() {
    const categoryId = document.getElementById('tx-category').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const description = document.getElementById('tx-description').value.trim();
    const note = document.getElementById('tx-note').value.trim();
    const txDate = document.getElementById('tx-date').value;

    if (!categoryId) { Toast.error('Kategori secin'); return; }
    if (!amount || amount <= 0) { Toast.error('Gecerli bir tutar girin'); return; }
    if (!txDate) { Toast.error('Tarih secin'); return; }

    const payload = {
        category_id: parseInt(categoryId),
        type: currentType,
        amount: amount,
        description: description || null,
        note: note || null,
        transaction_date: txDate,
    };

    const submitBtn = document.getElementById('tx-submit');
    submitBtn.disabled = true;

    try {
        if (editingId) {
            await Api.put(`/transactions/${editingId}`, payload);
            Toast.success('Islem guncellendi');
        } else {
            await Api.post('/transactions', payload);
            Toast.success('Islem eklendi');
        }
        resetForm();
        await loadTransactions();
    } catch (err) {
        Toast.error(err.message);
    } finally {
        submitBtn.disabled = false;
    }
}

function resetForm() {
    editingId = null;
    document.getElementById('transaction-form').reset();
    document.getElementById('tx-date').value = Utils.today();
    document.getElementById('tx-submit').textContent = 'Kaydet';
    document.getElementById('tx-cancel').style.display = 'none';
    document.getElementById('form-title').textContent = 'Yeni Islem Ekle';

    // Gider'e geri dön
    currentType = 'expense';
    document.getElementById('type-expense').className = 'toggle-btn active-expense';
    document.getElementById('type-income').className = 'toggle-btn';
    updateCategoryDropdown();
}

function editTransaction(tx) {
    editingId = tx.id;
    currentType = tx.type;

    if (tx.type === 'income') {
        document.getElementById('type-income').className = 'toggle-btn active-income';
        document.getElementById('type-expense').className = 'toggle-btn';
    } else {
        document.getElementById('type-expense').className = 'toggle-btn active-expense';
        document.getElementById('type-income').className = 'toggle-btn';
    }

    updateCategoryDropdown();
    document.getElementById('tx-category').value = tx.category_id;
    document.getElementById('tx-amount').value = tx.amount;
    document.getElementById('tx-description').value = tx.description || '';
    document.getElementById('tx-note').value = tx.note || '';
    document.getElementById('tx-date').value = tx.transaction_date;

    document.getElementById('tx-submit').textContent = 'Guncelle';
    document.getElementById('tx-cancel').style.display = 'inline-flex';
    document.getElementById('form-title').textContent = 'Islemi Duzenle';

    // Forma scroll
    document.getElementById('transaction-form').scrollIntoView({ behavior: 'smooth' });
}

async function deleteTransaction(id) {
    if (!confirm('Bu islemi silmek istediginize emin misiniz?')) return;
    try {
        await Api.delete(`/transactions/${id}`);
        Toast.success('Islem silindi');
        await loadTransactions();
    } catch (err) {
        Toast.error(err.message);
    }
}

// ─── İşlemleri Yükle ────────────────────────────────────

async function loadTransactions() {
    const filterType = document.getElementById('filter-type')?.value || '';
    const filterCategory = document.getElementById('filter-category')?.value || '';
    const filterFrom = document.getElementById('filter-from')?.value || '';
    const filterTo = document.getElementById('filter-to')?.value || '';
    const filterSearch = document.getElementById('filter-search')?.value || '';

    let query = '?limit=200';
    if (filterType) query += `&type=${filterType}`;
    if (filterCategory) query += `&category_id=${filterCategory}`;
    if (filterFrom) query += `&date_from=${filterFrom}`;
    if (filterTo) query += `&date_to=${filterTo}`;
    if (filterSearch) query += `&search=${encodeURIComponent(filterSearch)}`;

    try {
        const data = await Api.get(`/transactions${query}`);
        renderTransactions(data.transactions, data.total);
    } catch (err) {
        console.error('Islemler yuklenemedi:', err);
    }
}

function renderTransactions(transactions, total) {
    const listEl = document.getElementById('transactions-list');
    const totalEl = document.getElementById('transactions-total');
    const summaryEl = document.getElementById('filter-summary');
    const currency = Utils.getCurrency();

    if (totalEl) totalEl.textContent = `${total} islem`;

    // Filtrelenen özet
    if (summaryEl) {
        const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        summaryEl.innerHTML = `
            <span style="color:var(--success);">Gelir: ${Utils.formatCurrency(income, currency)}</span>
            <span style="margin:0 12px;">|</span>
            <span style="color:var(--danger);">Gider: ${Utils.formatCurrency(expense, currency)}</span>
            <span style="margin:0 12px;">|</span>
            <span>Net: ${Utils.formatCurrency(income - expense, currency)}</span>
        `;
    }

    if (!transactions || transactions.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-title">Islem bulunamadi</div>
                <div class="empty-state-text">Yukaridaki formu kullanarak yeni islem ekleyin.</div>
            </div>
        `;
        return;
    }

    // Tarihe göre grupla
    const grouped = {};
    transactions.forEach(t => {
        const dateKey = t.transaction_date;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(t);
    });

    let html = '';
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    for (const dateKey of sortedDates) {
        const txs = grouped[dateKey];
        html += `<div class="tx-date-group">
            <div class="tx-date-header">${Utils.formatDate(dateKey)}</div>`;

        txs.forEach(t => {
            html += `
            <div class="transaction-item" data-id="${t.id}">
                <div class="transaction-icon" style="background: ${t.category_color}15;">
                    ${t.category_icon || '📌'}
                </div>
                <div class="transaction-info">
                    <div class="transaction-name">${t.description || t.category_name}</div>
                    <div class="transaction-category">${t.category_name}</div>
                </div>
                <div style="text-align: right; display:flex; align-items:center; gap:12px;">
                    <div>
                        <div class="transaction-amount ${t.type}">
                            ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount, currency)}
                        </div>
                    </div>
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-ghost btn-sm" onclick='editTransaction(${JSON.stringify(t)})' title="Duzenle">✏️</button>
                        <button class="btn btn-ghost btn-sm" onclick="deleteTransaction(${t.id})" title="Sil">🗑️</button>
                    </div>
                </div>
            </div>`;
        });

        html += '</div>';
    }

    listEl.innerHTML = html;
}

// ─── Filtreler ──────────────────────────────────────────

function setupFilters() {
    // Filtre kategori dropdown'ını doldur
    const filterCat = document.getElementById('filter-category');
    if (filterCat) {
        filterCat.innerHTML = '<option value="">Tum Kategoriler</option>' +
            allCategories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    }

    // Filtre değişikliklerinde yeniden yükle
    ['filter-type', 'filter-category', 'filter-from', 'filter-to'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', loadTransactions);
    });

    // Arama
    const searchEl = document.getElementById('filter-search');
    if (searchEl) {
        let timeout;
        searchEl.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(loadTransactions, 400);
        });
    }
}
