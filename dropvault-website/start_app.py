import subprocess
import time
import sys
import os

def run_command(command, cwd=None):
    """Runs a command in a subprocess."""
    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return process
    except Exception as e:
        print(f"Error starting {command}: {e}")
        return None

def main():
    print("🚀 Starting DropVault System...")
    
    # Define paths
    project_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Start Local File Server (Backend)
    print("📂 Starting Local AI Backend (Port 8000)...")
    # Using 'backend.main:app' assuming start_app.py is in knowledge-tree root
    # update: use the venv uvicorn explicitly
    server_command = "./backend/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000"
    server_process = run_command(server_command, cwd=project_dir)
    
    # Wait a moment for server to initialize
    time.sleep(2)
    
    # 2. Start React App (Frontend)
    print("⚛️  Starting Frontend App...")
    frontend_process = run_command("npm run dev", cwd=project_dir)

    print("\n✅ System is running!")
    print("   - Frontend: http://localhost:5173")
    print("   - Backend:  http://localhost:8000")
    print("\n(Press Ctrl+C to stop both)")

    try:
        # Stream output from both
        while True:
            # Check if processes are still alive
            if server_process.poll() is not None:
                print("❌ Server crashed!")
                print(f"Error logs:\n{server_process.stderr.read()}")
                break
            if frontend_process.poll() is not None:
                print("❌ Frontend crashed!")
                print(f"Error logs:\n{frontend_process.stderr.read()}")
                break
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        server_process.terminate()
        frontend_process.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
