// Stock API - Fetch real-time data from Finnhub
// Free tier: 60 API calls/minute

const FINNHUB_API_KEY = 'ctj7l0hr01qovrn4sti0ctj7l0hr01qovrn4stig'; // Free API key
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Cache for API responses
const apiCache = {
    quotes: {},
    charts: {},
    lastUpdate: {}
};

const CACHE_DURATION = 60000; // 1 minute cache

// Data status tracking
const dataStatus = {
    lastUpdate: null,
    successCount: 0,
    failCount: 0,
    totalStocks: 0,
    isLive: false,
    isLoading: true
};

// Ticker normalization for Finnhub API
// Finnhub uses periods for share classes (BRK.B)
function normalizeTickerForAPI(ticker) {
    return ticker.replace('-', '.');
}

function normalizeTickerFromAPI(apiTicker) {
    return apiTicker.replace('.', '-');
}

// Manual refresh function (called by refresh button)
async function refreshAllData() {
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.classList.add('spinning');
    }
    
    // Clear cache to force fresh data
    apiCache.quotes = {};
    apiCache.lastUpdate = {};
    
    // Reset status
    dataStatus.successCount = 0;
    dataStatus.failCount = 0;
    dataStatus.isLoading = true;
    dataStatus.isLive = false;
    
    // Reset all stock changes to null
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => {
            stock.change = null;
        });
    });
    
    // Redraw treemap with loading state
    if (typeof initTreemap === 'function') {
        initTreemap();
    }
    
    updateDataStatusUI();
    
    // Fetch fresh data
    await updateIndexTrackers();
    await updateTreemapWithRealData();
    
    if (refreshBtn) {
        refreshBtn.classList.remove('spinning');
    }
}

// Update data status UI indicator
function updateDataStatusUI() {
    const statusEl = document.getElementById('data-status');
    if (!statusEl) return;
    
    if (dataStatus.isLoading && dataStatus.successCount === 0) {
        statusEl.textContent = 'Loading...';
        statusEl.className = 'data-status loading';
    } else if (dataStatus.isLive && dataStatus.successCount > 0) {
        const minutesAgo = Math.floor((Date.now() - dataStatus.lastUpdate) / 60000);
        if (minutesAgo < 1) {
            statusEl.textContent = 'Live';
        } else {
            statusEl.textContent = `Updated ${minutesAgo}m ago`;
        }
        statusEl.className = 'data-status live';
    } else if (dataStatus.successCount > 0 && dataStatus.failCount > 0) {
        statusEl.textContent = `${dataStatus.successCount}/${dataStatus.totalStocks} loaded`;
        statusEl.className = 'data-status partial';
    } else if (dataStatus.failCount > 0 && dataStatus.successCount === 0) {
        statusEl.textContent = 'Data unavailable';
        statusEl.className = 'data-status offline';
    }
}

// Fetch quote data for a single stock from Finnhub
async function fetchStockQuote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const now = Date.now();
    
    // Check cache
    if (apiCache.quotes[symbol] && (now - apiCache.lastUpdate[cacheKey]) < CACHE_DURATION) {
        console.log(`Using cached data for ${symbol}`);
        return apiCache.quotes[symbol];
    }
    
    try {
        const apiSymbol = normalizeTickerForAPI(symbol);
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${apiSymbol}&token=${FINNHUB_API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Finnhub returns: c (current), d (change), dp (percent change), h (high), l (low), o (open), pc (previous close)
        if (data && data.c && data.c > 0) {
            const quote = {
                symbol: symbol,
                currentPrice: data.c,
                change: data.d,
                changePercent: data.dp,
                high: data.h,
                low: data.l,
                open: data.o,
                previousClose: data.pc,
                timestamp: data.t
            };
            
            apiCache.quotes[symbol] = quote;
            apiCache.lastUpdate[cacheKey] = now;
            return quote;
        }
        
        console.log(`No valid data for ${symbol}:`, data);
        return null;
    } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
        return null;
    }
}

// Fetch quotes for multiple stocks (with rate limiting)
async function fetchMultipleQuotes(symbols) {
    const quotes = {};
    const batchSize = 10; // Process 10 at a time to stay under rate limit
    const delayBetweenBatches = 1000; // 1 second delay between batches
    
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        // Fetch batch in parallel
        const promises = batch.map(async (symbol) => {
            const quote = await fetchStockQuote(symbol);
            if (quote) {
                quotes[symbol] = quote;
            }
            return quote;
        });
        
        await Promise.all(promises);
        
        // Delay before next batch (except for last batch)
        if (i + batchSize < symbols.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }
    
    return quotes;
}

