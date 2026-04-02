"""Fix MathTex strings in video.py to use raw strings for LaTeX commands."""
import re

with open('app/api/v1/endpoints/video.py', 'r') as f:
    content = f.read()

# Fix: MathTex("...\command...") -> MathTex(r"...\command...")
def fix_mathtex(match):
    prefix = match.group(1)
    quote = match.group(2)
    body = match.group(3)
    suffix = match.group(4)
    if '\\' in body:
        return f'{prefix}r{quote}{body}{suffix}'
    return match.group(0)

pattern = r'(MathTex\()(?!r)(["\'])((?:[^"\'\\]|\\.)*)(\2)'
fixed = re.sub(pattern, fix_mathtex, content)

if content != fixed:
    with open('app/api/v1/endpoints/video.py', 'w') as f:
        f.write(fixed)
    orig = len(re.findall(r'MathTex\("[^"]*\\[a-zA-Z]', content))
    after = len(re.findall(r'MathTex\("[^"]*\\[a-zA-Z]', fixed))
    print(f"Fixed {orig - after} MathTex strings (had {orig}, now {after} without raw)")
else:
    print("No changes needed")
