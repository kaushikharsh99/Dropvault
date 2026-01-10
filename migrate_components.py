import os
import subprocess
import glob

SOURCE_DIR = "dropvault-effortless-knowledge-93-main/src"
TARGET_DIR = "knowledge-tree/src"
ESBUILD = "knowledge-tree/node_modules/.bin/esbuild"

def convert(src_pattern, dest_dir):
    files = glob.glob(src_pattern)
    for src_file in files:
        filename = os.path.basename(src_file)
        name_no_ext = os.path.splitext(filename)[0]
        dest_file = os.path.join(dest_dir, name_no_ext + ".jsx")
        
        # Simple command: esbuild input.tsx --outfile=output.jsx --jsx=preserve
        cmd = [
            ESBUILD,
            src_file,
            "--jsx=preserve",
            f"--outfile={dest_file}"
        ]
        
        print(f"Converting {src_file} -> {dest_file}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error converting {src_file}: {result.stderr}")

# Convert Landing Components
convert(f"{SOURCE_DIR}/components/*.tsx", f"{TARGET_DIR}/components/landing")

# Convert UI Components
convert(f"{SOURCE_DIR}/components/ui/*.tsx", f"{TARGET_DIR}/components/ui")

# Convert UI Components (.ts files like use-toast.ts)
files = glob.glob(f"{SOURCE_DIR}/components/ui/*.ts")
for src_file in files:
    filename = os.path.basename(src_file)
    name_no_ext = os.path.splitext(filename)[0]
    dest_file = os.path.join(f"{TARGET_DIR}/components/ui", name_no_ext + ".js")
    
    cmd = [
        ESBUILD,
        src_file,
        f"--outfile={dest_file}"
    ]
    print(f"Converting {src_file} -> {dest_file}")
    subprocess.run(cmd)

# Convert Hooks
# .tsx hooks -> .jsx
convert(f"{SOURCE_DIR}/hooks/*.tsx", f"{TARGET_DIR}/hooks")
# .ts hooks -> .js
files = glob.glob(f"{SOURCE_DIR}/hooks/*.ts")
for src_file in files:
    filename = os.path.basename(src_file)
    name_no_ext = os.path.splitext(filename)[0]
    dest_file = os.path.join(f"{TARGET_DIR}/hooks", name_no_ext + ".js")
    
    cmd = [
        ESBUILD,
        src_file,
        f"--outfile={dest_file}"
    ]
    print(f"Converting {src_file} -> {dest_file}")
    subprocess.run(cmd)

print("Done.")