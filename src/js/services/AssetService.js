// Asset Service - CRUD operations with proper asset class instantiation

import { storageService } from './StorageService.js';
import { CashAsset } from '../models/CashAsset.js';
import { StockAsset } from '../models/StockAsset.js';
import { FundAsset } from '../models/FundAsset.js';
import { CryptoAsset } from '../models/CryptoAsset.js';
import { ASSET_TYPES } from '../utils/constants.js';

export class AssetService {
    constructor(storage = storageService) {
        this.storage = storage;
    }

    // JSONデータから適切なAssetクラスのインスタンスを作成
    createAssetInstance(data) {
        switch (data.type) {
            case ASSET_TYPES.CASH:
                return new CashAsset(data);
            case ASSET_TYPES.STOCK:
                return new StockAsset(data);
            case ASSET_TYPES.FUND:
                return new FundAsset(data);
            case ASSET_TYPES.CRYPTO:
                return new CryptoAsset(data);
            default:
                throw new Error(`Unknown asset type: ${data.type}`);
        }
    }

    // すべての資産を取得（Assetインスタンスの配列）
    getAllAssets() {
        const rawAssets = this.storage.getAllAssets();
        return rawAssets.map(data => this.createAssetInstance(data));
    }

    // IDで資産を取得
    getAssetById(id) {
        const data = this.storage.getAssetById(id);
        return data ? this.createAssetInstance(data) : null;
    }

    // タイプ別で資産を取得
    getAssetsByType(type) {
        const rawAssets = this.storage.getAssetsByType(type);
        return rawAssets.map(data => this.createAssetInstance(data));
    }

    // 資産を保存（新規・更新）
    saveAsset(asset) {
        // Assetインスタンスの場合はJSONに変換
        const data = typeof asset.toJSON === 'function' ? asset.toJSON() : asset;
        return this.storage.saveAsset(data);
    }

    // 資産を削除
    deleteAsset(id) {
        return this.storage.deleteAsset(id);
    }

    // 資産を検索
    searchAssets(query) {
        const assets = this.getAllAssets();
        const lowerQuery = query.toLowerCase();

        return assets.filter(asset => {
            return (
                asset.name.toLowerCase().includes(lowerQuery) ||
                (asset.ticker && asset.ticker.toLowerCase().includes(lowerQuery)) ||
                (asset.symbol && asset.symbol.toLowerCase().includes(lowerQuery)) ||
                (asset.fundCode && asset.fundCode.toLowerCase().includes(lowerQuery))
            );
        });
    }

    // 資産をソート
    sortAssets(assets, sortOption) {
        const sorted = [...assets];

        switch (sortOption) {
            case 'name_asc':
                return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
            case 'name_desc':
                return sorted.sort((a, b) => b.name.localeCompare(a.name, 'ja'));
            case 'value_asc':
                return sorted.sort((a, b) => a.getCurrentValue() - b.getCurrentValue());
            case 'value_desc':
                return sorted.sort((a, b) => b.getCurrentValue() - a.getCurrentValue());
            case 'date_asc':
                return sorted.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
            case 'date_desc':
                return sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            default:
                return sorted;
        }
    }

    // フィルタとソートを適用
    filterAndSort(assets, typeFilter = null, searchQuery = '', sortOption = 'date_desc') {
        let filtered = assets;

        // タイプフィルタ
        if (typeFilter && typeFilter !== 'all') {
            filtered = filtered.filter(asset => asset.type === typeFilter);
        }

        // 検索フィルタ
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(asset => {
                return (
                    asset.name.toLowerCase().includes(lowerQuery) ||
                    (asset.ticker && asset.ticker.toLowerCase().includes(lowerQuery)) ||
                    (asset.symbol && asset.symbol.toLowerCase().includes(lowerQuery)) ||
                    (asset.fundCode && asset.fundCode.toLowerCase().includes(lowerQuery))
                );
            });
        }

        // ソート
        return this.sortAssets(filtered, sortOption);
    }
}

// シングルトンインスタンス
export const assetService = new AssetService();
