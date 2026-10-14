"""
Woxsen University - Campus Shuttle Routing & Scheduling (DAA Project)
Local Web Server Launcher
"""

import http.server
import socketserver
import webbrowser
import threading
import time
import os
import sys

PORT = 5000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        sys.stdout.write(f"[DAA Server] {self.address_string()} - {format % args}\n")

def open_browser():
    time.sleep(1.0)
    url = f"http://localhost:{PORT}"
    print(f"\n[DAA Project] Opening browser at: {url}\n")
    webbrowser.open(url)

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    # Enable address reuse so restarts don't hit address already in use errors
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHTTPHandler) as httpd:
        print("=" * 65)
        print("  WOXSEN UNIVERSITY - CAMPUS SHUTTLE ROUTING & LIVE SIMULATION")
        print("  Design & Analysis of Algorithms (DAA) Interactive Project")
        print("=" * 65)
        print(f"  Local Server running at: http://localhost:{PORT}")
        print("  Serving files from:", DIRECTORY)
        print("  Press Ctrl+C to terminate.")
        print("=" * 65)
        threading.Thread(target=open_browser, daemon=True).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[DAA Server] Shutting down.")
            httpd.server_close()
