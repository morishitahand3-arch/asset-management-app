// Formatting Functions

import { CURRENCY_SYMBOLS } from './constants.js';

export const formatters = {
    // 数値を通貨形式でフォーマット
    formatCurrency(value, currency = 'JPY') {
        const symbol = CURRENCY_SYMBOLS[currency] || '¥';
        const formattedValue = new Intl.NumberFormat('ja-JP').format(Math.round(value));
        return `${symbol}${formattedValue}`;
    },

    // 数値をフォーマット（小数点付き）
    formatNumber(value, decimals = 2) {
        return new Intl.NumberFormat('ja-JP', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    },

    // パーセンテージをフォーマット
    formatPercentage(value, decimals = 2) {
        return `${formatters.formatNumber(value, decimals)}%`;
    },

    // 日付をフォーマット
    formatDate(dateString, format = 'short') {
        const date = new Date(dateString);

        if (format === 'short') {
            // YYYY/MM/DD
            return new Intl.DateTimeFormat('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(date);
        } else if (format === 'long') {
            // YYYY年MM月DD日
            return new Intl.DateTimeFormat('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date);
        } else if (format === 'datetime') {
            // YYYY/MM/DD HH:MM
            return new Intl.DateTimeFormat('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        }

        return date.toLocaleDateString('ja-JP');
    },

    // 相対的な時間をフォーマット（「3日前」など）
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'たった今';
        if (diffMins < 60) return `${diffMins}分前`;
        if (diffHours < 24) return `${diffHours}時間前`;
        if (diffDays < 7) return `${diffDays}日前`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
        return `${Math.floor(diffDays / 365)}年前`;
    },

    // 損益に応じたクラス名を返す
    getProfitClass(profit) {
        if (profit > 0) return 'positive';
        if (profit < 0) return 'negative';
        return 'neutral';
    },

    // 損益に応じた符号付きテキストを返す
    formatProfitWithSign(profit, currency = 'JPY') {
        const sign = profit >= 0 ? '+' : '';
        return `${sign}${formatters.formatCurrency(profit, currency)}`;
    },

    // 大きな数値を短縮形式でフォーマット（10,000 → 1万円）
    formatLargeNumber(value, currency = 'JPY') {
        const symbol = CURRENCY_SYMBOLS[currency] || '¥';

        if (Math.abs(value) >= 100000000) {
            // 1億以上
            return `${symbol}${formatters.formatNumber(value / 100000000, 1)}億`;
        } else if (Math.abs(value) >= 10000) {
            // 1万以上
            return `${symbol}${formatters.formatNumber(value / 10000, 1)}万`;
        }

        return formatters.formatCurrency(value, currency);
    },

    // HTMLエスケープ（XSS対策）
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 資産タイプの日本語名を取得
    getAssetTypeLabel(type) {
        const labels = {
            cash: '現金',
            stock: '株式',
            fund: '投資信託',
            crypto: '暗号資産'
        };
        return labels[type] || type;
    },

    // 数値入力のバリデーション・フォーマット
    parseNumberInput(value) {
        if (value === '' || value === null || value === undefined) {
            return null;
        }

        // カンマを除去
        const cleaned = String(value).replace(/,/g, '');
        const parsed = parseFloat(cleaned);

        return isNaN(parsed) ? null : parsed;
    }
};
