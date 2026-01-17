#!/usr/bin/env python3
"""
Fetch S&P 500 stock data using yfinance and save to sp500_data.json
Run this script to update the data, then open index.html in a browser.
"""

import json
import yfinance as yf
from datetime import datetime

# S&P 500 stocks organized by sector
SP500_STOCKS = {
    "Technology": [
        ("AAPL", "Apple Inc."), ("MSFT", "Microsoft Corp."), ("NVDA", "NVIDIA Corp."),
        ("AVGO", "Broadcom Inc."), ("ORCL", "Oracle Corp."), ("CRM", "Salesforce Inc."),
        ("CSCO", "Cisco Systems"), ("ACN", "Accenture"), ("IBM", "IBM Corp."),
        ("ADBE", "Adobe Inc."), ("AMD", "AMD Inc."), ("INTC", "Intel Corp."),
        ("QCOM", "Qualcomm"), ("TXN", "Texas Instruments"), ("INTU", "Intuit Inc."),
        ("AMAT", "Applied Materials"), ("NOW", "ServiceNow"), ("MU", "Micron Technology"),
        ("LRCX", "Lam Research"), ("ADI", "Analog Devices")
    ],
    "Healthcare": [
        ("UNH", "UnitedHealth Group"), ("JNJ", "Johnson & Johnson"), ("LLY", "Eli Lilly"),
        ("MRK", "Merck & Co."), ("ABBV", "AbbVie Inc."), ("PFE", "Pfizer Inc."),
        ("TMO", "Thermo Fisher"), ("ABT", "Abbott Labs"), ("DHR", "Danaher Corp."),
        ("BMY", "Bristol-Myers"), ("AMGN", "Amgen Inc."), ("MDT", "Medtronic"),
        ("GILD", "Gilead Sciences"), ("ISRG", "Intuitive Surgical"), ("VRTX", "Vertex Pharma"),
        ("CVS", "CVS Health"), ("CI", "Cigna Group"), ("ELV", "Elevance Health"),
        ("SYK", "Stryker Corp."), ("REGN", "Regeneron")
    ],
    "Financials": [
        ("BRK-B", "Berkshire Hathaway"), ("JPM", "JPMorgan Chase"), ("V", "Visa Inc."),
        ("MA", "Mastercard"), ("BAC", "Bank of America"), ("WFC", "Wells Fargo"),
        ("GS", "Goldman Sachs"), ("MS", "Morgan Stanley"), ("BLK", "BlackRock"),
        ("AXP", "American Express"), ("SPGI", "S&P Global"), ("C", "Citigroup"),
        ("SCHW", "Charles Schwab"), ("CB", "Chubb Ltd."), ("PGR", "Progressive Corp."),
        ("MMC", "Marsh McLennan"), ("ICE", "Intercontinental Ex"), ("USB", "U.S. Bancorp"),
        ("AON", "Aon plc"), ("CME", "CME Group")
    ],
    "Consumer Discretionary": [
        ("AMZN", "Amazon.com"), ("TSLA", "Tesla Inc."), ("HD", "Home Depot"),
        ("MCD", "McDonald's Corp."), ("NKE", "Nike Inc."), ("LOW", "Lowe's Cos."),
        ("SBUX", "Starbucks"), ("TJX", "TJX Companies"), ("BKNG", "Booking Holdings"),
        ("CMG", "Chipotle"), ("MAR", "Marriott Intl"), ("ORLY", "O'Reilly Auto"),
        ("GM", "General Motors"), ("F", "Ford Motor"), ("AZO", "AutoZone"),
        ("ROST", "Ross Stores"), ("DHI", "D.R. Horton"), ("LEN", "Lennar Corp."),
        ("YUM", "Yum! Brands"), ("EBAY", "eBay Inc.")
    ],
    "Communication Services": [
        ("GOOGL", "Alphabet Inc."), ("META", "Meta Platforms"), ("NFLX", "Netflix Inc."),
        ("DIS", "Walt Disney"), ("CMCSA", "Comcast Corp."), ("VZ", "Verizon"),
        ("T", "AT&T Inc."), ("TMUS", "T-Mobile US"), ("CHTR", "Charter Comm."),
        ("WBD", "Warner Bros."), ("EA", "Electronic Arts"), ("TTWO", "Take-Two"),
        ("OMC", "Omnicom Group"), ("IPG", "Interpublic"), ("PARA", "Paramount"),
        ("FOX", "Fox Corp."), ("NWSA", "News Corp."), ("LYV", "Live Nation"),
        ("MTCH", "Match Group")
    ],
    "Consumer Staples": [
        ("WMT", "Walmart Inc."), ("PG", "Procter & Gamble"), ("COST", "Costco"),
        ("KO", "Coca-Cola"), ("PEP", "PepsiCo"), ("PM", "Philip Morris"),
        ("MO", "Altria Group"), ("MDLZ", "Mondelez"), ("CL", "Colgate-Palmolive"),
        ("EL", "Estee Lauder"), ("KMB", "Kimberly-Clark"), ("GIS", "General Mills"),
        ("SYY", "Sysco Corp."), ("HSY", "Hershey Co."), ("K", "Kellanova"),
        ("KHC", "Kraft Heinz"), ("STZ", "Constellation Brands"), ("KR", "Kroger Co."),
        ("WBA", "Walgreens Boots"), ("CAG", "Conagra Brands")
    ],
    "Energy": [
        ("XOM", "Exxon Mobil"), ("CVX", "Chevron Corp."), ("COP", "ConocoPhillips"),
        ("EOG", "EOG Resources"), ("SLB", "Schlumberger"), ("MPC", "Marathon Petroleum"),
        ("PXD", "Pioneer Natural"), ("PSX", "Phillips 66"), ("VLO", "Valero Energy"),
        ("OXY", "Occidental Petro"), ("WMB", "Williams Cos."), ("KMI", "Kinder Morgan"),
        ("HAL", "Halliburton"), ("DVN", "Devon Energy"), ("BKR", "Baker Hughes"),
        ("FANG", "Diamondback Energy"), ("HES", "Hess Corp."), ("TRGP", "Targa Resources"),
        ("OKE", "ONEOK Inc.")
    ],
    "Industrials": [
        ("GE", "GE Aerospace"), ("CAT", "Caterpillar"), ("UNP", "Union Pacific"),
        ("RTX", "RTX Corp."), ("HON", "Honeywell"), ("BA", "Boeing Co."),
        ("DE", "Deere & Co."), ("LMT", "Lockheed Martin"), ("UPS", "United Parcel"),
        ("ADP", "ADP Inc."), ("ETN", "Eaton Corp."), ("NOC", "Northrop Grumman"),
        ("GD", "General Dynamics"), ("WM", "Waste Management"), ("ITW", "Illinois Tool Works"),
        ("FDX", "FedEx Corp."), ("EMR", "Emerson Electric"), ("NSC", "Norfolk Southern"),
        ("CSX", "CSX Corp."), ("PH", "Parker Hannifin")
    ],
    "Utilities": [
        ("NEE", "NextEra Energy"), ("SO", "Southern Co."), ("DUK", "Duke Energy"),
        ("SRE", "Sempra Energy"), ("AEP", "American Electric"), ("D", "Dominion Energy"),
        ("EXC", "Exelon Corp."), ("XEL", "Xcel Energy"), ("PCG", "PG&E Corp."),
        ("ED", "Con Edison"), ("WEC", "WEC Energy"), ("EIX", "Edison Intl"),
        ("AWK", "American Water"), ("DTE", "DTE Energy"), ("PPL", "PPL Corp."),
        ("ES", "Eversource"), ("FE", "FirstEnergy"), ("AEE", "Ameren Corp."),
        ("CMS", "CMS Energy"), ("CNP", "CenterPoint")
    ],
    "Real Estate": [
        ("PLD", "Prologis"), ("AMT", "American Tower"), ("EQIX", "Equinix"),
        ("CCI", "Crown Castle"), ("PSA", "Public Storage"), ("SPG", "Simon Property"),
        ("WELL", "Welltower"), ("DLR", "Digital Realty"), ("O", "Realty Income"),
        ("VICI", "VICI Properties"), ("AVB", "AvalonBay"), ("EQR", "Equity Residential"),
        ("SBAC", "SBA Comm."), ("WY", "Weyerhaeuser"), ("ARE", "Alexandria RE"),
        ("EXR", "Extra Space"), ("MAA", "Mid-America Apt"), ("VTR", "Ventas Inc."),
        ("IRM", "Iron Mountain"), ("CBRE", "CBRE Group")
    ],
    "Materials": [
        ("LIN", "Linde plc"), ("APD", "Air Products"), ("SHW", "Sherwin-Williams"),
        ("FCX", "Freeport-McMoRan"), ("ECL", "Ecolab Inc."), ("NUE", "Nucor Corp."),
        ("NEM", "Newmont Corp."), ("DOW", "Dow Inc."), ("CTVA", "Corteva"),
        ("DD", "DuPont"), ("PPG", "PPG Industries"), ("VMC", "Vulcan Materials"),
        ("MLM", "Martin Marietta"), ("ALB", "Albemarle"), ("IFF", "IFF"),
        ("LYB", "LyondellBasell"), ("CF", "CF Industries"), ("MOS", "Mosaic Co."),
        ("CE", "Celanese"), ("BALL", "Ball Corp.")
    ]
}

