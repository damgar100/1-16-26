// Stock API - Yahoo Finance via CORS proxies
// Shows "Data unavailable" if API fails (no mock/demo data)

const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

let currentProxyIndex = 0;

const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Cache
const apiCache = { quotes: {}, charts: {}, lastUpdate: {} };
const CACHE_DURATION = 60000;

// Status tracking
const dataStatus = {
    lastUpdate: null,
    successCount: 0,
    failCount: 0,
    totalStocks: 0,
    isLive: false,
    isLoading: true
};

// Normalize tickers
function normalizeTickerForAPI(ticker) {
    return ticker.replace('-', '.');
}

// Refresh all data
async function refreshAllData() {
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) refreshBtn.classList.add('spinning');
    
    apiCache.quotes = {};
    apiCache.lastUpdate = {};
    dataStatus.successCount = 0;
    dataStatus.failCount = 0;
    dataStatus.isLoading = true;
    dataStatus.isLive = false;
    
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => { stock.change = null; });
    });
    
    if (typeof initTreemap === 'function') initTreemap();
    updateDataStatusUI();
    
    await updateIndexTrackers();
    await updateTreemapWithRealData();
    
    if (refreshBtn) refreshBtn.classList.remove('spinning');
}

// Update status UI
function updateDataStatusUI() {
    const statusEl = document.getElementById('data-status');
    if (!statusEl) return;
    
    if (dataStatus.isLoading && dataStatus.successCount === 0 && dataStatus.failCount === 0) {
        statusEl.textContent = 'Loading...';
        statusEl.className = 'data-status loading';
    } else if (dataStatus.isLoading && dataStatus.successCount > 0) {
        statusEl.textContent = `${dataStatus.successCount}/${dataStatus.totalStocks}`;
        statusEl.className = 'data-status loading';
    } else if (dataStatus.isLive && dataStatus.successCount > 0) {
        const minutesAgo = Math.floor((Date.now() - dataStatus.lastUpdate) / 60000);
        statusEl.textContent = minutesAgo < 1 ? 'Live' : `${minutesAgo}m ago`;
        statusEl.className = 'data-status live';
    } else if (dataStatus.successCount > 0) {
        statusEl.textContent = `${dataStatus.successCount}/${dataStatus.totalStocks}`;
        statusEl.className = 'data-status partial';
    } else {
        statusEl.textContent = 'Data unavailable';
        statusEl.className = 'data-status offline';
    }
}

// Fetch with CORS proxy
async function fetchWithProxy(url, timeout = 8000) {
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxyIndex = (currentProxyIndex + i) % CORS_PROXIES.length;
        const proxyUrl = CORS_PROXIES[proxyIndex](url);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const text = await response.text();
                const data = JSON.parse(text);
                currentProxyIndex = proxyIndex;
                return data;
            }
        } catch (error) {
            console.log(`Proxy ${proxyIndex} failed:`, error.message);
        }
    }
    return null;
}

// Fetch stock data from Yahoo Finance
async function fetchStockData(symbol) {
    const cacheKey = `quote_${symbol}`;
    const now = Date.now();
    
    if (apiCache.quotes[symbol] && (now - apiCache.lastUpdate[cacheKey]) < CACHE_DURATION) {
        return apiCache.quotes[symbol];
    }
    
    try {
        const apiSymbol = normalizeTickerForAPI(symbol);
        const url = `${YAHOO_CHART_URL}/${apiSymbol}?interval=1d&range=5d`;
        const data = await fetchWithProxy(url);
        
        if (data?.chart?.result?.[0]) {
            const result = data.chart.result[0];
            const meta = result.meta || {};
            
            const currentPrice = meta.regularMarketPrice || meta.previousClose;
            const previousClose = meta.previousClose || meta.chartPreviousClose;
            
            if (currentPrice && previousClose) {
                const stockData = {
                    symbol: symbol,
                    currentPrice: currentPrice,
                    previousClose: previousClose,
                    change: currentPrice - previousClose,
                    changePercent: ((currentPrice - previousClose) / previousClose) * 100,
                    high: meta.regularMarketDayHigh,
                    low: meta.regularMarketDayLow,
                    open: meta.regularMarketOpen,
                    volume: meta.regularMarketVolume
                };
                
                apiCache.quotes[symbol] = stockData;
                apiCache.lastUpdate[cacheKey] = now;
                return stockData;
            }
        }
    } catch (error) {
        console.log(`Yahoo failed for ${symbol}:`, error.message);
    }
    
    return null;
}

