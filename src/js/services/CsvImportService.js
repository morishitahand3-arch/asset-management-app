// CSV Import Service - CSVファイルから資産データをインポート

import { assetService } from './AssetService.js';

class CsvImportService {
    // ダブルクォート対応のCSV行パーサー
    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = false;
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    fields.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        fields.push(current.trim());
        return fields;
    }

    // CSVテキストを解析し、ヘッダー行を自動検出
    parseCSV(text) {
        const lines = text.split(/\r?\n/);

        // 「種別」を含む行をヘッダーとして検出
        const headerIndex = lines.findIndex(line => {
            const cols = this.parseCSVLine(line);
            return cols.some(col => col === '種別');
        });

        if (headerIndex === -1) {
            throw new Error('ヘッダー行が見つかりません。「種別」列を含むCSVを使用してください。');
        }

        // ヘッダー以降のデータ行を取得
        const dataRows = [];
        for (let i = headerIndex + 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = this.parseCSVLine(lines[i]);
            const type = cols[0];
            // 外貨預金などは対象外
            if (!type || (!type.includes('株式') && !type.includes('投資信託'))) continue;
            const quantity = parseFloat(cols[4].replace(/,/g, '')) || 0;
            const averagePrice = parseFloat(cols[6].replace(/,/g, '')) || 0;
            const priceUnit = cols[7]; // 円 or USD
            const currentPrice = parseFloat(cols[8].replace(/,/g, '')) || 0;
            const marketValueJpy = parseFloat(cols[14].replace(/,/g, '')) || 0;

            // 米国株の場合、時価評価額[円]から為替レートを逆算して円建てに変換
            let avgPriceJpy = averagePrice;
            let curPriceJpy = currentPrice;
            if (priceUnit === 'USD' && quantity > 0 && currentPrice > 0) {
                const exchangeRate = marketValueJpy / (quantity * currentPrice);
                avgPriceJpy = averagePrice * exchangeRate;
                curPriceJpy = currentPrice * exchangeRate;
            }

            dataRows.push({
                type: type,
                code: cols[1],
                name: cols[2],
                account: cols[3],
                quantity: quantity,
                unit: cols[5],
                averagePrice: avgPriceJpy,
                currentPrice: curPriceJpy
            });
        }
        return dataRows;
    }

    // 同一銘柄を合算（数量合計、加重平均価額）
    mergeRows(rows) {
        const groups = new Map();

        for (const row of rows) {
            // 投資信託は銘柄名でグループ化、株式は銘柄コードでグループ化
            const key = row.type.includes('投資信託')
                ? `fund:${row.name}`
                : `${row.type}:${row.code}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    ...row,
                    totalCost: row.quantity * row.averagePrice,
                    currentPrice: row.currentPrice
                });
            } else {
                const existing = groups.get(key);
                existing.totalCost += row.quantity * row.averagePrice;
                existing.quantity += row.quantity;
                // 現在価格は同一なので最新を採用
                existing.currentPrice = row.currentPrice;
            }
        }

        // 加重平均価額を計算
        return Array.from(groups.values()).map(group => {
            group.averagePrice = group.quantity > 0
                ? group.totalCost / group.quantity
                : 0;
            delete group.totalCost;
            return group;
        });
    }

    // 合算済みデータをアプリの資産形式に変換
    convertToAssets(mergedRows) {
        return mergedRows.map(row => {
            if (row.type === '国内株式') {
                return {
                    type: 'stock',
                    name: row.name,
                    ticker: row.code,
                    quantity: row.quantity,
                    averagePrice: row.averagePrice,
                    currentPrice: row.currentPrice,
                    exchange: 'JP',
                    currency: 'JPY'
                };
            } else if (row.type === '米国株式') {
                return {
                    type: 'stock',
                    name: row.name,
                    ticker: row.code,
                    quantity: row.quantity,
                    averagePrice: row.averagePrice,
                    currentPrice: row.currentPrice,
                    exchange: 'US',
                    currency: 'JPY'
                };
            } else if (row.type.includes('投資信託')) {
                return {
                    type: 'fund',
                    name: row.name,
                    fundCode: row.code,
                    quantity: row.quantity,
                    averagePrice: row.averagePrice,
                    currentPrice: row.currentPrice,
                    currency: 'JPY'
                };
            } else {
                return null;
            }
        }).filter(Boolean);
    }

    // 既存資産からCSV資産へのマッチングキーを生成
    _getAssetKey(asset) {
        if (asset.type === 'stock') {
            return `stock:${asset.ticker}`;
        } else if (asset.type === 'fund') {
            return `fund:${asset.fundCode || asset.name}`;
        }
        return null;
    }

    // CSVテキストからインポート実行（既存の未含有銘柄は保持）
    importFromCSV(text) {
        const rows = this.parseCSV(text);
        if (rows.length === 0) {
            throw new Error('インポートするデータが見つかりませんでした。');
        }

        const merged = this.mergeRows(rows);
        const assets = this.convertToAssets(merged);

        // 既存資産をキーでマップ化
        const existingAssets = assetService.getAllAssets();
        const existingMap = new Map();
        for (const asset of existingAssets) {
            const key = this._getAssetKey(asset);
            if (key) {
                existingMap.set(key, asset);
            }
        }

        // CSV資産を保存（既存があれば更新、なければ新規作成）
        let savedCount = 0;
        let updatedCount = 0;
        for (const assetData of assets) {
            const key = this._getAssetKey(assetData);
            const existing = key ? existingMap.get(key) : null;

            if (existing) {
                // 既存資産を更新（IDを引き継ぐ）
                assetData.id = existing.id;
                assetData.createdAt = existing.createdAt;
                existingMap.delete(key);
                updatedCount++;
            }

            const instance = assetService.createAssetInstance(assetData);
            assetService.saveAsset(instance);
            savedCount++;
        }

        return { total: rows.length, merged: assets.length, saved: savedCount, updated: updatedCount };
    }
}

export const csvImportService = new CsvImportService();
