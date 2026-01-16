// S&P 500 Treemap Visualization using D3.js

// Color scale for performance
function getColor(change) {
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
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);
    
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
            // Hide text if node is too small
            if (nodeWidth < 45 || nodeHeight < 35) {
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
            const changeClass = d.data.change >= 0 ? 'positive' : 'negative';
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
                    <span class="value ${changeClass}">${formatChange(d.data.change)}</span>
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

// Initialize on load
initTreemap();

// Resize handler
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initTreemap, 250);
});
