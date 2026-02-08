// Asset List Controller - Asset list logic and interactions

import { AssetListView } from '../views/AssetListView.js';
import { assetService } from '../services/AssetService.js';
import { csvImportService } from '../services/CsvImportService.js';

export class AssetListController {
    constructor(containerId) {
        this.view = new AssetListView(containerId);
        this.currentFilter = 'all';
        this.currentSearchQuery = '';
        this.currentSortOption = 'date_desc';
        this.onEditCallback = null;
        this.onDeleteCallback = null;
        this.onAddCallback = null;
        this.searchDebounceTimer = null;
        this.isComposing = false; // 日本語入力中かどうか
    }

    // 資産一覧を表示
    renderList() {
        const allAssets = assetService.getAllAssets();

        // フィルタ・検索・ソートを適用
        const filteredAssets = assetService.filterAndSort(
            allAssets,
            this.currentFilter,
            this.currentSearchQuery,
            this.currentSortOption
        );

        // 検索/フィルタが適用されているかどうか
        const isFiltered = this.currentSearchQuery !== '' || this.currentFilter !== 'all';

        this.view.render(filteredAssets, {
            searchQuery: this.currentSearchQuery,
            currentFilter: this.currentFilter,
            isFiltered: isFiltered
        });
        this.attachEventHandlers();
    }

    // イベントハンドラーをアタッチ
    attachEventHandlers() {
        const container = this.view.container;
        if (!container) {
            console.error('Container not found!');
            return;
        }

        // イベント委譲を使用（クリックイベントを親要素で捕捉）
        // 既存のリスナーを削除するため、一度クローンして置き換え
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);
        this.view.container = newContainer;

