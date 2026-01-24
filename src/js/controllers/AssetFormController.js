// Asset Form Controller - Form logic and validation

import { AssetFormView } from '../views/AssetFormView.js';
import { assetService } from '../services/AssetService.js';
import { priceService } from '../services/PriceService.js';
import { validators } from '../utils/validators.js';
import { CashAsset } from '../models/CashAsset.js';
import { StockAsset } from '../models/StockAsset.js';
import { FundAsset } from '../models/FundAsset.js';
import { CryptoAsset } from '../models/CryptoAsset.js';

export class AssetFormController {
    constructor(containerId) {
        this.view = new AssetFormView(containerId);
        this.onSaveCallback = null;
        this.onCancelCallback = null;
    }

    // 新規作成フォームを表示
    showNewForm() {
        console.log('AssetFormController.showNewForm called');
        try {
            this.view.render();
            console.log('View render completed');
            this.attachFormHandlers();
            console.log('Form handlers attached');
        } catch (error) {
            console.error('Error in showNewForm:', error);
        }
    }

    // 編集フォームを表示
    showEditForm(assetId) {
        console.log('AssetFormController.showEditForm called with ID:', assetId);
        console.log('Container ID:', this.view.container?.id);

        const asset = assetService.getAssetById(assetId);
        console.log('Retrieved asset:', asset);

        if (!asset) {
            console.error('Asset not found for ID:', assetId);
            this.showToast('資産が見つかりません', 'error');
            return;
        }

        const assetData = asset.toJSON();
        console.log('Asset data for form:', assetData);

        try {
            this.view.render(assetData);
            console.log('View rendered successfully');
            this.attachFormHandlers();
            console.log('Form handlers attached');
        } catch (error) {
            console.error('Error in showEditForm:', error);
        }
    }

