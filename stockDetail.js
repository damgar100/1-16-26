// Stock Detail Panel and Search Functionality

let currentStock = null;
let currentPeriod = '1M';

// Initialize search functionality
function initSearch() {
    const searchInput = document.getElementById('stock-search');
    const searchResults = document.getElementById('search-results');
    const allStocks = getAllStocks();
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length === 0) {
            searchResults.classList.remove('visible');
            return;
        }
        
        const matches = allStocks.filter(stock => 
            stock.ticker.toLowerCase().includes(query) ||
            stock.name.toLowerCase().includes(query)
        ).slice(0, 8);
        
        if (matches.length === 0) {
            searchResults.classList.remove('visible');
            return;
        }
        
        searchResults.innerHTML = matches.map(stock => {
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const changeSign = stock.change >= 0 ? '+' : '';
            return `
                <div class="search-result-item" data-ticker="${stock.ticker}">
                    <div>
                        <span class="search-result-ticker">${stock.ticker}</span>
                        <span class="search-result-name">${stock.name}</span>
                    </div>
                    <span class="search-result-change ${changeClass}">${changeSign}${stock.change.toFixed(2)}%</span>
                </div>
            `;
        }).join('');
        
        searchResults.classList.add('visible');
        
        // Add click handlers
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const ticker = this.dataset.ticker;
                openStockPanel(ticker);
                searchInput.value = '';
                searchResults.classList.remove('visible');
            });
        });
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('visible');
        }
    });
    
    // Handle enter key
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const firstResult = searchResults.querySelector('.search-result-item');
            if (firstResult) {
                const ticker = firstResult.dataset.ticker;
                openStockPanel(ticker);
                searchInput.value = '';
                searchResults.classList.remove('visible');
            }
        }
    });
}

