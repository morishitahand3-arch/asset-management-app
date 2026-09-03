// Bulk Price Update Service - Update all asset prices at once

import { priceService } from './PriceService.js';
import { assetService } from './AssetService.js';
import { ASSET_TYPES } from '../utils/constants.js';

export class BulkPriceUpdateService {
    constructor() {
        this.isUpdating = false;
        this.updateProgress = {
            total: 0,
            completed: 0,
            successful: 0,
            failed: 0
        };
    }

    // すべての資産価格を一括更新
    async updateAllPrices(onProgress = null) {
        if (this.isUpdating) {
            console.warn('Update already in progress');
            return {
                success: false,
                message: '更新が既に進行中です'
            };
        }

        this.isUpdating = true;
        this.resetProgress();

        try {
            const allAssets = assetService.getAllAssets();

            // 価格取得が必要な資産のみフィルタ（投資信託は自動取得の精度が低いため除外）
            const updatableAssets = allAssets.filter(asset =>
                asset.type === ASSET_TYPES.STOCK ||
                asset.type === ASSET_TYPES.CRYPTO
            );

            this.updateProgress.total = updatableAssets.length;

            if (updatableAssets.length === 0) {
                return {
                    success: true,
                    message: '更新対象の資産がありません',
                    progress: this.updateProgress
                };
            }

            console.log(`Updating prices for ${updatableAssets.length} assets...`);

            // 各資産の価格を更新（バッチ処理 - 無料プロキシがレート制限/ブロックしやすいため
            // 同時実行数を抑え、バッチ内でも少しずつ間隔を空けて送信する）
            const batchSize = 2;
            const results = [];

            for (let i = 0; i < updatableAssets.length; i += batchSize) {
                const batch = updatableAssets.slice(i, i + batchSize);
                console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} assets)...`);

                const batchPromises = batch.map(async (asset, index) => {
                    // バッチ内でも同時に発火させず、少しずらして送信する
                    if (index > 0) {
                        await new Promise(resolve => setTimeout(resolve, index * 400));
                    }
                    return await this.updateAssetPrice(asset, onProgress);
                });

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // バッチ間で待機（レート制限回避）
                if (i + batchSize < updatableAssets.length) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            // 結果を集計
            results.forEach(result => {
                if (result.success) {
                    this.updateProgress.successful++;
                } else {
                    this.updateProgress.failed++;
                }
            });

            return {
                success: true,
                message: `更新完了: 成功 ${this.updateProgress.successful}件、失敗 ${this.updateProgress.failed}件`,
                progress: this.updateProgress,
                results
            };

        } catch (error) {
            console.error('Bulk update failed:', error);
            return {
                success: false,
                message: '一括更新中にエラーが発生しました',
                error: error.message
            };
        } finally {
            this.isUpdating = false;
        }
    }

    // 個別資産の価格を更新
    async updateAssetPrice(asset, onProgress = null) {
        try {
            let identifier;
            let result;

            switch (asset.type) {
                case ASSET_TYPES.STOCK:
                    identifier = asset.ticker || asset.name;
                    result = await priceService.getStockPrice(identifier);
                    break;

                case ASSET_TYPES.FUND:
                    identifier = asset.fundCode || asset.name;
                    result = await priceService.getFundPrice(identifier);
                    break;

                case ASSET_TYPES.CRYPTO:
                    identifier = asset.symbol || asset.name;
                    result = await priceService.getPrice('crypto', identifier);
                    break;

                default:
                    return {
                        success: false,
                        assetId: asset.id,
                        assetName: asset.name,
                        message: 'サポートされていない資産タイプ'
                    };
            }

            if (result.success) {
                // 価格を更新して保存
                const assetData = asset.toJSON();
                assetData.currentPrice = result.price;
                assetData.updatedAt = new Date().toISOString();

                assetService.saveAsset(assetData);

                this.updateProgress.completed++;

                if (onProgress) {
                    onProgress(this.updateProgress);
                }

                console.log(`✓ Updated ${asset.name}: ¥${result.price.toLocaleString()}`);

                return {
                    success: true,
                    assetId: asset.id,
                    assetName: asset.name,
                    oldPrice: asset.currentPrice,
                    newPrice: result.price,
                    message: '更新成功'
                };
            } else {
                this.updateProgress.completed++;

                if (onProgress) {
                    onProgress(this.updateProgress);
                }

                console.warn(`✗ Failed to update ${asset.name}: ${result.error}`);

                return {
                    success: false,
                    assetId: asset.id,
                    assetName: asset.name,
                    message: result.error
                };
            }

        } catch (error) {
            this.updateProgress.completed++;

            if (onProgress) {
                onProgress(this.updateProgress);
            }

            console.error(`Error updating ${asset.name}:`, error);

            return {
                success: false,
                assetId: asset.id,
                assetName: asset.name,
                message: error.message
            };
        }
    }

    // 進捗状況をリセット
    resetProgress() {
        this.updateProgress = {
            total: 0,
            completed: 0,
            successful: 0,
            failed: 0
        };
    }

    // 進捗状況を取得
    getProgress() {
        return { ...this.updateProgress };
    }

    // 更新中かどうか
    isUpdateInProgress() {
        return this.isUpdating;
    }
}

// シングルトンインスタンス
export const bulkPriceUpdateService = new BulkPriceUpdateService();
