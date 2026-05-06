// Calculation Service - Asset calculations and aggregations

import { ASSET_TYPES, ASSET_TYPE_LABELS, CHART_CATEGORIES, CHART_CATEGORY_LABELS } from '../utils/constants.js';

export class CalculationService {
    // 株式が韓国株かを判定
    isKoreanStock(asset) {
        if (asset.type !== ASSET_TYPES.STOCK) {
            return false;
        }

        // exchangeフィールドがある場合
        if (asset.exchange) {
            const ex = asset.exchange.toUpperCase();
            if (ex === 'KRX' || ex === 'KOSPI' || ex === 'KOSDAQ' ||
                ex === 'KR' || ex === 'KSE') {
                return true;
            }
        }

        // ティッカーにKSまたはKQサフィックスがある場合
        if (asset.ticker && /\.(KS|KQ)$/i.test(asset.ticker)) {
            return true;
        }

        // 6桁の数字のみの場合は韓国株と判定
        if (asset.ticker && /^\d{6}$/.test(asset.ticker)) {
            return true;
        }

        return false;
    }

    // 株式が日本株か米国株かを判定
    isJapaneseStock(asset) {
        if (asset.type !== ASSET_TYPES.STOCK) {
            return false;
        }

        // 韓国株の場合はfalse
        if (this.isKoreanStock(asset)) {
            return false;
        }

        // exchangeフィールドがある場合
        if (asset.exchange) {
            const ex = asset.exchange.toUpperCase();
            if (ex === 'TSE' || ex === 'TYO' || ex === 'TOKYO' ||
                ex === 'JP' || ex === 'JPX' || ex === 'JASDAQ' || ex === 'MOTHERS') {
                return true;
            }
            // 日本の取引所でない場合でも、ティッカーが数字のみなら日本株と判定
            if (asset.ticker && /^\d+$/.test(asset.ticker)) {
                return true;
            }
            return false;
        }

        // tickerから判定（数字のみなら日本株）
        if (asset.ticker) {
            return /^\d+$/.test(asset.ticker);
        }

        // デフォルトは日本株
        return true;
    }

    // 総資産額を計算
    calculateTotalValue(assets) {
        return assets.reduce((total, asset) => {
            return total + asset.getCurrentValue();
        }, 0);
    }

    // タイプ別に集計
    aggregateByType(assets) {
        const aggregation = {
            [ASSET_TYPES.CASH]: 0,
            [ASSET_TYPES.STOCK]: 0,
            [ASSET_TYPES.FUND]: 0,
            [ASSET_TYPES.CRYPTO]: 0
        };

        assets.forEach(asset => {
            if (aggregation.hasOwnProperty(asset.type)) {
                aggregation[asset.type] += asset.getCurrentValue();
            }
        });

        return aggregation;
    }

    // グラフ用カテゴリ別に集計（株式を日本株・米国株・韓国株に分類）
    aggregateByChartCategory(assets) {
        const aggregation = {
            [CHART_CATEGORIES.CASH]: 0,
            [CHART_CATEGORIES.STOCK_JP]: 0,
            [CHART_CATEGORIES.STOCK_US]: 0,
            [CHART_CATEGORIES.STOCK_KR]: 0,
            [CHART_CATEGORIES.FUND]: 0,
            [CHART_CATEGORIES.CRYPTO]: 0
        };

        assets.forEach(asset => {
            const value = asset.getCurrentValue();

            if (asset.type === ASSET_TYPES.CASH) {
                aggregation[CHART_CATEGORIES.CASH] += value;
            } else if (asset.type === ASSET_TYPES.STOCK) {
                // 株式は日本株・米国株・韓国株に分類
                if (this.isKoreanStock(asset)) {
                    aggregation[CHART_CATEGORIES.STOCK_KR] += value;
                } else if (this.isJapaneseStock(asset)) {
                    aggregation[CHART_CATEGORIES.STOCK_JP] += value;
                } else {
                    aggregation[CHART_CATEGORIES.STOCK_US] += value;
                }
            } else if (asset.type === ASSET_TYPES.FUND) {
                aggregation[CHART_CATEGORIES.FUND] += value;
            } else if (asset.type === ASSET_TYPES.CRYPTO) {
                aggregation[CHART_CATEGORIES.CRYPTO] += value;
            }
        });

        return aggregation;
    }

