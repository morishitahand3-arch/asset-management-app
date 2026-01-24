// Calculation Service - Asset calculations and aggregations

import { ASSET_TYPES, ASSET_TYPE_LABELS } from '../utils/constants.js';

export class CalculationService {
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
        const allocation = this.calculateAllocation(assets);

        if (chartType === 'pie' || chartType === 'doughnut') {
            return {
                labels: allocation.map(item => item.label),
                datasets: [{
                    data: allocation.map(item => item.value),
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',   // Cash - Green
                        'rgba(59, 130, 246, 0.8)',   // Stock - Blue
                        'rgba(245, 158, 11, 0.8)',   // Fund - Orange
                        'rgba(139, 92, 246, 0.8)'    // Crypto - Purple
                    ],
                    borderColor: [
                        'rgba(16, 185, 129, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(139, 92, 246, 1)'
                    ],
                    borderWidth: 2
                }]
            };
        }

        if (chartType === 'bar') {
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
}

// シングルトンインスタンス
export const calculationService = new CalculationService();
