// Detailed stock data with price history and fundamentals
// Price history is simulated data for demonstration

function generatePriceHistory(basePrice, volatility, days, trend = 0) {
    const prices = [];
    let price = basePrice * (1 - (days * trend / 365)); // Start price based on trend
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Add some randomness with trend
        const change = (Math.random() - 0.5) * volatility + (trend / 365);
        price = price * (1 + change);
        
        prices.push({
            date: date.toISOString().split('T')[0],
            price: Math.round(price * 100) / 100,
            volume: Math.floor(Math.random() * 50000000) + 20000000
        });
    }
    
    return prices;
}

// Generate intraday data (1 day)
function generateIntradayData(basePrice, volatility) {
    const prices = [];
    let price = basePrice * 0.998;
    const today = new Date();
    
    // Market hours: 9:30 AM to 4:00 PM (6.5 hours = 390 minutes)
    for (let i = 0; i <= 78; i++) { // Every 5 minutes
        const date = new Date(today);
        date.setHours(9, 30 + (i * 5), 0, 0);
        
        const change = (Math.random() - 0.48) * volatility * 0.3;
        price = price * (1 + change);
        
        prices.push({
            date: date.toISOString(),
            price: Math.round(price * 100) / 100,
            volume: Math.floor(Math.random() * 2000000) + 500000
        });
    }
    
    return prices;
}