// Fetch chart data
async function fetchStockChart(symbol, range = '1mo') {
    const cacheKey = `chart_${symbol}_${range}`;
    const now = Date.now();
    
    if (apiCache.charts[cacheKey] && (now - apiCache.lastUpdate[cacheKey]) < CACHE_DURATION * 5) {
        return apiCache.charts[cacheKey];
    }
    
    try {
        const apiSymbol = normalizeTickerForAPI(symbol);
        
        let yahooRange, yahooInterval;
        switch(range) {
            case '1d': yahooRange = '1d'; yahooInterval = '5m'; break;
            case '5d': yahooRange = '5d'; yahooInterval = '15m'; break;
            case '1mo': yahooRange = '1mo'; yahooInterval = '1d'; break;
            case '3mo': yahooRange = '3mo'; yahooInterval = '1d'; break;
            case '1y': yahooRange = '1y'; yahooInterval = '1d'; break;
            case '5y': yahooRange = '5y'; yahooInterval = '1wk'; break;
            default: yahooRange = '1mo'; yahooInterval = '1d';
        }
        
        const url = `${YAHOO_CHART_URL}/${apiSymbol}?interval=${yahooInterval}&range=${yahooRange}`;
        const data = await fetchWithProxy(url);
        
        if (data?.chart?.result?.[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp || [];
            const quotes = result.indicators?.quote?.[0] || {};
            
            const chartData = timestamps.map((ts, i) => ({
                date: new Date(ts * 1000).toISOString(),
                price: quotes.close?.[i],
                open: quotes.open?.[i],
                high: quotes.high?.[i],
                low: quotes.low?.[i],
                close: quotes.close?.[i],
                volume: quotes.volume?.[i]
            })).filter(d => d.price != null);
            
            if (chartData.length > 0) {
                apiCache.charts[cacheKey] = chartData;
                apiCache.lastUpdate[cacheKey] = now;
                return chartData;
            }
        }
    } catch (error) {
        console.log(`Chart fetch failed for ${symbol}:`, error.message);
    }
    
    return null;
}

// Map period to range
function getPeriodParams(period) {
    const map = { '1D': '1d', '1W': '5d', '1M': '1mo', '3M': '3mo', '1Y': '1y', '5Y': '5y' };
    return { range: map[period] || '1mo' };
}

function fetchChartForPeriod(symbol, period) {
    const { range } = getPeriodParams(period);
    return fetchStockChart(symbol, range);
}

// Update stock from API
async function updateStockFromAPI(symbol) {
    const data = await fetchStockData(symbol);
    if (!data) return null;
    
    let basicStock = null, sectorName = '';
    sp500Data.children.forEach(sector => {
        sector.children.forEach(s => {
            if (s.ticker === symbol) {
                basicStock = s;
                sectorName = sector.name;
            }
        });
    });
    
    return {
        ticker: symbol,
        name: basicStock?.name || symbol,
        sector: sectorName,
        currentPrice: data.currentPrice,
        change: data.change,
        changePercent: data.changePercent,
        prevClose: data.previousClose,
        open: data.open,
        high: data.high,
        low: data.low,
        volume: data.volume,
        priceHistory: {}
    };
}

// Update treemap with data
async function updateTreemapWithRealData() {
    console.log('Fetching stock data...');
    
    dataStatus.isLoading = true;
    dataStatus.successCount = 0;
    dataStatus.failCount = 0;
    updateDataStatusUI();
    
    const allTickers = [];
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => { allTickers.push(stock.ticker); });
    });
    
    dataStatus.totalStocks = allTickers.length;
    
    // Fetch in batches
    const batchSize = 10;
    
    for (let i = 0; i < allTickers.length; i += batchSize) {
        const batch = allTickers.slice(i, i + batchSize);
        
        const results = await Promise.all(batch.map(ticker => fetchStockData(ticker)));
        
        results.forEach((data, idx) => {
            const ticker = batch[idx];
            if (data?.changePercent != null) {
                sp500Data.children.forEach(sector => {
                    sector.children.forEach(stock => {
                        if (stock.ticker === ticker) {
                            stock.change = data.changePercent;
                            stock.currentPrice = data.currentPrice;
                        }
                    });
                });
                dataStatus.successCount++;
            } else {
                dataStatus.failCount++;
            }
        });
        
        dataStatus.lastUpdate = Date.now();
        updateDataStatusUI();
        
        if (typeof initTreemap === 'function') initTreemap();
        
        // Small delay between batches
        if (i + batchSize < allTickers.length) {
            await new Promise(r => setTimeout(r, 100));
        }
    }
    
    dataStatus.isLoading = false;
    dataStatus.isLive = dataStatus.successCount > 0;
    updateDataStatusUI();
    
    console.log(`Done: ${dataStatus.successCount} loaded, ${dataStatus.failCount} failed`);
}

// Update index trackers
async function updateIndexTrackers() {
    try {
        const [spyData, qqqData] = await Promise.all([
            fetchStockData('SPY'),
            fetchStockData('QQQ')
        ]);
        
        if (spyData) {
            const el = document.querySelector('.index-item:first-child .index-change');
            if (el) {
                const pct = spyData.changePercent;
                el.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
                el.className = `index-change ${pct >= 0 ? 'positive' : 'negative'}`;
            }
        }
        
        if (qqqData) {
            const el = document.querySelector('.index-item:last-child .index-change');
            if (el) {
                const pct = qqqData.changePercent;
                el.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
                el.className = `index-change ${pct >= 0 ? 'positive' : 'negative'}`;
            }
        }
    } catch (error) {
        console.error('Index tracker error:', error);
    }
}

// Market hours check
function isMarketOpen() {
    const now = new Date();
    const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false });
    const [hours, minutes] = etStr.split(':').map(Number);
    const mins = hours * 60 + minutes;
    const dayStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
    const isWeekday = !['Sat', 'Sun'].includes(dayStr);
    return { isOpen: isWeekday && mins >= 570 && mins < 960, hours, minutes, dayOfWeek: dayStr };
}

// Update raccoon
function updateRaccoon() {
    const { isOpen } = isMarketOpen();
    const awake = document.getElementById('raccoon-awake');
    const asleep = document.getElementById('raccoon-asleep');
    const status = document.getElementById('market-status');
    
    if (awake && asleep) {
        awake.style.display = isOpen ? 'block' : 'none';
        asleep.style.display = isOpen ? 'none' : 'block';
    }
    if (status) {
        status.textContent = isOpen ? 'Market Open' : 'Market Closed';
        status.className = `market-status ${isOpen ? 'open' : 'closed'}`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateRaccoon();
    setInterval(updateRaccoon, 60000);
    
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshAllData);
    
    updateIndexTrackers();
    setTimeout(updateTreemapWithRealData, 300);
    
    setInterval(() => {
        updateIndexTrackers();
        updateTreemapWithRealData();
    }, 300000);
    
    setInterval(updateDataStatusUI, 60000);
});
