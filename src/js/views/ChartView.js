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
}
