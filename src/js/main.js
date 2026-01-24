// Main Application Entry Point

import { DashboardController } from './controllers/DashboardController.js';
import { AssetFormController } from './controllers/AssetFormController.js';
import { AssetListController } from './controllers/AssetListController.js';

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.dashboardController = new DashboardController('dashboard-content');
        this.assetListController = new AssetListController('assets-content');
        this.newAssetFormController = new AssetFormController('form-content');
        this.editAssetFormController = new AssetFormController('edit-form-content');

        this.init();
    }

    init() {
        // コントローラーのコールバック設定
        this.setupControllerCallbacks();

        // ナビゲーションイベントリスナー
        this.setupNavigation();

        // 初期ビューを表示
        this.showView('dashboard');
    }

    setupControllerCallbacks() {
        // ダッシュボード
        this.dashboardController.onAddAsset(() => {
            this.showView('new-asset');
        });

        // 資産一覧
        this.assetListController.onEdit((assetId) => {
            this.showEditForm(assetId);
        });

        this.assetListController.onDelete(() => {
            // 削除後、ダッシュボードを更新
            if (this.currentView === 'dashboard') {
                this.dashboardController.renderDashboard();
            }
        });

        this.assetListController.onAdd(() => {
            this.showView('new-asset');
        });

        // 新規作成フォーム
        this.newAssetFormController.onSave(() => {
            this.showView('dashboard');
            this.dashboardController.renderDashboard();
        });

        this.newAssetFormController.onCancel(() => {
            this.showView('dashboard');
        });

        // 編集フォーム
        this.editAssetFormController.onSave(() => {
            this.showView('assets');
            this.assetListController.renderList();
            this.dashboardController.renderDashboard();
        });

        this.editAssetFormController.onCancel(() => {
            this.showView('assets');
        });
    }

    setupNavigation() {
        // ヘッダーナビゲーション
        const navBtns = document.querySelectorAll('.nav-btn');
        console.log('Nav buttons found:', navBtns.length);
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Nav button clicked:', e.currentTarget.dataset.view);
                const view = e.currentTarget.dataset.view;
                this.showView(view);
            });
        });

        // サイドバーナビゲーション
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        console.log('Sidebar links found:', sidebarLinks.length);
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Sidebar link clicked:', e.currentTarget.dataset.view);
                const view = e.currentTarget.dataset.view;
                this.showView(view);

                // サイドバーのアクティブ状態を更新
                sidebarLinks.forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
    }

    showView(viewName) {
        console.log('showView called with:', viewName);

        // すべてのビューを非表示
        const views = document.querySelectorAll('.view');
        console.log('Total views found:', views.length);
        views.forEach(view => {
            view.style.display = 'none';
        });

        // IDベースでビューを取得（より確実）
        const viewIdMap = {
            'dashboard': 'dashboard-view',
            'assets': 'assets-view',
            'new-asset': 'new-asset-view',
            'edit-asset': 'edit-asset-view'
        };

        const targetViewId = viewIdMap[viewName];
        const targetView = document.getElementById(targetViewId);

        console.log('Target view ID:', targetViewId);
        console.log('Target view element:', targetView);

        if (targetView) {
            targetView.style.display = 'block';
            console.log('View display set to block, actual value:', targetView.style.display);
            this.currentView = viewName;

            // ビューごとの処理
            this.handleViewChange(viewName);
        } else {
            console.error('View not found:', viewName);
        }
    }

    handleViewChange(viewName) {
        console.log('handleViewChange called with:', viewName);
        try {
            switch (viewName) {
                case 'dashboard':
                    console.log('Rendering dashboard...');
                    this.dashboardController.renderDashboard();
                    break;

                case 'assets':
                    console.log('Rendering asset list...');
                    this.assetListController.renderList();
                    break;

                case 'new-asset':
                    console.log('Rendering new asset form...');
                    this.newAssetFormController.showNewForm();
                    break;

                case 'edit-asset':
                    console.log('Edit asset view (no auto-render)');
                    // 編集フォームは showEditForm で個別に表示
                    break;

                default:
                    console.warn('Unknown view:', viewName);
            }
            console.log('handleViewChange completed');
        } catch (error) {
            console.error('Error in handleViewChange:', error);
        }
    }

    showEditForm(assetId) {
        console.log('showEditForm called with assetId:', assetId);
        this.showView('edit-asset');
        console.log('Calling editAssetFormController.showEditForm...');
        this.editAssetFormController.showEditForm(assetId);
    }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    console.log('Asset Management App Loaded');
    new App();
});
