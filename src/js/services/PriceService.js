// Price Service - Fetch current prices from Yahoo Finance

export class PriceService {
    constructor() {
        // CORSプロキシを使用（Yahoo FinanceはCORS制限があるため）
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.currentProxyIndex = 0;
        this.yahooFinanceBaseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';
    }

    // 現在のプロキシを取得
    getCurrentProxy() {
        return this.corsProxies[this.currentProxyIndex];
    }

    // 次のプロキシに切り替え
    switchToNextProxy() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
        console.log('Switched to proxy:', this.getCurrentProxy());
    }

    // ティッカーから適切なシンボルを生成（日本株 vs 米国株の判定）
    getSymbolForStock(ticker) {
        if (!ticker) return null;

        // 既にサフィックスが付いている場合はそのまま
        if (ticker.includes('.')) {
            return ticker;
        }

        // 数字のみの場合は日本株と判定（例: 7203）
        if (/^\d+$/.test(ticker)) {
            return `${ticker}.T`;
        }

        // アルファベットが含まれる場合は米国株と判定（例: AAPL, MU）
        return ticker;
    }

    // 為替レート取得（USD→JPY）
    async getExchangeRate(from = 'USD', to = 'JPY') {
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
            return rate;
        } catch (error) {
            console.error('Failed to fetch exchange rate:', error);
            // デフォルト値として150円/USDを返す
            console.warn('Using default exchange rate: 150 JPY/USD');
            return 150;
        }
    }

    // プロキシを使ってフェッチ（リトライ機能付き）
    async fetchWithProxyRetry(url, maxRetries = 3) {
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const proxyUrl = `${this.getCurrentProxy()}${encodeURIComponent(url)}`;
                console.log(`Attempt ${attempt + 1}: Fetching via ${this.getCurrentProxy()}`);

                const response = await fetch(proxyUrl);

                if (response.ok) {
                    return await response.json();
                }

                // プロキシエラーの場合は次のプロキシに切り替え
                console.warn(`Proxy failed with status ${response.status}, switching to next proxy...`);
                this.switchToNextProxy();
                lastError = new Error(`HTTP error! status: ${response.status}`);

            } catch (error) {
                console.warn(`Fetch error:`, error);
                this.switchToNextProxy();
                lastError = error;

                // 短い待機時間を挟む
                await new Promise(resolve => setTimeout(resolve, 500));
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

            // CORSプロキシ経由でHTMLを取得
            const proxyUrl = `${this.getCurrentProxy()}${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();

            // 基準価額を抽出（Yahoo Finance Japanのページ構造に依存）
            // パターン1: <dd class="_3rXWJKZF">23,456</dd> のような形式
            let priceMatch = html.match(/<dd[^>]*class="[^"]*_3rXWJKZF[^"]*"[^>]*>([\d,]+(?:\.\d+)?)<\/dd>/);

            if (!priceMatch) {
                // パターン2: より柔軟なマッチング
                priceMatch = html.match(/基準価額[^>]*>[\s\S]*?<[^>]*>([\d,]+(?:\.\d+)?)/i);
            }

            if (!priceMatch) {
                // パターン3: data-testid などを使った抽出
                priceMatch = html.match(/data-testid="[^"]*price[^"]*"[^>]*>([\d,]+(?:\.\d+)?)</i);
            }

            if (priceMatch) {
                const priceString = priceMatch[1].replace(/,/g, '');
                const price = parseFloat(priceString);

                if (!isNaN(price) && price > 0) {
                    console.log('Successfully extracted fund price:', price);
                    return {
                        success: true,
                        price: price,
                        currency: 'JPY',
                        symbol: fundCode,
                        source: 'Yahoo Finance Japan',
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

    // みんかぶ（投資信託）から基準価額を取得
    async getFundPriceFromMinkabu(fundCode) {
        try {
            // みんかぶのURL（例: https://minkabu.jp/fund/XXXXXXXX）
            const url = `https://minkabu.jp/fund/${fundCode}`;
            console.log('Fetching fund price from Minkabu:', url);

            const proxyUrl = `${this.getCurrentProxy()}${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();

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
