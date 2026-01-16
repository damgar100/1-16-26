// Stock API - Fetch real-time data from Yahoo Finance
// Using multiple CORS proxies as fallbacks

const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url='
];

let currentProxyIndex = 0;

const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Cache for API responses
const apiCache = {
    quotes: {},
    charts: {},
    lastUpdate: {}
};

const CACHE_DURATION = 300000; // 5 minute cache (increased for reliability)

// Try fetching with different proxies
async function fetchWithProxy(url) {
    const errors = [];
    
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxyIndex = (currentProxyIndex + i) % CORS_PROXIES.length;
        const proxy = CORS_PROXIES[proxyIndex];
        
        try {
            const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            console.log(`Trying proxy ${proxyIndex}:`, proxyUrl.substring(0, 80) + '...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(proxyUrl, {
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    currentProxyIndex = proxyIndex; // Remember working proxy
                    return data;
                } catch (parseError) {
                    console.log(`Proxy ${proxyIndex} returned invalid JSON`);
                    errors.push(`Proxy ${proxyIndex}: Invalid JSON`);
                }
            } else {
                console.log(`Proxy ${proxyIndex} returned status ${response.status}`);
                errors.push(`Proxy ${proxyIndex}: HTTP ${response.status}`);
            }
        } catch (error) {
            const errorMsg = error.name === 'AbortError' ? 'Timeout' : error.message;
            console.log(`Proxy ${proxyIndex} failed:`, errorMsg);
            errors.push(`Proxy ${proxyIndex}: ${errorMsg}`);
        }
    }
    
    throw new Error(`All proxies failed: ${errors.join(', ')}`);
}

// Fetch quote data for a single stock
async function fetchStockQuote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const now = Date.now();
    
    // Check cache
    if (apiCache.quotes[symbol] && (now - apiCache.lastUpdate[cacheKey]) < CACHE_DURATION) {
        console.log(`Using cached data for ${symbol}`);
        return apiCache.quotes[symbol];
    }
    
    try {
        const url = `${YAHOO_QUOTE_URL}?symbols=${symbol}`;
        const data = await fetchWithProxy(url);
        
        console.log(`API response for ${symbol}:`, data);
        
        if (data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result.length > 0) {
            const quote = data.quoteResponse.result[0];
            apiCache.quotes[symbol] = quote;
            apiCache.lastUpdate[cacheKey] = now;
            return quote;
        }
        
        console.log(`No quote data in response for ${symbol}`);
        return null;
    } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
        return null;
    }
}

// Fetch quotes for multiple stocks
async function fetchMultipleQuotes(symbols) {
    const symbolList = symbols.join(',');
    
    try {
        const url = `${YAHOO_QUOTE_URL}?symbols=${symbolList}`;
        const data = await fetchWithProxy(url);
        
        if (data.quoteResponse && data.quoteResponse.result) {
            const quotes = {};
            data.quoteResponse.result.forEach(quote => {
                quotes[quote.symbol] = quote;
                apiCache.quotes[quote.symbol] = quote;
                apiCache.lastUpdate[`quote_${quote.symbol}`] = Date.now();
            });
            return quotes;
        }
        return {};
    } catch (error) {
        console.error('Error fetching multiple quotes:', error);
        return {};
    }
}

