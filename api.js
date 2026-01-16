// Stock API - Uses local Python server with yfinance
// Run: python3 server.py

const API_BASE = 'http://localhost:8000/api';

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

// Normalize tickers (BRK-B -> BRK.B for yfinance)
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

// Fetch stock data from Python server
async function fetchStockData(symbol) {
    const cacheKey = `quote_${symbol}`;
    const now = Date.now();
    
    if (apiCache.quotes[symbol] && (now - apiCache.lastUpdate[cacheKey]) < CACHE_DURATION) {
        return apiCache.quotes[symbol];
    }
    
    try {
        const apiSymbol = normalizeTickerForAPI(symbol);
        const response = await fetch(`${API_BASE}/quote?symbol=${apiSymbol}`, {
            signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.currentPrice && data.previousClose) {
                const stockData = {
                    symbol: symbol,
                    currentPrice: data.currentPrice,
                    previousClose: data.previousClose,
                    change: data.change,
                    changePercent: data.changePercent,
                    high: data.high,
                    low: data.low,
                    open: data.open,
                    volume: data.volume
                };
                
                apiCache.quotes[symbol] = stockData;
                apiCache.lastUpdate[cacheKey] = now;
                return stockData;
            }
        }
    } catch (error) {
        console.log(`Failed to fetch ${symbol}:`, error.message);
    }
    
    return null;
}

// Fetch multiple stocks at once (more efficient)
async function fetchMultipleStocks(symbols) {
    try {
        const apiSymbols = symbols.map(s => normalizeTickerForAPI(s));
        const response = await fetch(`${API_BASE}/quotes?symbols=${apiSymbols.join(',')}`, {
            signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
            const data = await response.json();
            const results = {};
            
            for (const symbol of symbols) {
                const apiSymbol = normalizeTickerForAPI(symbol);
                const stockData = data[apiSymbol] || data[symbol];
                if (stockData && stockData.currentPrice) {
                    results[symbol] = {
                        symbol: symbol,
                        currentPrice: stockData.currentPrice,
                        previousClose: stockData.previousClose,
                        change: stockData.change,
                        changePercent: stockData.changePercent,
                        high: stockData.high,
                        low: stockData.low,
                        open: stockData.open,
                        volume: stockData.volume
                    };
                    
                    // Cache individual results
                    apiCache.quotes[symbol] = results[symbol];
                    apiCache.lastUpdate[`quote_${symbol}`] = Date.now();
                }
            }
            
            return results;
        }
    } catch (error) {
        console.log('Batch fetch failed:', error.message);
    }
    
    return {};
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
        
        // Map range to yfinance period/interval
        let period, interval;
        switch(range) {
            case '1d': period = '1d'; interval = '5m'; break;
            case '5d': period = '5d'; interval = '15m'; break;
            case '1mo': period = '1mo'; interval = '1d'; break;
            case '3mo': period = '3mo'; interval = '1d'; break;
            case '1y': period = '1y'; interval = '1d'; break;
            case '5y': period = '5y'; interval = '1wk'; break;
            default: period = '1mo'; interval = '1d';
        }
        
        const response = await fetch(
            `${API_BASE}/chart?symbol=${apiSymbol}&period=${period}&interval=${interval}`,
            { signal: AbortSignal.timeout(15000) }
        );
        
        if (response.ok) {
            const chartData = await response.json();
            if (Array.isArray(chartData) && chartData.length > 0) {
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
    console.log('Fetching stock data from yfinance server...');
    
    dataStatus.isLoading = true;
    dataStatus.successCount = 0;
    dataStatus.failCount = 0;
    updateDataStatusUI();
    
    const allTickers = [];
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => { allTickers.push(stock.ticker); });
    });
    
    dataStatus.totalStocks = allTickers.length;
    
    // Fetch in batches using bulk endpoint
    const batchSize = 20;
    
    for (let i = 0; i < allTickers.length; i += batchSize) {
        const batch = allTickers.slice(i, i + batchSize);
        
        const results = await fetchMultipleStocks(batch);
        
        batch.forEach(ticker => {
            const data = results[ticker];
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
            await new Promise(r => setTimeout(r, 200));
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
