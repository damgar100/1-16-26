// Stock API - Fetch real-time data from Twelve Data
// Free tier: 800 API calls/day, 8 calls/minute

const TWELVEDATA_API_KEY = 'demo'; // Demo key works for basic quotes
const TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';

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

// Ticker normalization
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

// Fetch quote data for a single stock from Twelve Data
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
        const url = `${TWELVEDATA_BASE_URL}/quote?symbol=${apiSymbol}&apikey=${TWELVEDATA_API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check for API errors
        if (data.code || data.status === 'error') {
            console.log(`API error for ${symbol}:`, data.message || data);
            return null;
        }
        
        // Twelve Data returns: close, change, percent_change, open, high, low, previous_close, etc.
        if (data && data.close && parseFloat(data.close) > 0) {
            const quote = {
                symbol: symbol,
                name: data.name,
                currentPrice: parseFloat(data.close),
                change: parseFloat(data.change) || 0,
                changePercent: parseFloat(data.percent_change) || 0,
                high: parseFloat(data.high),
                low: parseFloat(data.low),
                open: parseFloat(data.open),
                previousClose: parseFloat(data.previous_close),
                volume: parseInt(data.volume),
                week52High: data.fifty_two_week ? parseFloat(data.fifty_two_week.high) : null,
                week52Low: data.fifty_two_week ? parseFloat(data.fifty_two_week.low) : null
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

// Fetch quotes for multiple stocks using batch endpoint
async function fetchMultipleQuotes(symbols) {
    const quotes = {};
    
    // Twelve Data allows batch requests with up to 8 symbols at a time on free tier
    const batchSize = 8;
    const delayBetweenBatches = 8000; // 8 seconds to respect rate limit (8 calls/minute)
    
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const batchSymbols = batch.map(s => normalizeTickerForAPI(s)).join(',');
        
        try {
            const url = `${TWELVEDATA_BASE_URL}/quote?symbol=${batchSymbols}&apikey=${TWELVEDATA_API_KEY}`;
            console.log(`Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(symbols.length/batchSize)}...`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle single vs multiple results
            if (batch.length === 1) {
                // Single symbol returns object directly
                if (data && data.close && !data.code) {
                    const symbol = batch[0];
                    quotes[symbol] = {
                        symbol: symbol,
                        name: data.name,
                        currentPrice: parseFloat(data.close),
                        change: parseFloat(data.change) || 0,
                        changePercent: parseFloat(data.percent_change) || 0,
                        high: parseFloat(data.high),
                        low: parseFloat(data.low),
                        open: parseFloat(data.open),
                        previousClose: parseFloat(data.previous_close)
                    };
                    apiCache.quotes[symbol] = quotes[symbol];
                    apiCache.lastUpdate[`quote_${symbol}`] = Date.now();
                }
            } else {
                // Multiple symbols returns object with symbol keys
                for (const apiSymbol of Object.keys(data)) {
                    const quoteData = data[apiSymbol];
                    if (quoteData && quoteData.close && !quoteData.code) {
                        const originalSymbol = normalizeTickerFromAPI(apiSymbol);
                        // Find matching symbol from our batch
                        const matchedSymbol = batch.find(s => 
                            normalizeTickerForAPI(s) === apiSymbol || s === apiSymbol
                        ) || originalSymbol;
                        
                        quotes[matchedSymbol] = {
                            symbol: matchedSymbol,
                            name: quoteData.name,
                            currentPrice: parseFloat(quoteData.close),
                            change: parseFloat(quoteData.change) || 0,
                            changePercent: parseFloat(quoteData.percent_change) || 0,
                            high: parseFloat(quoteData.high),
                            low: parseFloat(quoteData.low),
                            open: parseFloat(quoteData.open),
                            previousClose: parseFloat(quoteData.previous_close)
                        };
                        apiCache.quotes[matchedSymbol] = quotes[matchedSymbol];
                        apiCache.lastUpdate[`quote_${matchedSymbol}`] = Date.now();
                    }
                }
            }
            
            // Update progress
            dataStatus.successCount = Object.keys(quotes).length;
            dataStatus.lastUpdate = Date.now();
            updateDataStatusUI();
            
        } catch (error) {
            console.error(`Error fetching batch:`, error);
        }
        
        // Delay before next batch (except for last batch)
        if (i + batchSize < symbols.length) {
            console.log(`Waiting ${delayBetweenBatches/1000}s before next batch...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }
    
    return quotes;
}

