// Constants and Enums

export const ASSET_TYPES = {
    CASH: 'cash',
    STOCK: 'stock',
    FUND: 'fund',
    CRYPTO: 'crypto'
};

export const ASSET_TYPE_LABELS = {
    [ASSET_TYPES.CASH]: '現金',
    [ASSET_TYPES.STOCK]: '株式',
    [ASSET_TYPES.FUND]: '投資信託',
    [ASSET_TYPES.CRYPTO]: '暗号資産'
};

// グラフ表示用の詳細カテゴリ（株式を日本株・米国株に分類）
export const CHART_CATEGORIES = {
    CASH: 'cash',
    STOCK_JP: 'stock_jp',
    STOCK_US: 'stock_us',
    FUND: 'fund',
    CRYPTO: 'crypto'
};

export const CHART_CATEGORY_LABELS = {
    [CHART_CATEGORIES.CASH]: '現金',
    [CHART_CATEGORIES.STOCK_JP]: '日本株',
    [CHART_CATEGORIES.STOCK_US]: '米国株',
    [CHART_CATEGORIES.FUND]: '投資信託',
    [CHART_CATEGORIES.CRYPTO]: '暗号資産'
};

export const ASSET_TYPE_ICONS = {
    [ASSET_TYPES.CASH]: '💵',
    [ASSET_TYPES.STOCK]: '📈',
    [ASSET_TYPES.FUND]: '📊',
    [ASSET_TYPES.CRYPTO]: '₿'
};

export const ACCOUNT_TYPES = {
    SAVINGS: 'savings',
    CHECKING: 'checking',
    WALLET: 'wallet'
};

export const ACCOUNT_TYPE_LABELS = {
    [ACCOUNT_TYPES.SAVINGS]: '普通預金',
    [ACCOUNT_TYPES.CHECKING]: '当座預金',
    [ACCOUNT_TYPES.WALLET]: '現金・財布'
};

export const FUND_CATEGORIES = {
    EQUITY: 'equity',
    BOND: 'bond',
    BALANCED: 'balanced',
    INDEX: 'index',
    REIT: 'reit'
};

export const FUND_CATEGORY_LABELS = {
    [FUND_CATEGORIES.EQUITY]: '株式型',
    [FUND_CATEGORIES.BOND]: '債券型',
    [FUND_CATEGORIES.BALANCED]: 'バランス型',
    [FUND_CATEGORIES.INDEX]: 'インデックス型',
    [FUND_CATEGORIES.REIT]: 'REIT型'
};

export const CURRENCIES = {
    JPY: 'JPY',
    USD: 'USD',
    EUR: 'EUR'
};

export const CURRENCY_SYMBOLS = {
    [CURRENCIES.JPY]: '¥',
    [CURRENCIES.USD]: '$',
    [CURRENCIES.EUR]: '€'
};

export const STORAGE_KEYS = {
    ASSETS: 'assetApp.assets',
    SETTINGS: 'assetApp.settings',
    VERSION: 'assetApp.version',
    HISTORY: 'assetApp.history'
};

export const APP_VERSION = '1.0.0';

export const SORT_OPTIONS = {
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
    VALUE_ASC: 'value_asc',
    VALUE_DESC: 'value_desc',
    DATE_ASC: 'date_asc',
    DATE_DESC: 'date_desc'
};

export const SORT_LABELS = {
    [SORT_OPTIONS.NAME_ASC]: '名前（昇順）',
    [SORT_OPTIONS.NAME_DESC]: '名前（降順）',
    [SORT_OPTIONS.VALUE_ASC]: '金額（昇順）',
    [SORT_OPTIONS.VALUE_DESC]: '金額（降順）',
    [SORT_OPTIONS.DATE_ASC]: '更新日（古い順）',
    [SORT_OPTIONS.DATE_DESC]: '更新日（新しい順）'
};