// Open stock panel
async function openStockPanel(ticker) {
    const panel = document.getElementById('stock-panel');
    const mainContent = document.querySelector('.main-content');
    
    // Show panel immediately with loading state
    panel.classList.add('visible');
    mainContent.classList.add('panel-open');
    
    // Show loading state
    document.querySelector('.stock-ticker').textContent = ticker;
    document.querySelector('.stock-name-full').textContent = 'Loading...';
    document.querySelector('.price-value').textContent = '...';
    document.querySelector('.price-change').textContent = '';
    
    // First, get basic info from sp500Data (always available)
    let basicStock = null;
    let sectorName = '';
    sp500Data.children.forEach(sector => {
        sector.children.forEach(s => {
            if (s.ticker === ticker) {
                basicStock = s;
                sectorName = sector.name;
            }
        });
    });
    
    // Start with cached stockDetails if available
    let stock = stockDetails[ticker] ? { ...stockDetails[ticker] } : null;
    
    // Try to fetch real data from API (with timeout)
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API timeout')), 5000)
        );
        const apiPromise = updateStockFromAPI(ticker);
        const apiData = await Promise.race([apiPromise, timeoutPromise]);
        
        if (apiData && apiData.currentPrice) {
            stock = apiData;
            console.log('Using API data for', ticker);
        }
    } catch (error) {
        console.log('API fetch failed for', ticker, '- using fallback:', error.message);
    }
    
    // If API failed and no cached stockDetails, create from basic data
    if (!stock && basicStock) {
        stock = {
            ticker: basicStock.ticker,
            name: basicStock.name,
            sector: sectorName,
            currentPrice: basicStock.currentPrice || null,
            change: basicStock.change || 0,
            changePercent: basicStock.change || 0,
            marketCap: basicStock.marketCap ? basicStock.marketCap * 1000000000 : null,
            priceHistory: {}
        };
        console.log('Using basic sp500Data for', ticker);
    }
    
    // Merge basic info if we have it (for sector info, etc.)
    if (stock && basicStock) {
        stock.sector = stock.sector || sectorName;
        stock.name = stock.name || basicStock.name;
        // Use basic data price if API didn't return one
        if (!stock.currentPrice && basicStock.currentPrice) {
            stock.currentPrice = basicStock.currentPrice;
        }
    }
    
    if (!stock) {
        document.querySelector('.stock-name-full').textContent = 'Data not available';
        document.querySelector('.price-value').textContent = 'N/A';
        return;
    }
    
    currentStock = stock;
    currentPeriod = '1M';
    
    // Log stock data for debugging
    console.log('Stock data:', stock);
    
    // Update panel content
    document.querySelector('.stock-ticker').textContent = stock.ticker || 'N/A';
    document.querySelector('.stock-sector').textContent = stock.sector || 'Unknown';
    document.querySelector('.stock-name-full').textContent = stock.name || 'Unknown';
    
    // Price section - handle null/undefined values
    const priceEl = document.querySelector('.price-value');
    const priceChangeEl = document.querySelector('.price-change');
    
    const price = parseFloat(stock.currentPrice) || 0;
    const change = parseFloat(stock.change) || 0;
    const changePercent = parseFloat(stock.changePercent) || 0;
    
    if (price > 0) {
        priceEl.textContent = `$${price.toFixed(2)}`;
        const changeSign = change >= 0 ? '+' : '';
        priceChangeEl.textContent = `${changeSign}${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;
        priceChangeEl.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
    } else {
        priceEl.textContent = 'Price unavailable';
        priceChangeEl.textContent = '';
        priceChangeEl.className = 'price-change';
    }
    
    // After hours / Pre-market
    const priceDetails = document.querySelector('.price-details');
    if (stock.afterHoursPrice && stock.afterHoursPrice > 0) {
        const ahChangeSign = (stock.afterHoursChange || 0) >= 0 ? '+' : '';
        document.querySelector('.ah-price').textContent = `$${stock.afterHoursPrice.toFixed(2)}`;
        const ahChange = document.querySelector('.ah-change');
        ahChange.textContent = `${ahChangeSign}${(stock.afterHoursChange || 0).toFixed(2)} (${ahChangeSign}${(stock.afterHoursPercent || 0).toFixed(2)}%)`;
        ahChange.className = `ah-change ${(stock.afterHoursChange || 0) >= 0 ? 'positive' : 'negative'}`;
        priceDetails.style.display = 'block';
    } else if (stock.preMarketPrice && stock.preMarketPrice > 0) {
        document.querySelector('.price-detail').innerHTML = `Pre-Market: <span class="ah-price">$${stock.preMarketPrice.toFixed(2)}</span> <span class="ah-change ${(stock.preMarketChange || 0) >= 0 ? 'positive' : 'negative'}">${(stock.preMarketChange || 0) >= 0 ? '+' : ''}${(stock.preMarketChange || 0).toFixed(2)} (${(stock.preMarketPercent || 0) >= 0 ? '+' : ''}${(stock.preMarketPercent || 0).toFixed(2)}%)</span>`;
        priceDetails.style.display = 'block';
    } else {
        priceDetails.style.display = 'none';
    }
    
    // Update all metrics
    updateAllMetrics(stock);
    
    // Reset time selector
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === '1M') {
            btn.classList.add('active');
        }
    });
    
    // First fetch 1D chart to get current price, then display 1M chart
    // This ensures we have the latest price even if quote API fails
    try {
        const intradayData = await fetchChartForPeriod(stock.ticker, '1D');
        if (intradayData && intradayData.length > 0) {
            // Get current price from latest intraday data
            const lastPoint = intradayData[intradayData.length - 1];
            const firstPoint = intradayData[0];
            
            if (lastPoint && lastPoint.price > 0) {
                const currentPrice = lastPoint.price;
                const prevClose = firstPoint.price; // Approximation
                
                // Update spot price display
                const priceEl = document.querySelector('.price-value');
                const priceChangeEl = document.querySelector('.price-change');
                const currentText = priceEl.textContent;
                
                if (currentText === 'Price unavailable' || currentText === '...' || currentText === 'N/A' || currentText === '$0.00') {
                    const change = currentPrice - prevClose;
                    const changePercent = ((currentPrice - prevClose) / prevClose) * 100;
                    
                    priceEl.textContent = `$${currentPrice.toFixed(2)}`;
                    const changeSign = change >= 0 ? '+' : '';
                    priceChangeEl.textContent = `${changeSign}${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;
                    priceChangeEl.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
                    
                    // Update currentStock
                    currentStock.currentPrice = currentPrice;
                    currentStock.change = change;
                    currentStock.changePercent = changePercent;
                    
                    console.log('Updated spot price from 1D chart:', currentPrice);
                }
            }
            
            // Store intraday data
            if (!currentStock.priceHistory) currentStock.priceHistory = {};
            currentStock.priceHistory['1D'] = intradayData;
        }
    } catch (error) {
        console.log('Could not fetch intraday data for spot price:', error.message);
    }
    
    // Now fetch and draw the 1M chart
    await loadAndDrawChart(stock.ticker, '1M');
    
    // Resize treemap after animation
    setTimeout(() => {
        if (typeof initTreemap === 'function') {
            initTreemap();
        }
    }, 350);
}

