/**
 * WealthWings — Giriş / Kayıt Sayfası Mantığı
 */
document.addEventListener('DOMContentLoaded', () => {
    // Zaten giriş yapılmışsa dashboard'a yönlendir
    if (Api.isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }

    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginSubmit = document.getElementById('login-submit');
    const registerSubmit = document.getElementById('register-submit');

    // Tab geçişleri
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });

    // Giriş
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            Toast.error('Kullanıcı adı ve şifre gereklidir');
            return;
        }

        loginSubmit.disabled = true;
        loginSubmit.innerHTML = '<span class="spinner"></span> Giriş yapılıyor...';

        try {
            const data = await Api.post('/auth/login', { username, password });
            if (data && data.access_token) {
                Api.setToken(data.access_token);
                Toast.success('Giriş başarılı! Yönlendiriliyorsunuz...');
                setTimeout(() => window.location.href = '/index.html', 800);
            }
        } catch (err) {
            Toast.error(err.message);
            loginSubmit.disabled = false;
            loginSubmit.innerHTML = 'Giriş Yap';
        }
    });

    // Kayıt
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const fullName = document.getElementById('register-fullname').value.trim();
        const email = document.getElementById('register-email').value.trim();

        if (!username || !password) {
            Toast.error('Kullanıcı adı ve şifre gereklidir');
            return;
        }

        if (password.length < 4) {
            Toast.error('Şifre en az 4 karakter olmalıdır');
            return;
        }

        if (password !== passwordConfirm) {
            Toast.error('Şifreler eşleşmiyor');
            return;
        }

        registerSubmit.disabled = true;
        registerSubmit.innerHTML = '<span class="spinner"></span> Hesap oluşturuluyor...';

        try {
            const data = await Api.post('/auth/register', {
                username,
                password,
                full_name: fullName || null,
                email: email || null,
            });
            if (data && data.access_token) {
                Api.setToken(data.access_token);
                Toast.success('Hesap oluşturuldu! Yönlendiriliyorsunuz...');
                setTimeout(() => window.location.href = '/index.html', 800);
            }
        } catch (err) {
            Toast.error(err.message);
            registerSubmit.disabled = false;
            registerSubmit.innerHTML = 'Hesap Oluştur';
        }
    });
});