// Fetch candle/chart data for a stock
async function fetchStockChart(symbol, range = '1mo', interval = '1d') {
    const cacheKey = `chart_${symbol}_${range}_${interval}`;
    const now = Date.now();
    
    // Check cache
    if (apiCache.charts[cacheKey] && (now - apiCache.lastUpdate[cacheKey]) < CACHE_DURATION) {
        return apiCache.charts[cacheKey];
    }
    
    try {
        const apiSymbol = normalizeTickerForAPI(symbol);
        
        // Calculate from/to timestamps based on range
        const to = Math.floor(Date.now() / 1000);
        let from;
        let resolution;
        
        switch(range) {
            case '1d':
                from = to - 86400;
                resolution = '5';
                break;
            case '5d':
                from = to - 5 * 86400;
                resolution = '15';
                break;
            case '1mo':
                from = to - 30 * 86400;
                resolution = 'D';
                break;
            case '3mo':
                from = to - 90 * 86400;
                resolution = 'D';
                break;
            case '1y':
                from = to - 365 * 86400;
                resolution = 'D';
                break;
            case '5y':
                from = to - 5 * 365 * 86400;
                resolution = 'W';
                break;
            default:
                from = to - 30 * 86400;
                resolution = 'D';
        }
        
        const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${apiSymbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Finnhub returns: c (close), h (high), l (low), o (open), t (timestamps), v (volume), s (status)
        if (data && data.s === 'ok' && data.t && data.c) {
            const chartData = data.t.map((timestamp, i) => ({
                date: new Date(timestamp * 1000).toISOString(),
                price: data.c[i],
                open: data.o[i],
                high: data.h[i],
                low: data.l[i],
                close: data.c[i],
                volume: data.v[i]
            })).filter(d => d.price !== null && d.price !== undefined);
            
            apiCache.charts[cacheKey] = chartData;
            apiCache.lastUpdate[cacheKey] = now;
            return chartData;
        }
        
        console.log(`No chart data for ${symbol}:`, data);
        return null;
    } catch (error) {
        console.error(`Error fetching chart for ${symbol}:`, error);
        return null;
    }
}

// Map period to Finnhub range/resolution
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

// Update stock data from API
async function updateStockFromAPI(symbol) {
    const quote = await fetchStockQuote(symbol);
    
    if (!quote || !quote.currentPrice) {
        console.log(`Could not fetch data for ${symbol}`);
        return null;
    }
    
    // Get basic info from sp500Data
    let basicStock = null;
    let sectorName = '';
    sp500Data.children.forEach(sector => {
        sector.children.forEach(s => {
            if (s.ticker === symbol) {
                basicStock = s;
                sectorName = sector.name;
            }
        });
    });
    
    const stockData = {
        ticker: symbol,
        name: basicStock ? basicStock.name : symbol,
        sector: sectorName || 'Unknown',
        currentPrice: quote.currentPrice,
        change: quote.change || 0,
        changePercent: quote.changePercent || 0,
        prevClose: quote.previousClose,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        priceHistory: {}
    };
    
    return stockData;
}

// Fetch chart data for a specific period
async function fetchChartForPeriod(symbol, period) {
    const { range } = getPeriodParams(period);
    const chartData = await fetchStockChart(symbol, range);
    return chartData;
}

// Update treemap with real data
async function updateTreemapWithRealData() {
    console.log('Fetching real-time stock data from Finnhub...');
    
    // Reset data status
    dataStatus.isLoading = true;
    dataStatus.successCount = 0;
    dataStatus.failCount = 0;
    updateDataStatusUI();
    
    // Get all tickers from sp500Data
    const allTickers = [];
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => {
            allTickers.push(stock.ticker);
        });
    });
    
    dataStatus.totalStocks = allTickers.length;
    
    // Fetch all quotes (with built-in rate limiting)
    const quotes = await fetchMultipleQuotes(allTickers);
    
    // Update sp500Data with real prices
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => {
            if (quotes[stock.ticker]) {
                const quote = quotes[stock.ticker];
                // Use changePercent (dp from Finnhub) for daily percentage change
                if (quote.changePercent !== undefined && quote.changePercent !== null) {
                    stock.change = quote.changePercent;
                    stock.currentPrice = quote.currentPrice;
                    dataStatus.successCount++;
                } else {
                    dataStatus.failCount++;
                }
            } else {
                dataStatus.failCount++;
            }
        });
    });
    
    dataStatus.lastUpdate = Date.now();
    dataStatus.isLive = dataStatus.successCount > 0;
    dataStatus.isLoading = false;
    updateDataStatusUI();
    
    // Reinitialize treemap with new data
    if (typeof initTreemap === 'function') {
        initTreemap();
    }
    
    console.log(`Stock data updated! ${dataStatus.successCount} loaded, ${dataStatus.failCount} failed`);
}

