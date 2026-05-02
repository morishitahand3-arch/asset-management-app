// Dashboard View - Display dashboard statistics and charts

import { ASSET_TYPE_LABELS, ASSET_TYPE_ICONS } from '../utils/constants.js';
import { formatters } from '../utils/formatters.js';

export class DashboardView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    // ダッシュボード全体を生成
    render(stats) {
        if (!this.container) return;

        if (!stats || stats.totalAssets === 0) {
            this.container.innerHTML = this.generateEmptyState();
            return;
        }

        const html = `
            ${this.generateTotalValueCard(stats.totalValue)}
            ${this.generateAssetSummaryGrid(stats.allocation)}
            <div class="grid grid-2">
                <div class="chart-container">
                    <h3 class="card-title">資産構成</h3>
                    <div class="chart-wrapper">
                        <canvas id="asset-allocation-chart"></canvas>
                    </div>
                </div>
                ${this.generateProfitLossCard(stats.profitLoss)}
            </div>
            ${this.generateMonthlyTrendChart()}
            ${this.generateAggregatedAssetsList(stats.aggregatedByIdentifier)}
            ${this.generateRecentAssetsList(stats.recent)}
        `;

        this.container.innerHTML = html;
    }

    // 総資産額カード
    generateTotalValueCard(totalValue) {
        return `
            <div class="total-value-card">
                <div class="total-value-header">
                    <div>
                        <div class="total-value-label">総資産額</div>
                        <div class="total-value-amount">${formatters.formatCurrency(totalValue)}</div>
                    </div>
                    <button class="btn btn-secondary" id="bulk-update-prices" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                        🔄 価格を一括更新
                    </button>
                </div>
                <div id="update-progress" style="margin-top: var(--spacing-md); display: none;">
                    <div style="font-size: var(--font-size-sm); margin-bottom: var(--spacing-xs);">
                        更新中: <span id="progress-text">0/0</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; overflow: hidden;">
                        <div id="progress-bar" style="background: white; height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // 資産タイプ別サマリーグリッド
    generateAssetSummaryGrid(allocation) {
        return `
            <div class="asset-summary-grid">
                ${allocation.map(item => `
                    <div class="asset-summary-card">
                        <div class="asset-summary-icon ${item.type}">
                            ${ASSET_TYPE_ICONS[item.type]}
                        </div>
                        <div class="asset-summary-content">
                            <div class="asset-summary-label">${item.label}</div>
                            <div class="asset-summary-value">
                                ${formatters.formatCurrency(item.value)}
                            </div>
                            <div class="asset-summary-percentage">
                                ${formatters.formatPercentage(item.percentage, 1)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 損益カード
    generateProfitLossCard(profitLoss) {
        if (!profitLoss || Object.keys(profitLoss.byType).length === 0) {
            return `
                <div class="card">
                    <h3 class="card-title">評価損益</h3>
                    <div class="empty-state-text" style="padding: var(--spacing-xl); text-align: center; color: var(--text-tertiary);">
                        損益データなし
                    </div>
                </div>
            `;
        }

        return `
            <div class="profit-loss-card card">
                <h3 class="card-title">評価損益</h3>
                <div class="profit-loss-list">
                    ${Object.values(profitLoss.byType).map(item => `
                        <div class="profit-loss-item">
                            <div class="profit-loss-label">
                                ${ASSET_TYPE_ICONS[item.type]} ${item.label}
                            </div>
                            <div class="profit-loss-value">
                                <div class="profit-loss-amount ${formatters.getProfitClass(item.profit)}">
                                    ${formatters.formatProfitWithSign(item.profit)}
                                </div>
                                <div class="profit-loss-percentage">
                                    ${formatters.formatPercentage(item.profitRate, 2)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    <div class="profit-loss-item" style="border-top: 2px solid var(--border-dark); font-weight: 600;">
                        <div class="profit-loss-label">合計</div>
                        <div class="profit-loss-value">
                            <div class="profit-loss-amount ${formatters.getProfitClass(profitLoss.totalProfit)}">
                                ${formatters.formatProfitWithSign(profitLoss.totalProfit)}
                            </div>
                            <div class="profit-loss-percentage">
                                ${formatters.formatPercentage(profitLoss.totalProfitRate, 2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 月次推移グラフ＋テーブル
    generateMonthlyTrendChart() {
        return `
            <div class="card">
                <div class="monthly-trend-header">
                    <h3 class="card-title" style="margin-bottom: 0;">月次資産推移</h3>
                    <button class="btn btn-secondary btn-sm" id="export-monthly-csv">📥 CSV</button>
                </div>
                <div class="chart-wrapper" style="height: 300px; margin-top: var(--spacing-md);">
                    <canvas id="monthly-trend-chart"></canvas>
                </div>
                <div id="monthly-trend-table-container"></div>
            </div>
        `;
    }

    // 月次推移テーブルを描画
    renderMonthlyTable(monthlyHistory) {
        const container = document.getElementById('monthly-trend-table-container');
        if (!container || !monthlyHistory || monthlyHistory.length === 0) return;
        container.innerHTML = this.generateMonthlyTableHTML(monthlyHistory);
    }

    generateMonthlyTableHTML(monthlyHistory) {
        const categories = [
            { key: 'cash',     label: '現金' },
            { key: 'stock_jp', label: '日本株' },
            { key: 'stock_us', label: '米国株' },
            { key: 'stock_kr', label: '韓国株' },
            { key: 'fund',     label: '投資信託' },
            { key: 'crypto',   label: '暗号資産' }
        ];

        // 最新月が先頭になるよう逆順に並べる
        const reversed = [...monthlyHistory].reverse();

        const rows = reversed.map((item, idx) => {
            const prevItem = reversed[idx + 1];
            const diff = prevItem ? item.value - prevItem.value : null;
            const diffRate = (prevItem && prevItem.value > 0) ? (diff / prevItem.value) * 100 : null;

            const diffClass = diff === null ? '' : diff >= 0 ? 'positive' : 'negative';
            const diffText = diff === null ? formatters.formatCurrency(0)
                : (diff >= 0 ? '+' : '') + formatters.formatCurrency(diff);
            const diffRateText = diffRate === null ? '0.00%'
                : `${diffRate >= 0 ? '+' : ''}${diffRate.toFixed(2)}%`;

            const categoryTds = categories.map(cat => {
                const val = item.breakdown && item.breakdown[cat.key];
                return `<td class="monthly-table-cell">${val ? formatters.formatCurrency(val) : '-'}</td>`;
            }).join('');

            return `
                <tr>
                    <td class="monthly-table-cell monthly-table-month">${item.label}</td>
                    <td class="monthly-table-cell monthly-table-total">${formatters.formatCurrency(item.value)}</td>
                    <td class="monthly-table-cell ${diffClass}">${diffText}</td>
                    <td class="monthly-table-cell ${diffClass}">${diffRateText}</td>
                    ${categoryTds}
                </tr>
            `;
        }).join('');

        const categoryHeaders = categories.map(c => `<th>${c.label}</th>`).join('');

        return `
            <div class="monthly-table-wrapper">
                <table class="monthly-table">
                    <thead>
                        <tr>
                            <th class="monthly-table-month-col">月</th>
                            <th>総資産</th>
                            <th>前月比(額)</th>
                            <th>前月比(率)</th>
                            ${categoryHeaders}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    // 銘柄別集計リスト
    generateAggregatedAssetsList(aggregatedAssets) {
        if (!aggregatedAssets || aggregatedAssets.length === 0) {
            return '';
        }

        // 株式、投資信託、暗号資産のみを表示（現金は集計不要）
        const displayAssets = aggregatedAssets.filter(item =>
            item.type === 'stock' || item.type === 'fund' || item.type === 'crypto'
        );

        if (displayAssets.length === 0) {
            return '';
        }

        return `
            <div class="card">
                <h3 class="card-title">銘柄別集計</h3>
                <div class="aggregated-assets-table" style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: var(--font-size-sm);">
                        <thead>
                            <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--border-dark);">
                                <th style="padding: var(--spacing-sm); text-align: left;">銘柄</th>
                                <th style="padding: var(--spacing-sm); text-align: left;">識別子</th>
                                <th style="padding: var(--spacing-sm); text-align: right;">保有数</th>
                                <th style="padding: var(--spacing-sm); text-align: right;">評価額</th>
                                <th style="padding: var(--spacing-sm); text-align: right;">平均単価</th>
                                <th style="padding: var(--spacing-sm); text-align: right;">現在単価</th>
                                <th style="padding: var(--spacing-sm); text-align: right;">損益</th>
                                <th style="padding: var(--spacing-sm); text-align: right;">損益率</th>
                                <th style="padding: var(--spacing-sm); text-align: center;">件数</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayAssets.map(item => `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: var(--spacing-sm);">
                                        <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                                            <span>${ASSET_TYPE_ICONS[item.type]}</span>
                                            <span>${formatters.escapeHtml(item.name)}</span>
                                        </div>
                                    </td>
                                    <td style="padding: var(--spacing-sm); color: var(--text-secondary); font-family: monospace;">
                                        ${formatters.escapeHtml(item.ticker || item.fundCode || item.symbol || '-')}
                                    </td>
                                    <td style="padding: var(--spacing-sm); text-align: right;">
                                        ${formatters.formatNumber(item.totalQuantity, item.type === 'crypto' ? 8 : 0)}
                                    </td>
                                    <td style="padding: var(--spacing-sm); text-align: right; font-weight: 600;">
                                        ${formatters.formatCurrency(item.totalValue)}
                                    </td>
                                    <td style="padding: var(--spacing-sm); text-align: right;">
                                        ${formatters.formatCurrency(item.averagePrice)}
                                    </td>
                                    <td style="padding: var(--spacing-sm); text-align: right;">
                                        ${formatters.formatCurrency(item.currentPrice)}
                                    </td>
                                    <td style="padding: var(--spacing-sm); text-align: right;">
                                        <span class="${formatters.getProfitClass(item.profit)}">
                                            ${formatters.formatProfitWithSign(item.profit)}
                                        </span>
                                    </td>
                                    <td style="padding: var(--spacing-sm); text-align: right;">
                                        <span class="${formatters.getProfitClass(item.profit)}">
                                            ${formatters.formatPercentage(item.profitRate, 2)}
                                        </span>
                                    </td>
                                    <td style="padding: var(--spacing-sm); text-align: center; color: var(--text-tertiary);">
                                        ${item.count}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // 最近更新された資産リスト
    generateRecentAssetsList(recentAssets) {
        if (!recentAssets || recentAssets.length === 0) {
            return '';
        }

        return `
            <div class="card">
                <h3 class="card-title">最近の更新</h3>
                <div class="recent-assets-list">
                    ${recentAssets.map(asset => `
                        <div class="recent-asset-item">
                            <div class="recent-asset-info">
                                <div class="recent-asset-name">
                                    ${ASSET_TYPE_ICONS[asset.type]} ${formatters.escapeHtml(asset.name)}
                                </div>
                                <div class="recent-asset-type">
                                    ${formatters.formatRelativeTime(asset.updatedAt)}
                                </div>
                            </div>
                            <div class="recent-asset-value">
                                ${formatters.formatCurrency(asset.getCurrentValue(), asset.currency)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 空状態
    generateEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">まだ資産が登録されていません</div>
                <p style="color: var(--text-tertiary); margin: var(--spacing-md) 0;">
                    最初の資産を登録して、資産管理を始めましょう
                </p>
                <button class="btn btn-primary" id="dashboard-add-asset">
                    資産を登録する
                </button>
            </div>
        `;
    }
}
