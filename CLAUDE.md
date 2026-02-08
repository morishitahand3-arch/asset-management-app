# Asset Management App (資産管理アプリ)

## プロジェクト概要
個人向けの資産管理Webアプリケーション。複数の資産カテゴリを横断的に追跡・分析・監視できる。

## 技術スタック
- **フロントエンド:** Vanilla JavaScript (ES6+ Modules) — フレームワーク不使用
- **チャート:** Chart.js 4.4.1 (CDN)
- **スタイリング:** CSS3 (カスタムプロパティによるデザインシステム)
- **データ保存:** ブラウザ LocalStorage
- **開発サーバー:** Python `http.server` (port 8000)
- **UI言語:** 日本語

## アーキテクチャ
MVCパターン + サービス層（シングルトン）

```
User Action → Controller → Service → Model → Storage/API
                ↓            ↓         ↓
               View      Calculation  Update
```

## ディレクトリ構成
```
asset-manegement-app/
├── index.html                          # エントリーポイント
├── start-app.bat                       # サーバー起動＋ブラウザ起動
├── start-server.bat                    # サーバーのみ起動
├── src/
│   ├── js/
│   │   ├── main.js                     # アプリ初期化・ルーティング
│   │   ├── models/                     # 資産モデル（クラス継承）
│   │   │   ├── Asset.js                # 基底クラス（抽象）
│   │   │   ├── CashAsset.js            # 現金・預金
│   │   │   ├── StockAsset.js           # 株式（日本株・米国株）
│   │   │   ├── FundAsset.js            # 投資信託
│   │   │   └── CryptoAsset.js          # 暗号資産
│   │   ├── controllers/                # コントローラー
│   │   │   ├── DashboardController.js  # ダッシュボード描画・価格更新
│   │   │   ├── AssetFormController.js  # 資産フォーム作成・編集
│   │   │   └── AssetListController.js  # 資産一覧管理
│   │   ├── views/                      # ビュー（HTML生成・DOM操作）
│   │   │   ├── DashboardView.js
│   │   │   ├── AssetListView.js
│   │   │   ├── AssetFormView.js
│   │   │   └── ChartView.js
│   │   ├── services/                   # サービス層（シングルトン）
│   │   │   ├── AssetService.js         # 資産CRUD・検索
│   │   │   ├── PriceService.js         # Yahoo Finance / CoinGecko API連携
│   │   │   ├── StorageService.js       # LocalStorageラッパー
│   │   │   ├── CalculationService.js   # 金融計算・集計
│   │   │   └── BulkPriceUpdateService.js # 一括価格更新
│   │   └── utils/                      # ユーティリティ
│   │       ├── constants.js            # 資産タイプ、列挙、ラベル定義
│   │       ├── formatters.js           # 数値・通貨フォーマット
│   │       └── validators.js           # 入力バリデーション
│   └── css/
│       ├── variables.css               # デザイントークン（色、間隔、フォント等）
│       ├── reset.css                   # CSSリセット
│       ├── layout.css                  # レイアウト（グリッド、フレックス）
│       ├── components.css              # 共通コンポーネント
│       ├── dashboard.css               # ダッシュボード固有
│       └── responsive.css              # レスポンシブ（480px / 768px / 1024px / 1440px）
├── data/
├── docs/
└── images/
```

## 対応資産タイプ
| タイプ | クラス | 主な項目 |
|-------|--------|---------|
| 現金 (`cash`) | CashAsset | 名前、金額、通貨 |
| 株式 (`stock`) | StockAsset | 銘柄名、ティッカー、株数、平均取得単価、現在価格 |
| 投資信託 (`fund`) | FundAsset | ファンド名、ファンドコード、口数、平均基準価額 |
| 暗号資産 (`crypto`) | CryptoAsset | 暗号資産名、シンボル、数量、平均取得単価 |

## 外部API
- **Yahoo Finance** (主): 株価・為替・仮想通貨 (`query1.finance.yahoo.com`)
- **Yahoo Finance Japan** (副): 投資信託（Webスクレイピング）
- **Minkabu** (副): 投資信託（Webスクレイピング）
- **CoinGecko** (フォールバック): 仮想通貨 (`api.coingecko.com`)
- **CORSプロキシチェーン:** allorigins.win → corsproxy.io → codetabs.com

## 主な機能
- ダッシュボード（総資産、資産配分チャート、月次推移、損益表示）
- 資産CRUD（追加・編集・削除）
- 検索・フィルタ・ソート
- リアルタイム価格更新（個別・一括）
- 月次履歴スナップショット（13ヶ月保持）
- レスポンシブデザイン（モバイル〜デスクトップ）
- トースト通知

## 実装上の注意点
- 日本株のティッカーは数字のみで判定し、自動で `.T`（東証）を付加する
- 投資信託の損益計算は10,000口単位に正規化される
- サービス層はすべてシングルトンとしてエクスポートされている
- データはすべてLocalStorageに保存（サーバーサイドDBなし）

## 起動方法
```bash
# サーバー起動＋ブラウザ
start-app.bat

# または手動
python -m http.server 8000
# http://localhost:8000 にアクセス
```
