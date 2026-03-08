/**
 * WealthWings — Ortak Uygulama Başlatıcı
 * Her sayfada (login hariç) yüklenir. Auth guard, kullanıcı bilgisi, sidebar aktif durumu.
 */
const App = {
    user: null,

    async init() {
        // Auth kontrolü
        if (!Api.isAuthenticated()) {
            window.location.href = '/login.html';
            return;
        }

        // Kullanıcı bilgisini yükle
        try {
            this.user = await Api.get('/auth/me');
            if (this.user) {
                localStorage.setItem('ww_currency', this.user.currency);
                this.updateUserUI();
            }
        } catch (err) {
            Api.removeToken();
            window.location.href = '/login.html';
            return;
        }

        // Sidebar aktif durumu
        this.setActiveSidebar();

        // Sidebar mobil toggle
        this.setupMobileMenu();

        // Çıkış butonu
        this.setupLogout();
    },

    updateUserUI() {
        const nameEl = document.getElementById('user-display-name');
        const avatarEl = document.getElementById('user-avatar-text');

        if (nameEl && this.user) {
            nameEl.textContent = this.user.full_name || this.user.username;
        }
        if (avatarEl && this.user) {
            const name = this.user.full_name || this.user.username;
            avatarEl.textContent = name.charAt(0).toUpperCase();
        }
    },

    setActiveSidebar() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const links = document.querySelectorAll('.sidebar-nav a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || href === '/' + currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    setupMobileMenu() {
        const toggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('sidebar-open');
                if (overlay) overlay.classList.toggle('show');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('show');
            });
        }
    },

    setupLogout() {
        const btn = document.getElementById('logout-btn');
        if (btn) {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await Api.post('/auth/logout', {});
                } catch (err) {
                    // Logout her durumda yapılacak
                }
                Api.removeToken();
                localStorage.removeItem('ww_currency');
                window.location.href = '/login.html';
            });
        }
    }
};

// Sayfa yüklendikten sonra başlat
document.addEventListener('DOMContentLoaded', () => App.init());
