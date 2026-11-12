"""Create a source-only ZIP for GitHub upload and Vercel import."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    '.gitignore', '.vercelignore', '.env.example', '.python-version',
    'README.md', 'DEPLOYMENT.md', 'THIRD_PARTY_NOTICES.md',
    'server.py', 'database.py', 'requirements.txt', 'vercel.json',
)
DIRECTORIES = ('api', 'migrations', 'scripts', 'static', 'tests', '.github')
EXCLUDED = {'__pycache__', 'models', 'vendor', '.DS_Store'}


def package():
    paths = [ROOT / name for name in FILES]
    for directory in DIRECTORIES:
        paths.extend(path for path in (ROOT / directory).rglob('*')
                     if path.is_file() and not path.is_symlink()
                     and not any(part in EXCLUDED or part.startswith('.')
                                 for part in path.relative_to(ROOT / directory).parts)
                     and path.suffix not in {'.pyc', '.download'})
    archive = ROOT / 'kabad-setu-vercel.zip'
    with ZipFile(archive, 'w', ZIP_DEFLATED) as bundle:
        for path in sorted(paths):
            if path.is_symlink():
                raise ValueError(f'Refusing symlink: {path.name}')
            if path.stat().st_size >= 100 * 1024 * 1024:
                raise ValueError(f'File exceeds GitHub upload size: {path.name}')
            bundle.write(path, path.relative_to(ROOT))
    print(f'Created {archive.name}: {len(paths)} files, {archive.stat().st_size / 1024 / 1024:.1f} MiB')


if __name__ == '__main__':
    package()