    // 構成比を計算
    calculateAllocation(assets) {
        const total = this.calculateTotalValue(assets);
        const byType = this.aggregateByType(assets);

        return Object.entries(byType).map(([type, value]) => ({
            type,
            label: ASSET_TYPE_LABELS[type],
            value,
            percentage: total > 0 ? (value / total) * 100 : 0
        }));
    }

    // 損益を計算（株式、投資信託、暗号資産のみ）
    calculateProfitLoss(assets) {
        const profitableAssets = assets.filter(asset =>
            asset.type === ASSET_TYPES.STOCK ||
            asset.type === ASSET_TYPES.FUND ||
            asset.type === ASSET_TYPES.CRYPTO
        );

        const summary = {
            totalProfit: 0,
            totalCostBasis: 0,
            byType: {}
        };

        profitableAssets.forEach(asset => {
            const profit = asset.getProfit() || 0;
            const value = asset.getCurrentValue();
            const costBasis = value - profit;

            summary.totalProfit += profit;
            summary.totalCostBasis += costBasis;

            if (!summary.byType[asset.type]) {
                summary.byType[asset.type] = {
                    type: asset.type,
                    label: ASSET_TYPE_LABELS[asset.type],
                    profit: 0,
                    costBasis: 0,
                    profitRate: 0,
                    count: 0
                };
            }

            summary.byType[asset.type].profit += profit;
            summary.byType[asset.type].costBasis += costBasis;
            summary.byType[asset.type].count += 1;
        });

        // 損益率を計算
        Object.values(summary.byType).forEach(typeData => {
            if (typeData.costBasis > 0) {
                typeData.profitRate = (typeData.profit / typeData.costBasis) * 100;
            }
        });

        summary.totalProfitRate = summary.totalCostBasis > 0
            ? (summary.totalProfit / summary.totalCostBasis) * 100
            : 0;

        return summary;
    }

