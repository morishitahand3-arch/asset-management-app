// Price Service - Fetch current prices from Yahoo Finance

export class PriceService {
    constructor() {
        // CORSプロキシを使用（Yahoo FinanceはCORS制限があるため）
        // corsproxy.ioは匿名利用が廃止され常に403を返すため削除済み（要APIキー）
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.currentProxyIndex = 0;
        this.yahooFinanceBaseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';

        // 為替レートのキャッシュ（一括更新時に同じペアを何度も取得しないため）
        this.exchangeRateCache = new Map();
        this.exchangeRateCacheTtlMs = 5 * 60 * 1000; // 5分
    }

    // タイムアウト付きfetch（モバイル回線での長時間ハング防止）
    async fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(`タイムアウトしました（${timeoutMs}ms）`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // 現在のプロキシを取得
    getCurrentProxy() {
        return this.corsProxies[this.currentProxyIndex];
    }

    // ティッカーから適切なシンボルを生成（日本株 vs 米国株 vs 韓国株の判定）
    getSymbolForStock(ticker) {
        if (!ticker) return null;

        // 既にサフィックスが付いている場合はそのまま
        if (ticker.includes('.')) {
            return ticker;
        }

        // 数字のみの場合：桁数で日本株と韓国株を判定
        if (/^\d+$/.test(ticker)) {
            // 6桁の数字は韓国株と判定（例: 005930 = サムスン電子）
            if (ticker.length === 6) {
                return `${ticker}.KS`;
            }
            // それ以外（主に4桁）は日本株と判定（例: 7203）
            return `${ticker}.T`;
        }

        // アルファベットが含まれる場合は米国株と判定（例: AAPL, MU）
        return ticker;
    }

    // 為替レート取得（USD→JPY）
    async getExchangeRate(from = 'USD', to = 'JPY') {
        const cacheKey = `${from}${to}`;
        const cached = this.exchangeRateCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.exchangeRateCacheTtlMs) {
            console.log(`Using cached exchange rate ${from}/${to}:`, cached.rate);
            return cached.rate;
        }

        try {
            const symbol = `${from}${to}=X`;
            const url = `${this.yahooFinanceBaseUrl}${symbol}`;

            console.log('Fetching exchange rate for:', symbol);
            const data = await this.fetchWithProxyRetry(url);

            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('為替レートが見つかりません');
            }

            const result = data.chart.result[0];
            const rate = result.meta.regularMarketPrice;

            console.log(`Exchange rate ${from}/${to}:`, rate);
            this.exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() });
            return rate;
        } catch (error) {
            console.error('Failed to fetch exchange rate:', error);
            // デフォルト値として150円/USDを返す（同一実行中に無駄な再試行をしないよう短時間キャッシュ）
            console.warn('Using default exchange rate: 150 JPY/USD');
            this.exchangeRateCache.set(cacheKey, { rate: 150, timestamp: Date.now() - this.exchangeRateCacheTtlMs + 30000 });
            return 150;
        }
    }

    // プロキシを使ってフェッチ（リトライ機能付き）
    // モバイル回線はプロキシがボット判定でブロックしやすく不安定なため、
    // 全プロキシを2周試す・タイムアウトを設ける・指数バックオフで待機する
    async fetchWithProxyRetry(url, maxRetries = this.corsProxies.length * 2) {
        let lastError = null;
        // 呼び出し開始時点の現在プロキシを起点に、他の並行呼び出しと競合しないよう
        // ローカルにプロキシの試行順を組み立てる
        const startIndex = this.currentProxyIndex;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const proxyIndex = (startIndex + attempt) % this.corsProxies.length;
            const proxy = this.corsProxies[proxyIndex];

            try {
                const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                console.log(`Attempt ${attempt + 1}/${maxRetries}: Fetching via ${proxy}`);

                const response = await this.fetchWithTimeout(proxyUrl, {}, 10000);

                if (response.ok) {
                    const data = await response.json();
                    this.currentProxyIndex = proxyIndex; // 成功したプロキシを次回以降の起点にする
                    return data;
                }

                console.warn(`Proxy failed with status ${response.status}, trying next proxy...`);
                lastError = new Error(`HTTP error! status: ${response.status}`);

            } catch (error) {
                console.warn(`Fetch error via ${proxy}:`, error.message);
                lastError = error;
            }

            // 指数バックオフ + ジッターで待機（最終試行後は待たない）
            if (attempt < maxRetries - 1) {
                const backoff = Math.min(500 * Math.pow(2, attempt), 4000) + Math.random() * 300;
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
        }

        throw lastError || new Error('All proxies failed');
    }

    // 株式の現在価格を取得（日本円換算）
    async getStockPrice(ticker, exchange = null) {
        try {
            const symbol = this.getSymbolForStock(ticker);

            if (!symbol) {
                throw new Error('ティッカーシンボルが無効です');
            }

            const url = `${this.yahooFinanceBaseUrl}${symbol}`;
            console.log('Fetching stock price for:', symbol);

            const data = await this.fetchWithProxyRetry(url);

            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('価格データが見つかりません');
            }

            const result = data.chart.result[0];
            let price = result.meta.regularMarketPrice;
            const currency = result.meta.currency;

            // USD/KRWの場合は日本円に変換
            if (currency === 'USD') {
                const exchangeRate = await this.getExchangeRate('USD', 'JPY');
                price = price * exchangeRate;
                console.log(`Converted ${result.meta.regularMarketPrice} USD to ${price.toFixed(2)} JPY (rate: ${exchangeRate})`);
            } else if (currency === 'KRW') {
                const exchangeRate = await this.getExchangeRate('KRW', 'JPY');
                price = price * exchangeRate;
                console.log(`Converted ${result.meta.regularMarketPrice} KRW to ${price.toFixed(2)} JPY (rate: ${exchangeRate})`);
            }

            return {
                success: true,
                price: price,
                currency: 'JPY', // 常に日本円で返す
                originalCurrency: currency,
                symbol: symbol,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to fetch stock price:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 投資信託の現在価格を取得
    async getFundPrice(fundCode) {
        if (!fundCode) {
            return {
                success: false,
                error: 'ファンドコードが指定されていません'
            };
        }

        // 複数の方法を試す
        const methods = [
            () => this.getFundPriceFromYahooJapan(fundCode),
            () => this.getFundPriceFromMinkabu(fundCode)
        ];

        for (const method of methods) {
            try {
                const result = await method();
                if (result.success) {
                    return result;
                }
            } catch (error) {
                console.warn('Method failed, trying next...', error);
            }
        }

        return {
            success: false,
            error: '投資信託の基準価額を取得できませんでした。手動で更新してください。'
        };
    }

    // Yahoo Finance Japan から投資信託の基準価額を取得
    async getFundPriceFromYahooJapan(fundCode) {
        try {
            // Yahoo Finance JapanのURL（例: https://finance.yahoo.co.jp/quote/03311187）
            const url = `https://finance.yahoo.co.jp/quote/${fundCode}`;
            console.log('Fetching fund price from Yahoo Finance Japan:', url);

            // CORSプロキシ経由でHTMLを取得（複数プロキシをリトライ）
            const html = await this.fetchHtmlWithProxyRetry(url);

            // 方法1: __PRELOADED_STATE__ からJSONで抽出（最も安定）
            const stateMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*({.+?});\s*<\/script>/s);
            if (stateMatch) {
                try {
                    const state = JSON.parse(stateMatch[1]);
                    const priceStr = state?.mainFundPriceBoard?.fundPrices?.price;
                    if (priceStr) {
                        const price = parseFloat(priceStr.replace(/,/g, ''));
                        if (!isNaN(price) && price > 0) {
                            console.log('Successfully extracted fund price from __PRELOADED_STATE__:', price);
                            return {
                                success: true,
                                price: price,
                                currency: 'JPY',
                                symbol: fundCode,
                                source: 'Yahoo Finance Japan (__PRELOADED_STATE__)',
                                timestamp: new Date().toISOString()
                            };
                        }
                    }
                } catch (parseError) {
                    console.warn('Failed to parse __PRELOADED_STATE__:', parseError);
                }
            }

            // 方法2: HTMLから直接抽出（フォールバック）
            const priceMatch = html.match(/基準価額[^>]*>[\s\S]*?<[^>]*>([\d,]+(?:\.\d+)?)/i);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1].replace(/,/g, ''));
                if (!isNaN(price) && price > 0) {
                    console.log('Successfully extracted fund price from HTML:', price);
                    return {
                        success: true,
                        price: price,
                        currency: 'JPY',
                        symbol: fundCode,
                        source: 'Yahoo Finance Japan (HTML)',
                        timestamp: new Date().toISOString()
                    };
                }
            }

            throw new Error('基準価額をページから抽出できませんでした');
        } catch (error) {
            console.error('Failed to fetch fund price from Yahoo Japan:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // HTML取得用のプロキシリトライ（テキストレスポンス用）
    async fetchHtmlWithProxyRetry(url, maxRetries = this.corsProxies.length * 2) {
        let lastError = null;
        const startIndex = this.currentProxyIndex;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const proxyIndex = (startIndex + attempt) % this.corsProxies.length;
            const proxy = this.corsProxies[proxyIndex];

            try {
                const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                console.log(`[HTML] Attempt ${attempt + 1}/${maxRetries}: Fetching via ${proxy}`);

                const response = await this.fetchWithTimeout(proxyUrl, {}, 10000);

                if (response.ok) {
                    const text = await response.text();
                    if (text && text.length > 1000) {
                        this.currentProxyIndex = proxyIndex;
                        return text;
                    }
                    console.warn('Response too short, might be blocked. Trying next proxy...');
                    lastError = new Error('プロキシからのレスポンスが不正です（ブロックされた可能性）');
                } else {
                    lastError = new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (error) {
                console.warn(`Fetch error via ${proxy}:`, error.message);
                lastError = error;
            }

            if (attempt < maxRetries - 1) {
                const backoff = Math.min(500 * Math.pow(2, attempt), 4000) + Math.random() * 300;
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
        }

        throw lastError || new Error('All proxies failed');
    }

    // みんかぶ（投資信託）から基準価額を取得
    async getFundPriceFromMinkabu(fundCode) {
        try {
            // みんかぶのURL（例: https://minkabu.jp/fund/XXXXXXXX）
            const url = `https://minkabu.jp/fund/${fundCode}`;
            console.log('Fetching fund price from Minkabu:', url);

            const html = await this.fetchHtmlWithProxyRetry(url);

            // 基準価額を抽出
            const priceMatch = html.match(/基準価額[^>]*>[\s\S]*?([\d,]+(?:\.\d+)?)\s*円/i);

            if (priceMatch) {
                const priceString = priceMatch[1].replace(/,/g, '');
                const price = parseFloat(priceString);

                if (!isNaN(price) && price > 0) {
                    console.log('Successfully extracted fund price from Minkabu:', price);
                    return {
                        success: true,
                        price: price,
                        currency: 'JPY',
                        symbol: fundCode,
                        source: 'Minkabu',
                        timestamp: new Date().toISOString()
                    };
                }
            }

            throw new Error('基準価額をページから抽出できませんでした');
        } catch (error) {
            console.error('Failed to fetch fund price from Minkabu:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 暗号資産の現在価格を取得（日本円換算）
    async getCryptoPrice(symbol) {
        try {
            // 暗号資産のシンボル（例：BTC-JPY, ETH-JPY）
            const cryptoSymbol = symbol.includes('-') ? symbol : `${symbol}-JPY`;
            const url = `${this.yahooFinanceBaseUrl}${cryptoSymbol}`;

            console.log('Fetching crypto price for:', cryptoSymbol);
            const data = await this.fetchWithProxyRetry(url);

            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('暗号資産の価格データが見つかりません');
            }

            const result = data.chart.result[0];
            let price = result.meta.regularMarketPrice;
            const currency = result.meta.currency;

            // USDの場合は日本円に変換
            if (currency === 'USD') {
                const exchangeRate = await this.getExchangeRate('USD', 'JPY');
                price = price * exchangeRate;
                console.log(`Converted ${result.meta.regularMarketPrice} USD to ${price.toFixed(2)} JPY (rate: ${exchangeRate})`);
            }

            return {
                success: true,
                price: price,
                currency: 'JPY', // 常に日本円で返す
                originalCurrency: currency,
                symbol: cryptoSymbol,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to fetch crypto price:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // CoinGecko APIを使った暗号資産価格取得（代替方法）
    async getCryptoPriceFromCoinGecko(symbol) {
        try {
            // シンボルをCoinGecko IDに変換（簡易マッピング）
            const symbolMap = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'XRP': 'ripple',
                'ADA': 'cardano',
                'DOGE': 'dogecoin',
                'SOL': 'solana',
                'DOT': 'polkadot',
                'MATIC': 'matic-network',
                'LINK': 'chainlink',
                'UNI': 'uniswap'
            };

            const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=jpy`;

            console.log('Fetching crypto price from CoinGecko for:', coinId);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data[coinId] || !data[coinId].jpy) {
                throw new Error('暗号資産の価格データが見つかりません');
            }

            return {
                success: true,
                price: data[coinId].jpy,
                currency: 'JPY',
                symbol: symbol,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to fetch crypto price from CoinGecko:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 汎用的な価格取得メソッド
    async getPrice(assetType, identifier) {
        switch (assetType) {
            case 'stock':
                return await this.getStockPrice(identifier);
            case 'fund':
                return await this.getFundPrice(identifier);
            case 'crypto':
                // まずYahoo Financeを試し、失敗したらCoinGeckoを使用
                const yahooResult = await this.getCryptoPrice(identifier);
                if (yahooResult.success) {
                    return yahooResult;
                }
                console.log('Yahoo Finance failed, trying CoinGecko...');
                return await this.getCryptoPriceFromCoinGecko(identifier);
            default:
                return {
                    success: false,
                    error: 'サポートされていない資産タイプです'
                };
        }
    }
}

// シングルトンインスタンス
export const priceService = new PriceService();
