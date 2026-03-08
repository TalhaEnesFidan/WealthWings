/**
 * WealthWings — API İstemci Modülü
 * Tüm backend isteklerini yöneten merkezi API wrapper
 */
const API_BASE = '/api';

class Api {
    static getToken() {
        return localStorage.getItem('ww_token');
    }

    static setToken(token) {
        localStorage.setItem('ww_token', token);
    }

    static removeToken() {
        localStorage.removeItem('ww_token');
    }

    static isAuthenticated() {
        return !!this.getToken();
    }

    static async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            // Token geçersiz → login sayfasına yönlendir
            if (response.status === 401) {
                this.removeToken();
                window.location.href = '/login.html';
                return null;
            }

            // Dosya indirme (blob)
            if (options.responseType === 'blob') {
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'İndirme hatası');
                }
                return response.blob();
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Bir hata oluştu');
            }

            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                throw new Error('Sunucuya bağlanılamadı. Lütfen uygulamanın çalıştığından emin olun.');
            }
            throw error;
        }
    }

    static get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    static put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    static delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    static download(endpoint) {
        return this.request(endpoint, {
            method: 'GET',
            responseType: 'blob',
        });
    }
}


/**
 * Toast bildirim sistemi
 */
class Toast {
    static show(message, type = 'info', duration = 3000) {
        // Varolan toast'ı kaldır
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${this.getIcon(type)}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;

        document.body.appendChild(toast);

        // Animasyonla göster
        requestAnimationFrame(() => toast.classList.add('toast-show'));

        // Otomatik kapat
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
        };
        return icons[type] || icons.info;
    }

    static success(msg) { this.show(msg, 'success'); }
    static error(msg) { this.show(msg, 'error', 5000); }
    static warning(msg) { this.show(msg, 'warning'); }
    static info(msg) { this.show(msg, 'info'); }
}


/**
 * Yardımcı fonksiyonlar
 */
const Utils = {
    /**
     * Para birimi formatla
     */
    formatCurrency(amount, currency = 'TRY') {
        const symbols = { TRY: '₺', USD: '$', EUR: '€' };
        const symbol = symbols[currency] || '₺';
        const formatted = Math.abs(amount).toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return `${amount < 0 ? '-' : ''}${formatted}${symbol}`;
    },

    /**
     * Tarihi formatla
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    },

    /**
     * Kısa tarih
     */
    formatDateShort(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    },

    /**
     * Yüzde formatla
     */
    formatPercent(value) {
        return `%${(value * 100).toFixed(1)}`;
    },

    /**
     * Bugünün tarihini YYYY-MM-DD olarak döner
     */
    today() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Kullanıcı para birimini al
     */
    getCurrency() {
        return localStorage.getItem('ww_currency') || 'TRY';
    },

    /**
     * Ay adı
     */
    monthName(month) {
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        return months[month - 1] || '';
    },
};
