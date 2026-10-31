// Asset List View - Display assets as cards

import { ASSET_TYPE_LABELS, ASSET_TYPE_ICONS } from '../utils/constants.js';
import { formatters } from '../utils/formatters.js';

const FILTERS = [
    { value: 'all', label: 'すべて' },
    { value: 'cash', label: '💵 現金' },
    { value: 'stock', label: '📈 株式' },
    { value: 'fund', label: '📊 投資信託' },
    { value: 'crypto', label: '₿ 暗号資産' }
];

const SORT_OPTIONS = [
    { value: 'date_desc', label: '更新日（新しい順）' },
    { value: 'date_asc', label: '更新日（古い順）' },
    { value: 'name_asc', label: '名前（昇順）' },
    { value: 'name_desc', label: '名前（降順）' },
    { value: 'value_desc', label: '金額（高い順）' },
    { value: 'value_asc', label: '金額（低い順）' }
];

export class AssetListView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    // 資産一覧を生成
    render(assets, options = {}) {
        if (!this.container) return;

        const {
            showFilters = true,
            showSearch = true,
            emptyMessage = '資産が登録されていません',
            isFiltered = false,
            searchQuery = '',
            currentFilter = 'all',
            sortOption = 'date_desc'
        } = options;

        const toolbar = showFilters || showSearch
            ? this.generateToolbar(showFilters, showSearch, currentFilter, sortOption)
            : '';

        // 検索/フィルタ結果が0件の場合
        if (assets.length === 0 && (isFiltered || searchQuery || currentFilter !== 'all')) {
            this.container.innerHTML = `
                ${toolbar}
                ${this.generateNoResultsState(searchQuery, currentFilter)}
            `;
            return;
        }

        // 本当に資産が0件の場合
        if (assets.length === 0) {
            this.container.innerHTML = this.generateEmptyState(emptyMessage);
            return;
        }

        const total = assets.reduce((sum, asset) => sum + asset.getCurrentValue(), 0);

        this.container.innerHTML = `
            ${toolbar}
            <div class="asset-list-summary">
                <span>${assets.length}件</span>
                <span>合計 <strong>${formatters.formatCurrency(total)}</strong></span>
            </div>
            <div class="asset-grid">
                ${assets.map(asset => this.generateAssetCard(asset)).join('')}
            </div>
        `;
    }

    // ツールバー生成（フィルタ・検索）
    generateToolbar(showFilters, showSearch, currentFilter, sortOption) {
        return `
            <div class="asset-toolbar">
                ${showSearch ? `
                    <div class="asset-search-row">
                        <div class="search-field">
                            <span class="search-field-icon" aria-hidden="true">🔍</span>
                            <input type="search" id="asset-search" class="form-input"
                                   placeholder="資産名・ティッカー・シンボルで検索">
                        </div>
                        <select id="asset-sort" class="form-select" aria-label="並び順">
                            ${SORT_OPTIONS.map(opt => `
                                <option value="${opt.value}" ${opt.value === sortOption ? 'selected' : ''}>${opt.label}</option>
                            `).join('')}
                        </select>
                        <button class="btn btn-secondary" id="csv-import-btn" title="CSVインポート">
                            📥 CSV取込
                        </button>
                        <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
                    </div>
                ` : ''}
                ${showFilters ? `
                    <div class="chip-group" role="group" aria-label="資産タイプで絞り込み">
                        ${FILTERS.map(f => `
                            <button class="chip filter-btn ${f.value === currentFilter ? 'active' : ''}" data-filter="${f.value}">
                                ${f.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // 資産カード生成
    generateAssetCard(asset) {
        const value = asset.getCurrentValue();
        const profit = asset.getProfit ? asset.getProfit() : null;
        const profitRate = asset.getProfitRate ? asset.getProfitRate() : null;
        const profitClass = profit !== null ? formatters.getProfitClass(profit) : '';

        return `
            <div class="card asset-card" data-asset-id="${asset.id}" data-asset-type="${asset.type}">
                <div class="asset-card-main">
                    <span class="asset-summary-icon ${asset.type}">${ASSET_TYPE_ICONS[asset.type]}</span>
                    <div class="asset-card-info">
                        <h3 class="asset-name">${formatters.escapeHtml(asset.name)}</h3>
                        <div class="asset-card-sub">${this.generateSubline(asset)}</div>
                    </div>
                    <div class="asset-card-value">
                        <div class="asset-value">${formatters.formatCurrency(value, asset.currency)}</div>
                        ${profit !== null ? `
                            <div class="asset-profit ${profitClass}">
                                ${formatters.formatProfitWithSign(profit, asset.currency)}
                                ${profitRate !== null ? `
                                    <span class="delta ${profitClass}">${profitRate >= 0 ? '+' : ''}${formatters.formatPercentage(profitRate)}</span>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="asset-card-footer">
                    <div class="asset-meta">
                        ${this.generateAssetDetails(asset)}
                        <span>更新 ${formatters.formatRelativeTime(asset.updatedAt)}</span>
                    </div>
                    <div class="asset-actions">
                        ${asset.type === 'fund' ? `
                            <button class="icon-btn update-price-btn"
                                    data-asset-id="${asset.id}" title="基準価額を更新" aria-label="基準価額を更新">
                                🔄
                            </button>
                        ` : ''}
                        <button class="icon-btn edit-asset-btn"
                                data-asset-id="${asset.id}" title="編集" aria-label="編集">
                            ✏️
                        </button>
                        <button class="icon-btn danger delete-asset-btn"
                                data-asset-id="${asset.id}" title="削除" aria-label="削除">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // 名前の下に出す要約（種類・コード・数量）
    generateSubline(asset) {
        const parts = [ASSET_TYPE_LABELS[asset.type]];

        if (asset.type === 'cash') {
            if (asset.bankName) parts.push(formatters.escapeHtml(asset.bankName));
        } else if (asset.type === 'stock') {
            if (asset.ticker) parts.push(formatters.escapeHtml(asset.ticker));
            if (asset.quantity) parts.push(`${formatters.formatNumber(asset.quantity, 0)}株`);
        } else if (asset.type === 'fund') {
            if (asset.fundCode) parts.push(formatters.escapeHtml(asset.fundCode));
            if (asset.quantity) parts.push(`${formatters.formatNumber(asset.quantity, 0)}口`);
        } else if (asset.type === 'crypto') {
            if (asset.symbol) parts.push(formatters.escapeHtml(asset.symbol));
            if (asset.quantity) parts.push(formatters.formatNumber(asset.quantity, 8));
        }

        return parts.join(' · ');
    }

    // 資産タイプ別の補足情報（現在価格・リンク）
    generateAssetDetails(asset) {
        const details = [];

        if (asset.type === 'stock' || asset.type === 'crypto') {
            if (asset.currentPrice) {
                details.push(`<span>現在価格 ${formatters.formatCurrency(asset.currentPrice, asset.currency)}</span>`);
            }
        } else if (asset.type === 'fund') {
            if (asset.currentPrice) {
                details.push(`<span>基準価額 ${formatters.formatNumber(asset.currentPrice, 0)}</span>`);
            }
            const url = asset.fundCode
                ? `https://finance.yahoo.co.jp/quote/${encodeURIComponent(asset.fundCode)}`
                : `https://finance.yahoo.co.jp/search/?query=${encodeURIComponent(asset.name)}`;
            details.push(`
                <a href="${url}" class="asset-link" target="_blank" rel="noopener noreferrer"
                   onclick="event.stopPropagation();">
                    ${asset.fundCode ? 'Yahoo!ファイナンスで確認' : 'Yahoo!ファイナンスで検索'} ↗
                </a>
            `);
        }

        return details.join('');
    }

    // 検索/フィルタ結果が0件の場合の表示
    generateNoResultsState(searchQuery, currentFilter) {
        let details = '';

        if (searchQuery && currentFilter !== 'all') {
            details = `検索キーワード「${formatters.escapeHtml(searchQuery)}」とフィルタに一致する資産がありません`;
        } else if (searchQuery) {
            details = `検索キーワード「${formatters.escapeHtml(searchQuery)}」に一致する資産がありません`;
        } else if (currentFilter !== 'all') {
            details = `${ASSET_TYPE_LABELS[currentFilter] || currentFilter}の資産がありません`;
        }

        return `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-text">該当する資産が見つかりませんでした</div>
                ${details ? `<p class="empty-state-hint">${details}</p>` : ''}
                <button class="btn btn-secondary" id="clear-search-filter">
                    検索・フィルタをクリア
                </button>
            </div>
        `;
    }

    // 空状態を生成
    generateEmptyState(message) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">${message}</div>
                <p class="empty-state-hint">手入力で登録するか、証券会社のCSVを取り込めます</p>
                <div class="empty-state-actions">
                    <button class="btn btn-primary" id="add-first-asset">
                        最初の資産を登録
                    </button>
                    <button class="btn btn-secondary" id="csv-import-btn">
                        📥 CSVインポート
                    </button>
                    <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
                </div>
            </div>
        `;
    }
}
