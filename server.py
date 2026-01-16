#!/usr/bin/env python3
"""
Stock data server using yfinance
Serves stock quotes and chart data to the frontend
"""

import json
import http.server
import socketserver
from urllib.parse import urlparse, parse_qs
import yfinance as yf

PORT = 8000

class StockHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)
        
        # API endpoints
        if path == '/api/quote':
            self.handle_quote(params)
        elif path == '/api/quotes':
            self.handle_quotes(params)
        elif path == '/api/chart':
            self.handle_chart(params)
        else:
            # Serve static files
            super().do_GET()
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def handle_quote(self, params):
        """Get quote for a single stock"""
        symbol = params.get('symbol', [None])[0]
        if not symbol:
            self.send_json({'error': 'Missing symbol'}, 400)
            return
        
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            
            current_price = info.get('lastPrice') or info.get('regularMarketPrice')
            previous_close = info.get('previousClose') or info.get('regularMarketPreviousClose')
            
            if current_price and previous_close:
                change = current_price - previous_close
                change_percent = (change / previous_close) * 100
                
                self.send_json({
                    'symbol': symbol,
                    'currentPrice': current_price,
                    'previousClose': previous_close,
                    'change': change,
                    'changePercent': change_percent,
                    'open': info.get('open') or info.get('regularMarketOpen'),
                    'high': info.get('dayHigh') or info.get('regularMarketDayHigh'),
                    'low': info.get('dayLow') or info.get('regularMarketDayLow'),
                    'volume': info.get('volume') or info.get('regularMarketVolume')
                })
            else:
                self.send_json({'error': f'No data for {symbol}'}, 404)
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
            self.send_json({'error': str(e)}, 500)
    
    def handle_quotes(self, params):
        """Get quotes for multiple stocks"""
        symbols_param = params.get('symbols', [None])[0]
        if not symbols_param:
            self.send_json({'error': 'Missing symbols'}, 400)
            return
        
        symbols = symbols_param.split(',')
        results = {}
        
        try:
            # Fetch all tickers at once for efficiency
            tickers = yf.Tickers(' '.join(symbols))
            
            for symbol in symbols:
                try:
                    ticker = tickers.tickers.get(symbol.upper())
                    if not ticker:
                        continue
                    
                    info = ticker.fast_info
                    current_price = info.get('lastPrice') or info.get('regularMarketPrice')
                    previous_close = info.get('previousClose') or info.get('regularMarketPreviousClose')
                    
                    if current_price and previous_close:
                        change = current_price - previous_close
                        change_percent = (change / previous_close) * 100
                        
                        results[symbol] = {
                            'symbol': symbol,
                            'currentPrice': current_price,
                            'previousClose': previous_close,
                            'change': change,
                            'changePercent': change_percent,
                            'open': info.get('open') or info.get('regularMarketOpen'),
                            'high': info.get('dayHigh') or info.get('regularMarketDayHigh'),
                            'low': info.get('dayLow') or info.get('regularMarketDayLow'),
                            'volume': info.get('volume') or info.get('regularMarketVolume')
                        }
                except Exception as e:
                    print(f"Error fetching {symbol}: {e}")
            
            self.send_json(results)
        except Exception as e:
            print(f"Error fetching quotes: {e}")
            self.send_json({'error': str(e)}, 500)
    
    def handle_chart(self, params):
        """Get historical chart data"""
        symbol = params.get('symbol', [None])[0]
        period = params.get('period', ['1mo'])[0]
        interval = params.get('interval', ['1d'])[0]
        
        if not symbol:
            self.send_json({'error': 'Missing symbol'}, 400)
            return
        
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period, interval=interval)
            
            if hist.empty:
                self.send_json({'error': f'No chart data for {symbol}'}, 404)
                return
            
            chart_data = []
            for idx, row in hist.iterrows():
                chart_data.append({
                    'date': str(idx),
                    'open': row['Open'],
                    'high': row['High'],
                    'low': row['Low'],
                    'close': row['Close'],
                    'price': row['Close'],
                    'volume': int(row['Volume'])
                })
            
            self.send_json(chart_data)
        except Exception as e:
            print(f"Error fetching chart for {symbol}: {e}")
            self.send_json({'error': str(e)}, 500)
    
    def log_message(self, format, *args):
        # Only log API requests, not static files
        if '/api/' in args[0]:
            super().log_message(format, *args)


if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), StockHandler) as httpd:
        print(f"Stock server running at http://localhost:{PORT}")
        print("API endpoints:")
        print("  /api/quote?symbol=AAPL")
        print("  /api/quotes?symbols=AAPL,MSFT,GOOGL")
        print("  /api/chart?symbol=AAPL&period=1mo&interval=1d")
        print("\nPress Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