    // フォームイベントハンドラーをアタッチ
    attachFormHandlers() {
        const form = document.getElementById('asset-form');
        const cancelBtn = document.getElementById('cancel-btn');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.handleCancel();
            });
        }

        // 価格取得ボタン
        const fetchStockPriceBtn = document.getElementById('fetch-stock-price');
        const fetchCryptoPriceBtn = document.getElementById('fetch-crypto-price');

        if (fetchStockPriceBtn) {
            fetchStockPriceBtn.addEventListener('click', () => {
                this.handleFetchStockPrice();
            });
        }

        if (fetchCryptoPriceBtn) {
            fetchCryptoPriceBtn.addEventListener('click', () => {
                this.handleFetchCryptoPrice();
            });
        }

        // 基準価額確認リンクボタン（投資信託 - ファンドコード欄）
        const openFundSiteBtn = document.getElementById('open-fund-site');
        const fundCodeInput = document.getElementById('fundCode');

        if (openFundSiteBtn && fundCodeInput) {
            // ファンドコード入力時にボタンの有効/無効を切り替え
            fundCodeInput.addEventListener('input', (e) => {
                const fundCode = e.target.value.trim();
                openFundSiteBtn.disabled = !fundCode;

                // 基準価額欄の確認ボタンも連動
                const openFundPriceSiteBtn = document.getElementById('open-fund-price-site');
                if (openFundPriceSiteBtn) {
                    openFundPriceSiteBtn.disabled = !fundCode;
                }
            });

            // ボタンクリック時に確認サイトを選択して開く
            openFundSiteBtn.addEventListener('click', () => {
                const fundCode = fundCodeInput.value.trim();
                if (fundCode) {
                    this.showFundSiteOptions(fundCode);
                } else {
                    this.showToast('ファンドコードを入力してください', 'error');
                }
            });
        }

        // 基準価額確認リンクボタン（投資信託 - 基準価額欄）
        const openFundPriceSiteBtn = document.getElementById('open-fund-price-site');

        if (openFundPriceSiteBtn && fundCodeInput) {
            // ボタンクリック時に確認サイトを選択して開く
            openFundPriceSiteBtn.addEventListener('click', () => {
                const fundCode = fundCodeInput.value.trim();
                if (fundCode) {
                    this.showFundSiteOptions(fundCode);
                } else {
                    this.showToast('ファンドコードを入力してください', 'error');
                }
            });
        }
    }

    // 投資信託の基準価額確認サイトを選択して開く
    showFundSiteOptions(fundCode) {
        const sites = [
            { name: 'Yahoo Finance', url: `https://finance.yahoo.co.jp/quote/${fundCode}` },
            { name: 'みんかぶ', url: `https://itf.minkabu.jp/fund/${fundCode}` },
            { name: 'マネックス証券', url: `https://fund.monex.co.jp/detail/${fundCode}` },
            { name: '日経', url: `https://www.nikkei.com/nkd/fund/?fcode=${fundCode}` }
        ];

        const message = `基準価額を確認するサイトを選択してください:\n\n` +
            sites.map((site, index) => `${index + 1}. ${site.name}`).join('\n') +
            `\n\n数字を入力してください (1-${sites.length}):`;

        const choice = prompt(message, '1');

        if (choice === null) {
            return; // キャンセル
        }

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < sites.length) {
            const selectedSite = sites[index];
            window.open(selectedSite.url, '_blank');
            this.showToast(`${selectedSite.name} を開きました`, 'info');
        } else {
            this.showToast('無効な選択です', 'error');
        }
    }

    // フォーム送信処理
    handleSubmit() {
        const formData = this.view.getFormData();

        // バリデーション
        const errors = validators.validateAsset(formData.type, formData);

        if (Object.keys(errors).length > 0) {
            this.view.showErrors(errors);
            this.showToast('入力内容を確認してください', 'error');
            return;
        }

        // エラーをクリア
        this.view.clearErrors();

        try {
            // 資産インスタンスを作成
            const asset = this.createAssetInstance(formData);

            // 投資信託の場合、同じファンドコードを持つすべての投資信託の基準価額を一括更新
            let updatedCount = 1;
            if (formData.type === 'fund' && formData.fundCode && formData.currentPrice) {
                updatedCount = this.updateSameFundPrices(
                    formData.fundCode,
                    parseFloat(formData.currentPrice),
                    formData.id // 現在編集中の資産IDは除外しない
                );
            }

            // 保存
            assetService.saveAsset(asset);

            // 成功メッセージ
            let message = formData.id ? '資産を更新しました' : '資産を登録しました';
            if (formData.type === 'fund' && updatedCount > 1) {
                message += ` (同じファンドコードの投資信託 ${updatedCount}件 を一括更新)`;
            }
            this.showToast(message, 'success');

            // コールバック実行
            if (this.onSaveCallback) {
                this.onSaveCallback(asset);
            }
        } catch (error) {
            console.error('Failed to save asset:', error);
            this.showToast('保存に失敗しました: ' + error.message, 'error');
        }
    }

    // 同じファンドコードを持つ投資信託の基準価額を一括更新
    updateSameFundPrices(fundCode, newPrice, currentAssetId = null) {
        const allAssets = assetService.getAllAssets();
        let updatedCount = 0;

        allAssets.forEach(asset => {
            if (asset.type === 'fund' && asset.fundCode === fundCode) {
                // 基準価額を更新
                asset.currentPrice = newPrice;
                asset.updatedAt = new Date().toISOString();
                assetService.saveAsset(asset);
                updatedCount++;
            }
        });

        console.log(`Updated ${updatedCount} funds with code ${fundCode} to price ${newPrice}`);
        return updatedCount;
    }

    // 資産インスタンスを作成
    createAssetInstance(formData) {
        const data = {
            ...formData,
            // 数値フィールドをパース
            amount: formData.amount ? parseFloat(formData.amount) : undefined,
            quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
            averagePrice: formData.averagePrice ? parseFloat(formData.averagePrice) : undefined,
            currentPrice: formData.currentPrice ? parseFloat(formData.currentPrice) : undefined
        };

        switch (formData.type) {
            case 'cash':
                return new CashAsset(data);
            case 'stock':
                return new StockAsset(data);
            case 'fund':
                return new FundAsset(data);
            case 'crypto':
                return new CryptoAsset(data);
            default:
                throw new Error('Unknown asset type');
        }
    }

    // キャンセル処理
    handleCancel() {
        if (this.onCancelCallback) {
            this.onCancelCallback();
        }
    }

    // 株式価格取得
    async handleFetchStockPrice() {
        const tickerInput = document.getElementById('ticker');
        const priceInput = document.getElementById('currentPrice');
        const fetchBtn = document.getElementById('fetch-stock-price');

        if (!tickerInput || !priceInput) return;

        const ticker = tickerInput.value.trim();
        if (!ticker) {
            this.showToast('ティッカーシンボルを入力してください', 'error');
            return;
        }

        // ボタンを無効化
        fetchBtn.disabled = true;
        fetchBtn.textContent = '取得中...';

        try {
            const result = await priceService.getStockPrice(ticker);

            if (result.success) {
                priceInput.value = result.price;
                this.showToast(`現在価格を取得しました: ¥${result.price.toLocaleString()}`, 'success');
            } else {
                this.showToast(`価格取得失敗: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error fetching stock price:', error);
            this.showToast('価格の取得に失敗しました', 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = '🔄 取得';
        }
    }

    // 暗号資産価格取得
    async handleFetchCryptoPrice() {
        const symbolInput = document.getElementById('symbol');
        const priceInput = document.getElementById('currentPrice');
        const fetchBtn = document.getElementById('fetch-crypto-price');

        if (!symbolInput || !priceInput) return;

        const symbol = symbolInput.value.trim();
        if (!symbol) {
            this.showToast('シンボルを入力してください（例: BTC）', 'error');
            return;
        }

        // ボタンを無効化
        fetchBtn.disabled = true;
        fetchBtn.textContent = '取得中...';

        try {
            const result = await priceService.getPrice('crypto', symbol);

            if (result.success) {
                priceInput.value = result.price;
                this.showToast(`現在価格を取得しました: ¥${result.price.toLocaleString()}`, 'success');
            } else {
                this.showToast(`価格取得失敗: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error fetching crypto price:', error);
            this.showToast('価格の取得に失敗しました', 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = '🔄 取得';
        }
    }

    // トースト通知を表示
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // コールバック設定
    onSave(callback) {
        this.onSaveCallback = callback;
    }

    onCancel(callback) {
        this.onCancelCallback = callback;
    }
}