# Also fetch index data
INDICES = ["SPY", "QQQ"]


def main():
    print("Fetching S&P 500 stock data...")
    print("=" * 50)
    
    # Collect all tickers
    all_tickers = []
    ticker_info = {}  # ticker -> (name, sector)
    
    for sector_name, stocks in SP500_STOCKS.items():
        for ticker, name in stocks:
            # Convert BRK-B to BRK.B for yfinance
            yf_ticker = ticker.replace('-', '.')
            all_tickers.append(yf_ticker)
            ticker_info[yf_ticker] = (ticker, name, sector_name)
    
    # Add indices
    all_tickers.extend(INDICES)
    
    print(f"Fetching {len(all_tickers)} tickers...")
    
    # Fetch all data at once using yfinance batch download
    tickers_str = ' '.join(all_tickers)
    data = yf.download(tickers_str, period='5d', group_by='ticker', progress=True, threads=True)
    
    # Process price results
    results = {}
    for yf_ticker in all_tickers:
        try:
            if len(all_tickers) == 1:
                ticker_data = data
            else:
                ticker_data = data[yf_ticker] if yf_ticker in data.columns.get_level_values(0) else None
            
            if ticker_data is not None and not ticker_data.empty:
                # Get the last two days of data
                closes = ticker_data['Close'].dropna()
                if len(closes) >= 2:
                    current_price = closes.iloc[-1]
                    prev_close = closes.iloc[-2]
                    change = current_price - prev_close
                    change_pct = (change / prev_close) * 100
                    
                    results[yf_ticker] = {
                        'price': float(current_price),
                        'change': float(change_pct),
                        'marketCap': 0
                    }
        except Exception as e:
            print(f"  Error processing {yf_ticker}: {e}")
    
    print(f"\nProcessed {len(results)} price records")
    
    # Fetch market caps
    print("Fetching market caps...")
    stock_tickers = [t for t in all_tickers if t not in INDICES]
    for i, yf_ticker in enumerate(stock_tickers):
        if yf_ticker in results:
            try:
                ticker = yf.Ticker(yf_ticker)
                info = ticker.fast_info
                market_cap = info.get('marketCap', 0)
                if market_cap:
                    results[yf_ticker]['marketCap'] = market_cap / 1e9  # Convert to billions
            except Exception:
                pass
        
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(stock_tickers)} market caps fetched...")
    
    print(f"Market caps fetched successfully")
    
    # Build output data structure
    output = {
        "name": "S&P 500",
        "lastUpdated": datetime.now().isoformat(),
        "indices": {},
        "children": []
    }
    
    # Add index data (from batch download - uses historical closes for accuracy)
    for idx in INDICES:
        if idx in results:
            output["indices"][idx] = {
                "name": "S&P 500" if idx == "SPY" else "NASDAQ 100",
                "changePercent": round(results[idx]['change'], 2)
            }
            print(f"  {idx}: {results[idx]['change']:+.2f}%")
    
    # Add sector data
    success = 0
    failed = 0
    
    for sector_name, stocks in SP500_STOCKS.items():
        sector = {"name": sector_name, "children": []}
        
        for orig_ticker, name in stocks:
            yf_ticker = orig_ticker.replace('-', '.')
            
            if yf_ticker in results:
                r = results[yf_ticker]
                sector["children"].append({
                    "ticker": orig_ticker,
                    "name": name,
                    "marketCap": round(r.get('marketCap', 10), 2),
                    "price": round(r['price'], 2),
                    "change": round(r['change'], 2)
                })
                success += 1
            else:
                sector["children"].append({
                    "ticker": orig_ticker,
                    "name": name,
                    "marketCap": 10,
                    "price": None,
                    "change": None
                })
                failed += 1
        
        output["children"].append(sector)
    
    # Save to JSON
    output_file = "sp500_data.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    print("\n" + "=" * 50)
    print(f"Done! {success} succeeded, {failed} failed")
    print(f"Data saved to {output_file}")
    print(f"\nOpen index.html in a browser to view the treemap.")


if __name__ == "__main__":
    main()
