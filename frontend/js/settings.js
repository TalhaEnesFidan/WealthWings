/**
 * WealthWings — Settings Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Current user bilgilerini yükle
    await loadUserProfile();

    // 2. Form event listener'ları kur
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordUpdate);
    }

    // Dil değiştiğinde anında arayüzü güncelle
    const langSelect = document.getElementById('profLang');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            if (typeof setLanguage === 'function') {
                setLanguage(e.target.value);
            }
        });
    }
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleAccountDeletion);
    }
});

async function handleAccountDeletion() {
    const confirmMsg = typeof t === 'function' ? t('settings.deleteConfirmTitle') : "Hesabınızı silmek istediğinize emin misiniz?";
    const dangerMsg = typeof t === 'function' ? t('settings.deleteConfirmText') : "Bu işlem geri alınamaz!";

    if (!confirm(`${confirmMsg}\n\n${dangerMsg}`)) return;

    try {
        await Api.delete('/auth/account');
        showToast("Hesabınız silindi. Elveda...", "success");
        setTimeout(() => {
            Api.removeToken();
            window.location.href = '/login.html';
        }, 2000);
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function loadUserProfile() {
    showToast("Profil bilgileri yükleniyor...", "info");
    try {
        const user = await Api.get('/auth/me');
        if (user) {
            document.getElementById('profUsername').value = user.username;
            document.getElementById('profFullName').value = user.full_name || '';
            document.getElementById('profEmail').value = user.email || '';
            document.getElementById('profLang').value = user.language || 'tr';
            document.getElementById('profCurrency').value = user.currency || 'TRY';
        }
    } catch (err) {
        showToast("Profil bilgileri alınamadı", "error");
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();

    const payload = {
        full_name: document.getElementById('profFullName').value.trim() || null,
        email: document.getElementById('profEmail').value.trim() || null,
        language: document.getElementById('profLang').value,
        currency: document.getElementById('profCurrency').value
    };

    try {
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = "...";
        btn.disabled = true;

        const updated = await Api.put('/auth/profile', payload);
        showToast(typeof t === 'function' ? t('settings.successProfile') : "Profil güncellendi!", "success");

        // Greeting'i de güncelleme ihtimaline karşı (dashboard/settings topbar)
        const greeting = document.getElementById('userGreeting');
        if (greeting && updated.full_name) {
            greeting.textContent = `Merhaba, ${updated.full_name.split(' ')[0]}!`;
        }

        btn.textContent = originalText;
        btn.disabled = false;

    } catch (err) {
        showToast(err.message, "error");
        e.target.querySelector('button[type="submit"]').textContent = typeof t === 'function' ? t('settings.saveProfile') : "Profili Güncelle";
        e.target.querySelector('button[type="submit"]').disabled = false;
    }
}

async function handlePasswordUpdate(e) {
    e.preventDefault();

    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (newPass !== confirm) {
        showToast("Yeni şifreler eşleşmiyor!", "error");
        return;
    }

    try {
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        await Api.put('/auth/password', {
            current_password: current,
            new_password: newPass
        });

        showToast(typeof t === 'function' ? t('settings.successPassword') : "Şifre güncellendi, tekrar giriş yapın.", "success");
        e.target.reset();

        // Log out after short delay
        setTimeout(() => {
            Api.removeToken();
            window.location.href = '/login.html';
        }, 2000);

    } catch (err) {
        showToast(err.message, "error");
        e.target.querySelector('button[type="submit"]').disabled = false;
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return alert(message);

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
