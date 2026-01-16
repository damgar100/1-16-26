// S&P 500 Treemap Visualization using D3.js

// Color scale for performance
function getColor(change) {
    // Return gray for null/undefined (no data loaded)
    if (change === null || change === undefined) {
        return '#444';
    }
    if (change >= 3) return '#0d5f2a';
    if (change >= 2) return '#1a8f3e';
    if (change >= 1) return '#2ecc71';
    if (change >= 0.5) return '#58d68d';
    if (change >= 0) return '#8fe0ac';
    if (change >= -0.5) return '#f5a8a2';
    if (change >= -1) return '#e67e73';
    if (change >= -2) return '#e74c3c';
    if (change >= -3) return '#c0392b';
    return '#7b241c';
}

// Format market cap
function formatMarketCap(value) {
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}T`;
    }
    return `$${value.toFixed(0)}B`;
}

// Format percentage change
function formatChange(change) {
    if (change === null || change === undefined) {
        return '—';
    }
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
}

// Initialize the treemap
function initTreemap() {
    const container = document.getElementById('treemap');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Clear any existing SVG
    d3.select('#treemap').selectAll('*').remove();
    
    // Create SVG
    const svg = d3.select('#treemap')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create hierarchy
    const root = d3.hierarchy(sp500Data)
        .sum(d => d.marketCap)
        .sort((a, b) => b.value - a.value);
    
    // Create treemap layout
    d3.treemap()
        .size([width, height])
        .paddingOuter(3)
        .paddingTop(19)
        .paddingInner(1)
        .round(true)(root);
    
    // Tooltip element
    const tooltip = d3.select('#tooltip');
    
    // Create groups for sectors
    const sectors = svg.selectAll('g.sector')
        .data(root.children)
        .join('g')
        .attr('class', 'sector');
    
    // Add sector background
    sectors.append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', '#222')
        .attr('rx', 2);
    
    // Add sector labels
    sectors.append('text')
        .attr('class', 'sector-label')
        .attr('x', d => d.x0 + 5)
        .attr('y', d => d.y0 + 14)
        .text(d => d.data.name)
        .each(function(d) {
            // Truncate if too long
            const textWidth = d.x1 - d.x0 - 10;
            const text = d3.select(this);
            let textContent = d.data.name;
            while (text.node().getComputedTextLength() > textWidth && textContent.length > 0) {
                textContent = textContent.slice(0, -1);
                text.text(textContent + '...');
            }
        });
    
    // Create nodes for stocks
    const nodes = svg.selectAll('g.node')
        .data(root.leaves())
        .join('g')
        .attr('class', d => `node ${d.data.change === null ? 'no-data' : ''}`)
        .attr('transform', d => `translate(${d.x0},${d.y0})`)
        .attr('data-ticker', d => d.data.ticker);
    
    // Add rectangles
    nodes.append('rect')
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0))
        .attr('fill', d => getColor(d.data.change))
        .attr('rx', 2);
    
    // Add ticker labels
    nodes.append('text')
        .attr('class', 'ticker')
        .attr('x', d => (d.x1 - d.x0) / 2)
        .attr('y', d => (d.y1 - d.y0) / 2 - 2)
        .text(d => d.data.ticker)
        .each(function(d) {
            const nodeWidth = d.x1 - d.x0;
            const nodeHeight = d.y1 - d.y0;
            // Hide text if node is too small
            if (nodeWidth < 35 || nodeHeight < 25) {
                d3.select(this).style('display', 'none');
            }
            // Adjust font size based on node size
            const fontSize = Math.min(14, Math.max(8, nodeWidth / 5));
            d3.select(this).style('font-size', fontSize + 'px');
        });
    
    // Add change labels
    nodes.append('text')
        .attr('class', 'change')
        .attr('x', d => (d.x1 - d.x0) / 2)
        .attr('y', d => (d.y1 - d.y0) / 2 + 12)
        .text(d => formatChange(d.data.change))
        .each(function(d) {
            const nodeWidth = d.x1 - d.x0;
            const nodeHeight = d.y1 - d.y0;
            // Hide text if node is too small or no data
            if (nodeWidth < 45 || nodeHeight < 35 || d.data.change === null) {
                d3.select(this).style('display', 'none');
            }
            // Adjust font size based on node size
            const fontSize = Math.min(11, Math.max(7, nodeWidth / 6));
            d3.select(this).style('font-size', fontSize + 'px');
        });
    
    // Add hover interactions
    nodes
        .on('mouseenter', function(event, d) {
            tooltip.classed('visible', true);
            const changeClass = d.data.change === null ? '' : (d.data.change >= 0 ? 'positive' : 'negative');
            const changeText = d.data.change === null ? 'Data unavailable' : formatChange(d.data.change);
            tooltip.html(`
                <div class="company-name">${d.data.name}</div>
                <div class="info-row">
                    <span class="label">Ticker:</span>
                    <span class="value">${d.data.ticker}</span>
                </div>
                <div class="info-row">
                    <span class="label">Sector:</span>
                    <span class="value">${d.parent.data.name}</span>
                </div>
                <div class="info-row">
                    <span class="label">Market Cap:</span>
                    <span class="value">${formatMarketCap(d.data.marketCap)}</span>
                </div>
                <div class="info-row">
                    <span class="label">Change:</span>
                    <span class="value ${changeClass}">${changeText}</span>
                </div>
            `);
        })
        .on('mousemove', function(event) {
            const tooltipWidth = tooltip.node().offsetWidth;
            const tooltipHeight = tooltip.node().offsetHeight;
            let x = event.pageX + 15;
            let y = event.pageY - 10;
            
            // Keep tooltip in viewport
            if (x + tooltipWidth > window.innerWidth) {
                x = event.pageX - tooltipWidth - 15;
            }
            if (y + tooltipHeight > window.innerHeight) {
                y = event.pageY - tooltipHeight - 10;
            }
            
            tooltip
                .style('left', x + 'px')
                .style('top', y + 'px');
        })
        .on('mouseleave', function() {
            tooltip.classed('visible', false);
        });
}

// Get all stocks as flat array
function getAllStocks() {
    const stocks = [];
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => {
            stocks.push({ ...stock, sector: sector.name });
        });
    });
    return stocks;
}

// Get top gainers/losers (only stocks with loaded data)
function getTopMovers(type = 'gainers', limit = 10) {
    const allStocks = getAllStocks().filter(stock => stock.change !== null);
    
    if (allStocks.length === 0) {
        return [];
    }
    
    allStocks.sort((a, b) => type === 'gainers' ? b.change - a.change : a.change - b.change);
    return allStocks.slice(0, limit);
}

// Show quick stats panel
function showQuickStats(type) {
    const panel = document.getElementById('quick-stats-panel');
    const title = document.getElementById('quick-stats-title');
    const list = document.getElementById('quick-stats-list');
    
    const movers = getTopMovers(type);
    
    title.textContent = type === 'gainers' ? 'Top Gainers' : 'Top Losers';
    title.className = type;
    
    if (movers.length === 0) {
        list.innerHTML = '<div class="quick-stats-empty">Loading stock data...</div>';
    } else {
        list.innerHTML = movers.map(stock => {
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const sign = stock.change >= 0 ? '+' : '';
            return `
                <div class="quick-stats-item" data-ticker="${stock.ticker}">
                    <div class="quick-stats-stock">
                        <span class="quick-stats-ticker">${stock.ticker}</span>
                        <span class="quick-stats-name">${stock.name}</span>
                    </div>
                    <span class="quick-stats-change ${changeClass}">${sign}${stock.change.toFixed(2)}%</span>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        list.querySelectorAll('.quick-stats-item').forEach(item => {
            item.addEventListener('click', function() {
                const ticker = this.dataset.ticker;
                if (typeof openStockPanel === 'function') {
                    openStockPanel(ticker);
                }
                panel.classList.remove('visible');
            });
        });
    }
    
    panel.classList.add('visible');
}