// Fetch chart data for a stock
async function fetchStockChart(symbol, range = '1mo', interval = '1d') {
    const cacheKey = `chart_${symbol}_${range}_${interval}`;
    const now = Date.now();
    
    // Check cache
    if (apiCache.charts[cacheKey] && (now - apiCache.lastUpdate[cacheKey]) < CACHE_DURATION) {
        return apiCache.charts[cacheKey];
    }
    
    try {
        const url = `${YAHOO_CHART_URL}/${symbol}?range=${range}&interval=${interval}`;
        const data = await fetchWithProxy(url);
        
        if (data.chart && data.chart.result && data.chart.result.length > 0) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp || [];
            const quotes = result.indicators.quote[0] || {};
            
            const chartData = timestamps.map((timestamp, i) => ({
                date: new Date(timestamp * 1000).toISOString(),
                price: quotes.close[i] || quotes.open[i],
                open: quotes.open[i],
                high: quotes.high[i],
                low: quotes.low[i],
                close: quotes.close[i],
                volume: quotes.volume[i]
            })).filter(d => d.price !== null && d.price !== undefined);
            
            apiCache.charts[cacheKey] = chartData;
            apiCache.lastUpdate[cacheKey] = now;
            return chartData;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching chart for ${symbol}:`, error);
        return null;
    }
}

// Map period to Yahoo Finance range/interval
function getPeriodParams(period) {
    const params = {
        '1D': { range: '1d', interval: '5m' },
        '1W': { range: '5d', interval: '15m' },
        '1M': { range: '1mo', interval: '1d' },
        '3M': { range: '3mo', interval: '1d' },
        '1Y': { range: '1y', interval: '1d' },
        '5Y': { range: '5y', interval: '1wk' }
    };
    return params[period] || params['1M'];
}

// Get price from chart API as fallback
async function getPriceFromChart(symbol) {
    try {
        const url = `${YAHOO_CHART_URL}/${symbol}?range=1d&interval=1m`;
        const data = await fetchWithProxy(url);
        
        if (data.chart && data.chart.result && data.chart.result.length > 0) {
            const result = data.chart.result[0];
            const meta = result.meta || {};
            const quotes = result.indicators?.quote?.[0] || {};
            const closes = quotes.close || [];
            
            // Get the last valid price
            let lastPrice = meta.regularMarketPrice;
            if (!lastPrice) {
                for (let i = closes.length - 1; i >= 0; i--) {
                    if (closes[i] !== null && closes[i] !== undefined) {
                        lastPrice = closes[i];
                        break;
                    }
                }
            }
            
            if (lastPrice) {
                return {
                    price: lastPrice,
                    prevClose: meta.previousClose || meta.chartPreviousClose,
                    name: meta.shortName || meta.longName || symbol,
                    symbol: meta.symbol || symbol
                };
            }
        }
    } catch (error) {
        console.log(`Chart API fallback failed for ${symbol}:`, error.message);
    }
    return null;
}

// Update stock data from API
async function updateStockFromAPI(symbol) {
    let quote = await fetchStockQuote(symbol);
    
    // If quote API fails, try getting price from chart API
    if (!quote || !quote.regularMarketPrice) {
        console.log(`Quote API failed for ${symbol}, trying chart API...`);
        const chartPrice = await getPriceFromChart(symbol);
        
        if (chartPrice) {
            // Create a minimal quote object from chart data
            quote = quote || {};
            quote.regularMarketPrice = chartPrice.price;
            quote.regularMarketPreviousClose = chartPrice.prevClose;
            quote.shortName = quote.shortName || chartPrice.name;
            quote.symbol = quote.symbol || chartPrice.symbol;
            
            if (chartPrice.prevClose) {
                quote.regularMarketChange = chartPrice.price - chartPrice.prevClose;
                quote.regularMarketChangePercent = ((chartPrice.price - chartPrice.prevClose) / chartPrice.prevClose) * 100;
            }
            console.log(`Got price from chart API for ${symbol}:`, chartPrice.price);
        }
    }
    
    if (!quote) {
        console.log(`Could not fetch data for ${symbol} from any source`);
        return null;
    }
    
    // Log the quote to debug
    console.log(`Quote data for ${symbol}:`, quote);
    
    // Check if we have a valid price
    const price = quote.regularMarketPrice || quote.postMarketPrice || quote.preMarketPrice;
    if (!price) {
        console.log(`No price data for ${symbol}`);
        return null;
    }
    
    // Create or update stockDetails entry
    const stockData = {
        ticker: quote.symbol || symbol,
        name: quote.shortName || quote.longName || quote.displayName || symbol,
        sector: quote.sector || 'Unknown',
        currentPrice: quote.regularMarketPrice || price,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        prevClose: quote.regularMarketPreviousClose || quote.previousClose,
        open: quote.regularMarketOpen,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        week52High: quote.fiftyTwoWeekHigh,
        week52Low: quote.fiftyTwoWeekLow,
        volume: quote.regularMarketVolume,
        avgVolume: quote.averageDailyVolume10Day || quote.averageDailyVolume3Month,
        marketCap: quote.marketCap,
        enterpriseValue: quote.enterpriseValue,
        pe: quote.trailingPE,
        forwardPe: quote.forwardPE,
        peg: quote.pegRatio,
        priceToSales: quote.priceToSalesTrailing12Months,
        priceToBook: quote.priceToBook,
        eps: quote.epsTrailingTwelveMonths,
        epsForward: quote.epsForward,
        divAnnual: quote.trailingAnnualDividendRate,
        divYield: quote.trailingAnnualDividendYield ? quote.trailingAnnualDividendYield * 100 : (quote.dividendYield ? quote.dividendYield * 100 : 0),
        beta: quote.beta,
        sharesOutstanding: quote.sharesOutstanding,
        floatShares: quote.floatShares,
        shortRatio: quote.shortRatio,
        analystRating: quote.averageAnalystRating,
        priceTarget: quote.targetMeanPrice,
        // After hours data
        afterHoursPrice: quote.postMarketPrice,
        afterHoursChange: quote.postMarketChange,
        afterHoursPercent: quote.postMarketChangePercent,
        // Pre-market data
        preMarketPrice: quote.preMarketPrice,
        preMarketChange: quote.preMarketChange,
        preMarketPercent: quote.preMarketChangePercent,
        // Additional data
        exchange: quote.exchange || quote.fullExchangeName,
        currency: quote.currency,
        fiftyDayAverage: quote.fiftyDayAverage,
        twoHundredDayAverage: quote.twoHundredDayAverage,
        // Keep chart data placeholder
        priceHistory: {}
    };
    
    return stockData;
}

// Fetch chart data for a specific period
async function fetchChartForPeriod(symbol, period) {
    const { range, interval } = getPeriodParams(period);
    const chartData = await fetchStockChart(symbol, range, interval);
    return chartData;
}

// Update treemap with real data
async function updateTreemapWithRealData() {
    console.log('Fetching real-time stock data...');
    
    // Get all tickers from sp500Data
    const allTickers = [];
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => {
            allTickers.push(stock.ticker);
        });
    });
    
    // Fetch in batches of 20 (Yahoo Finance limit)
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < allTickers.length; i += batchSize) {
        batches.push(allTickers.slice(i, i + batchSize));
    }
    
    // Process batches
    for (const batch of batches) {
        const quotes = await fetchMultipleQuotes(batch);
        
        // Update sp500Data with real prices
        sp500Data.children.forEach(sector => {
            sector.children.forEach(stock => {
                if (quotes[stock.ticker]) {
                    const quote = quotes[stock.ticker];
                    stock.change = quote.regularMarketChangePercent || stock.change;
                    stock.marketCap = quote.marketCap ? quote.marketCap / 1000000000 : stock.marketCap;
                    stock.currentPrice = quote.regularMarketPrice;
                }
            });
        });
    }
    
    // Reinitialize treemap with new data
    if (typeof initTreemap === 'function') {
        initTreemap();
    }
    
    console.log('Stock data updated!');
}

// Fetch index data (S&P 500 and NASDAQ)
async function updateIndexTrackers() {
    try {
        const quotes = await fetchMultipleQuotes(['^GSPC', '^IXIC']);
        
        // Update S&P 500
        if (quotes['^GSPC']) {
            const sp500 = quotes['^GSPC'];
            const sp500Change = document.querySelector('.index-item:first-child .index-change');
            if (sp500Change) {
                const changePercent = sp500.regularMarketChangePercent;
                const sign = changePercent >= 0 ? '+' : '';
                sp500Change.textContent = `${sign}${changePercent.toFixed(2)}%`;
                sp500Change.className = `index-change ${changePercent >= 0 ? 'positive' : 'negative'}`;
            }
        }
        
        // Update NASDAQ
        if (quotes['^IXIC']) {
            const nasdaq = quotes['^IXIC'];
            const nasdaqChange = document.querySelector('.index-item:last-child .index-change');
            if (nasdaqChange) {
                const changePercent = nasdaq.regularMarketChangePercent;
                const sign = changePercent >= 0 ? '+' : '';
                nasdaqChange.textContent = `${sign}${changePercent.toFixed(2)}%`;
                nasdaqChange.className = `index-change ${changePercent >= 0 ? 'positive' : 'negative'}`;
            }
        }
    } catch (error) {
        console.error('Error updating index trackers:', error);
    }
}

// Initialize real-time data on page load
document.addEventListener('DOMContentLoaded', function() {
    // Update index trackers
    updateIndexTrackers();
    
    // Update treemap data (with slight delay to let page load first)
    setTimeout(() => {
        updateTreemapWithRealData();
    }, 1000);
    
    // Refresh data every 5 minutes
    setInterval(() => {
        updateIndexTrackers();
        updateTreemapWithRealData();
    }, 300000);
});
