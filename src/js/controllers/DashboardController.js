// Dashboard Controller - Dashboard logic and chart rendering

import { DashboardView } from '../views/DashboardView.js';
import { ChartView } from '../views/ChartView.js';
import { assetService } from '../services/AssetService.js';
import { calculationService } from '../services/CalculationService.js';
import { bulkPriceUpdateService } from '../services/BulkPriceUpdateService.js';
import { storageService } from '../services/StorageService.js';
import { dividendService } from '../services/DividendService.js';
import { ASSET_TYPES } from '../utils/constants.js';

export class DashboardController {
    constructor(containerId) {
        this.view = new DashboardView(containerId);
        this.allocationChartView = new ChartView();
        this.monthlyChartView = new ChartView();
        this.treemapChartView = new ChartView();
        this.dividendChartView = new ChartView();
        this.onAddAssetCallback = null;
    }

    // ダッシュボードを表示
    renderDashboard() {
        const assets = assetService.getAllAssets();
        const stats = calculationService.getAssetStats(assets);

        // 履歴スナップショットを保存（カテゴリ別内訳付き）
        if (stats.totalValue > 0) {
            const breakdown = calculationService.aggregateByChartCategory(assets);
            storageService.saveHistorySnapshot(stats.totalValue, breakdown);
        }

        // 配当セクションは株式を保有している場合のみ表示
        const hasStocks = assets.some(asset => asset.type === ASSET_TYPES.STOCK);

        this.view.render(stats, hasStocks);
        this.attachEventHandlers();

        // グラフを描画（資産がある場合のみ）
        if (stats.totalAssets > 0) {
            this.renderAllocationChart(assets);
            this.renderMonthlyChart();
            this.renderTreemapChart(assets, stats.totalValue);
        }

        if (hasStocks) {
            this.renderDividendSection(assets);
        } else {
            this.dividendChartView.destroyChart();
        }
    }

    // 配当表示モード（税引後 net / 税引前 gross）。端末ごとに記憶する
    getDividendMode() {
        try {
            return localStorage.getItem('assetApp.dividendMode') === 'gross' ? 'gross' : 'net';
        } catch {
            return 'net';
        }
    }

    setDividendMode(mode) {
        try {
            localStorage.setItem('assetApp.dividendMode', mode);
        } catch {
            // 保存できなくても表示切替はそのまま行う
        }
    }

