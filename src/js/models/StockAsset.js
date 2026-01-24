// Stock Asset Class

import { Asset } from './Asset.js';
import { ASSET_TYPES } from '../utils/constants.js';

export class StockAsset extends Asset {
    constructor(data = {}) {
        super(data);
        this.type = ASSET_TYPES.STOCK;
        this.ticker = data.ticker || '';
        this.quantity = data.quantity || 0;
        this.averagePrice = data.averagePrice || 0;
        this.currentPrice = data.currentPrice || 0;
        this.exchange = data.exchange || '';
    }

    getCurrentValue() {
        return this.quantity * this.currentPrice;
    }

    getProfit() {
        const currentValue = this.getCurrentValue();
        const costBasis = this.quantity * this.averagePrice;
        return currentValue - costBasis;
    }

    getProfitRate() {
        const costBasis = this.quantity * this.averagePrice;
        if (costBasis === 0) return 0;
        return (this.getProfit() / costBasis) * 100;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            ticker: this.ticker,
            quantity: this.quantity,
            averagePrice: this.averagePrice,
            currentPrice: this.currentPrice,
            exchange: this.exchange
        };
    }

    static fromJSON(json) {
        return new StockAsset(json);
    }
}
