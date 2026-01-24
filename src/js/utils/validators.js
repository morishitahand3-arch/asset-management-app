// Validation Functions

export const validators = {
    // 必須チェック
    required(value, fieldName = 'この項目') {
        if (value === null || value === undefined || value === '') {
            return `${fieldName}は必須です`;
        }
        if (typeof value === 'string' && value.trim() === '') {
            return `${fieldName}は必須です`;
        }
        return null;
    },

    // 数値チェック
    isNumber(value, fieldName = 'この項目') {
        if (value === '' || value === null || value === undefined) {
            return null; // 空の場合はrequiredでチェック
        }
        const num = parseFloat(value);
        if (isNaN(num)) {
            return `${fieldName}は数値で入力してください`;
        }
        return null;
    },

    // 正の数チェック
    isPositive(value, fieldName = 'この項目') {
        if (value === '' || value === null || value === undefined) {
            return null;
        }
        const num = parseFloat(value);
        if (num <= 0) {
            return `${fieldName}は0より大きい値を入力してください`;
        }
        return null;
    },

    // 非負の数チェック
    isNonNegative(value, fieldName = 'この項目') {
        if (value === '' || value === null || value === undefined) {
            return null;
        }
        const num = parseFloat(value);
        if (num < 0) {
            return `${fieldName}は0以上の値を入力してください`;
        }
        return null;
    },

    // 最大長チェック
    maxLength(value, max, fieldName = 'この項目') {
        if (value && value.length > max) {
            return `${fieldName}は${max}文字以内で入力してください`;
        }
        return null;
    },

    // 最小長チェック
    minLength(value, min, fieldName = 'この項目') {
        if (value && value.length < min) {
            return `${fieldName}は${min}文字以上で入力してください`;
        }
        return null;
    },

    // 現金資産のバリデーション
    validateCashAsset(data) {
        const errors = {};

        const nameError = validators.required(data.name, '名前');
        if (nameError) errors.name = nameError;

        const amountRequiredError = validators.required(data.amount, '金額');
        if (amountRequiredError) {
            errors.amount = amountRequiredError;
        } else {
            const amountNumberError = validators.isNumber(data.amount, '金額');
            if (amountNumberError) {
                errors.amount = amountNumberError;
            } else {
                const amountPositiveError = validators.isPositive(data.amount, '金額');
                if (amountPositiveError) errors.amount = amountPositiveError;
            }
        }

        return errors;
    },

    // 株式資産のバリデーション
    validateStockAsset(data) {
        const errors = {};

        const nameError = validators.required(data.name, '銘柄名');
        if (nameError) errors.name = nameError;

        const quantityRequiredError = validators.required(data.quantity, '株数');
        if (quantityRequiredError) {
            errors.quantity = quantityRequiredError;
        } else {
            const quantityNumberError = validators.isNumber(data.quantity, '株数');
            if (quantityNumberError) {
                errors.quantity = quantityNumberError;
            } else {
                const quantityPositiveError = validators.isPositive(data.quantity, '株数');
                if (quantityPositiveError) errors.quantity = quantityPositiveError;
            }
        }

        const averagePriceRequiredError = validators.required(data.averagePrice, '平均取得単価');
        if (averagePriceRequiredError) {
            errors.averagePrice = averagePriceRequiredError;
        } else {
            const avgNumberError = validators.isNumber(data.averagePrice, '平均取得単価');
            if (avgNumberError) {
                errors.averagePrice = avgNumberError;
            } else {
                const avgPositiveError = validators.isPositive(data.averagePrice, '平均取得単価');
                if (avgPositiveError) errors.averagePrice = avgPositiveError;
            }
        }

        if (data.currentPrice !== '' && data.currentPrice !== null && data.currentPrice !== undefined) {
            const currentPriceNumberError = validators.isNumber(data.currentPrice, '現在価格');
            if (currentPriceNumberError) {
                errors.currentPrice = currentPriceNumberError;
            } else {
                const currentPricePositiveError = validators.isPositive(data.currentPrice, '現在価格');
                if (currentPricePositiveError) errors.currentPrice = currentPricePositiveError;
            }
        }

        return errors;
    },

    // 投資信託資産のバリデーション
    validateFundAsset(data) {
        const errors = {};

        const nameError = validators.required(data.name, 'ファンド名');
        if (nameError) errors.name = nameError;

        const quantityRequiredError = validators.required(data.quantity, '口数');
        if (quantityRequiredError) {
            errors.quantity = quantityRequiredError;
        } else {
            const quantityNumberError = validators.isNumber(data.quantity, '口数');
            if (quantityNumberError) {
                errors.quantity = quantityNumberError;
            } else {
                const quantityPositiveError = validators.isPositive(data.quantity, '口数');
                if (quantityPositiveError) errors.quantity = quantityPositiveError;
            }
        }

        const averagePriceRequiredError = validators.required(data.averagePrice, '平均基準価額');
        if (averagePriceRequiredError) {
            errors.averagePrice = averagePriceRequiredError;
        } else {
            const avgNumberError = validators.isNumber(data.averagePrice, '平均基準価額');
            if (avgNumberError) {
                errors.averagePrice = avgNumberError;
            } else {
                const avgPositiveError = validators.isPositive(data.averagePrice, '平均基準価額');
                if (avgPositiveError) errors.averagePrice = avgPositiveError;
            }
        }

        if (data.currentPrice !== '' && data.currentPrice !== null && data.currentPrice !== undefined) {
            const currentPriceNumberError = validators.isNumber(data.currentPrice, '現在基準価額');
            if (currentPriceNumberError) {
                errors.currentPrice = currentPriceNumberError;
            } else {
                const currentPricePositiveError = validators.isPositive(data.currentPrice, '現在基準価額');
                if (currentPricePositiveError) errors.currentPrice = currentPricePositiveError;
            }
        }

        return errors;
    },

    // 暗号資産のバリデーション
    validateCryptoAsset(data) {
        const errors = {};

        const nameError = validators.required(data.name, '暗号資産名');
        if (nameError) errors.name = nameError;

        const quantityRequiredError = validators.required(data.quantity, '数量');
        if (quantityRequiredError) {
            errors.quantity = quantityRequiredError;
        } else {
            const quantityNumberError = validators.isNumber(data.quantity, '数量');
            if (quantityNumberError) {
                errors.quantity = quantityNumberError;
            } else {
                const quantityPositiveError = validators.isPositive(data.quantity, '数量');
                if (quantityPositiveError) errors.quantity = quantityPositiveError;
            }
        }

        const averagePriceRequiredError = validators.required(data.averagePrice, '平均取得単価');
        if (averagePriceRequiredError) {
            errors.averagePrice = averagePriceRequiredError;
        } else {
            const avgNumberError = validators.isNumber(data.averagePrice, '平均取得単価');
            if (avgNumberError) {
                errors.averagePrice = avgNumberError;
            } else {
                const avgPositiveError = validators.isPositive(data.averagePrice, '平均取得単価');
                if (avgPositiveError) errors.averagePrice = avgPositiveError;
            }
        }

        if (data.currentPrice !== '' && data.currentPrice !== null && data.currentPrice !== undefined) {
            const currentPriceNumberError = validators.isNumber(data.currentPrice, '現在価格');
            if (currentPriceNumberError) {
                errors.currentPrice = currentPriceNumberError;
            } else {
                const currentPricePositiveError = validators.isPositive(data.currentPrice, '現在価格');
                if (currentPricePositiveError) errors.currentPrice = currentPricePositiveError;
            }
        }

        return errors;
    },

    // 資産タイプに応じたバリデーション
    validateAsset(type, data) {
        switch (type) {
            case 'cash':
                return validators.validateCashAsset(data);
            case 'stock':
                return validators.validateStockAsset(data);
            case 'fund':
                return validators.validateFundAsset(data);
            case 'crypto':
                return validators.validateCryptoAsset(data);
            default:
                return {};
        }
    }
};
