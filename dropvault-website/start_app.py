import subprocess
import time
import sys
import os
import threading

def stream_output(process, prefix):
    """Streams stdout and stderr from a subprocess to the console."""
    def log_stream(stream, stream_name):
        for line in iter(stream.readline, ''):
            print(f"[{prefix}] {line.strip()}")
        stream.close()

    # Create threads for stdout and stderr
    t1 = threading.Thread(target=log_stream, args=(process.stdout, "OUT"))
    t2 = threading.Thread(target=log_stream, args=(process.stderr, "ERR"))
    t1.daemon = True
    t2.daemon = True
    t1.start()
    t2.start()

def main():
    print("🚀 Starting DropVault System...")
    
    project_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Start Backend
    print("📂 Starting Local AI Backend (Port 8000)...")
    server_cmd = [
        "./backend/venv/bin/uvicorn", 
        "backend.main:app", 
        "--host", "0.0.0.0", 
        "--port", "8000"
    ]
    # Use array for Popen with shell=False for better signal handling
    server_process = subprocess.Popen(
        server_cmd,
        cwd=project_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1 # Line buffered
    )
    stream_output(server_process, "BACKEND")
    
    time.sleep(2)
    
    # 2. Start Frontend
    print("⚛️  Starting Frontend App...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=project_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )
    stream_output(frontend_process, "FRONTEND")

    print("\n✅ System is running!")
    print("   - Frontend: http://localhost:5173")
    print("   - Backend:  http://localhost:8000")
    print("\n(Press Ctrl+C to stop both)")

    try:
        while True:
            if server_process.poll() is not None:
                print("❌ Server stopped unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print("❌ Frontend stopped unexpectedly.")
                break
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        server_process.terminate()
        frontend_process.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()