    // 配当セクション（サマリー・月別グラフ・銘柄別ランキング）を描画
    renderDividendSection(assets = assetService.getAllAssets()) {
        const summary = calculationService.calculateDividendSummary(assets, dividendService.getCache());
        const mode = this.getDividendMode();

        this.view.renderDividendSection(summary, mode);

        ['update-dividends', 'update-dividends-empty'].forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => this.handleUpdateDividends());
            }
        });

        document.querySelectorAll('[data-dividend-mode]').forEach(button => {
            button.addEventListener('click', () => {
                if (button.dataset.dividendMode === mode) return;
                this.setDividendMode(button.dataset.dividendMode);
                this.renderDividendSection();
            });
        });

        if (summary.lastUpdated === null) {
            this.dividendChartView.destroyChart();
            return;
        }

        const chartData = calculationService.generateDividendChartData(summary, mode);
        this.dividendChartView.renderDividendChart('dividend-monthly-chart', chartData);
    }

    // 資産構成グラフを描画
    renderAllocationChart(assets) {
        const chartData = calculationService.generateChartData(assets, 'doughnut');

        if (chartData) {
            // DOMの準備ができてから描画
            setTimeout(() => {
                this.allocationChartView.renderDoughnutChart('asset-allocation-chart', chartData);
            }, 100);
        }
    }

    // 月次推移グラフを描画（積み上げ棒グラフ）＋テーブル
    renderMonthlyChart() {
        const monthlyHistory = storageService.getMonthlyHistory(12).filter(item => item.value > 0);
        const chartData = calculationService.generateMonthlyChartData(monthlyHistory);

        if (chartData) {
            setTimeout(() => {
                this.monthlyChartView.renderStackedBarChart('monthly-trend-chart', chartData);
            }, 150);
        }

        this.view.renderMonthlyTable(monthlyHistory);
    }

    // ツリーマップを描画
    renderTreemapChart(assets, totalValue) {
        let treeData = calculationService.generateTreemapData(assets);
        if (!treeData || treeData.length === 0) return;

        const colorMap = {
            cash:     '#10b981',
            stock_jp: '#3b82f6',
            stock_us: '#6366f1',
            stock_kr: '#ec4899',
            fund:     '#f59e0b',
            crypto:   '#8b5cf6',
            others:   '#6b7280'
        };

        // 2%未満の小さいタイルが2件以上あれば「その他」にまとめる
        if (totalValue > 0) {
            const small = treeData.filter(d => d.v / totalValue < 0.02);
            if (small.length >= 2) {
                const large = treeData.filter(d => d.v / totalValue >= 0.02);
                const othersTotal = small.reduce((s, d) => s + d.v, 0);
                large.push({ v: othersTotal, label: 'その他', ticker: null, symbol: null, category: 'others', categoryLabel: 'その他' });
                treeData = large;
            }
        }

        const categoryTotals = {};
        treeData.forEach(item => {
            if (!categoryTotals[item.category]) {
                categoryTotals[item.category] = { label: item.categoryLabel, value: 0, color: colorMap[item.category] || '#6b7280' };
            }
            categoryTotals[item.category].value += item.v;
        });

        const legendCategories = Object.values(categoryTotals)
            .filter(c => c.value > 0)
            .map(c => ({ ...c, percentage: totalValue > 0 ? (c.value / totalValue) * 100 : 0 }))
            .sort((a, b) => b.value - a.value);

        setTimeout(() => {
            this.treemapChartView.renderTreemapChart('asset-treemap-chart', treeData, totalValue);
            this.view.renderTreemapLegend(legendCategories);
        }, 200);
    }

    // イベントハンドラーをアタッチ
    attachEventHandlers() {
        const addAssetBtn = document.getElementById('dashboard-add-asset');
        if (addAssetBtn) {
            addAssetBtn.addEventListener('click', () => {
                this.handleAddAsset();
            });
        }

        const bulkUpdateBtn = document.getElementById('bulk-update-prices');
        if (bulkUpdateBtn) {
            bulkUpdateBtn.addEventListener('click', () => {
                this.handleBulkPriceUpdate();
            });
        }

        const exportCsvBtn = document.getElementById('export-monthly-csv');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => {
                this.handleExportMonthlyCSV();
            });
        }
    }

    // 資産追加処理
    handleAddAsset() {
        if (this.onAddAssetCallback) {
            this.onAddAssetCallback();
        }
    }

    // 価格一括更新処理
    async handleBulkPriceUpdate() {
        const updateBtn = document.getElementById('bulk-update-prices');
        const progressContainer = document.getElementById('update-progress');
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('progress-bar');

        if (!updateBtn) return;

        // ボタンを無効化
        updateBtn.disabled = true;
        updateBtn.textContent = '更新中...';

        // プログレスバーを表示
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        try {
            // 進捗コールバック
            const onProgress = (progress) => {
                if (progressText) {
                    progressText.textContent = `${progress.completed}/${progress.total}`;
                }
                if (progressBar) {
                    const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
                    progressBar.style.width = `${percentage}%`;
                }
            };

            // 一括更新実行
            const result = await bulkPriceUpdateService.updateAllPrices(onProgress);

            if (result.success) {
                this.showToast(result.message, 'success');

                // 配当データが未取得・1週間以上前なら合わせて取得する
                if (dividendService.isStale(assetService.getAllAssets())) {
                    await dividendService.updateAllDividends((progress) => {
                        if (progressText) {
                            progressText.textContent = `配当 ${progress.completed}/${progress.total}`;
                        }
                        if (progressBar) {
                            progressBar.style.width = `${(progress.completed / progress.total) * 100}%`;
                        }
                    });
                }

                // ダッシュボードを再レンダリング
                setTimeout(() => {
                    this.renderDashboard();
                }, 1000);
            } else {
                this.showToast(result.message || '更新に失敗しました', 'error');
            }

        } catch (error) {
            console.error('Bulk update error:', error);
            this.showToast('更新中にエラーが発生しました', 'error');
        } finally {
            // ボタンを元に戻す
            updateBtn.disabled = false;
            updateBtn.textContent = '🔄 価格を一括更新';

            // プログレスバーを非表示
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.style.display = 'none';
                }
            }, 2000);
        }
    }

    // 配当データ取得処理
    async handleUpdateDividends() {
        const buttons = ['update-dividends', 'update-dividends-empty']
            .map(id => document.getElementById(id))
            .filter(Boolean);
        const subtitle = document.querySelector('.dividend-subtitle');
        if (buttons.length === 0) return;

        buttons.forEach(button => {
            button.disabled = true;
            button.classList.add('is-loading');
        });
        if (subtitle) subtitle.textContent = '配当データを取得中...';

        try {
            const result = await dividendService.updateAllDividends((progress) => {
                if (subtitle) subtitle.textContent = `配当データを取得中... ${progress.completed}/${progress.total}`;
            });

            this.showToast(result.message, result.success ? 'success' : 'error');
        } catch (error) {
            console.error('Dividend update error:', error);
            this.showToast('配当データの取得中にエラーが発生しました', 'error');
        } finally {
            // 成功・失敗どちらでもセクションを描き直してボタン状態を戻す
            this.renderDividendSection();
        }
    }

    // トースト通知を表示
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }

    // グラフを更新
    updateChart() {
        const assets = assetService.getAllAssets();
        const stats = calculationService.getAssetStats(assets);

        // 履歴スナップショットを更新（カテゴリ別内訳付き）
        if (stats.totalValue > 0) {
            const breakdown = calculationService.aggregateByChartCategory(assets);
            storageService.saveHistorySnapshot(stats.totalValue, breakdown);
        }

        // 資産構成グラフを更新
        const chartData = calculationService.generateChartData(assets, 'doughnut');
        if (chartData && this.allocationChartView.chartInstance) {
            this.allocationChartView.updateChart(chartData);
        } else {
            this.renderAllocationChart(assets);
        }

        // 月次推移グラフを更新
        const monthlyHistory = storageService.getMonthlyHistory(12).filter(item => item.value > 0);
        const monthlyChartData = calculationService.generateMonthlyChartData(monthlyHistory);
        if (monthlyChartData && this.monthlyChartView.chartInstance) {
            this.monthlyChartView.updateChart(monthlyChartData);
            this.view.renderMonthlyTable(monthlyHistory);
        } else {
            this.renderMonthlyChart();
        }

        // ツリーマップを更新
        this.renderTreemapChart(assets, stats.totalValue);
    }

    // 月次データをCSVエクスポート
    handleExportMonthlyCSV() {
        const monthlyHistory = storageService.getMonthlyHistory(12);
        if (!monthlyHistory || monthlyHistory.length === 0) {
            this.showToast('エクスポートするデータがありません', 'error');
            return;
        }

        const categories = [
            { key: 'cash',     label: '現金' },
            { key: 'stock_jp', label: '日本株' },
            { key: 'stock_us', label: '米国株' },
            { key: 'stock_kr', label: '韓国株' },
            { key: 'fund',     label: '投資信託' },
            { key: 'crypto',   label: '暗号資産' }
        ];

        const headers = ['月', '総資産', '前月比(額)', '前月比(率)', ...categories.map(c => c.label)];
        const reversed = [...monthlyHistory].reverse();

        const rows = reversed.map((item, idx) => {
            const prevItem = reversed[idx + 1];
            const diff = prevItem ? item.value - prevItem.value : null;
            const diffRate = (prevItem && prevItem.value > 0) ? (diff / prevItem.value) * 100 : null;

            return [
                item.label,
                Math.round(item.value),
                diff !== null ? Math.round(diff) : '',
                diffRate !== null ? `${diffRate.toFixed(2)}%` : '',
                ...categories.map(cat => {
                    const val = item.breakdown && item.breakdown[cat.key];
                    return val ? Math.round(val) : 0;
                })
            ];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\r\n');

        const bom = '﻿'; // Excel用UTF-8 BOM
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `資産推移_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('CSVをエクスポートしました', 'success');
    }

    // グラフを破棄
    destroyChart() {
        this.allocationChartView.destroyChart();
        this.monthlyChartView.destroyChart();
        this.treemapChartView.destroyChart();
        this.dividendChartView.destroyChart();
    }

    // コールバック設定
    onAddAsset(callback) {
        this.onAddAssetCallback = callback;
    }
}
