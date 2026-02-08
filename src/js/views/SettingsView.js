// Settings View - データエクスポート/インポート

import { storageService } from '../services/StorageService.js';

export class SettingsView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="card" style="margin-bottom: var(--spacing-lg);">
                <h3 class="card-title">データエクスポート</h3>
                <p style="margin-bottom: var(--spacing-md); color: var(--text-secondary);">
                    現在のデータをJSONファイルとしてダウンロードします。<br>
                    別のデバイスへのデータ移行やバックアップに使用できます。
                </p>
                <button class="btn btn-primary" id="export-btn">エクスポート</button>
            </div>

            <div class="card">
                <h3 class="card-title">データインポート</h3>
                <p style="margin-bottom: var(--spacing-md); color: var(--text-secondary);">
                    エクスポートしたJSONファイルを読み込んでデータを復元します。<br>
                    <strong>注意：現在のデータは上書きされます。</strong>
                </p>
                <label class="btn btn-secondary" style="cursor: pointer;">
                    ファイルを選択
                    <input type="file" id="import-file" accept=".json" style="display: none;">
                </label>
                <span id="import-filename" style="margin-left: var(--spacing-sm); color: var(--text-secondary);"></span>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('export-btn').addEventListener('click', () => {
            this.handleExport();
        });

        document.getElementById('import-file').addEventListener('change', (e) => {
            this.handleImport(e);
        });
    }

    handleExport() {
        const data = storageService.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().split('T')[0];
        const a = document.createElement('a');
        a.href = url;
        a.download = `asset-backup-${date}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.showToast('データをエクスポートしました');
    }

    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('import-filename').textContent = file.name;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (!data.assets || !Array.isArray(data.assets)) {
                    this.showToast('無効なファイル形式です', true);
                    return;
                }

                const count = data.assets.length;
                if (!confirm(`${count}件の資産データをインポートします。\n現在のデータは上書きされます。よろしいですか？`)) {
                    return;
                }

                storageService.importData(data);
                this.showToast(`${count}件のデータをインポートしました`);
            } catch (error) {
                this.showToast('ファイルの読み込みに失敗しました', true);
            }
        };
        reader.readAsText(file);
    }

    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = 'toast show' + (isError ? ' toast-error' : '');

        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }
}
