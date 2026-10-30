// Dividend Service - Fetch and cache dividend history for held stocks

import { priceService } from './PriceService.js';
import { assetService } from './AssetService.js';
import { ASSET_TYPES, STORAGE_KEYS } from '../utils/constants.js';

export class DividendService {
    constructor() {
        this.isUpdating = false;
        // 配当は頻繁に変わらないため、1週間以上経過したデータを「古い」とみなす
        this.staleAfterMs = 7 * 24 * 60 * 60 * 1000;
    }

    // キャッシュ済みの配当データを取得
    // 形式: { [ticker]: { symbol, currency, jpyRate, dividends: [{ date, amount }], fetchedAt } }
    getCache() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.DIVIDENDS);
            if (!data) return {};

            const cache = JSON.parse(data);
            return cache && typeof cache === 'object' && !Array.isArray(cache) ? cache : {};
        } catch (error) {
            console.error('Failed to get dividend cache:', error);
            return {};
        }
    }

    saveCache(cache) {
        try {
            localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(cache));
            return true;
        } catch (error) {
            console.error('Failed to save dividend cache:', error);
            return false;
        }
    }

    // 保有株式のユニークなティッカー一覧
    getHeldTickers(assets = assetService.getAllAssets()) {
        const tickers = assets
            .filter(asset => asset.type === ASSET_TYPES.STOCK && asset.ticker)
            .map(asset => asset.ticker);
        return [...new Set(tickers)];
    }

    // 未取得または古い配当データがあるか
    isStale(assets) {
        const cache = this.getCache();
        const now = Date.now();
        return this.getHeldTickers(assets).some(ticker => {
            const entry = cache[ticker];
            return !entry || now - new Date(entry.fetchedAt).getTime() > this.staleAfterMs;
        });
    }

    // 保有株式すべての配当データを取得してキャッシュ
    async updateAllDividends(onProgress = null) {
        if (this.isUpdating) {
            return {
                success: false,
                message: '配当データの取得が既に進行中です'
            };
        }

        this.isUpdating = true;

        try {
            const tickers = this.getHeldTickers();
            const progress = { total: tickers.length, completed: 0, successful: 0, failed: 0 };

            if (tickers.length === 0) {
                return {
                    success: true,
                    message: '配当データの取得対象となる株式がありません'
                };
            }

            const cache = this.getCache();

            // 無料プロキシのレート制限を避けるため1件ずつ間隔を空けて取得する
            for (const ticker of tickers) {
                const result = await priceService.getDividendHistory(ticker);

                if (result.success) {
                    cache[ticker] = {
                        symbol: result.symbol,
                        currency: result.currency,
                        jpyRate: result.jpyRate,
                        dividends: result.dividends,
                        fetchedAt: new Date().toISOString()
                    };
                    progress.successful++;
                } else {
                    console.warn(`✗ Failed to fetch dividends for ${ticker}: ${result.error}`);
                    progress.failed++;
                }

                progress.completed++;
                if (onProgress) {
                    onProgress(progress);
                }

                if (progress.completed < tickers.length) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            }

            // 売却済み銘柄のデータは削除
            Object.keys(cache).forEach(ticker => {
                if (!tickers.includes(ticker)) {
                    delete cache[ticker];
                }
            });

            this.saveCache(cache);

            return {
                success: true,
                message: `配当データ取得完了: 成功 ${progress.successful}件、失敗 ${progress.failed}件`
            };
        } catch (error) {
            console.error('Dividend update failed:', error);
            return {
                success: false,
                message: '配当データの取得中にエラーが発生しました'
            };
        } finally {
            this.isUpdating = false;
        }
    }
}

// シングルトンインスタンス
export const dividendService = new DividendService();
