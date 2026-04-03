import os
frontend_dir = os.path.join(os.path.dirname('scripts/inject_real_gstins.py'), "..", "frontend")
print(frontend_dir)
from glob import glob
print(list(os.walk(frontend_dir)))
