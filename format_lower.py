import sys

def convert_file(filename):
    with open(filename, 'r') as f:
        content = f.read()
    with open(filename, 'w') as f:
        f.write(content.lower())

convert_file("DATA_GENERATION.md")
convert_file("SCHEMA.md")