// Close panel
function closeStockPanel() {
    const panel = document.getElementById('stock-panel');
    const mainContent = document.querySelector('.main-content');
    
    panel.classList.remove('visible');
    mainContent.classList.remove('panel-open');
    
    // Resize treemap after animation
    setTimeout(() => {
        if (typeof initTreemap === 'function') {
            initTreemap();
        }
    }, 350);
}

// Update spot price from chart data
function updateSpotPriceFromChart(chartData) {
    if (!chartData || chartData.length === 0) return;
    
    const priceEl = document.querySelector('.price-value');
    const priceChangeEl = document.querySelector('.price-change');
    
    // Get current price (last data point) and starting price (first data point)
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];
    
    if (lastPoint && lastPoint.price > 0) {
        const currentPrice = lastPoint.price;
        const startPrice = firstPoint.price;
        const change = currentPrice - startPrice;
        const changePercent = ((currentPrice - startPrice) / startPrice) * 100;
        
        // Only update if price is currently showing "unavailable" or "..."
        const currentText = priceEl.textContent;
        if (currentText === 'Price unavailable' || currentText === '...' || currentText === 'N/A') {
            priceEl.textContent = `$${currentPrice.toFixed(2)}`;
            
            const changeSign = change >= 0 ? '+' : '';
            priceChangeEl.textContent = `${changeSign}${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;
            priceChangeEl.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
            
            console.log('Updated spot price from chart data:', currentPrice);
            
            // Also update currentStock
            if (currentStock) {
                currentStock.currentPrice = currentPrice;
                currentStock.change = change;
                currentStock.changePercent = changePercent;
            }
        }
    }
}

// Load chart data from API and draw
async function loadAndDrawChart(ticker, period) {
    const chartContainer = document.getElementById('stock-chart');
    
    // Show loading state
    chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">Loading chart...</div>';
    
    try {
        const chartData = await fetchChartForPeriod(ticker, period);
        
        if (chartData && chartData.length > 0) {
            // Store in currentStock for redrawing
            if (currentStock) {
                if (!currentStock.priceHistory) currentStock.priceHistory = {};
                currentStock.priceHistory[period] = chartData;
            }
            
            // Update spot price from chart if needed (for 1D period, use actual current price)
            if (period === '1D') {
                updateSpotPriceFromChart(chartData);
            }
            
            drawChartFromData(chartData, period);
        } else {
            // Fall back to stored data if available
            if (currentStock && currentStock.priceHistory && currentStock.priceHistory[period]) {
                drawChartFromData(currentStock.priceHistory[period], period);
            } else {
                chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">Chart data unavailable</div>';
            }
        }
    } catch (error) {
        console.error('Error loading chart:', error);
        // Fall back to stored data
        if (currentStock && currentStock.priceHistory && currentStock.priceHistory[period]) {
            drawChartFromData(currentStock.priceHistory[period], period);
        } else {
            chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">Chart data unavailable</div>';
        }
    }
}

// Update all metrics display
function updateAllMetrics(stock) {
    // Today's Trading - with null checks
    setMetric('metric-open', stock.open ? `$${stock.open.toFixed(2)}` : 'N/A');
    setMetric('metric-high', stock.high ? `$${stock.high.toFixed(2)}` : 'N/A');
    setMetric('metric-low', stock.low ? `$${stock.low.toFixed(2)}` : 'N/A');
    setMetric('metric-prevclose', stock.prevClose ? `$${stock.prevClose.toFixed(2)}` : (stock.currentPrice && stock.change ? `$${(stock.currentPrice - stock.change).toFixed(2)}` : 'N/A'));
    setMetric('metric-volume', stock.volume ? formatVolume(stock.volume) : 'N/A');
    setMetric('metric-avgvol', stock.avgVolume ? formatVolume(stock.avgVolume) : 'N/A');
    
    // 52 Week Range
    setMetric('metric-52low', stock.week52Low ? `$${stock.week52Low.toFixed(2)}` : 'N/A');
    setMetric('metric-52high', stock.week52High ? `$${stock.week52High.toFixed(2)}` : 'N/A');
    if (stock.week52Low && stock.week52High && stock.currentPrice) {
        update52WeekRange(stock);
    }
    
    // Valuation
    setMetric('metric-marketcap', stock.marketCap ? formatLargeNumber(stock.marketCap) : 'N/A');
    setMetric('metric-ev', stock.enterpriseValue ? formatLargeNumber(stock.enterpriseValue) : (stock.marketCap ? formatLargeNumber(stock.marketCap * 1.02) : 'N/A'));
    setMetric('metric-pe', stock.pe ? stock.pe.toFixed(2) : 'N/A');
    setMetric('metric-forwardpe', stock.forwardPe ? stock.forwardPe.toFixed(2) : 'N/A');
    setMetric('metric-peg', stock.peg ? stock.peg.toFixed(2) : 'N/A');
    setMetric('metric-ps', stock.priceToSales ? stock.priceToSales.toFixed(2) : 'N/A');
    setMetric('metric-pb', stock.priceToBook ? stock.priceToBook.toFixed(2) : 'N/A');
    setMetric('metric-evebitda', stock.evToEbitda ? stock.evToEbitda.toFixed(2) : 'N/A');
    
    // Financials
    setMetric('metric-revenue', stock.revenue ? formatLargeNumber(stock.revenue) : 'N/A');
    setMetric('metric-revgrowth', stock.revenueGrowth ? formatGrowthValue(stock.revenueGrowth) : 'N/A');
    setMetric('metric-grossprofit', stock.grossProfit ? formatLargeNumber(stock.grossProfit) : 'N/A');
    setMetric('metric-grossmargin', stock.grossMargin ? `${stock.grossMargin.toFixed(1)}%` : 'N/A');
    setMetric('metric-opincome', stock.operatingIncome ? formatLargeNumber(stock.operatingIncome) : 'N/A');
    setMetric('metric-opmargin', stock.operatingMargin ? `${stock.operatingMargin.toFixed(1)}%` : 'N/A');
    setMetric('metric-netincome', stock.netIncome ? formatLargeNumber(stock.netIncome) : 'N/A');
    setMetric('metric-margin', stock.profitMargin ? `${stock.profitMargin.toFixed(1)}%` : 'N/A');
    
    // Per Share Data
    setMetric('metric-eps', stock.eps ? `$${stock.eps.toFixed(2)}` : 'N/A');
    setMetric('metric-epsgrowth', stock.epsGrowth ? formatGrowthValue(stock.epsGrowth) : 'N/A');
    setMetric('metric-bookvalue', stock.bookValue ? `$${stock.bookValue.toFixed(2)}` : 'N/A');
    setMetric('metric-cashpershare', stock.cashPerShare ? `$${stock.cashPerShare.toFixed(2)}` : 'N/A');
    
    // Dividends & Returns
    setMetric('metric-divannual', stock.divAnnual ? `$${stock.divAnnual.toFixed(2)}` : 'N/A');
    setMetric('metric-divyield', stock.divYield ? `${stock.divYield.toFixed(2)}%` : 'N/A');
    setMetric('metric-payout', stock.payoutRatio ? `${stock.payoutRatio.toFixed(1)}%` : 'N/A');
    setMetric('metric-exdiv', stock.exDivDate || 'N/A');
    setMetric('metric-roe', stock.roe ? `${stock.roe.toFixed(1)}%` : 'N/A');
    setMetric('metric-roa', stock.roa ? `${stock.roa.toFixed(1)}%` : 'N/A');
    setMetric('metric-roic', stock.roic ? `${stock.roic.toFixed(1)}%` : 'N/A');
    
    // Balance Sheet
    setMetric('metric-cash', stock.totalCash ? formatLargeNumber(stock.totalCash) : 'N/A');
    setMetric('metric-debt', stock.totalDebt ? formatLargeNumber(stock.totalDebt) : 'N/A');
    setMetric('metric-netdebt', stock.netDebt ? formatLargeNumber(stock.netDebt) : 'N/A');
    setMetric('metric-debtequity', stock.debtToEquity ? stock.debtToEquity.toFixed(2) : 'N/A');
    setMetric('metric-currentratio', stock.currentRatio ? stock.currentRatio.toFixed(2) : 'N/A');
    setMetric('metric-quickratio', stock.quickRatio ? stock.quickRatio.toFixed(2) : 'N/A');
    
    // Trading Information
    setMetric('metric-beta', stock.beta ? stock.beta.toFixed(2) : 'N/A');
    setMetric('metric-sharesout', stock.sharesOutstanding ? formatVolume(stock.sharesOutstanding) : 'N/A');
    setMetric('metric-float', stock.floatShares ? formatVolume(stock.floatShares) : 'N/A');
    setMetric('metric-shortint', stock.shortInterest ? `${stock.shortInterest.toFixed(2)}%` : (stock.shortRatio ? `${stock.shortRatio.toFixed(2)} days` : 'N/A'));
    setMetric('metric-instown', stock.instOwnership ? `${stock.instOwnership.toFixed(1)}%` : 'N/A');
    setMetric('metric-insiderown', stock.insiderOwnership ? `${stock.insiderOwnership.toFixed(2)}%` : 'N/A');
    
    // Analyst Ratings
    updateAnalystRatings(stock);
    
    // Company Info
    const descEl = document.getElementById('company-description');
    if (descEl) descEl.textContent = stock.description || `${stock.name} is a company in the ${stock.sector} sector.`;
    setMetric('company-hq', stock.headquarters || 'United States');
    setMetric('company-employees', stock.employees ? stock.employees.toLocaleString() : 'N/A');
    setMetric('company-founded', stock.founded || 'N/A');
    setMetric('company-ceo', stock.ceo || 'N/A');
}

function setMetric(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatGrowthValue(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

function update52WeekRange(stock) {
    const rangeFill = document.getElementById('range-fill');
    const rangeMarker = document.getElementById('range-marker');
    
    if (rangeFill && rangeMarker) {
        const range = stock.week52High - stock.week52Low;
        const position = ((stock.currentPrice - stock.week52Low) / range) * 100;
        
        rangeFill.style.width = '100%';
        rangeMarker.style.left = `${Math.min(100, Math.max(0, position))}%`;
    }
}

function updateAnalystRatings(stock) {
    const rating = stock.analystRating || 'Hold';
    const ratingEl = document.getElementById('analyst-rating');
    if (ratingEl) {
        ratingEl.textContent = rating;
        ratingEl.className = `rating-value ${rating.toLowerCase().replace(' ', '-')}`;
    }
    
    const target = stock.priceTarget || stock.currentPrice * 1.1;
    setMetric('analyst-target', `$${target.toFixed(2)}`);
    
    const upside = ((target - stock.currentPrice) / stock.currentPrice) * 100;
    const upsideEl = document.getElementById('analyst-upside');
    if (upsideEl) {
        const sign = upside >= 0 ? '+' : '';
        upsideEl.textContent = `(${sign}${upside.toFixed(1)}% ${upside >= 0 ? 'upside' : 'downside'})`;
        upsideEl.className = `target-upside ${upside >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Rating breakdown
    const strongBuy = stock.strongBuy || 10;
    const buy = stock.buy || 15;
    const hold = stock.hold || 8;
    const sell = stock.sell || 2;
    const strongSell = stock.strongSell || 0;
    const total = strongBuy + buy + hold + sell + strongSell;
    
    const setSegment = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.style.width = `${(count / total) * 100}%`;
    };
    
    setSegment('seg-strongbuy', strongBuy);
    setSegment('seg-buy', buy);
    setSegment('seg-hold', hold);
    setSegment('seg-sell', sell);
    setSegment('seg-strongsell', strongSell);
    
    setMetric('cnt-strongbuy', strongBuy);
    setMetric('cnt-buy', buy);
    setMetric('cnt-hold', hold);
    setMetric('cnt-sell', sell);
}

// Format volume
function formatVolume(vol) {
    if (vol >= 1000000000) {
        return `${(vol / 1000000000).toFixed(1)}B`;
    }
    if (vol >= 1000000) {
        return `${(vol / 1000000).toFixed(1)}M`;
    }
    if (vol >= 1000) {
        return `${(vol / 1000).toFixed(1)}K`;
    }
    return vol.toString();
}

// Format large number
function formatLargeNumber(val) {
    if (val >= 1000000000000) {
        return `$${(val / 1000000000000).toFixed(2)}T`;
    }
    if (val >= 1000000000) {
        return `$${(val / 1000000000).toFixed(1)}B`;
    }
    if (val >= 1000000) {
        return `$${(val / 1000000).toFixed(1)}M`;
    }
    return `$${val}`;
}

// Draw price chart from data array
function drawChartFromData(priceData, period) {
    const container = document.getElementById('stock-chart');
    
    if (!priceData || priceData.length === 0) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">No chart data available</div>';
        return;
    }
    
    // Clear previous chart
    d3.select('#stock-chart').selectAll('*').remove();
    
    const margin = { top: 10, right: 45, bottom: 25, left: 10 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    
    const svg = d3.select('#stock-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Determine if overall trend is positive or negative
    const startPrice = priceData[0].price;
    const endPrice = priceData[priceData.length - 1].price;
    const isPositive = endPrice >= startPrice;
    const colorClass = isPositive ? 'positive' : 'negative';
    const color = isPositive ? '#2ecc71' : '#e74c3c';
    
    // Update chart stats
    const prices = priceData.map(d => d.price);
    const periodHigh = Math.max(...prices);
    const periodLow = Math.min(...prices);
    const periodChange = ((endPrice - startPrice) / startPrice) * 100;
    
    setMetric('chart-high', `$${periodHigh.toFixed(2)}`);
    setMetric('chart-low', `$${periodLow.toFixed(2)}`);
    
    const chartChangeEl = document.getElementById('chart-change');
    if (chartChangeEl) {
        const sign = periodChange >= 0 ? '+' : '';
        chartChangeEl.textContent = `${sign}${periodChange.toFixed(1)}%`;
        chartChangeEl.className = `stat-value ${periodChange >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Create scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(priceData, d => new Date(d.date)))
        .range([0, width]);
    
    const yExtent = d3.extent(priceData, d => d.price);
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height, 0]);
    
    // Create grid lines
    const yGrid = svg.append('g')
        .attr('class', 'chart-grid');
    
    yGrid.selectAll('line')
        .data(yScale.ticks(4))
        .join('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d));
    
    // Create area
    const area = d3.area()
        .x(d => xScale(new Date(d.date)))
        .y0(height)
        .y1(d => yScale(d.price))
        .curve(d3.curveMonotoneX);
    
    svg.append('path')
        .datum(priceData)
        .attr('class', `chart-area ${colorClass}`)
        .attr('d', area);
    
    // Create line
    const line = d3.line()
        .x(d => xScale(new Date(d.date)))
        .y(d => yScale(d.price))
        .curve(d3.curveMonotoneX);
    
    svg.append('path')
        .datum(priceData)
        .attr('class', `chart-line ${colorClass}`)
        .attr('d', line);
    
    // Add axes
    const xAxis = svg.append('g')
        .attr('class', 'chart-axis')
        .attr('transform', `translate(0,${height})`);
    
    let xTickFormat;
    if (period === '1D') {
        xTickFormat = d3.timeFormat('%H:%M');
    } else if (period === '1W' || period === '1M') {
        xTickFormat = d3.timeFormat('%b %d');
    } else {
        xTickFormat = d3.timeFormat('%b %Y');
    }
    
    xAxis.call(d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(xTickFormat));
    
    const yAxis = svg.append('g')
        .attr('class', 'chart-axis')
        .attr('transform', `translate(${width},0)`);
    
    yAxis.call(d3.axisRight(yScale)
        .ticks(4)
        .tickFormat(d => `$${d.toFixed(0)}`));
    
    // Add interactive overlay
    const overlay = svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair');
    
    const crosshairV = svg.append('line')
        .attr('class', 'crosshair')
        .attr('y1', 0)
        .attr('y2', height)
        .style('opacity', 0);
    
    const crosshairH = svg.append('line')
        .attr('class', 'crosshair')
        .attr('x1', 0)
        .attr('x2', width)
        .style('opacity', 0);
    
    const tooltip = svg.append('g')
        .attr('class', 'chart-hover-tooltip')
        .style('opacity', 0);
    
    tooltip.append('rect')
        .attr('width', 100)
        .attr('height', 45)
        .attr('fill', 'rgba(0,0,0,0.9)')
        .attr('stroke', '#444')
        .attr('rx', 4);
    
    const tooltipDate = tooltip.append('text')
        .attr('x', 8)
        .attr('y', 18)
        .attr('fill', '#888')
        .attr('font-size', '10px');
    
    const tooltipPrice = tooltip.append('text')
        .attr('x', 8)
        .attr('y', 35)
        .attr('fill', '#fff')
        .attr('font-size', '13px')
        .attr('font-weight', '600');
    
    const bisect = d3.bisector(d => new Date(d.date)).left;
    
    overlay
        .on('mousemove', function(event) {
            const [mx] = d3.pointer(event);
            const x0 = xScale.invert(mx);
            const i = bisect(priceData, x0, 1);
            const d0 = priceData[i - 1];
            const d1 = priceData[i];
            
            if (!d0 || !d1) return;
            
            const d = x0 - new Date(d0.date) > new Date(d1.date) - x0 ? d1 : d0;
            const xPos = xScale(new Date(d.date));
            const yPos = yScale(d.price);
            
            crosshairV
                .attr('x1', xPos)
                .attr('x2', xPos)
                .style('opacity', 1);
            
            crosshairH
                .attr('y1', yPos)
                .attr('y2', yPos)
                .style('opacity', 1);
            
            let tooltipX = xPos + 10;
            if (tooltipX + 100 > width) {
                tooltipX = xPos - 110;
            }
            
            let tooltipY = yPos - 55;
            if (tooltipY < 0) {
                tooltipY = yPos + 10;
            }
            
            tooltip
                .attr('transform', `translate(${tooltipX},${tooltipY})`)
                .style('opacity', 1);
            
            const dateFormat = period === '1D' ? d3.timeFormat('%H:%M') : d3.timeFormat('%b %d, %Y');
            tooltipDate.text(dateFormat(new Date(d.date)));
            tooltipPrice.text(`$${d.price.toFixed(2)}`);
        })
        .on('mouseleave', function() {
            crosshairV.style('opacity', 0);
            crosshairH.style('opacity', 0);
            tooltip.style('opacity', 0);
        });
}

// Initialize panel functionality
function initPanel() {
    const panel = document.getElementById('stock-panel');
    const closeBtn = panel.querySelector('.panel-close');
    
    closeBtn.addEventListener('click', closeStockPanel);
    
    // Time selector buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            
            if (currentStock) {
                await loadAndDrawChart(currentStock.ticker, currentPeriod);
            }
        });
    });
    
    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && panel.classList.contains('visible')) {
            closeStockPanel();
        }
    });
}

// Make treemap nodes clickable to open stock detail
function makeTreemapClickable() {
    setTimeout(() => {
        document.querySelectorAll('.node').forEach(node => {
            node.addEventListener('click', function(e) {
                e.stopPropagation();
                const ticker = this.querySelector('.ticker')?.textContent;
                if (ticker) {
                    openStockPanel(ticker);
                }
            });
        });
    }, 100);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    initSearch();
    initPanel();
    makeTreemapClickable();
});

// Re-attach click handlers when treemap is resized
const originalInitTreemap = window.initTreemap;
if (originalInitTreemap) {
    window.initTreemap = function() {
        originalInitTreemap();
        makeTreemapClickable();
    };
}
