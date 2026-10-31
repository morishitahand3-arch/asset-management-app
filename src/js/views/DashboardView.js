// Dashboard View - Display dashboard statistics and charts

import { ASSET_TYPE_LABELS, ASSET_TYPE_ICONS } from '../utils/constants.js';
import { formatters } from '../utils/formatters.js';

export class DashboardView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    // ダッシュボード全体を生成
    render(stats, showDividends = false) {
        if (!this.container) return;

        if (!stats || stats.totalAssets === 0) {
            this.container.innerHTML = this.generateEmptyState();
            return;
        }

        const html = `
            ${this.generateTotalValueCard(stats.totalValue, stats.profitLoss)}
            ${this.generateAssetSummaryGrid(stats.allocation)}
            <div class="grid grid-2">
                <div class="card chart-container">
                    <h3 class="card-title">資産構成</h3>
                    <div class="chart-wrapper allocation-chart-wrapper">
                        <canvas id="asset-allocation-chart"></canvas>
                    </div>
                </div>
                ${this.generateProfitLossCard(stats.profitLoss)}
            </div>
            ${this.generateTreemapSection()}
            ${showDividends ? this.generateDividendSection() : ''}
            ${this.generateMonthlyTrendChart()}
            ${this.generateAggregatedAssetsList(stats.aggregatedByIdentifier)}
            ${this.generateRecentAssetsList(stats.recent)}
        `;

        this.container.innerHTML = html;
    }

    // 総資産額カード（評価損益の合計も表示）
    generateTotalValueCard(totalValue, profitLoss) {
        const hasProfit = profitLoss && Object.keys(profitLoss.byType).length > 0;

        return `
            <div class="total-value-card">
                <div class="total-value-header">
                    <div>
                        <div class="total-value-label">総資産額</div>
                        <div class="total-value-amount">${formatters.formatCurrency(totalValue)}</div>
                        ${hasProfit ? `
                            <div class="total-value-profit">
                                <span>評価損益</span>
                                <strong>${formatters.formatProfitWithSign(profitLoss.totalProfit)}</strong>
                                <span class="total-value-rate">${profitLoss.totalProfitRate >= 0 ? '+' : ''}${formatters.formatPercentage(profitLoss.totalProfitRate, 2)}</span>
                            </div>
                        ` : ''}
                    </div>
                    <button class="total-value-button" id="bulk-update-prices">
                        🔄 価格を一括更新
                    </button>
                </div>
                <div id="update-progress" class="update-progress" style="display: none;">
                    <div class="update-progress-text">更新中: <span id="progress-text">0/0</span></div>
                    <div class="update-progress-track">
                        <div id="progress-bar" class="update-progress-bar"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // 資産タイプ別サマリーグリッド（評価額がある種類のみ）
    generateAssetSummaryGrid(allocation) {
        const items = allocation.filter(item => item.value > 0);

        return `
            <div class="asset-summary-grid">
                ${items.map(item => `
                    <div class="asset-summary-card">
                        <div class="asset-summary-top">
                            <span class="asset-summary-icon ${item.type}">${ASSET_TYPE_ICONS[item.type]}</span>
                            <span class="asset-summary-label">${item.label}</span>
                        </div>
                        <div class="asset-summary-value">${formatters.formatCurrency(item.value)}</div>
                        <div class="asset-summary-share">
                            <div class="asset-summary-bar">
                                <span class="${item.type}" style="width: ${Math.min(item.percentage, 100)}%;"></span>
                            </div>
                            <span class="asset-summary-percentage">${formatters.formatPercentage(item.percentage, 1)}</span>
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
                    <div class="card-empty">損益データなし</div>
                </div>
            `;
        }

        const row = (label, profit, profitRate, isTotal = false) => `
            <div class="profit-loss-item ${isTotal ? 'is-total' : ''}">
                <div class="profit-loss-label">${label}</div>
                <div class="profit-loss-value">
                    <div class="profit-loss-amount ${formatters.getProfitClass(profit)}">
                        ${formatters.formatProfitWithSign(profit)}
                    </div>
                    <span class="delta ${formatters.getProfitClass(profit)}">
                        ${profitRate >= 0 ? '+' : ''}${formatters.formatPercentage(profitRate, 2)}
                    </span>
                </div>
            </div>
        `;

        return `
            <div class="profit-loss-card card">
                <h3 class="card-title">評価損益</h3>
                <div class="profit-loss-list">
                    ${Object.values(profitLoss.byType).map(item =>
                        row(`<span class="asset-summary-icon ${item.type}">${ASSET_TYPE_ICONS[item.type]}</span>${item.label}`, item.profit, item.profitRate)
                    ).join('')}
                    ${row('合計', profitLoss.totalProfit, profitLoss.totalProfitRate, true)}
                </div>
            </div>
        `;
    }

    // ツリーマップセクション
    generateTreemapSection() {
        return `
            <div class="card treemap-section">
                <div class="treemap-header">
                    <h3 class="card-title" style="margin-bottom:0;">保有資産ツリーマップ</h3>
                    <div class="treemap-legend" id="treemap-legend"></div>
                </div>
                <div class="treemap-wrapper">
                    <canvas id="asset-treemap-chart"></canvas>
                </div>
            </div>
        `;
    }

    // ツリーマップ凡例を描画
    renderTreemapLegend(categories) {
        const container = document.getElementById('treemap-legend');
        if (!container) return;
        container.innerHTML = categories.map(cat => `
            <div class="treemap-legend-item">
                <div class="treemap-legend-dot" style="background-color:${cat.color};"></div>
                <span>${cat.label}</span>
                <span>${cat.percentage.toFixed(1)}%</span>
            </div>
        `).join('');
    }

    // 配当金セクション（中身は renderDividendSection で描画）
    generateDividendSection() {
        return `<section class="card dividend-card" id="dividend-section"></section>`;
    }

    // 配当金セクションを描画
    renderDividendSection(summary, mode) {
        const container = document.getElementById('dividend-section');
        if (!container) return;

        const header = `
            <div class="dividend-header">
                <div>
                    <h3 class="card-title dividend-title">配当金</h3>
                    <p class="dividend-subtitle">過去12ヶ月の実績から算出した年間予想</p>
                </div>
                <div class="dividend-actions">
                    ${summary.lastUpdated ? `
                        <div class="segmented" role="group" aria-label="表示切替">
                            <button type="button" class="segmented-btn ${mode === 'net' ? 'active' : ''}" data-dividend-mode="net" aria-pressed="${mode === 'net'}">税引後</button>
                            <button type="button" class="segmented-btn ${mode === 'gross' ? 'active' : ''}" data-dividend-mode="gross" aria-pressed="${mode === 'gross'}">税引前</button>
                        </div>
                    ` : ''}
                    <button type="button" class="icon-btn" id="update-dividends" title="配当データを取得" aria-label="配当データを取得">↻</button>
                </div>
            </div>
        `;

        if (!summary.lastUpdated) {
            container.innerHTML = `
                ${header}
                <div class="dividend-empty">
                    <div class="dividend-empty-icon">💰</div>
                    <p class="dividend-empty-text">配当データがまだありません</p>
                    <p class="dividend-empty-hint">保有株式の過去12ヶ月の配当実績を取得して、年間の配当金を予想します。</p>
                    <button type="button" class="btn btn-primary" id="update-dividends-empty">配当データを取得</button>
                </div>
            `;
            return;
        }

        const current = summary[mode];
        const other = mode === 'net' ? summary.gross : summary.net;
        const otherLabel = mode === 'net' ? '税引前' : '税引後';

        container.innerHTML = `
            ${header}
            <div class="dividend-hero">
                <div class="dividend-hero-main">
                    <div class="dividend-hero-label">年間配当（${mode === 'net' ? '税引後' : '税引前'}）</div>
                    <div class="dividend-hero-amount">${formatters.formatCurrency(current.annual)}</div>
                    <div class="dividend-hero-sub">
                        ${otherLabel} ${formatters.formatCurrency(other.annual)}
                        <span class="dividend-hero-sep">·</span>
                        税金 −${formatters.formatCurrency(summary.tax)}
                    </div>
                </div>
                <div class="dividend-kpis">
                    ${this.generateDividendKpi('月平均', formatters.formatCurrency(current.monthlyAverage))}
                    ${this.generateDividendKpi('配当利回り', formatters.formatPercentage(current.dividendYield, 2))}
                    ${this.generateDividendKpi('取得利回り', formatters.formatPercentage(current.yieldOnCost, 2))}
                </div>
            </div>

            <div class="dividend-body">
                <div class="dividend-block">
                    <h4 class="dividend-block-title">月別の配当<span class="dividend-block-hint">権利落ち月ベース</span></h4>
                    <div class="dividend-chart">
                        <canvas id="dividend-monthly-chart"></canvas>
                    </div>
                </div>

                <div class="dividend-block">
                    <h4 class="dividend-block-title">銘柄別の配当<span class="dividend-block-hint">${summary.holdings.length}銘柄</span></h4>
                    ${this.generateDividendRanking(summary.holdings, mode)}
                </div>
            </div>

            <p class="dividend-note">
                税引後は国内株20.315%、米国株は現地10%＋国内20.315%、韓国株は現地15%＋国内20.315%で計算（NISA分は国内課税なし、外国税額控除は考慮外）。
                最終取得: ${formatters.formatRelativeTime(summary.lastUpdated)}
                ${summary.missingCount > 0 ? `／未取得の銘柄: ${summary.missingCount}件` : ''}
            </p>
        `;
    }

    generateDividendKpi(label, value) {
        return `
            <div class="dividend-kpi">
                <div class="dividend-kpi-label">${label}</div>
                <div class="dividend-kpi-value">${value}</div>
            </div>
        `;
    }

    // 銘柄別配当ランキング（上位8件＋残りは折りたたみ）
    generateDividendRanking(holdings, mode) {
        const visibleCount = 8;
        holdings = [...holdings].sort((a, b) => b[mode] - a[mode]);
        const max = holdings.length > 0 ? holdings[0][mode] : 0;

        const row = (h, index) => {
            const amount = h[mode];
            const share = mode === 'net' ? h.netShare : h.grossShare;
            const width = max > 0 ? (amount / max) * 100 : 0;
            const months = h.months.length > 0 ? `${h.months.join('・')}月` : '';
            const nisaBadge = h.quantity > 0 && h.nisaQuantity >= h.quantity
                ? '<span class="dividend-badge">NISA</span>'
                : h.nisaQuantity > 0 ? '<span class="dividend-badge">一部NISA</span>' : '';

            return `
                <li class="dividend-row">
                    <span class="dividend-rank">${index + 1}</span>
                    <div class="dividend-row-body">
                        <div class="dividend-row-top">
                            <div class="dividend-row-name">
                                <span class="dividend-row-title">${formatters.escapeHtml(h.name)}</span>
                                ${nisaBadge}
                            </div>
                            <div class="dividend-row-amount ${amount > 0 ? '' : 'is-zero'}">
                                ${amount > 0 ? formatters.formatCurrency(amount) : '無配'}
                            </div>
                        </div>
                        <div class="dividend-row-bar">
                            <span class="dividend-row-bar-fill cat-${h.category}" style="width: ${width}%;"></span>
                        </div>
                        <div class="dividend-row-meta">
                            <span><span class="dividend-dot cat-${h.category}"></span>${formatters.escapeHtml(h.ticker)}</span>
                            ${amount > 0 ? `<span>構成比 ${formatters.formatPercentage(share, 1)}</span>` : ''}
                            ${amount > 0 ? `<span>利回り ${formatters.formatPercentage(h.value > 0 ? (amount / h.value) * 100 : 0, 2)}</span>` : ''}
                            ${months ? `<span>${months}</span>` : ''}
                        </div>
                    </div>
                </li>
            `;
        };

        const visible = holdings.slice(0, visibleCount).map(row).join('');
        const rest = holdings.slice(visibleCount);

        return `
            <ol class="dividend-ranking">${visible}</ol>
            ${rest.length > 0 ? `
                <details class="dividend-more">
                    <summary>他 ${rest.length} 銘柄を表示</summary>
                    <ol class="dividend-ranking">${rest.map((h, i) => row(h, i + visibleCount)).join('')}</ol>
                </details>
            ` : ''}
        `;
    }

    // 月次推移グラフ＋テーブル
    generateMonthlyTrendChart() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">月次資産推移</h3>
                    <button class="btn btn-secondary btn-sm" id="export-monthly-csv">📥 CSV</button>
                </div>
                <div class="chart-wrapper monthly-chart-wrapper">
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
                <div class="table-scroll">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th class="align-left">銘柄</th>
                                <th>保有数</th>
                                <th>評価額</th>
                                <th>平均単価</th>
                                <th>現在単価</th>
                                <th>損益</th>
                                <th>損益率</th>
                                <th class="align-center">件数</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayAssets.map(item => `
                                <tr>
                                    <td class="align-left">
                                        <div class="data-table-name">
                                            <span class="data-table-title">${formatters.escapeHtml(item.name)}</span>
                                            <span class="data-table-sub">${ASSET_TYPE_ICONS[item.type]} ${formatters.escapeHtml(item.ticker || item.fundCode || item.symbol || '-')}</span>
                                        </div>
                                    </td>
                                    <td>${formatters.formatNumber(item.totalQuantity, item.type === 'crypto' ? 8 : 0)}</td>
                                    <td class="is-strong">${formatters.formatCurrency(item.totalValue)}</td>
                                    <td>${formatters.formatCurrency(item.averagePrice)}</td>
                                    <td>${formatters.formatCurrency(item.currentPrice)}</td>
                                    <td class="${formatters.getProfitClass(item.profit)}">${formatters.formatProfitWithSign(item.profit)}</td>
                                    <td class="${formatters.getProfitClass(item.profit)}">${formatters.formatPercentage(item.profitRate, 2)}</td>
                                    <td class="align-center muted">${item.count}</td>
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
                            <span class="asset-summary-icon ${asset.type}">${ASSET_TYPE_ICONS[asset.type]}</span>
                            <div class="recent-asset-info">
                                <div class="recent-asset-name">${formatters.escapeHtml(asset.name)}</div>
                                <div class="recent-asset-type">${ASSET_TYPE_LABELS[asset.type]} · ${formatters.formatRelativeTime(asset.updatedAt)}</div>
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
                <p class="empty-state-hint">最初の資産を登録して、資産管理を始めましょう</p>
                <button class="btn btn-primary" id="dashboard-add-asset">
                    資産を登録する
                </button>
            </div>
        `;
    }
}
