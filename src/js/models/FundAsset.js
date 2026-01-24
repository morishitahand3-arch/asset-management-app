// Fund (Investment Trust) Asset Class

import { Asset } from './Asset.js';
import { ASSET_TYPES } from '../utils/constants.js';

export class FundAsset extends Asset {
    constructor(data = {}) {
        super(data);
        this.type = ASSET_TYPES.FUND;
        this.fundCode = data.fundCode || '';
        this.quantity = data.quantity || 0;
        this.averagePrice = data.averagePrice || 0;
        this.currentPrice = data.currentPrice || 0;
        this.category = data.category || 'equity';
    }

    getCurrentValue() {
        // 投資信託の場合、口数 × 基準価額 / 10000
        return (this.quantity * this.currentPrice) / 10000;
    }

    getProfit() {
        const currentValue = this.getCurrentValue();
        const costBasis = (this.quantity * this.averagePrice) / 10000;
        return currentValue - costBasis;
    }

    getProfitRate() {
        const costBasis = (this.quantity * this.averagePrice) / 10000;
        if (costBasis === 0) return 0;
        return (this.getProfit() / costBasis) * 100;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            fundCode: this.fundCode,
            quantity: this.quantity,
            averagePrice: this.averagePrice,
            currentPrice: this.currentPrice,
            category: this.category
        };
    }

    static fromJSON(json) {
        return new FundAsset(json);
    }
}
