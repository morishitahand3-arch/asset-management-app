// Asset List View - Display assets as cards

import { ASSET_TYPE_LABELS, ASSET_TYPE_ICONS } from '../utils/constants.js';
import { formatters } from '../utils/formatters.js';

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
            currentFilter = 'all'
        } = options;

        // 検索/フィルタ結果が0件の場合
        if (assets.length === 0 && (isFiltered || searchQuery || currentFilter !== 'all')) {
            const html = `
                ${this.generateToolbar(showFilters, showSearch)}
                ${this.generateNoResultsState(searchQuery, currentFilter)}
            `;
            this.container.innerHTML = html;
            return;
        }

        // 本当に資産が0件の場合
        if (assets.length === 0) {
            this.container.innerHTML = this.generateEmptyState(emptyMessage);
            return;
        }

        const html = `
            ${showFilters || showSearch ? this.generateToolbar(showFilters, showSearch) : ''}
            <div class="asset-grid grid-3">
                ${assets.map(asset => this.generateAssetCard(asset)).join('')}
            </div>
        `;

        this.container.innerHTML = html;
    }

    // ツールバー生成（フィルタ・検索）
    generateToolbar(showFilters, showSearch) {
        return `
            <div class="asset-toolbar" style="margin-bottom: var(--spacing-lg);">
                ${showFilters ? `
                    <div class="filter-buttons" style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap; margin-bottom: var(--spacing-md);">
                        <button class="btn btn-sm btn-secondary filter-btn active" data-filter="all">
                            すべて
                        </button>
                        <button class="btn btn-sm btn-secondary filter-btn" data-filter="cash">
                            💵 現金
                        </button>
                        <button class="btn btn-sm btn-secondary filter-btn" data-filter="stock">
                            📈 株式
                        </button>
                        <button class="btn btn-sm btn-secondary filter-btn" data-filter="fund">
                            📊 投資信託
                        </button>
                        <button class="btn btn-sm btn-secondary filter-btn" data-filter="crypto">
                            ₿ 暗号資産
                        </button>
                    </div>
                ` : ''}
                ${showSearch ? `
                    <div class="search-box" style="display: flex; gap: var(--spacing-md);">
                        <input type="text" id="asset-search" class="form-input"
                               placeholder="資産名、ティッカー、シンボルで検索..."
                               style="flex: 1;">
                        <select id="asset-sort" class="form-select" style="width: 200px;">
                            <option value="date_desc">更新日（新しい順）</option>
                            <option value="date_asc">更新日（古い順）</option>
                            <option value="name_asc">名前（昇順）</option>
                            <option value="name_desc">名前（降順）</option>
                            <option value="value_desc">金額（高い順）</option>
                            <option value="value_asc">金額（低い順）</option>
                        </select>
                        <button class="btn btn-sm btn-secondary" id="csv-import-btn" title="CSVインポート">
                            📥 CSVインポート
                        </button>
                        <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
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

        return `
            <div class="card asset-card" data-asset-id="${asset.id}" data-asset-type="${asset.type}">
                <div class="asset-card-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-md);">
                    <div>
                        <div class="asset-type-badge" style="display: inline-flex; align-items: center; gap: var(--spacing-xs); font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--spacing-xs);">
                            <span>${ASSET_TYPE_ICONS[asset.type]}</span>
                            <span>${ASSET_TYPE_LABELS[asset.type]}</span>
                        </div>
                        <h3 class="asset-name" style="font-size: var(--font-size-lg); font-weight: 600; color: var(--text-primary);">
                            ${formatters.escapeHtml(asset.name)}
                        </h3>
                    </div>
                    <div class="asset-actions" style="display: flex; gap: var(--spacing-xs);">
                        ${asset.type === 'fund' ? `
                            <button class="btn btn-sm btn-primary update-price-btn"
                                    data-asset-id="${asset.id}" title="基準価額を更新">
                                🔄
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-secondary edit-asset-btn"
                                data-asset-id="${asset.id}" title="編集">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-danger delete-asset-btn"
                                data-asset-id="${asset.id}" title="削除">
                            🗑️
                        </button>
                    </div>
                </div>

                <div class="asset-card-body">
                    <div class="asset-value" style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-primary); margin-bottom: var(--spacing-sm);">
                        ${formatters.formatCurrency(value, asset.currency)}
                    </div>

                    ${this.generateAssetDetails(asset)}

                    ${profit !== null ? `
                        <div class="asset-profit" style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--border-color);">
                            <div class="profit-row" style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--text-secondary); font-size: var(--font-size-sm);">評価損益</span>
                                <span class="profit-value ${formatters.getProfitClass(profit)}"
                                      style="font-weight: 600; font-size: var(--font-size-lg);">
                                    ${formatters.formatProfitWithSign(profit, asset.currency)}
                                </span>
                            </div>
                            ${profitRate !== null ? `
                                <div class="profit-rate" style="text-align: right; color: var(--text-tertiary); font-size: var(--font-size-sm); margin-top: var(--spacing-xs);">
                                    (${formatters.formatPercentage(profitRate)})
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <div class="asset-meta" style="margin-top: var(--spacing-md); color: var(--text-tertiary); font-size: var(--font-size-xs);">
                        更新: ${formatters.formatRelativeTime(asset.updatedAt)}
                    </div>
                </div>
            </div>
        `;
    }

    // 資産タイプ別の詳細情報
    generateAssetDetails(asset) {
        const details = [];

        if (asset.type === 'cash') {
            if (asset.bankName) {
                details.push(`<div>銀行: ${formatters.escapeHtml(asset.bankName)}</div>`);
            }
        } else if (asset.type === 'stock') {
            if (asset.ticker) {
                details.push(`<div>ティッカー: ${formatters.escapeHtml(asset.ticker)}</div>`);
            }
            if (asset.quantity) {
                details.push(`<div>株数: ${formatters.formatNumber(asset.quantity, 0)}株</div>`);
            }
            if (asset.currentPrice) {
                details.push(`<div>現在価格: ${formatters.formatCurrency(asset.currentPrice, asset.currency)}</div>`);
            }
        } else if (asset.type === 'fund') {
            if (asset.fundCode) {
                details.push(`<div>コード: ${formatters.escapeHtml(asset.fundCode)}</div>`);
                // Yahoo Financeへのリンクを追加
                details.push(`
                    <div>
                        <a href="https://finance.yahoo.co.jp/quote/${formatters.escapeHtml(asset.fundCode)}"
                           target="_blank"
                           rel="noopener noreferrer"
                           style="color: var(--primary-color); text-decoration: none; font-size: var(--font-size-sm); display: inline-flex; align-items: center; gap: 4px;"
                           onclick="event.stopPropagation();">
                            🔗 Yahoo Finance で確認
                        </a>
                    </div>
                `);
            } else {
                // ファンドコードがない場合、ファンド名で検索するリンクを表示
                details.push(`
                    <div>
                        <a href="https://finance.yahoo.co.jp/search/?query=${encodeURIComponent(asset.name)}"
                           target="_blank"
                           rel="noopener noreferrer"
                           style="color: var(--primary-color); text-decoration: none; font-size: var(--font-size-sm); display: inline-flex; align-items: center; gap: 4px;"
                           onclick="event.stopPropagation();">
                            🔍 Yahoo Finance で検索
                        </a>
                    </div>
                `);
            }
            if (asset.quantity) {
                details.push(`<div>口数: ${formatters.formatNumber(asset.quantity, 0)}口</div>`);
            }
            if (asset.currentPrice) {
                details.push(`<div>基準価額: ${formatters.formatNumber(asset.currentPrice, 0)}</div>`);
            }
        } else if (asset.type === 'crypto') {
            if (asset.symbol) {
                details.push(`<div>シンボル: ${formatters.escapeHtml(asset.symbol)}</div>`);
            }
            if (asset.quantity) {
                details.push(`<div>保有量: ${formatters.formatNumber(asset.quantity, 8)}</div>`);
            }
            if (asset.currentPrice) {
                details.push(`<div>現在価格: ${formatters.formatCurrency(asset.currentPrice, asset.currency)}</div>`);
            }
        }

        if (details.length === 0) return '';

        return `
            <div class="asset-details" style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-top: var(--spacing-sm);">
                ${details.join('')}
            </div>
        `;
    }

    // 検索/フィルタ結果が0件の場合の表示
    generateNoResultsState(searchQuery, currentFilter) {
        let message = '該当する資産が見つかりませんでした';
        let details = '';

        if (searchQuery && currentFilter !== 'all') {
            details = `検索キーワード「${formatters.escapeHtml(searchQuery)}」とフィルタに一致する資産がありません`;
        } else if (searchQuery) {
            details = `検索キーワード「${formatters.escapeHtml(searchQuery)}」に一致する資産がありません`;
        } else if (currentFilter !== 'all') {
            const filterLabels = {
                'cash': '現金',
                'stock': '株式',
                'fund': '投資信託',
                'crypto': '暗号資産'
            };
            details = `${filterLabels[currentFilter] || currentFilter}の資産がありません`;
        }

        return `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-text">${message}</div>
                ${details ? `<p style="color: var(--text-tertiary); margin: var(--spacing-md) 0;">${details}</p>` : ''}
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
                <div style="display: flex; gap: var(--spacing-md); justify-content: center; flex-wrap: wrap;">
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
