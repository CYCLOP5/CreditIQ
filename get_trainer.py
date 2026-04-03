import sys
with open('src/scoring/trainer.py', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines[-30:]):
    print(f"{len(lines)-30+i+1}: {line}", end='')
