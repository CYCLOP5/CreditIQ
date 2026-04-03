import os
import glob
import random
import re

def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    features_dir = os.path.join(repo_root, "data", "features")
    
    if not os.path.exists(features_dir):
        print(f"Features dir not found: {features_dir}")
        return
    
    dirs = glob.glob(os.path.join(features_dir, "gstin=*"))
    if not dirs:
        print("No real GSTINs found.")
        return
        
    real_gstins = [os.path.basename(d).split("=")[1] for d in dirs]
    
    if len(real_gstins) < 3:
        print("Not enough real GSTINs found.")
        return

    # Don't use a hardcoded random seed so it picks new ones each execution
    random.shuffle(real_gstins)
    new_gst_1 = real_gstins[0]
    new_gst_2 = real_gstins[1]
    new_gst_3 = real_gstins[2]
    
    # Dynamically find whatever GSTINs the frontend is currently using
    mock_data_path = os.path.join(repo_root, "frontend", "dib", "mockData.ts")
    try:
        with open(mock_data_path, "r", encoding="utf-8") as f:
            mock_content = f.read()
    except Exception as e:
        print(f"Could not read mockData.ts: {e}")
        return

    # Extract the currently active GSTINs linked to the 3 mock tasks
    old_gst_1_match = re.search(r'"([A-Z0-9]{15})":\s*"task_abc001"', mock_content)
    old_gst_2_match = re.search(r'"([A-Z0-9]{15})":\s*"task_abc002"', mock_content)
    old_gst_3_match = re.search(r'"([A-Z0-9]{15})":\s*"task_abc003"', mock_content)

    if not (old_gst_1_match and old_gst_2_match and old_gst_3_match):
        print("Could not locate the current GSTINs from mockData.ts. They might be formatted differently.")
        return

    old_gst_1 = old_gst_1_match.group(1)
    old_gst_2 = old_gst_2_match.group(1)
    old_gst_3 = old_gst_3_match.group(1)
    
    frontend_dir = os.path.join(repo_root, "frontend")
    extensions = (".ts", ".tsx")
    files_to_process = []
    
    for root, dirs, files in os.walk(frontend_dir):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".next", ".git")]
        for file in files:
            if file.endswith(extensions):
                files_to_process.append(os.path.join(root, file))
                
    modified_files = []
    for filepath in files_to_process:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            continue
            
        modified = False
        
        # Iteratively replace whichever the OLD ones currently are
        if old_gst_1 in content:
            content = content.replace(old_gst_1, new_gst_1)
            modified = True
        if old_gst_2 in content:
            content = content.replace(old_gst_2, new_gst_2)
            modified = True
        if old_gst_3 in content:
            content = content.replace(old_gst_3, new_gst_3)
            modified = True
            
        if modified:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            modified_files.append(filepath)
            print(f"Updated {os.path.relpath(filepath, repo_root)}")

    print(f"Successfully injected real GSTINs:")
    print(f"  {old_gst_1} -> {new_gst_1}")
    print(f"  {old_gst_2} -> {new_gst_2}")
    print(f"  {old_gst_3} -> {new_gst_3}")
    print(f"Modified {len(modified_files)} files.")

if __name__ == "__main__":
    main()
