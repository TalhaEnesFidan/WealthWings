/**
 * WealthWings — Kategoriler Sayfası Mantığı
 * Kategori listeleme, ekleme, düzenleme, silme
 */

let categories = [];

document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(initCategories, 300);
});

async function initCategories() {
    await loadAllCategories();
    setupCategoryForm();
}

// ─── Veri Yükleme ───────────────────────────────────────

async function loadAllCategories() {
    try {
        categories = await Api.get('/categories');
        renderCategories();
    } catch (err) {
        Toast.error('Kategoriler yuklenemedi');
    }
}

// ─── Render ─────────────────────────────────────────────

function renderCategories() {
    const incomeList = document.getElementById('income-categories');
    const expenseList = document.getElementById('expense-categories');

    const incomeCats = categories.filter(c => c.type === 'income');
    const expenseCats = categories.filter(c => c.type === 'expense');

    incomeList.innerHTML = incomeCats.map(c => categoryCard(c)).join('');
    expenseList.innerHTML = expenseCats.map(c => categoryCard(c)).join('');
}

function categoryCard(cat) {
    return `
    <div class="category-card" style="border-left: 4px solid ${cat.color};">
        <div class="category-card-info">
            <span class="category-card-icon">${cat.icon}</span>
            <span class="category-card-name">${cat.name}</span>
            ${cat.is_default ? '<span class="badge badge-primary" style="font-size:10px;">Varsayilan</span>' : ''}
        </div>
        <div class="category-card-actions">
            ${!cat.is_default ? `
                <button class="btn btn-ghost btn-sm" onclick='editCategory(${JSON.stringify(cat)})'>✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteCategory(${cat.id})">🗑️</button>
            ` : ''}
        </div>
    </div>`;
}

// ─── Form ───────────────────────────────────────────────

let editingCatId = null;

function setupCategoryForm() {
    document.getElementById('category-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('cat-name').value.trim();
        const type = document.getElementById('cat-type').value;
        const icon = document.getElementById('cat-icon').value.trim() || '📌';
        const color = document.getElementById('cat-color').value;

        if (!name) { Toast.error('Kategori adi girin'); return; }

        try {
            if (editingCatId) {
                await Api.put(`/categories/${editingCatId}`, { name, icon, color });
                Toast.success('Kategori guncellendi');
            } else {
                await Api.post('/categories', { name, type, icon, color });
                Toast.success('Kategori eklendi');
            }
            resetCategoryForm();
            await loadAllCategories();
        } catch (err) {
            Toast.error(err.message);
        }
    });
}

function editCategory(cat) {
    editingCatId = cat.id;
    document.getElementById('cat-name').value = cat.name;
    document.getElementById('cat-type').value = cat.type;
    document.getElementById('cat-type').disabled = true;
    document.getElementById('cat-icon').value = cat.icon;
    document.getElementById('cat-color').value = cat.color;
    document.getElementById('cat-submit').textContent = 'Guncelle';
    document.getElementById('cat-cancel').style.display = 'inline-flex';
    document.getElementById('cat-form-title').textContent = 'Kategori Duzenle';
}

function resetCategoryForm() {
    editingCatId = null;
    document.getElementById('category-form').reset();
    document.getElementById('cat-type').disabled = false;
    document.getElementById('cat-color').value = '#6366f1';
    document.getElementById('cat-submit').textContent = 'Ekle';
    document.getElementById('cat-cancel').style.display = 'none';
    document.getElementById('cat-form-title').textContent = 'Yeni Kategori';
}

async function deleteCategory(id) {
    if (!confirm('Bu kategoriyi silmek istediginize emin misiniz?')) return;
    try {
        await Api.delete(`/categories/${id}`);
        Toast.success('Kategori silindi');
        await loadAllCategories();
    } catch (err) {
        Toast.error(err.message);
    }
}