// Fetch index data (S&P 500 and NASDAQ)
async function updateIndexTrackers() {
    try {
        // Finnhub uses SPY for S&P 500 ETF and QQQ for NASDAQ
        const [spyQuote, qqqQuote] = await Promise.all([
            fetchStockQuote('SPY'),
            fetchStockQuote('QQQ')
        ]);
        
        // Update S&P 500 (using SPY as proxy)
        if (spyQuote && spyQuote.changePercent !== undefined) {
            const sp500Change = document.querySelector('.index-item:first-child .index-change');
            if (sp500Change) {
                const changePercent = spyQuote.changePercent;
                const sign = changePercent >= 0 ? '+' : '';
                sp500Change.textContent = `${sign}${changePercent.toFixed(2)}%`;
                sp500Change.className = `index-change ${changePercent >= 0 ? 'positive' : 'negative'}`;
            }
        }
        
        // Update NASDAQ (using QQQ as proxy)
        if (qqqQuote && qqqQuote.changePercent !== undefined) {
            const nasdaqChange = document.querySelector('.index-item:last-child .index-change');
            if (nasdaqChange) {
                const changePercent = qqqQuote.changePercent;
                const sign = changePercent >= 0 ? '+' : '';
                nasdaqChange.textContent = `${sign}${changePercent.toFixed(2)}%`;
                nasdaqChange.className = `index-change ${changePercent >= 0 ? 'positive' : 'negative'}`;
            }
        }
    } catch (error) {
        console.error('Error updating index trackers:', error);
    }
}

// Check if US stock market is open
function isMarketOpen() {
    const now = new Date();
    
    // Convert to Eastern Time
    const etOptions = { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false };
    const etTimeStr = now.toLocaleString('en-US', etOptions);
    const [hours, minutes] = etTimeStr.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    
    // Market hours: 9:30 AM - 4:00 PM ET (570 - 960 minutes)
    const marketOpen = 9 * 60 + 30;  // 9:30 AM
    const marketClose = 16 * 60;      // 4:00 PM
    
    // Check if it's a weekday
    const etDayOptions = { timeZone: 'America/New_York', weekday: 'short' };
    const dayOfWeek = now.toLocaleString('en-US', etDayOptions);
    const isWeekday = !['Sat', 'Sun'].includes(dayOfWeek);
    
    const isOpen = isWeekday && currentMinutes >= marketOpen && currentMinutes < marketClose;
    
    return {
        isOpen,
        hours,
        minutes,
        dayOfWeek
    };
}

// Update raccoon and market status
function updateRaccoon() {
    const { isOpen } = isMarketOpen();
    
    const raccoonAwake = document.getElementById('raccoon-awake');
    const raccoonAsleep = document.getElementById('raccoon-asleep');
    const marketStatus = document.getElementById('market-status');
    
    if (raccoonAwake && raccoonAsleep) {
        if (isOpen) {
            raccoonAwake.style.display = 'block';
            raccoonAsleep.style.display = 'none';
        } else {
            raccoonAwake.style.display = 'none';
            raccoonAsleep.style.display = 'block';
        }
    }
    
    if (marketStatus) {
        if (isOpen) {
            marketStatus.textContent = 'Market Open';
            marketStatus.className = 'market-status open';
        } else {
            marketStatus.textContent = 'Market Closed';
            marketStatus.className = 'market-status closed';
        }
    }
}

// Initialize real-time data on page load
document.addEventListener('DOMContentLoaded', function() {
    // Update raccoon based on market hours
    updateRaccoon();
    
    // Check market status every minute
    setInterval(updateRaccoon, 60000);
    
    // Add refresh button click handler
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshAllData);
    }
    
    // Update index trackers
    updateIndexTrackers();
    
    // Update treemap data (with slight delay to let page load first)
    setTimeout(() => {
        updateTreemapWithRealData();
    }, 500);
    
    // Refresh data every 5 minutes
    setInterval(() => {
        updateIndexTrackers();
        updateTreemapWithRealData();
    }, 300000);
    
    // Update the "X minutes ago" display every minute
    setInterval(updateDataStatusUI, 60000);
});