        // 一つのイベントリスナーですべてのボタンを処理
        newContainer.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            // 編集ボタン
            if (target.classList.contains('edit-asset-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const assetId = target.dataset.assetId;
                console.log('Edit button clicked, assetId:', assetId);
                this.handleEdit(assetId);
                return;
            }

            // 削除ボタン
            if (target.classList.contains('delete-asset-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const assetId = target.dataset.assetId;
                this.handleDelete(assetId);
                return;
            }

            // 基準価額更新ボタン
            if (target.classList.contains('update-price-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const assetId = target.dataset.assetId;
                this.handleQuickPriceUpdate(assetId);
                return;
            }

            // フィルタボタン
            if (target.classList.contains('filter-btn')) {
                const filter = target.dataset.filter;
                this.handleFilterChange(filter, target);
                return;
            }

            // 最初の資産を登録ボタン
            if (target.id === 'add-first-asset') {
                this.handleAdd();
                return;
            }

            // 検索・フィルタをクリアボタン
            if (target.id === 'clear-search-filter') {
                this.clearSearchAndFilter();
                return;
            }

            // CSVインポートボタン
            if (target.id === 'csv-import-btn') {
                const fileInput = newContainer.querySelector('#csv-file-input');
                if (fileInput) fileInput.click();
                return;
            }
        });

        // CSVファイル選択
        const csvFileInput = newContainer.querySelector('#csv-file-input');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', (e) => {
                this.handleCsvImport(e.target.files[0]);
                e.target.value = '';
            });
        }

        // 検索（inputイベントは委譲できないので直接アタッチ）
        const searchInput = newContainer.querySelector('#asset-search');
        if (searchInput) {
            // 現在の検索クエリを復元
            searchInput.value = this.currentSearchQuery;

            // 日本語入力の開始を検知
            searchInput.addEventListener('compositionstart', () => {
                this.isComposing = true;
            });

            // 日本語入力の確定を検知
            searchInput.addEventListener('compositionend', (e) => {
                this.isComposing = false;
                this.handleSearchChange(e.target.value);
            });

            // 入力イベント
            searchInput.addEventListener('input', (e) => {
                // 日本語入力中は検索しない
                if (!this.isComposing) {
                    this.handleSearchChange(e.target.value);
                }
            });
        }

        // ソート（changeイベントは委譲できないので直接アタッチ）
        const sortSelect = newContainer.querySelector('#asset-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.handleSortChange(e.target.value);
            });
        }

        console.log('Event handlers attached using delegation');
    }

    // フィルタ変更処理
    handleFilterChange(filter, buttonElement) {
        this.currentFilter = filter;

        // ボタンのアクティブ状態を更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        if (buttonElement) {
            buttonElement.classList.add('active');
        }

        this.renderList();
    }

    // 検索変更処理（デバウンス付き）
    handleSearchChange(query) {
        // 検索クエリを即座に保存（入力フィールドの値を保持するため）
        this.currentSearchQuery = query;

        // 既存のタイマーをクリア
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        // 300ms後に検索を実行
        this.searchDebounceTimer = setTimeout(() => {
            this.renderList();
        }, 300);
    }

    // ソート変更処理
    handleSortChange(sortOption) {
        this.currentSortOption = sortOption;
        this.renderList();
    }

    // 編集処理
    handleEdit(assetId) {
        console.log('handleEdit called with assetId:', assetId);
        console.log('onEditCallback exists:', !!this.onEditCallback);
        if (this.onEditCallback) {
            console.log('Calling onEditCallback...');
            this.onEditCallback(assetId);
        } else {
            console.error('onEditCallback is not set!');
        }
    }

    // 削除処理
    handleDelete(assetId) {
        const asset = assetService.getAssetById(assetId);
        if (!asset) {
            this.showToast('資産が見つかりません', 'error');
            return;
        }

        const confirmed = confirm(`「${asset.name}」を削除してもよろしいですか？`);
        if (!confirmed) return;

        try {
            assetService.deleteAsset(assetId);
            this.showToast('資産を削除しました', 'success');

            if (this.onDeleteCallback) {
                this.onDeleteCallback();
            }

            this.renderList();
        } catch (error) {
            console.error('Failed to delete asset:', error);
            this.showToast('削除に失敗しました', 'error');
        }
    }

    // 追加処理
    handleAdd() {
        if (this.onAddCallback) {
            this.onAddCallback();
        }
    }

    // CSVインポート処理
    handleCsvImport(file) {
        if (!file) return;

        if (!confirm('既存の資産データをすべて削除し、CSVの内容で置き換えます。よろしいですか？')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = csvImportService.importFromCSV(e.target.result);
                this.showToast(
                    `CSVインポート完了: ${result.total}行 → ${result.saved}件の資産を登録`,
                    'success'
                );
                this.renderList();
                if (this.onDeleteCallback) {
                    this.onDeleteCallback(); // ダッシュボード再描画用
                }
            } catch (error) {
                console.error('CSV import failed:', error);
                this.showToast(`インポート失敗: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file, 'Shift_JIS');
    }

    // 検索・フィルタをクリア
    clearSearchAndFilter() {
        this.currentSearchQuery = '';
        this.currentFilter = 'all';
        this.currentSortOption = 'date_desc';
        this.renderList();
    }

    // クイック基準価額更新処理（投資信託専用）
    async handleQuickPriceUpdate(assetId) {
        const asset = assetService.getAssetById(assetId);
        if (!asset || asset.type !== 'fund') {
            this.showToast('投資信託が見つかりません', 'error');
            return;
        }

        // 基準価額確認サイトを開く
        if (asset.fundCode) {
            const sites = [
                { name: 'Yahoo Finance', url: `https://finance.yahoo.co.jp/quote/${asset.fundCode}` },
                { name: 'みんかぶ', url: `https://itf.minkabu.jp/fund/${asset.fundCode}` },
                { name: 'マネックス証券', url: `https://fund.monex.co.jp/detail/${asset.fundCode}` }
            ];

            const message = `基準価額を確認するサイトを選択してください:\n\n` +
                sites.map((site, index) => `${index + 1}. ${site.name}`).join('\n') +
                `\n\n数字を入力 (1-${sites.length})、または Enter で Yahoo Finance:`;

            const choice = prompt(message, '1');
            if (choice !== null && choice.trim() !== '') {
                const index = parseInt(choice) - 1;
                if (index >= 0 && index < sites.length) {
                    window.open(sites[index].url, '_blank');
                    this.showToast(`${sites[index].name} を開きました`, 'info');
                }
            }
        }

        // 手動入力
        const currentPrice = asset.currentPrice || '';
        const newPrice = prompt(
            `「${asset.name}」の新しい基準価額を入力してください\n\n` +
            `現在の基準価額: ${currentPrice ? currentPrice.toLocaleString() : '未設定'}\n` +
            `${asset.fundCode ? `ファンドコード: ${asset.fundCode}\n` : ''}` +
            `\n※ 同じファンドコードの投資信託がある場合、すべて一括更新されます`,
            currentPrice
        );

        if (newPrice === null) {
            return; // キャンセル
        }

        const priceValue = parseFloat(newPrice.replace(/,/g, ''));
        if (isNaN(priceValue) || priceValue <= 0) {
            this.showToast('有効な基準価額を入力してください', 'error');
            return;
        }

        try {
            // 同じファンドコードを持つすべての投資信託を更新
            const updatedCount = this.updateSameFunds(asset.fundCode || null, priceValue, asset.name);

            if (updatedCount > 1) {
                this.showToast(`基準価額を更新しました: ${priceValue.toLocaleString()} (${updatedCount}件)`, 'success');
            } else {
                this.showToast(`基準価額を更新しました: ${priceValue.toLocaleString()}`, 'success');
            }
            this.renderList();
        } catch (error) {
            console.error('Failed to update price:', error);
            this.showToast('基準価額の更新に失敗しました', 'error');
        }
    }

    // 同じファンドコードを持つ投資信託を一括更新
    updateSameFunds(fundCode, price, fundName = null) {
        const allAssets = assetService.getAllAssets();
        let updatedCount = 0;

        allAssets.forEach(asset => {
            if (asset.type === 'fund') {
                // ファンドコードがある場合はそれで一致判定
                if (fundCode && asset.fundCode === fundCode) {
                    asset.currentPrice = price;
                    asset.updatedAt = new Date().toISOString();
                    assetService.saveAsset(asset);
                    updatedCount++;
                }
                // ファンドコードがない場合は名前で一致判定
                else if (!fundCode && fundName && asset.name === fundName) {
                    asset.currentPrice = price;
                    asset.updatedAt = new Date().toISOString();
                    assetService.saveAsset(asset);
                    updatedCount++;
                }
            }
        });

        return updatedCount;
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
    onEdit(callback) {
        this.onEditCallback = callback;
    }

    onDelete(callback) {
        this.onDeleteCallback = callback;
    }

    onAdd(callback) {
        this.onAddCallback = callback;
    }
}
