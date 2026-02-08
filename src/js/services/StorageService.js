// LocalStorage Service

import { STORAGE_KEYS, APP_VERSION } from '../utils/constants.js';

export class StorageService {
    constructor(storageKey = STORAGE_KEYS.ASSETS) {
        this.storageKey = storageKey;
        this.initializeStorage();
    }

    initializeStorage() {
        try {
            // バージョンチェック
            const version = localStorage.getItem(STORAGE_KEYS.VERSION);
            if (!version) {
                localStorage.setItem(STORAGE_KEYS.VERSION, APP_VERSION);
            }

            // 資産データの初期化
            const assets = localStorage.getItem(this.storageKey);
            if (!assets) {
                localStorage.setItem(this.storageKey, JSON.stringify([]));
            }

            // 設定の初期化
            const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (!settings) {
                const defaultSettings = {
                    currency: 'JPY',
                    theme: 'light',
                    chartType: 'pie'
                };
                localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
            }
        } catch (error) {
            console.error('Failed to initialize storage:', error);
        }
    }

    // すべての資産を取得
    getAllAssets() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return [];

            const assets = JSON.parse(data);

            // データ整合性チェック
            if (!Array.isArray(assets)) {
                console.error('Invalid data format in storage');
                return [];
            }

            return assets;
        } catch (error) {
            console.error('Failed to get assets:', error);
            return [];
        }
    }

    // 資産を保存（新規・更新）
    saveAsset(asset) {
        try {
            const assets = this.getAllAssets();
            const index = assets.findIndex(a => a.id === asset.id);

            const assetData = {
                ...asset,
                updatedAt: new Date().toISOString()
            };

            if (index >= 0) {
                // 更新
                assets[index] = assetData;
            } else {
                // 新規追加
                assets.push(assetData);
            }

            localStorage.setItem(this.storageKey, JSON.stringify(assets));
            return assetData;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new Error('ストレージ容量が不足しています。古いデータを削除してください。');
            }
            throw new Error('データの保存に失敗しました: ' + error.message);
        }
    }

    // 資産を削除
    deleteAsset(id) {
        try {
            const assets = this.getAllAssets();
            const filtered = assets.filter(a => a.id !== id);
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Failed to delete asset:', error);
            throw new Error('資産の削除に失敗しました');
        }
    }

    // IDで資産を取得
    getAssetById(id) {
        const assets = this.getAllAssets();
        return assets.find(a => a.id === id);
    }

    // タイプ別で資産を取得
    getAssetsByType(type) {
        const assets = this.getAllAssets();
        return assets.filter(a => a.type === type);
    }

    // すべての資産データを削除
    deleteAllAssets() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
            return true;
        } catch (error) {
            console.error('Failed to delete all assets:', error);
            return false;
        }
    }

    // すべてのデータをクリア
    clearAll() {
        try {
            localStorage.removeItem(this.storageKey);
            this.initializeStorage();
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }

    // データをエクスポート
    exportData() {
        const assets = this.getAllAssets();
        const settings = this.getSettings();
        return {
            version: APP_VERSION,
            exportDate: new Date().toISOString(),
            assets,
            settings
        };
    }

    // データをインポート
    importData(data) {
        try {
            if (!data.assets || !Array.isArray(data.assets)) {
                throw new Error('Invalid import data format');
            }

            localStorage.setItem(this.storageKey, JSON.stringify(data.assets));

            if (data.settings) {
                localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
            }

            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            throw new Error('データのインポートに失敗しました');
        }
    }

    // 設定を取得
    getSettings() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to get settings:', error);
            return {};
        }
    }

    // 設定を保存
    saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    // 履歴スナップショットを保存（カテゴリ別内訳付き）
    saveHistorySnapshot(totalValue, breakdown = {}) {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
            const history = this.getHistory();

            const snapshot = {
                date: today,
                value: totalValue,
                breakdown: breakdown // カテゴリ別の内訳
            };

            // 今日のデータが既にある場合は上書き
            const existingIndex = history.findIndex(item => item.date === today);
            if (existingIndex >= 0) {
                history[existingIndex] = snapshot;
            } else {
                history.push(snapshot);
            }

            // 古いデータを削除（過去13ヶ月分のみ保持）
            const thirteenMonthsAgo = new Date();
            thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
            const filteredHistory = history.filter(item => new Date(item.date) >= thirteenMonthsAgo);

            // 日付でソート
            filteredHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filteredHistory));
            return true;
        } catch (error) {
            console.error('Failed to save history snapshot:', error);
            return false;
        }
    }

    // 履歴データを取得
    getHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
            if (!data) return [];

            const history = JSON.parse(data);
            if (!Array.isArray(history)) {
                console.error('Invalid history format in storage');
                return [];
            }

            return history;
        } catch (error) {
            console.error('Failed to get history:', error);
            return [];
        }
    }

    // 月次集計データを取得（カテゴリ別内訳付き）
    getMonthlyHistory(months = 12) {
        const history = this.getHistory();
        if (history.length === 0) return [];

        // 月末の値を抽出
        const monthlyData = [];
        const now = new Date();

        for (let i = 0; i < months; i++) {
            const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = targetMonth.getFullYear();
            const month = targetMonth.getMonth() + 1;

            // その月の最後の日付のデータを探す
            const monthData = history.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
            });

            if (monthData.length > 0) {
                // 最新の日付のデータを使用
                const latestData = monthData[monthData.length - 1];
                monthlyData.unshift({
                    year,
                    month,
                    label: `${year}/${month}`,
                    value: latestData.value,
                    breakdown: latestData.breakdown || {}, // カテゴリ別内訳
                    date: latestData.date
                });
            } else {
                // データがない場合は0
                monthlyData.unshift({
                    year,
                    month,
                    label: `${year}/${month}`,
                    value: 0,
                    breakdown: {},
                    date: null
                });
            }
        }

        return monthlyData;
    }
}

// シングルトンインスタンス
export const storageService = new StorageService();