// Fetch time series/chart data for a stock
async function fetchStockChart(symbol, range = '1mo') {
    const cacheKey = `chart_${symbol}_${range}`;
    const now = Date.now();
    
    // Check cache
    if (apiCache.charts[cacheKey] && (now - apiCache.lastUpdate[cacheKey]) < CACHE_DURATION * 5) {
        return apiCache.charts[cacheKey];
    }
    
    try {
        const apiSymbol = normalizeTickerForAPI(symbol);
        
        // Map range to Twelve Data parameters
        let interval, outputsize;
        switch(range) {
            case '1d':
                interval = '5min';
                outputsize = '78'; // Full trading day
                break;
            case '5d':
                interval = '15min';
                outputsize = '130';
                break;
            case '1mo':
                interval = '1day';
                outputsize = '22';
                break;
            case '3mo':
                interval = '1day';
                outputsize = '66';
                break;
            case '1y':
                interval = '1day';
                outputsize = '252';
                break;
            case '5y':
                interval = '1week';
                outputsize = '260';
                break;
            default:
                interval = '1day';
                outputsize = '22';
        }
        
        const url = `${TWELVEDATA_BASE_URL}/time_series?symbol=${apiSymbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVEDATA_API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.values && Array.isArray(data.values)) {
            // Twelve Data returns newest first, so reverse for chronological order
            const chartData = data.values.reverse().map(item => ({
                date: item.datetime,
                price: parseFloat(item.close),
                open: parseFloat(item.open),
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                close: parseFloat(item.close),
                volume: parseInt(item.volume) || 0
            })).filter(d => d.price > 0);
            
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

// Map period to range
function getPeriodParams(period) {
    const params = {
        '1D': { range: '1d' },
        '1W': { range: '5d' },
        '1M': { range: '1mo' },
        '3M': { range: '3mo' },
        '1Y': { range: '1y' },
        '5Y': { range: '5y' }
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
        name: quote.name || (basicStock ? basicStock.name : symbol),
        sector: sectorName || 'Unknown',
        currentPrice: quote.currentPrice,
        change: quote.change || 0,
        changePercent: quote.changePercent || 0,
        prevClose: quote.previousClose,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        week52High: quote.week52High,
        week52Low: quote.week52Low,
        volume: quote.volume,
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
    console.log('Fetching real-time stock data from Twelve Data...');
    
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
    let successCount = 0;
    let failCount = 0;
    
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => {
            if (quotes[stock.ticker]) {
                const quote = quotes[stock.ticker];
                if (quote.changePercent !== undefined && quote.changePercent !== null) {
                    stock.change = quote.changePercent;
                    stock.currentPrice = quote.currentPrice;
                    successCount++;
                } else {
                    failCount++;
                }
            } else {
                failCount++;
            }
        });
    });
    
    dataStatus.successCount = successCount;
    dataStatus.failCount = failCount;
    dataStatus.lastUpdate = Date.now();
    dataStatus.isLive = successCount > 0;
    dataStatus.isLoading = false;
    updateDataStatusUI();
    
    // Reinitialize treemap with new data
    if (typeof initTreemap === 'function') {
        initTreemap();
    }
    
    console.log(`Stock data updated! ${successCount} loaded, ${failCount} failed`);
}

// Fetch index data (S&P 500 and NASDAQ)
async function updateIndexTrackers() {
    try {
        // Use SPY for S&P 500 and QQQ for NASDAQ
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
    
    // Market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;
    
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
    
    // Update index trackers first (quick)
    updateIndexTrackers();
    
    // Update treemap data
    setTimeout(() => {
        updateTreemapWithRealData();
    }, 500);
    
    // Refresh data every 10 minutes (to respect API limits)
    setInterval(() => {
        updateIndexTrackers();
        updateTreemapWithRealData();
    }, 600000);
    
    // Update the "X minutes ago" display every minute
    setInterval(updateDataStatusUI, 60000);
});
