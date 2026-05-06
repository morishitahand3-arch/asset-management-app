// Chart View - Chart.js integration

export class ChartView {
    constructor() {
        this.chartInstance = null;
    }

    // グラフを生成
    renderChart(canvasId, chartData, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id "${canvasId}" not found`);
            return null;
        }

        // 既存のグラフを破棄
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
                            size: 12
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            const value = context.parsed || context.parsed.y || 0;
                            label += '¥' + new Intl.NumberFormat('ja-JP').format(Math.round(value));

                            // パーセンテージを追加
                            if (context.chart.config.type === 'pie' || context.chart.config.type === 'doughnut') {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                label += ` (${percentage}%)`;
                            }

                            return label;
                        }
                    }
                }
            }
        };

        const chartConfig = {
            type: options.type || 'pie',
            data: chartData,
            options: { ...defaultOptions, ...options.chartOptions }
        };

        // Chart.jsが読み込まれているか確認
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return null;
        }

        this.chartInstance = new Chart(ctx, chartConfig);
        return this.chartInstance;
    }

    // 円グラフ生成
    renderPieChart(canvasId, chartData) {
        return this.renderChart(canvasId, chartData, {
            type: 'pie',
            chartOptions: {
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    // ドーナツグラフ生成
    renderDoughnutChart(canvasId, chartData) {
        return this.renderChart(canvasId, chartData, {
            type: 'doughnut',
            chartOptions: {
                plugins: {
                    legend: {
                        position: 'right'
                    }
                },
                cutout: '60%'
            }
        });
    }

    // 棒グラフ生成
    renderBarChart(canvasId, chartData, stacked = false) {
        const chartOptions = {
            plugins: {
                legend: {
                    display: stacked, // 積み上げグラフの場合は凡例を表示
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    stacked: stacked
                },
                y: {
                    stacked: stacked,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + new Intl.NumberFormat('ja-JP').format(value);
                        }
                    }
                }
            }
        };

        return this.renderChart(canvasId, chartData, {
            type: 'bar',
            chartOptions
        });
    }

    // 積み上げ棒グラフ生成
    renderStackedBarChart(canvasId, chartData) {
        return this.renderBarChart(canvasId, chartData, true);
    }

    // グラフを更新
    updateChart(chartData) {
        if (!this.chartInstance) {
            console.error('No chart instance to update');
            return;
        }

        this.chartInstance.data = chartData;
        this.chartInstance.update();
    }

    // グラフを破棄
    destroyChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }

    // ツリーマップ生成
    renderTreemapChart(canvasId, treeData, totalValue) {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return null;
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id "${canvasId}" not found`);
            return null;
        }

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const colorMap = {
            cash:     'rgba(16, 185, 129, 0.85)',
            stock_jp: 'rgba(59, 130, 246, 0.85)',
            stock_us: 'rgba(99, 102, 241, 0.85)',
            stock_kr: 'rgba(236, 72, 153, 0.85)',
            fund:     'rgba(245, 158, 11, 0.85)',
            crypto:   'rgba(139, 92, 246, 0.85)',
            others:   'rgba(107, 114, 128, 0.85)'
        };

        const formatCurrency = (v) => '¥' + new Intl.NumberFormat('ja-JP').format(Math.round(v));

        // 文字幅推定（CJK=13px、ASCII=8px）してタイル幅に収まるよう折り返す
        const wrapLabel = (label, tileW) => {
            const estW = s => [...s].reduce((w, c) => w + (c.charCodeAt(0) > 127 ? 13 : 8), 0);
            const avail = tileW - 16;
            if (avail <= 0 || estW(label) <= avail) return [label];
            const lines = [];
            let line = '';
            for (const ch of label) {
                if (estW(line + ch) > avail && line) {
                    lines.push(line);
                    if (lines.length >= 2) { lines[1] = lines[1].slice(0, -1) + '…'; break; }
                    line = ch;
                } else {
                    line += ch;
                }
            }
            if (line && lines.length < 2) lines.push(line);
            return lines.length ? lines : [label.slice(0, 4) + '…'];
        };

        const ctx = canvas.getContext('2d');

        this.chartInstance = new Chart(ctx, {
            type: 'treemap',
            data: {
                datasets: [{
                    tree: treeData,
                    key: 'v',
                    spacing: 2,
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.9)',
                    backgroundColor(ctx) {
                        const category = ctx.raw?._data?.category;
                        return colorMap[category] || 'rgba(150,150,150,0.85)';
                    },
                    labels: {
                        display: true,
                        formatter(ctx) {
                            const d = ctx.raw?._data;
                            if (!d) return '';
                            const w = ctx.raw.w || 0;
                            const h = ctx.raw.h || 0;
                            // 極小タイルはラベルなし
                            if (w < 45 || h < 28) return '';

                            // 表示名を決定
                            let nameLines;
                            if (d.category === 'stock_us' && d.ticker) {
                                nameLines = [d.ticker]; // 米国株はティッカーコード
                            } else {
                                nameLines = wrapLabel(d.label, w);
                            }

                            // タイルが小さければ名前のみ、大きければ金額も
                            if (h < 55 || w < 65) return nameLines;
                            return [...nameLines, formatCurrency(d.v)];
                        },
                        color: ['white', 'white', 'rgba(255,255,255,0.8)'],
                        font: [{ size: 13, weight: 'bold' }, { size: 13, weight: 'bold' }, { size: 11 }],
                        align: 'center',
                        position: 'middle'
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title(ctx) {
                                const d = ctx[0].raw?._data;
                                if (!d) return '';
                                // 米国株はティッカー付きで表示
                                return d.category === 'stock_us' && d.ticker
                                    ? `${d.label} (${d.ticker})`
                                    : d.label;
                            },
                            label(ctx) {
                                const d = ctx.raw?._data;
                                if (!d) return '';
                                const pct = totalValue > 0 ? ((d.v / totalValue) * 100).toFixed(1) : '0.0';
                                return [
                                    `評価額: ${formatCurrency(d.v)}`,
                                    `構成比: ${pct}%`,
                                    `カテゴリ: ${d.categoryLabel}`
                                ];
                            }
                        }
                    }
                }
            }
        });

        return this.chartInstance;
    }
}
