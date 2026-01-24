// Asset Form View - Dynamic form generation

import { ASSET_TYPES, ASSET_TYPE_LABELS, ASSET_TYPE_ICONS, ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, FUND_CATEGORIES, FUND_CATEGORY_LABELS } from '../utils/constants.js';
import { formatters } from '../utils/formatters.js';

export class AssetFormView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentType = ASSET_TYPES.CASH;
        this.editMode = false;
        this.assetId = null;
    }

    // フォーム全体を生成
    render(assetData = null) {
        console.log('AssetFormView.render called, container:', this.container);
        console.log('Asset data:', assetData);
        if (!this.container) {
            console.error('Container not found!');
            return;
        }

        this.editMode = !!assetData;
        this.assetId = assetData?.id || null;
        this.currentType = assetData?.type || ASSET_TYPES.CASH;
        this.assetData = assetData || {};

        console.log('Edit mode:', this.editMode);
        console.log('Current type:', this.currentType);
        console.log('Generating form HTML...');
        this.container.innerHTML = this.generateFormHTML(assetData);
        console.log('Form HTML generated, attaching listeners...');
        this.attachEventListeners();
        console.log('AssetFormView.render completed');
    }

    // フォームHTMLを生成
    generateFormHTML(assetData) {
        return `
            <div class="asset-form">
                ${this.generateTypeSelector(assetData)}
                <form id="asset-form" class="form">
                    <div id="dynamic-fields"></div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            ${this.editMode ? '更新' : '登録'}
                        </button>
                        <button type="button" class="btn btn-secondary" id="cancel-btn">
                            キャンセル
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    // 資産タイプセレクター生成
    generateTypeSelector(assetData) {
        const types = Object.values(ASSET_TYPES);

        return `
            <div class="asset-type-selector ${this.editMode ? 'disabled' : ''}">
                ${types.map(type => `
                    <div class="asset-type-option ${this.currentType === type ? 'selected' : ''} ${this.editMode && this.currentType !== type ? 'disabled' : ''}"
                         data-type="${type}"
                         ${this.editMode && this.currentType !== type ? 'style="opacity: 0.3; pointer-events: none;"' : ''}>
                        <div class="type-icon">${ASSET_TYPE_ICONS[type]}</div>
                        <div class="type-name">${ASSET_TYPE_LABELS[type]}</div>
                    </div>
                `).join('')}
            </div>
            ${this.editMode ? '<p style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-top: var(--spacing-sm);">※ 編集時は資産タイプを変更できません</p>' : ''}
        `;
    }

    // 動的フィールドを生成
    generateDynamicFields(type, assetData = {}) {
        const container = document.getElementById('dynamic-fields');
        if (!container) return;

        let html = '';

        switch (type) {
            case ASSET_TYPES.CASH:
                html = this.generateCashFields(assetData);
                break;
            case ASSET_TYPES.STOCK:
                html = this.generateStockFields(assetData);
                break;
            case ASSET_TYPES.FUND:
                html = this.generateFundFields(assetData);
                break;
            case ASSET_TYPES.CRYPTO:
                html = this.generateCryptoFields(assetData);
                break;
        }

        container.innerHTML = html;
    }

    // 現金フィールド
    generateCashFields(data = {}) {
        return `
            <div class="form-group">
                <label class="form-label required" for="name">名前</label>
                <input type="text" id="name" name="name" class="form-input"
                       placeholder="例: 三菱UFJ銀行 普通預金"
                       value="${data.name || ''}">
                <div class="form-error" id="name-error"></div>
            </div>

            <div class="form-group">
                <label class="form-label required" for="amount">金額</label>
                <input type="number" id="amount" name="amount" class="form-input"
                       placeholder="500000" step="1" min="0"
                       value="${data.amount || ''}">
                <div class="form-error" id="amount-error"></div>
            </div>

            <div class="form-group">
                <label class="form-label" for="accountType">口座種別</label>
                <select id="accountType" name="accountType" class="form-select">
                    ${Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => `
                        <option value="${value}" ${data.accountType === value ? 'selected' : ''}>
                            ${label}
                        </option>
                    `).join('')}
                </select>
            </div>

            <div class="form-group">
                <label class="form-label" for="bankName">銀行名</label>
                <input type="text" id="bankName" name="bankName" class="form-input"
                       placeholder="例: 三菱UFJ銀行"
                       value="${data.bankName || ''}">
            </div>

            <div class="form-group">
                <label class="form-label" for="notes">メモ</label>
                <textarea id="notes" name="notes" class="form-textarea"
                          placeholder="メモを入力（任意）">${data.notes || ''}</textarea>
            </div>
        `;
    }

    // 株式フィールド
    generateStockFields(data = {}) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required" for="name">銘柄名</label>
                    <input type="text" id="name" name="name" class="form-input"
                           placeholder="例: トヨタ自動車"
                           value="${data.name || ''}">
                    <div class="form-error" id="name-error"></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="ticker">ティッカーシンボル</label>
                    <input type="text" id="ticker" name="ticker" class="form-input"
                           placeholder="例: 7203"
                           value="${data.ticker || ''}">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required" for="quantity">保有株数</label>
                    <input type="number" id="quantity" name="quantity" class="form-input"
                           placeholder="100" step="1" min="0"
                           value="${data.quantity || ''}">
                    <div class="form-error" id="quantity-error"></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="exchange">取引所</label>
                    <input type="text" id="exchange" name="exchange" class="form-input"
                           placeholder="例: 東証"
                           value="${data.exchange || ''}">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required" for="averagePrice">平均取得単価</label>
                    <input type="number" id="averagePrice" name="averagePrice" class="form-input"
                           placeholder="2500" step="0.01" min="0"
                           value="${data.averagePrice || ''}">
                    <div class="form-error" id="averagePrice-error"></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="currentPrice">現在価格</label>
                    <div style="display: flex; gap: var(--spacing-sm);">
                        <input type="number" id="currentPrice" name="currentPrice" class="form-input"
                               placeholder="2800" step="0.01" min="0"
                               value="${data.currentPrice || ''}" style="flex: 1;">
                        <button type="button" class="btn btn-secondary btn-sm fetch-price-btn" id="fetch-stock-price">
                            🔄 取得
                        </button>
                    </div>
                    <div class="form-error" id="currentPrice-error"></div>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="notes">メモ</label>
                <textarea id="notes" name="notes" class="form-textarea"
                          placeholder="メモを入力（任意）">${data.notes || ''}</textarea>
            </div>
        `;
    }

    // 投資信託フィールド
    generateFundFields(data = {}) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required" for="name">ファンド名</label>
                    <input type="text" id="name" name="name" class="form-input"
                           placeholder="例: eMAXIS Slim 全世界株式"
                           value="${data.name || ''}">
                    <div class="form-error" id="name-error"></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="fundCode">ファンドコード</label>
                    <div style="display: flex; gap: var(--spacing-sm);">
                        <input type="text" id="fundCode" name="fundCode" class="form-input"
                               placeholder="例: 03311187"
                               value="${data.fundCode || ''}" style="flex: 1;">
                        <button type="button" class="btn btn-secondary btn-sm" id="open-fund-site"
                                title="基準価額を確認" ${!data.fundCode ? 'disabled' : ''}>
                            🔗 確認
                        </button>
                    </div>
                    <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: var(--spacing-xs);">
                        💡 コード入力後、「🔗 確認」ボタンで基準価額を確認できます
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required" for="quantity">保有口数</label>
                    <input type="number" id="quantity" name="quantity" class="form-input"
                           placeholder="50000" step="1" min="0"
                           value="${data.quantity || ''}">
                    <div class="form-error" id="quantity-error"></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="category">カテゴリ</label>
                    <select id="category" name="category" class="form-select">
                        ${Object.entries(FUND_CATEGORY_LABELS).map(([value, label]) => `
                            <option value="${value}" ${data.category === value ? 'selected' : ''}>
                                ${label}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required" for="averagePrice">平均取得基準価額</label>
                    <input type="number" id="averagePrice" name="averagePrice" class="form-input"
                           placeholder="20000" step="0.01" min="0"
                           value="${data.averagePrice || ''}">
                    <div class="form-error" id="averagePrice-error"></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="currentPrice">現在基準価額</label>
                    <div style="display: flex; gap: var(--spacing-sm);">
                        <input type="number" id="currentPrice" name="currentPrice" class="form-input"
                               placeholder="40122" step="0.01" min="0"
                               value="${data.currentPrice || ''}" style="flex: 1;">
                        <button type="button" class="btn btn-secondary btn-sm" id="open-fund-price-site"
                                ${!data.fundCode ? 'disabled' : ''}>
                            🔗 確認
                        </button>
                    </div>
                    <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: var(--spacing-xs);">
                        💡 「🔗 確認」ボタンで基準価額確認サイトを開けます
                    </div>
                    <div class="form-error" id="currentPrice-error"></div>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="notes">メモ</label>
                <textarea id="notes" name="notes" class="form-textarea"
                          placeholder="メモを入力（任意）">${data.notes || ''}</textarea>
            </div>
        `;
    }

    // 暗号資産フィールド
    generateCryptoFields(data = {}) {
        return `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required" for="name">暗号資産名</label>
                    <input type="text" id="name" name="name" class="form-input"
                           placeholder="例: Bitcoin"
                           value="${data.name || ''}">
                    <div class="form-error" id="name-error"></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="symbol">シンボル</label>
                    <input type="text" id="symbol" name="symbol" class="form-input"
                           placeholder="例: BTC"
                           value="${data.symbol || ''}">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required" for="quantity">保有数量</label>
                    <input type="number" id="quantity" name="quantity" class="form-input"
                           placeholder="0.5" step="0.00000001" min="0"
                           value="${data.quantity || ''}">
                    <div class="form-error" id="quantity-error"></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="exchange">取引所</label>
                    <input type="text" id="exchange" name="exchange" class="form-input"
                           placeholder="例: bitFlyer"
                           value="${data.exchange || ''}">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required" for="averagePrice">平均取得単価（円）</label>
                    <input type="number" id="averagePrice" name="averagePrice" class="form-input"
                           placeholder="6000000" step="0.01" min="0"
                           value="${data.averagePrice || ''}">
                    <div class="form-error" id="averagePrice-error"></div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="currentPrice">現在価格（円）</label>
                    <div style="display: flex; gap: var(--spacing-sm);">
                        <input type="number" id="currentPrice" name="currentPrice" class="form-input"
                               placeholder="7000000" step="0.01" min="0"
                               value="${data.currentPrice || ''}" style="flex: 1;">
                        <button type="button" class="btn btn-secondary btn-sm fetch-price-btn" id="fetch-crypto-price">
                            🔄 取得
                        </button>
                    </div>
                    <div class="form-error" id="currentPrice-error"></div>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="notes">メモ</label>
                <textarea id="notes" name="notes" class="form-textarea"
                          placeholder="メモを入力（任意）">${data.notes || ''}</textarea>
            </div>
        `;
    }

    // イベントリスナーをアタッチ
    attachEventListeners() {
        // 資産タイプ選択（編集モードでは無効）
        if (!this.editMode) {
            const typeOptions = this.container.querySelectorAll('.asset-type-option');
            typeOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    const type = e.currentTarget.dataset.type;
                    this.onTypeChange(type);
                });
            });
        }

        // 初期フィールド生成（編集モードの場合は保存されたデータを使用）
        console.log('Generating dynamic fields with data:', this.assetData);
        this.generateDynamicFields(this.currentType, this.assetData);
    }

    // タイプ変更時の処理
    onTypeChange(type) {
        this.currentType = type;

        // タイプセレクターの選択状態を更新
        const options = this.container.querySelectorAll('.asset-type-option');
        options.forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.type === type);
        });

        // フィールドを再生成
        this.generateDynamicFields(type);
    }

    // フォームデータを取得
    getFormData() {
        const form = document.getElementById('asset-form');
        if (!form) return {};

        const formData = new FormData(form);
        const data = {
            type: this.currentType
        };

        if (this.assetId) {
            data.id = this.assetId;
        }

        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    }

    // エラーを表示
    showErrors(errors) {
        // エラーをクリア
        this.clearErrors();

        // 各フィールドのエラーを表示
        Object.entries(errors).forEach(([field, message]) => {
            const errorElement = document.getElementById(`${field}-error`);
            const inputElement = document.getElementById(field);

            if (errorElement && inputElement) {
                errorElement.textContent = message;
                inputElement.classList.add('error');
            }
        });
    }

    // エラーをクリア
    clearErrors() {
        const errorElements = this.container.querySelectorAll('.form-error');
        errorElements.forEach(el => {
            el.textContent = '';
        });

        const inputElements = this.container.querySelectorAll('.form-input, .form-select, .form-textarea');
        inputElements.forEach(el => {
            el.classList.remove('error');
        });
    }
}