// Initialize quick stats buttons
function initQuickStats() {
    const gainersBtn = document.getElementById('show-gainers');
    const losersBtn = document.getElementById('show-losers');
    const closeBtn = document.querySelector('.quick-stats-close');
    const panel = document.getElementById('quick-stats-panel');
    
    if (gainersBtn) {
        gainersBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showQuickStats('gainers');
        });
    }
    if (losersBtn) {
        losersBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showQuickStats('losers');
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => panel.classList.remove('visible'));
    }
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
        if (panel && !panel.contains(e.target) && 
            e.target !== gainersBtn && e.target !== losersBtn &&
            !e.target.closest('.stats-btn')) {
            panel.classList.remove('visible');
        }
    });
}

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key.toLowerCase()) {
            case 'g':
                showQuickStats('gainers');
                break;
            case 'l':
                showQuickStats('losers');
                break;
            case 'r':
                // Refresh data
                if (typeof refreshAllData === 'function') {
                    refreshAllData();
                }
                break;
            case '/':
                e.preventDefault();
                document.getElementById('stock-search')?.focus();
                break;
            case 'escape':
                // Close any open panels
                document.getElementById('quick-stats-panel')?.classList.remove('visible');
                if (typeof closeStockPanel === 'function') {
                    const panel = document.getElementById('stock-panel');
                    if (panel && panel.classList.contains('visible')) {
                        closeStockPanel();
                    }
                }
                break;
        }
    });
}

// Initialize on load
initTreemap();
initQuickStats();
initKeyboardShortcuts();

// Resize handler
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initTreemap, 250);
});
