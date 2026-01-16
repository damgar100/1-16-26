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
function openStockPanel(ticker) {
    const stock = stockDetails[ticker];
    const panel = document.getElementById('stock-panel');
    const mainContent = document.querySelector('.main-content');
    
    if (!stock) {
        // Find stock in sp500Data for basic info
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
        
        if (basicStock) {
            alert(`Detailed data for ${ticker} (${basicStock.name}) is not available yet.`);
        }
        return;
    }
    
    currentStock = stock;
    currentPeriod = '1M';
    
    // Update panel content
    document.querySelector('.stock-ticker').textContent = stock.ticker;
    document.querySelector('.stock-sector').textContent = stock.sector;
    document.querySelector('.stock-name-full').textContent = stock.name;
    
    // Price section
    const priceChange = document.querySelector('.price-change');
    const changeSign = stock.change >= 0 ? '+' : '';
    document.querySelector('.price-value').textContent = `$${stock.currentPrice.toFixed(2)}`;
    priceChange.textContent = `${changeSign}${stock.change.toFixed(2)} (${changeSign}${stock.changePercent.toFixed(2)}%)`;
    priceChange.className = `price-change ${stock.change >= 0 ? 'positive' : 'negative'}`;
    
    // After hours
    if (stock.afterHoursPrice) {
        const ahChangeSign = stock.afterHoursChange >= 0 ? '+' : '';
        document.querySelector('.ah-price').textContent = `$${stock.afterHoursPrice.toFixed(2)}`;
        const ahChange = document.querySelector('.ah-change');
        ahChange.textContent = `${ahChangeSign}${stock.afterHoursChange.toFixed(2)} (${ahChangeSign}${stock.afterHoursPercent.toFixed(2)}%)`;
        ahChange.className = `ah-change ${stock.afterHoursChange >= 0 ? 'positive' : 'negative'}`;
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
    
    // Draw chart
    drawChart(stock, '1M');
    
    // Show panel
    panel.classList.add('visible');
    mainContent.classList.add('panel-open');
    
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

// Update all metrics display
function updateAllMetrics(stock) {
    // Today's Trading
    setMetric('metric-open', `$${stock.open.toFixed(2)}`);
    setMetric('metric-high', `$${stock.high.toFixed(2)}`);
    setMetric('metric-low', `$${stock.low.toFixed(2)}`);
    setMetric('metric-prevclose', `$${(stock.prevClose || stock.currentPrice - stock.change).toFixed(2)}`);
    setMetric('metric-volume', formatVolume(stock.volume));
    setMetric('metric-avgvol', formatVolume(stock.avgVolume));
    
    // 52 Week Range
    setMetric('metric-52low', `$${stock.week52Low.toFixed(2)}`);
    setMetric('metric-52high', `$${stock.week52High.toFixed(2)}`);
    update52WeekRange(stock);
    
    // Valuation
    setMetric('metric-marketcap', formatLargeNumber(stock.marketCap));
    setMetric('metric-ev', formatLargeNumber(stock.enterpriseValue || stock.marketCap * 1.02));
    setMetric('metric-pe', stock.pe.toFixed(2));
    setMetric('metric-forwardpe', (stock.forwardPe || stock.pe * 0.9).toFixed(2));
    setMetric('metric-peg', (stock.peg || 2.0).toFixed(2));
    setMetric('metric-ps', (stock.priceToSales || 5.0).toFixed(2));
    setMetric('metric-pb', (stock.priceToBook || 10.0).toFixed(2));
    setMetric('metric-evebitda', (stock.evToEbitda || 15.0).toFixed(2));
    
    // Financials
    setMetric('metric-revenue', formatLargeNumber(stock.revenue));
    setMetric('metric-revgrowth', formatGrowth(stock.revenueGrowth || 5.0));
    setMetric('metric-grossprofit', formatLargeNumber(stock.grossProfit || stock.revenue * 0.4));
    setMetric('metric-grossmargin', `${(stock.grossMargin || 40).toFixed(1)}%`);
    setMetric('metric-opincome', formatLargeNumber(stock.operatingIncome || stock.netIncome * 1.2));
    setMetric('metric-opmargin', `${(stock.operatingMargin || stock.profitMargin * 1.2).toFixed(1)}%`);
    setMetric('metric-netincome', formatLargeNumber(stock.netIncome));
    setMetric('metric-margin', `${stock.profitMargin.toFixed(1)}%`);
    
    // Per Share Data
    setMetric('metric-eps', `$${stock.eps.toFixed(2)}`);
    setMetric('metric-epsgrowth', formatGrowth(stock.epsGrowth || 8.0));
    setMetric('metric-bookvalue', `$${(stock.bookValue || stock.currentPrice / 10).toFixed(2)}`);
    setMetric('metric-cashpershare', `$${(stock.cashPerShare || stock.currentPrice * 0.02).toFixed(2)}`);
    
    // Dividends & Returns
    setMetric('metric-divannual', stock.divYield > 0 ? `$${(stock.divAnnual || stock.currentPrice * stock.divYield / 100).toFixed(2)}` : 'N/A');
    setMetric('metric-divyield', stock.divYield > 0 ? `${stock.divYield.toFixed(2)}%` : 'N/A');
    setMetric('metric-payout', stock.divYield > 0 ? `${(stock.payoutRatio || 20).toFixed(1)}%` : 'N/A');
    setMetric('metric-exdiv', stock.exDivDate || 'N/A');
    setMetric('metric-roe', `${stock.roe.toFixed(1)}%`);
    setMetric('metric-roa', `${(stock.roa || stock.roe / 5).toFixed(1)}%`);
    setMetric('metric-roic', `${(stock.roic || stock.roe / 3).toFixed(1)}%`);
    
    // Balance Sheet
    setMetric('metric-cash', formatLargeNumber(stock.totalCash || stock.marketCap * 0.02));
    setMetric('metric-debt', formatLargeNumber(stock.totalDebt || stock.marketCap * 0.03));
    setMetric('metric-netdebt', formatLargeNumber(stock.netDebt || stock.marketCap * 0.01));
    setMetric('metric-debtequity', (stock.debtToEquity || 1.5).toFixed(2));
    setMetric('metric-currentratio', (stock.currentRatio || 1.2).toFixed(2));
    setMetric('metric-quickratio', (stock.quickRatio || 1.0).toFixed(2));
    
    // Trading Information
    setMetric('metric-beta', stock.beta.toFixed(2));
    setMetric('metric-sharesout', formatVolume(stock.sharesOutstanding || stock.marketCap / stock.currentPrice));
    setMetric('metric-float', formatVolume(stock.floatShares || stock.marketCap / stock.currentPrice * 0.99));
    setMetric('metric-shortint', `${(stock.shortInterest || 1.5).toFixed(2)}%`);
    setMetric('metric-instown', `${(stock.instOwnership || 65).toFixed(1)}%`);
    setMetric('metric-insiderown', `${(stock.insiderOwnership || 0.5).toFixed(2)}%`);
    
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

function formatGrowth(value) {
    const el = document.getElementById('metric-revgrowth');
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

// Draw price chart
function drawChart(stock, period) {
    const container = document.getElementById('stock-chart');
    const priceData = stock.priceHistory[period];
    
    if (!priceData || priceData.length === 0) return;
    
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
        btn.addEventListener('click', function() {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            
            if (currentStock) {
                drawChart(currentStock, currentPeriod);
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
                if (ticker && stockDetails[ticker]) {
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
