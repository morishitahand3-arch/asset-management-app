// Dashboard Controller - Dashboard logic and chart rendering

import { DashboardView } from '../views/DashboardView.js';
import { ChartView } from '../views/ChartView.js';
import { assetService } from '../services/AssetService.js';
import { calculationService } from '../services/CalculationService.js';
import { bulkPriceUpdateService } from '../services/BulkPriceUpdateService.js';
import { storageService } from '../services/StorageService.js';
import { ASSET_TYPES } from '../utils/constants.js';

export class DashboardController {
    constructor(containerId) {
        this.view = new DashboardView(containerId);
        this.allocationChartView = new ChartView();
        this.monthlyChartView = new ChartView();
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

        this.view.render(stats);
        this.attachEventHandlers();

        // グラフを描画（資産がある場合のみ）
        if (stats.totalAssets > 0) {
            this.renderAllocationChart(assets);
            this.renderMonthlyChart();
        }
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
    }

    // コールバック設定
    onAddAsset(callback) {
        this.onAddAssetCallback = callback;
    }
}
