// Stock API - Multiple data sources with fallbacks
// Tries: 1) Yahoo Finance via CORS proxies, 2) Generates realistic mock data

const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

let currentProxyIndex = 0;
let usesMockData = false;

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
    usesMockData = false;
    
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
        statusEl.textContent = usesMockData ? 'Demo Data' : (minutesAgo < 1 ? 'Live' : `${minutesAgo}m ago`);
        statusEl.className = usesMockData ? 'data-status partial' : 'data-status live';
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

// Generate realistic mock data for a stock
function generateMockData(symbol) {
    // Base prices for major stocks (realistic values)
    const basePrices = {
        'AAPL': 178, 'MSFT': 378, 'GOOGL': 141, 'AMZN': 178, 'NVDA': 495,
        'META': 505, 'TSLA': 248, 'BRK-B': 408, 'JPM': 195, 'V': 276,
        'UNH': 527, 'JNJ': 156, 'WMT': 165, 'MA': 457, 'PG': 159,
        'HD': 363, 'CVX': 147, 'MRK': 126, 'ABBV': 154, 'KO': 60,
        'PEP': 169, 'COST': 735, 'LLY': 582, 'AVGO': 1320, 'TMO': 532,
        'MCD': 296, 'CSCO': 49, 'ACN': 348, 'ABT': 113, 'NKE': 106,
        'DHR': 252, 'CRM': 272, 'ORCL': 118, 'VZ': 40, 'INTC': 43,
        'CMCSA': 42, 'ADBE': 575, 'PFE': 28, 'T': 17, 'DIS': 112,
        'WFC': 55, 'COP': 114, 'PM': 95, 'NEE': 75, 'RTX': 102,
        'IBM': 168, 'QCOM': 169, 'GE': 163, 'HON': 203, 'SPGI': 445,
        'CAT': 355, 'BA': 215, 'LOW': 245, 'GS': 465, 'AXP': 225,
        'BKNG': 3780, 'SBUX': 95, 'MDLZ': 72, 'BLK': 815, 'ADI': 198,
        'TJX': 100, 'DE': 395, 'ISRG': 385, 'GILD': 83, 'MMC': 200,
        'SYK': 345, 'CB': 255, 'VRTX': 428, 'ADP': 245, 'LMT': 455,
        'ELV': 515, 'CI': 335, 'BMY': 52, 'AMT': 198, 'REGN': 965,
        'CVS': 76, 'CME': 212, 'SCHW': 72, 'SO': 72, 'DUK': 100,
        'PLD': 132, 'EQIX': 815, 'ETN': 295, 'USB': 44, 'AON': 335,
        'TMUS': 175, 'MO': 45, 'SLB': 48, 'ICE': 138, 'SHW': 345,
        'APD': 295, 'EMR': 108, 'PGR': 205, 'PSA': 295, 'FCX': 42,
        'MCK': 555, 'NFLX': 485, 'AMD': 148, 'INTU': 628, 'NOW': 705,
        'TXN': 172, 'AMAT': 198, 'MU': 88, 'LRCX': 935, 'PANW': 295,
        'SNPS': 515, 'KLAC': 715, 'CDNS': 275, 'MRVL': 72, 'FTNT': 75,
        'CRWD': 285, 'DXCM': 118, 'TEAM': 225, 'WDAY': 265, 'ZS': 195,
        'ABNB': 155, 'COIN': 185, 'DASH': 135, 'RBLX': 45, 'PLTR': 22,
        'SPY': 478, 'QQQ': 405
    };
    
    // Get base price or generate one
    const basePrice = basePrices[symbol] || (50 + Math.random() * 200);
    
    // Generate random daily change between -3% and +3%
    const changePercent = (Math.random() - 0.5) * 6;
    const change = basePrice * (changePercent / 100);
    const currentPrice = basePrice + change;
    const previousClose = basePrice;
    
    return {
        symbol: symbol,
        currentPrice: currentPrice,
        previousClose: previousClose,
        change: change,
        changePercent: changePercent,
        high: currentPrice * (1 + Math.random() * 0.02),
        low: currentPrice * (1 - Math.random() * 0.02),
        open: previousClose * (1 + (Math.random() - 0.5) * 0.01),
        volume: Math.floor(Math.random() * 50000000) + 1000000
    };
}

// Fetch stock data - tries Yahoo, falls back to mock
async function fetchStockData(symbol) {
    const cacheKey = `quote_${symbol}`;
    const now = Date.now();
    
    if (apiCache.quotes[symbol] && (now - apiCache.lastUpdate[cacheKey]) < CACHE_DURATION) {
        return apiCache.quotes[symbol];
    }
    
    // Try Yahoo Finance first
    if (!usesMockData) {
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
    }
    
    // Fall back to mock data
    usesMockData = true;
    const mockData = generateMockData(symbol);
    apiCache.quotes[symbol] = mockData;
    apiCache.lastUpdate[cacheKey] = now;
    return mockData;
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
    
    // Generate mock chart data
    const mockChart = generateMockChartData(symbol, range);
    apiCache.charts[cacheKey] = mockChart;
    apiCache.lastUpdate[cacheKey] = now;
    return mockChart;
}

// Generate mock chart data
function generateMockChartData(symbol, range) {
    const basePrice = generateMockData(symbol).currentPrice;
    const points = range === '1d' ? 78 : range === '5d' ? 130 : range === '1mo' ? 22 : 
                   range === '3mo' ? 66 : range === '1y' ? 252 : 260;
    
    const data = [];
    let price = basePrice * 0.95;
    const now = Date.now();
    const interval = range === '1d' ? 5 * 60 * 1000 : 
                     range === '5d' ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    for (let i = points; i >= 0; i--) {
        const change = (Math.random() - 0.48) * price * 0.02;
        price = Math.max(price * 0.5, price + change);
        
        data.push({
            date: new Date(now - i * interval).toISOString(),
            price: price,
            open: price * (1 + (Math.random() - 0.5) * 0.01),
            high: price * (1 + Math.random() * 0.01),
            low: price * (1 - Math.random() * 0.01),
            close: price,
            volume: Math.floor(Math.random() * 10000000)
        });
    }
    
    return data;
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
    
    console.log(`Done: ${dataStatus.successCount} loaded, ${dataStatus.failCount} failed, mock=${usesMockData}`);
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
