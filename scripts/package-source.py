"""Build a portable source ZIP without dependencies, build files, or secrets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
output = root / 'public' / 'downloads' / 'shortly-source.zip'
output.parent.mkdir(parents=True, exist_ok=True)
excluded_dirs = {'node_modules', '.next', '.git', '.cache', '__pycache__', 'test-results', 'playwright-report'}
allowed_root = {'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'drizzle.config.ts', '.env.example', '.gitignore', 'README.md', 'docker-compose.yml'}
files = []
for name in allowed_root:
    path = root / name
    if path.is_file():
        files.append(path)
for folder in ['src', 'scripts', 'public', 'drizzle']:
    directory = root / folder
    if not directory.exists():
        continue
    for path in directory.rglob('*'):
        if not path.is_file() or any(part in excluded_dirs for part in path.relative_to(root).parts):
            continue
        if path.suffix in {'.zip', '.pyc', '.log', '.tsbuildinfo'} or path.name.startswith('.env'):
            continue
        files.append(path)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(set(files)):
        archive.write(path, 'shortly/' + str(path.relative_to(root)))
print(f'Created {output.relative_to(root)}: {len(files)} source files, {output.stat().st_size:,} bytes')