    // 最近更新された資産を取得
    getRecentAssets(assets, limit = 5) {
        return [...assets]
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, limit);
    }

    // 同じ銘柄を集計（ticker/fundCode/symbol で集約）
    aggregateByIdentifier(assets) {
        const aggregated = {};

        assets.forEach(asset => {
            let identifier = null;

            // 識別子を取得
            if (asset.type === ASSET_TYPES.STOCK && asset.ticker) {
                identifier = `stock-${asset.ticker}`;
            } else if (asset.type === ASSET_TYPES.FUND && asset.fundCode) {
                identifier = `fund-${asset.fundCode}`;
            } else if (asset.type === ASSET_TYPES.CRYPTO && asset.symbol) {
                identifier = `crypto-${asset.symbol}`;
            }

            // 識別子がない場合は個別に扱う
            if (!identifier) {
                identifier = `individual-${asset.id}`;
            }

            if (!aggregated[identifier]) {
                aggregated[identifier] = {
                    type: asset.type,
                    name: asset.name,
                    identifier: identifier,
                    ticker: asset.ticker || null,
                    fundCode: asset.fundCode || null,
                    symbol: asset.symbol || null,
                    totalQuantity: 0,
                    totalValue: 0,
                    totalCostBasis: 0,
                    count: 0,
                    assets: []
                };
            }

            const data = aggregated[identifier];
            data.totalQuantity += asset.quantity || 0;
            data.totalValue += asset.getCurrentValue();

            // 取得原価を計算（投資信託は10000で割る）
            if (asset.quantity && asset.averagePrice) {
                if (asset.type === ASSET_TYPES.FUND) {
                    // 投資信託: (口数 × 平均取得基準価額) / 10000
                    data.totalCostBasis += (asset.quantity * asset.averagePrice) / 10000;
                } else {
                    // 株式・暗号資産: 数量 × 平均取得単価
                    data.totalCostBasis += asset.quantity * asset.averagePrice;
                }
            }

            data.count += 1;
            data.assets.push(asset);
        });

        // 配列に変換してソート
        return Object.values(aggregated)
            .map(item => {
                let averagePrice = 0;
                let currentPrice = 0;

                if (item.totalQuantity > 0) {
                    if (item.type === ASSET_TYPES.FUND) {
                        // 投資信託: 基準価額 = (取得原価 / 口数) * 10000
                        averagePrice = (item.totalCostBasis / item.totalQuantity) * 10000;
                        currentPrice = (item.totalValue / item.totalQuantity) * 10000;
                    } else {
                        // 株式・暗号資産: 単価 = 金額 / 数量
                        averagePrice = item.totalCostBasis / item.totalQuantity;
                        currentPrice = item.totalValue / item.totalQuantity;
                    }
                }

                return {
                    ...item,
                    averagePrice,
                    currentPrice,
                    profit: item.totalValue - item.totalCostBasis,
                    profitRate: item.totalCostBasis > 0 ? ((item.totalValue - item.totalCostBasis) / item.totalCostBasis) * 100 : 0
                };
            })
            .sort((a, b) => b.totalValue - a.totalValue);
    }

    // ツリーマップ用データを生成
    generateTreemapData(assets) {
        const aggregated = this.aggregateByIdentifier(assets);

        return aggregated
            .map(item => {
                let category;
                if (item.type === ASSET_TYPES.CASH) {
                    category = 'cash';
                } else if (item.type === ASSET_TYPES.FUND) {
                    category = 'fund';
                } else if (item.type === ASSET_TYPES.CRYPTO) {
                    category = 'crypto';
                } else {
                    const firstAsset = item.assets[0];
                    if (this.isKoreanStock(firstAsset)) {
                        category = 'stock_kr';
                    } else if (this.isJapaneseStock(firstAsset)) {
                        category = 'stock_jp';
                    } else {
                        category = 'stock_us';
                    }
                }

                return {
                    v: item.totalValue,
                    label: item.name,
                    ticker: item.ticker || null,
                    symbol: item.symbol || null,
                    category,
                    categoryLabel: CHART_CATEGORY_LABELS[category]
                };
            })
            .filter(item => item.v > 0)
            .sort((a, b) => b.v - a.v);
    }

    // 資産統計を取得
    getAssetStats(assets) {
        const totalValue = this.calculateTotalValue(assets);
        const allocation = this.calculateAllocation(assets);
        const profitLoss = this.calculateProfitLoss(assets);
        const recent = this.getRecentAssets(assets);
        const aggregatedByIdentifier = this.aggregateByIdentifier(assets);

        return {
            totalValue,
            totalAssets: assets.length,
            allocation,
            profitLoss,
            recent,
            aggregatedByIdentifier,
            byType: {
                cash: assets.filter(a => a.type === ASSET_TYPES.CASH).length,
                stock: assets.filter(a => a.type === ASSET_TYPES.STOCK).length,
                fund: assets.filter(a => a.type === ASSET_TYPES.FUND).length,
                crypto: assets.filter(a => a.type === ASSET_TYPES.CRYPTO).length
            }
        };
    }

    // グラフ用のデータを生成
    generateChartData(assets, chartType = 'pie') {
        if (chartType === 'pie' || chartType === 'doughnut') {
            // 株式を日本株・米国株に分類して集計
            const chartAggregation = this.aggregateByChartCategory(assets);
            const total = this.calculateTotalValue(assets);

            // 値が0より大きいカテゴリのみ抽出
            const categories = Object.entries(chartAggregation)
                .filter(([category, value]) => value > 0)
                .map(([category, value]) => ({
                    category,
                    label: CHART_CATEGORY_LABELS[category],
                    value,
                    percentage: total > 0 ? (value / total) * 100 : 0
                }));

            // 色の定義
            const colorMap = {
                [CHART_CATEGORIES.CASH]: {
                    bg: 'rgba(16, 185, 129, 0.8)',
                    border: 'rgba(16, 185, 129, 1)'
                },
                [CHART_CATEGORIES.STOCK_JP]: {
                    bg: 'rgba(59, 130, 246, 0.8)',
                    border: 'rgba(59, 130, 246, 1)'
                },
                [CHART_CATEGORIES.STOCK_US]: {
                    bg: 'rgba(99, 102, 241, 0.8)',
                    border: 'rgba(99, 102, 241, 1)'
                },
                [CHART_CATEGORIES.STOCK_KR]: {
                    bg: 'rgba(236, 72, 153, 0.8)',
                    border: 'rgba(236, 72, 153, 1)'
                },
                [CHART_CATEGORIES.FUND]: {
                    bg: 'rgba(245, 158, 11, 0.8)',
                    border: 'rgba(245, 158, 11, 1)'
                },
                [CHART_CATEGORIES.CRYPTO]: {
                    bg: 'rgba(139, 92, 246, 0.8)',
                    border: 'rgba(139, 92, 246, 1)'
                }
            };

            return {
                labels: categories.map(item => item.label),
                datasets: [{
                    data: categories.map(item => item.value),
                    backgroundColor: categories.map(item => colorMap[item.category].bg),
                    borderColor: categories.map(item => colorMap[item.category].border),
                    borderWidth: 2
                }]
            };
        }

        if (chartType === 'bar') {
            const allocation = this.calculateAllocation(assets);
            return {
                labels: allocation.map(item => item.label),
                datasets: [{
                    label: '資産額',
                    data: allocation.map(item => item.value),
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                }]
            };
        }

        return null;
    }

    // 月次推移グラフ用のデータを生成（積み上げ棒グラフ）
    generateMonthlyChartData(monthlyHistory) {
        if (!monthlyHistory || monthlyHistory.length === 0) {
            return null;
        }

        const labels = monthlyHistory.map(item => item.label);

        // カテゴリごとのデータセットを準備
        const categories = [
            { key: CHART_CATEGORIES.CASH, label: CHART_CATEGORY_LABELS[CHART_CATEGORIES.CASH], color: { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgba(16, 185, 129, 1)' } },
            { key: CHART_CATEGORIES.STOCK_JP, label: CHART_CATEGORY_LABELS[CHART_CATEGORIES.STOCK_JP], color: { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgba(59, 130, 246, 1)' } },
            { key: CHART_CATEGORIES.STOCK_US, label: CHART_CATEGORY_LABELS[CHART_CATEGORIES.STOCK_US], color: { bg: 'rgba(99, 102, 241, 0.8)', border: 'rgba(99, 102, 241, 1)' } },
            { key: CHART_CATEGORIES.STOCK_KR, label: CHART_CATEGORY_LABELS[CHART_CATEGORIES.STOCK_KR], color: { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgba(236, 72, 153, 1)' } },
            { key: CHART_CATEGORIES.FUND, label: CHART_CATEGORY_LABELS[CHART_CATEGORIES.FUND], color: { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgba(245, 158, 11, 1)' } },
            { key: CHART_CATEGORIES.CRYPTO, label: CHART_CATEGORY_LABELS[CHART_CATEGORIES.CRYPTO], color: { bg: 'rgba(139, 92, 246, 0.8)', border: 'rgba(139, 92, 246, 1)' } }
        ];

        // 各カテゴリのデータセットを作成
        const datasets = categories.map(category => {
            return {
                label: category.label,
                data: monthlyHistory.map(item => {
                    // breakdownからカテゴリの値を取得、なければ0
                    return item.breakdown && item.breakdown[category.key] ? item.breakdown[category.key] : 0;
                }),
                backgroundColor: category.color.bg,
                borderColor: category.color.border,
                borderWidth: 1
            };
        });

        return {
            labels,
            datasets
        };
    }
}

// シングルトンインスタンス
export const calculationService = new CalculationService();
