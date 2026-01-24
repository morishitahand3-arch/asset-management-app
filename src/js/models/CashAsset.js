// Cash Asset Class

import { Asset } from './Asset.js';
import { ASSET_TYPES } from '../utils/constants.js';

export class CashAsset extends Asset {
    constructor(data = {}) {
        super(data);
        this.type = ASSET_TYPES.CASH;
        this.amount = data.amount || 0;
        this.accountType = data.accountType || 'savings';
        this.bankName = data.bankName || '';
    }

    getCurrentValue() {
        return this.amount;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            amount: this.amount,
            accountType: this.accountType,
            bankName: this.bankName
        };
    }

    static fromJSON(json) {
        return new CashAsset(json);
    }
}
