#!/usr/bin/env python3
"""
S&P 500 Treemap Server
Serves the HTML and provides a /refresh endpoint to fetch new stock data.

Usage: python3 server.py
Then open http://localhost:8000
"""

import json
import http.server
import socketserver
from urllib.parse import urlparse
import yfinance as yf
from datetime import datetime
import threading

PORT = 8000

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
        ("OMC", "Omnicom Group"), ("LYV", "Live Nation"), ("FOX", "Fox Corp."),
        ("NWSA", "News Corp."), ("MTCH", "Match Group")
    ],
    "Consumer Staples": [
        ("WMT", "Walmart Inc."), ("PG", "Procter & Gamble"), ("COST", "Costco"),
        ("KO", "Coca-Cola"), ("PEP", "PepsiCo"), ("PM", "Philip Morris"),
        ("MO", "Altria Group"), ("MDLZ", "Mondelez"), ("CL", "Colgate-Palmolive"),
        ("EL", "Estee Lauder"), ("KMB", "Kimberly-Clark"), ("GIS", "General Mills"),
        ("SYY", "Sysco Corp."), ("HSY", "Hershey Co."), ("KHC", "Kraft Heinz"),
        ("STZ", "Constellation Brands"), ("KR", "Kroger Co."), ("CAG", "Conagra Brands")
    ],
    "Energy": [
        ("XOM", "Exxon Mobil"), ("CVX", "Chevron Corp."), ("COP", "ConocoPhillips"),
        ("EOG", "EOG Resources"), ("SLB", "Schlumberger"), ("MPC", "Marathon Petroleum"),
        ("PSX", "Phillips 66"), ("VLO", "Valero Energy"), ("OXY", "Occidental Petro"),
        ("WMB", "Williams Cos."), ("KMI", "Kinder Morgan"), ("HAL", "Halliburton"),
        ("DVN", "Devon Energy"), ("BKR", "Baker Hughes"), ("FANG", "Diamondback Energy"),
        ("TRGP", "Targa Resources"), ("OKE", "ONEOK Inc.")
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

INDICES = ["SPY", "QQQ"]

# Track refresh status
refresh_status = {
    "is_refreshing": False,
    "last_refresh": None,
    "progress": 0,
    "total": 0,
    "message": ""
}


def fetch_stock_data():
    """Fetch all stock data and save to JSON"""
    global refresh_status
    
    refresh_status["is_refreshing"] = True
    refresh_status["progress"] = 0
    refresh_status["message"] = "Starting data fetch..."
    
    try:
        # Collect all tickers
        all_tickers = []
        ticker_info = {}
        
        for sector_name, stocks in SP500_STOCKS.items():
            for ticker, name in stocks:
                yf_ticker = ticker.replace('-', '.')
                all_tickers.append(yf_ticker)
                ticker_info[yf_ticker] = (ticker, name, sector_name)
        
        all_tickers.extend(INDICES)
        refresh_status["total"] = len(all_tickers)
        refresh_status["message"] = f"Fetching {len(all_tickers)} tickers..."
        
        # Fetch all data
        tickers_str = ' '.join(all_tickers)
        data = yf.download(tickers_str, period='5d', group_by='ticker', progress=False, threads=True)
        
        refresh_status["progress"] = 50
        refresh_status["message"] = "Processing data..."
        
        # Process results
        results = {}
        for yf_ticker in all_tickers:
            try:
                if len(all_tickers) == 1:
                    ticker_data = data
                else:
                    ticker_data = data[yf_ticker] if yf_ticker in data.columns.get_level_values(0) else None
                
                if ticker_data is not None and not ticker_data.empty:
                    closes = ticker_data['Close'].dropna()
                    if len(closes) >= 2:
                        current_price = closes.iloc[-1]
                        prev_close = closes.iloc[-2]
                        change_pct = ((current_price - prev_close) / prev_close) * 100
                        
                        results[yf_ticker] = {
                            'price': float(current_price),
                            'change': float(change_pct),
                        }
            except Exception:
                pass
        
        refresh_status["progress"] = 80
        refresh_status["message"] = "Building output..."
        
        # Build output
        output = {
            "name": "S&P 500",
            "lastUpdated": datetime.now().isoformat(),
            "indices": {},
            "children": []
        }
        
        for idx in INDICES:
            if idx in results:
                output["indices"][idx] = {
                    "name": "S&P 500" if idx == "SPY" else "NASDAQ 100",
                    "changePercent": round(results[idx]['change'], 2)
                }
        
        for sector_name, stocks in SP500_STOCKS.items():
            sector = {"name": sector_name, "children": []}
            for orig_ticker, name in stocks:
                yf_ticker = orig_ticker.replace('-', '.')
                if yf_ticker in results:
                    r = results[yf_ticker]
                    sector["children"].append({
                        "ticker": orig_ticker,
                        "name": name,
                        "marketCap": 100,
                        "price": round(r['price'], 2),
                        "change": round(r['change'], 2)
                    })
                else:
                    sector["children"].append({
                        "ticker": orig_ticker,
                        "name": name,
                        "marketCap": 50,
                        "price": None,
                        "change": None
                    })
            output["children"].append(sector)
        
        # Save
        with open("sp500_data.json", 'w') as f:
            json.dump(output, f, indent=2)
        
        refresh_status["progress"] = 100
        refresh_status["message"] = f"Done! {len(results)} stocks updated."
        refresh_status["last_refresh"] = datetime.now().isoformat()
        
    except Exception as e:
        refresh_status["message"] = f"Error: {str(e)}"
    finally:
        refresh_status["is_refreshing"] = False


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/refresh':
            self.handle_refresh()
        elif parsed.path == '/api/status':
            self.handle_status()
        else:
            super().do_GET()
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def handle_refresh(self):
        """Start a data refresh in background thread"""
        if refresh_status["is_refreshing"]:
            self.send_json({"status": "already_running", "message": "Refresh already in progress"})
            return
        
        # Start refresh in background
        thread = threading.Thread(target=fetch_stock_data)
        thread.daemon = True
        thread.start()
        
        self.send_json({"status": "started", "message": "Refresh started"})
    
    def handle_status(self):
        """Return current refresh status"""
        self.send_json(refresh_status)
    
    def log_message(self, format, *args):
        # Only log API calls
        if '/api/' in args[0]:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]}")


if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\n  S&P 500 Treemap Server")
        print(f"  ======================")
        print(f"  Open: http://localhost:{PORT}")
        print(f"  Press Ctrl+C to stop\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
