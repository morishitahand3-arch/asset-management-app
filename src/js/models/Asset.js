// Asset Base Class

export class Asset {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.type = data.type;
        this.name = data.name || '';
        this.currency = data.currency || 'JPY';
        this.notes = data.notes || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        return `${this.type}-${timestamp}-${random}`;
    }

    // サブクラスでオーバーライド
    getCurrentValue() {
        throw new Error('getCurrentValue() must be implemented by subclass');
    }

    // サブクラスでオーバーライド（オプション）
    getProfit() {
        return null;
    }

    // サブクラスでオーバーライド（オプション）
    getProfitRate() {
        return null;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            currency: this.currency,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromJSON(json) {
        return new Asset(json);
    }
}
