import re

with open("README.md", "r") as f:
    text = f.read()

replacements = {
    r'\[MATH\.md\]\(MATH\.md\)': r'[math.md](math.md)',
    r'\[TOOLS\.md\]\(TOOLS\.md\)': r'[tools.md](tools.md)',
    r'\[SCHEMA\.md\]\(SCHEMA\.md\)': r'[schema.md](schema.md)',
    r'\[markdownstochat/bootstrap\.md\]\(markdownstochat/bootstrap\.md\)': r'[bootstrap.md](bootstrap.md)',
    r'\[markdownstochat/mmmmapimusic\.md\]\(markdownstochat/mmmmapimusic\.md\)': r'[api.md](api.md)',
    r'\[markdownstochat/howdoesthismsmeevenworkman\.md\]\(markdownstochat/howdoesthismsmeevenworkman\.md\)': r'[theoryMSME.md](theoryMSME.md)',
    r'\*\*TOOLS\.md\*\*': r'**tools.md**',
    r'\*\*MATH\.md\*\*': r'**math.md**'
}

for old, new in replacements.items():
    text = re.sub(old, new, text)

with open("README.md", "w") as f:
    f.write(text)

print("Links updated in README.md")
