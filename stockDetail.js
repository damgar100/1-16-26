// Stock Detail Modal and Search Functionality

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
                openStockModal(ticker);
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
                openStockModal(ticker);
                searchInput.value = '';
                searchResults.classList.remove('visible');
            }
        }
    });
}

// Open stock modal
function openStockModal(ticker) {
    const stock = stockDetails[ticker];
    const modal = document.getElementById('stock-modal');
    
    if (!stock) {
        // Find stock in sp500Data for basic info
        let basicStock = null;
        sp500Data.children.forEach(sector => {
            sector.children.forEach(s => {
                if (s.ticker === ticker) {
                    basicStock = s;
                }
            });
        });
        
        if (basicStock) {
            alert(`Detailed data for ${ticker} is not available yet. Showing basic info.`);
        }
        return;
    }
    
    currentStock = stock;
    currentPeriod = '1M';
    
    // Update modal content
    document.querySelector('.stock-ticker').textContent = stock.ticker;
    document.querySelector('.stock-name').textContent = stock.name;
    
    const priceChange = document.querySelector('.price-change');
    const changeSign = stock.change >= 0 ? '+' : '';
    document.querySelector('.price-value').textContent = `$${stock.currentPrice.toFixed(2)}`;
    priceChange.textContent = `${changeSign}${stock.change.toFixed(2)} (${changeSign}${stock.changePercent.toFixed(2)}%)`;
    priceChange.className = `price-change ${stock.change >= 0 ? 'positive' : 'negative'}`;
    
    // Update metrics
    updateMetrics(stock);
    
    // Reset time selector
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === '1M') {
            btn.classList.add('active');
        }
    });
    
    // Draw chart
    drawChart(stock, '1M');
    
    // Show modal
    modal.classList.add('visible');
}

// Update metrics display
function updateMetrics(stock) {
    document.getElementById('metric-open').textContent = `$${stock.open.toFixed(2)}`;
    document.getElementById('metric-high').textContent = `$${stock.high.toFixed(2)}`;
    document.getElementById('metric-low').textContent = `$${stock.low.toFixed(2)}`;
    document.getElementById('metric-52high').textContent = `$${stock.week52High.toFixed(2)}`;
    document.getElementById('metric-52low').textContent = `$${stock.week52Low.toFixed(2)}`;
    document.getElementById('metric-volume').textContent = formatVolume(stock.volume);
    document.getElementById('metric-avgvol').textContent = formatVolume(stock.avgVolume);
    document.getElementById('metric-marketcap').textContent = formatMarketCapLarge(stock.marketCap);
    
    document.getElementById('metric-pe').textContent = stock.pe.toFixed(2);
    document.getElementById('metric-eps').textContent = `$${stock.eps.toFixed(2)}`;
    document.getElementById('metric-revenue').textContent = formatMarketCapLarge(stock.revenue);
    document.getElementById('metric-netincome').textContent = formatMarketCapLarge(stock.netIncome);
    document.getElementById('metric-divyield').textContent = stock.divYield > 0 ? `${stock.divYield.toFixed(2)}%` : 'N/A';
    document.getElementById('metric-beta').textContent = stock.beta.toFixed(2);
    document.getElementById('metric-margin').textContent = `${stock.profitMargin.toFixed(1)}%`;
    document.getElementById('metric-roe').textContent = `${stock.roe.toFixed(1)}%`;
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

// Format large market cap
function formatMarketCapLarge(val) {
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
    
    const margin = { top: 20, right: 50, bottom: 30, left: 10 };
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
        .data(yScale.ticks(5))
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
        .ticks(6)
        .tickFormat(xTickFormat));
    
    const yAxis = svg.append('g')
        .attr('class', 'chart-axis')
        .attr('transform', `translate(${width},0)`);
    
    yAxis.call(d3.axisRight(yScale)
        .ticks(5)
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
        .attr('width', 120)
        .attr('height', 50)
        .attr('fill', 'rgba(0,0,0,0.9)')
        .attr('stroke', '#444')
        .attr('rx', 4);
    
    const tooltipDate = tooltip.append('text')
        .attr('x', 10)
        .attr('y', 20)
        .attr('fill', '#888')
        .attr('font-size', '11px');
    
    const tooltipPrice = tooltip.append('text')
        .attr('x', 10)
        .attr('y', 38)
        .attr('fill', '#fff')
        .attr('font-size', '14px')
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
            if (tooltipX + 120 > width) {
                tooltipX = xPos - 130;
            }
            
            let tooltipY = yPos - 60;
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

// Initialize modal functionality
function initModal() {
    const modal = document.getElementById('stock-modal');
    const closeBtn = modal.querySelector('.modal-close');
    
    closeBtn.addEventListener('click', function() {
        modal.classList.remove('visible');
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('visible');
        }
    });
    
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
        if (e.key === 'Escape' && modal.classList.contains('visible')) {
            modal.classList.remove('visible');
        }
    });
}

// Make treemap nodes clickable to open stock detail
function makeTreemapClickable() {
    // This will be called after treemap is initialized
    setTimeout(() => {
        document.querySelectorAll('.node').forEach(node => {
            node.addEventListener('click', function() {
                const ticker = this.querySelector('.ticker')?.textContent;
                if (ticker && stockDetails[ticker]) {
                    openStockModal(ticker);
                }
            });
        });
    }, 100);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    initSearch();
    initModal();
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