const stockDetails = {
    // Technology
    AAPL: {
        ticker: "AAPL",
        name: "Apple Inc.",
        sector: "Technology",
        currentPrice: 178.52,
        change: 2.35,
        changePercent: 1.33,
        open: 176.15,
        high: 179.23,
        low: 175.82,
        week52High: 198.23,
        week52Low: 124.17,
        volume: 52300000,
        avgVolume: 58200000,
        marketCap: 2890000000000,
        pe: 29.45,
        eps: 6.06,
        revenue: 94800000000,
        netIncome: 23000000000,
        divYield: 0.51,
        beta: 1.28,
        profitMargin: 24.3,
        roe: 147.2,
        priceHistory: {
            "1D": generateIntradayData(178.52, 0.02),
            "1W": generatePriceHistory(178.52, 0.015, 7, 0.05),
            "1M": generatePriceHistory(178.52, 0.02, 30, 0.08),
            "3M": generatePriceHistory(178.52, 0.025, 90, 0.12),
            "1Y": generatePriceHistory(178.52, 0.03, 365, 0.15),
            "5Y": generatePriceHistory(178.52, 0.035, 1825, 0.25)
        }
    },
    MSFT: {
        ticker: "MSFT",
        name: "Microsoft Corp.",
        sector: "Technology",
        currentPrice: 378.91,
        change: 3.21,
        changePercent: 0.85,
        open: 375.50,
        high: 380.15,
        low: 374.82,
        week52High: 384.30,
        week52Low: 245.61,
        volume: 22100000,
        avgVolume: 25800000,
        marketCap: 2780000000000,
        pe: 35.82,
        eps: 10.58,
        revenue: 56500000000,
        netIncome: 21900000000,
        divYield: 0.74,
        beta: 0.89,
        profitMargin: 36.7,
        roe: 38.5,
        priceHistory: {
            "1D": generateIntradayData(378.91, 0.015),
            "1W": generatePriceHistory(378.91, 0.012, 7, 0.04),
            "1M": generatePriceHistory(378.91, 0.018, 30, 0.06),
            "3M": generatePriceHistory(378.91, 0.022, 90, 0.10),
            "1Y": generatePriceHistory(378.91, 0.028, 365, 0.18),
            "5Y": generatePriceHistory(378.91, 0.032, 1825, 0.30)
        }
    },
    NVDA: {
        ticker: "NVDA",
        name: "NVIDIA Corp.",
        sector: "Technology",
        currentPrice: 485.09,
        change: 16.23,
        changePercent: 3.45,
        open: 470.15,
        high: 492.30,
        low: 468.50,
        week52High: 502.66,
        week52Low: 138.84,
        volume: 48500000,
        avgVolume: 52300000,
        marketCap: 1200000000000,
        pe: 65.32,
        eps: 7.43,
        revenue: 18100000000,
        netIncome: 6200000000,
        divYield: 0.03,
        beta: 1.72,
        profitMargin: 34.2,
        roe: 69.2,
        priceHistory: {
            "1D": generateIntradayData(485.09, 0.03),
            "1W": generatePriceHistory(485.09, 0.025, 7, 0.08),
            "1M": generatePriceHistory(485.09, 0.035, 30, 0.15),
            "3M": generatePriceHistory(485.09, 0.04, 90, 0.25),
            "1Y": generatePriceHistory(485.09, 0.05, 365, 0.50),
            "5Y": generatePriceHistory(485.09, 0.055, 1825, 0.80)
        }
    },
    GOOGL: {
        ticker: "GOOGL",
        name: "Alphabet Inc.",
        sector: "Communication Services",
        currentPrice: 141.80,
        change: 1.34,
        changePercent: 0.95,
        open: 140.25,
        high: 142.50,
        low: 139.80,
        week52High: 153.78,
        week52Low: 89.62,
        volume: 25600000,
        avgVolume: 28900000,
        marketCap: 1750000000000,
        pe: 25.18,
        eps: 5.63,
        revenue: 76700000000,
        netIncome: 19700000000,
        divYield: 0,
        beta: 1.05,
        profitMargin: 25.7,
        roe: 25.3,
        priceHistory: {
            "1D": generateIntradayData(141.80, 0.018),
            "1W": generatePriceHistory(141.80, 0.015, 7, 0.04),
            "1M": generatePriceHistory(141.80, 0.02, 30, 0.07),
            "3M": generatePriceHistory(141.80, 0.025, 90, 0.12),
            "1Y": generatePriceHistory(141.80, 0.03, 365, 0.20),
            "5Y": generatePriceHistory(141.80, 0.035, 1825, 0.35)
        }
    },
    META: {
        ticker: "META",
        name: "Meta Platforms",
        sector: "Communication Services",
        currentPrice: 355.64,
        change: 5.78,
        changePercent: 1.65,
        open: 350.20,
        high: 358.90,
        low: 349.15,
        week52High: 362.90,
        week52Low: 167.72,
        volume: 18200000,
        avgVolume: 21500000,
        marketCap: 925000000000,
        pe: 28.45,
        eps: 12.50,
        revenue: 34100000000,
        netIncome: 11600000000,
        divYield: 0,
        beta: 1.24,
        profitMargin: 34.0,
        roe: 22.8,
        priceHistory: {
            "1D": generateIntradayData(355.64, 0.022),
            "1W": generatePriceHistory(355.64, 0.018, 7, 0.05),
            "1M": generatePriceHistory(355.64, 0.025, 30, 0.10),
            "3M": generatePriceHistory(355.64, 0.03, 90, 0.18),
            "1Y": generatePriceHistory(355.64, 0.04, 365, 0.35),
            "5Y": generatePriceHistory(355.64, 0.045, 1825, 0.20)
        }
    },
    AMZN: {
        ticker: "AMZN",
        name: "Amazon.com",
        sector: "Consumer Discretionary",
        currentPrice: 153.42,
        change: 2.19,
        changePercent: 1.45,
        open: 151.80,
        high: 154.65,
        low: 150.90,
        week52High: 155.63,
        week52Low: 88.12,
        volume: 45200000,
        avgVolume: 52100000,
        marketCap: 1550000000000,
        pe: 78.52,
        eps: 1.95,
        revenue: 143100000000,
        netIncome: 10400000000,
        divYield: 0,
        beta: 1.18,
        profitMargin: 7.3,
        roe: 16.2,
        priceHistory: {
            "1D": generateIntradayData(153.42, 0.02),
            "1W": generatePriceHistory(153.42, 0.018, 7, 0.05),
            "1M": generatePriceHistory(153.42, 0.022, 30, 0.08),
            "3M": generatePriceHistory(153.42, 0.028, 90, 0.14),
            "1Y": generatePriceHistory(153.42, 0.035, 365, 0.28),
            "5Y": generatePriceHistory(153.42, 0.04, 1825, 0.40)
        }
    },
    TSLA: {
        ticker: "TSLA",
        name: "Tesla Inc.",
        sector: "Consumer Discretionary",
        currentPrice: 185.10,
        change: -4.46,
        changePercent: -2.35,
        open: 189.50,
        high: 191.20,
        low: 183.45,
        week52High: 299.29,
        week52Low: 138.80,
        volume: 125600000,
        avgVolume: 118500000,
        marketCap: 585000000000,
        pe: 52.18,
        eps: 3.55,
        revenue: 24900000000,
        netIncome: 2500000000,
        divYield: 0,
        beta: 2.08,
        profitMargin: 10.0,
        roe: 21.4,
        priceHistory: {
            "1D": generateIntradayData(185.10, 0.035),
            "1W": generatePriceHistory(185.10, 0.03, 7, -0.03),
            "1M": generatePriceHistory(185.10, 0.04, 30, -0.08),
            "3M": generatePriceHistory(185.10, 0.05, 90, -0.15),
            "1Y": generatePriceHistory(185.10, 0.06, 365, -0.10),
            "5Y": generatePriceHistory(185.10, 0.07, 1825, 0.60)
        }
    },
    JPM: {
        ticker: "JPM",
        name: "JPMorgan Chase",
        sector: "Financials",
        currentPrice: 172.35,
        change: 1.57,
        changePercent: 0.92,
        open: 170.80,
        high: 173.20,
        low: 170.15,
        week52High: 175.50,
        week52Low: 123.11,
        volume: 9800000,
        avgVolume: 11200000,
        marketCap: 495000000000,
        pe: 10.85,
        eps: 15.88,
        revenue: 41300000000,
        netIncome: 14300000000,
        divYield: 2.32,
        beta: 1.08,
        profitMargin: 34.6,
        roe: 15.8,
        priceHistory: {
            "1D": generateIntradayData(172.35, 0.015),
            "1W": generatePriceHistory(172.35, 0.012, 7, 0.03),
            "1M": generatePriceHistory(172.35, 0.018, 30, 0.05),
            "3M": generatePriceHistory(172.35, 0.022, 90, 0.08),
            "1Y": generatePriceHistory(172.35, 0.025, 365, 0.12),
            "5Y": generatePriceHistory(172.35, 0.03, 1825, 0.20)
        }
    },
    V: {
        ticker: "V",
        name: "Visa Inc.",
        sector: "Financials",
        currentPrice: 258.92,
        change: 1.67,
        changePercent: 0.65,
        open: 257.10,
        high: 260.15,
        low: 256.50,
        week52High: 262.50,
        week52Low: 206.73,
        volume: 6200000,
        avgVolume: 7100000,
        marketCap: 485000000000,
        pe: 30.52,
        eps: 8.48,
        revenue: 8600000000,
        netIncome: 4700000000,
        divYield: 0.76,
        beta: 0.95,
        profitMargin: 54.7,
        roe: 45.2,
        priceHistory: {
            "1D": generateIntradayData(258.92, 0.012),
            "1W": generatePriceHistory(258.92, 0.01, 7, 0.02),
            "1M": generatePriceHistory(258.92, 0.015, 30, 0.04),
            "3M": generatePriceHistory(258.92, 0.018, 90, 0.07),
            "1Y": generatePriceHistory(258.92, 0.022, 365, 0.10),
            "5Y": generatePriceHistory(258.92, 0.025, 1825, 0.22)
        }
    },
    UNH: {
        ticker: "UNH",
        name: "UnitedHealth Group",
        sector: "Healthcare",
        currentPrice: 528.45,
        change: -3.45,
        changePercent: -0.65,
        open: 532.10,
        high: 534.80,
        low: 526.20,
        week52High: 558.10,
        week52Low: 445.68,
        volume: 3500000,
        avgVolume: 4200000,
        marketCap: 480000000000,
        pe: 22.35,
        eps: 23.64,
        revenue: 92400000000,
        netIncome: 5800000000,
        divYield: 1.35,
        beta: 0.72,
        profitMargin: 6.3,
        roe: 25.8,
        priceHistory: {
            "1D": generateIntradayData(528.45, 0.012),
            "1W": generatePriceHistory(528.45, 0.01, 7, -0.02),
            "1M": generatePriceHistory(528.45, 0.015, 30, -0.03),
            "3M": generatePriceHistory(528.45, 0.018, 90, 0.02),
            "1Y": generatePriceHistory(528.45, 0.022, 365, 0.08),
            "5Y": generatePriceHistory(528.45, 0.025, 1825, 0.25)
        }
    },
    JNJ: {
        ticker: "JNJ",
        name: "Johnson & Johnson",
        sector: "Healthcare",
        currentPrice: 160.25,
        change: 0.35,
        changePercent: 0.22,
        open: 159.80,
        high: 161.10,
        low: 159.20,
        week52High: 175.97,
        week52Low: 150.81,
        volume: 7200000,
        avgVolume: 8100000,
        marketCap: 385000000000,
        pe: 15.82,
        eps: 10.13,
        revenue: 21400000000,
        netIncome: 4500000000,
        divYield: 2.95,
        beta: 0.55,
        profitMargin: 21.0,
        roe: 21.5,
        priceHistory: {
            "1D": generateIntradayData(160.25, 0.008),
            "1W": generatePriceHistory(160.25, 0.007, 7, 0.01),
            "1M": generatePriceHistory(160.25, 0.01, 30, 0.02),
            "3M": generatePriceHistory(160.25, 0.012, 90, 0.03),
            "1Y": generatePriceHistory(160.25, 0.015, 365, 0.05),
            "5Y": generatePriceHistory(160.25, 0.018, 1825, 0.15)
        }
    },
    LLY: {
        ticker: "LLY",
        name: "Eli Lilly",
        sector: "Healthcare",
        currentPrice: 598.75,
        change: 16.62,
        changePercent: 2.85,
        open: 582.50,
        high: 605.20,
        low: 580.10,
        week52High: 610.25,
        week52Low: 296.32,
        volume: 4100000,
        avgVolume: 3800000,
        marketCap: 565000000000,
        pe: 85.53,
        eps: 7.00,
        revenue: 9500000000,
        netIncome: 1800000000,
        divYield: 0.77,
        beta: 0.42,
        profitMargin: 18.9,
        roe: 58.2,
        priceHistory: {
            "1D": generateIntradayData(598.75, 0.025),
            "1W": generatePriceHistory(598.75, 0.02, 7, 0.06),
            "1M": generatePriceHistory(598.75, 0.028, 30, 0.12),
            "3M": generatePriceHistory(598.75, 0.035, 90, 0.20),
            "1Y": generatePriceHistory(598.75, 0.045, 365, 0.45),
            "5Y": generatePriceHistory(598.75, 0.05, 1825, 0.70)
        }
    },
    XOM: {
        ticker: "XOM",
        name: "Exxon Mobil",
        sector: "Energy",
        currentPrice: 104.82,
        change: -0.90,
        changePercent: -0.85,
        open: 105.60,
        high: 106.20,
        low: 104.15,
        week52High: 120.70,
        week52Low: 95.77,
        volume: 15800000,
        avgVolume: 18200000,
        marketCap: 455000000000,
        pe: 10.25,
        eps: 10.23,
        revenue: 90800000000,
        netIncome: 9200000000,
        divYield: 3.52,
        beta: 0.98,
        profitMargin: 10.1,
        roe: 18.5,
        priceHistory: {
            "1D": generateIntradayData(104.82, 0.015),
            "1W": generatePriceHistory(104.82, 0.012, 7, -0.02),
            "1M": generatePriceHistory(104.82, 0.018, 30, -0.04),
            "3M": generatePriceHistory(104.82, 0.022, 90, -0.05),
            "1Y": generatePriceHistory(104.82, 0.028, 365, 0.02),
            "5Y": generatePriceHistory(104.82, 0.035, 1825, 0.15)
        }
    },
    WMT: {
        ticker: "WMT",
        name: "Walmart Inc.",
        sector: "Consumer Staples",
        currentPrice: 158.32,
        change: 0.71,
        changePercent: 0.45,
        open: 157.50,
        high: 159.10,
        low: 157.20,
        week52High: 163.42,
        week52Low: 141.12,
        volume: 8500000,
        avgVolume: 9200000,
        marketCap: 425000000000,
        pe: 28.62,
        eps: 5.53,
        revenue: 161000000000,
        netIncome: 5100000000,
        divYield: 1.42,
        beta: 0.52,
        profitMargin: 3.2,
        roe: 18.2,
        priceHistory: {
            "1D": generateIntradayData(158.32, 0.01),
            "1W": generatePriceHistory(158.32, 0.008, 7, 0.015),
            "1M": generatePriceHistory(158.32, 0.012, 30, 0.03),
            "3M": generatePriceHistory(158.32, 0.015, 90, 0.05),
            "1Y": generatePriceHistory(158.32, 0.018, 365, 0.08),
            "5Y": generatePriceHistory(158.32, 0.022, 1825, 0.18)
        }
    },
    PG: {
        ticker: "PG",
        name: "Procter & Gamble",
        sector: "Consumer Staples",
        currentPrice: 152.18,
        change: 0.42,
        changePercent: 0.28,
        open: 151.70,
        high: 153.05,
        low: 151.40,
        week52High: 158.52,
        week52Low: 138.79,
        volume: 6100000,
        avgVolume: 6800000,
        marketCap: 365000000000,
        pe: 25.36,
        eps: 6.00,
        revenue: 21400000000,
        netIncome: 3800000000,
        divYield: 2.45,
        beta: 0.42,
        profitMargin: 17.8,
        roe: 32.5,
        priceHistory: {
            "1D": generateIntradayData(152.18, 0.008),
            "1W": generatePriceHistory(152.18, 0.007, 7, 0.01),
            "1M": generatePriceHistory(152.18, 0.01, 30, 0.02),
            "3M": generatePriceHistory(152.18, 0.012, 90, 0.04),
            "1Y": generatePriceHistory(152.18, 0.015, 365, 0.06),
            "5Y": generatePriceHistory(152.18, 0.018, 1825, 0.15)
        }
    },
    NFLX: {
        ticker: "NFLX",
        name: "Netflix Inc.",
        sector: "Communication Services",
        currentPrice: 478.25,
        change: 10.05,
        changePercent: 2.15,
        open: 468.50,
        high: 482.30,
        low: 466.80,
        week52High: 485.00,
        week52Low: 271.56,
        volume: 5200000,
        avgVolume: 4800000,
        marketCap: 245000000000,
        pe: 45.55,
        eps: 10.50,
        revenue: 8500000000,
        netIncome: 1700000000,
        divYield: 0,
        beta: 1.35,
        profitMargin: 20.0,
        roe: 22.5,
        priceHistory: {
            "1D": generateIntradayData(478.25, 0.025),
            "1W": generatePriceHistory(478.25, 0.02, 7, 0.05),
            "1M": generatePriceHistory(478.25, 0.028, 30, 0.10),
            "3M": generatePriceHistory(478.25, 0.035, 90, 0.18),
            "1Y": generatePriceHistory(478.25, 0.045, 365, 0.30),
            "5Y": generatePriceHistory(478.25, 0.05, 1825, 0.35)
        }
    }
};

// Function to get all searchable stocks
function getAllStocks() {
    const allStocks = [];
    
    // Add stocks from stockDetails
    for (const ticker in stockDetails) {
        allStocks.push({
            ticker: ticker,
            name: stockDetails[ticker].name,
            change: stockDetails[ticker].changePercent
        });
    }
    
    // Add remaining stocks from sp500Data
    sp500Data.children.forEach(sector => {
        sector.children.forEach(stock => {
            if (!stockDetails[stock.ticker]) {
                allStocks.push({
                    ticker: stock.ticker,
                    name: stock.name,
                    change: stock.change
                });
            }
        });
    });
    
    return allStocks;
}
