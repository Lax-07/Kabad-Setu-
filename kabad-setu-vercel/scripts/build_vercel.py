"""Build only public assets. Downloads pinned AI files instead of uploading them."""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build():
    if os.environ.get('VERCEL') == '1':
        if not (os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL')):
            raise RuntimeError('Add DATABASE_URL in Vercel Environment Variables, then redeploy.')
        password = os.environ.get('RECYCLER_PASSWORD', '')
        if not password or password == 'demo-recycler':
            raise RuntimeError('Set a private RECYCLER_PASSWORD in Vercel Environment Variables.')
    subprocess.run([sys.executable, str(ROOT / 'scripts' / 'setup_local_ai.py')], check=True)
    output = ROOT / 'public'
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(exist_ok=True)
    # A dedicated output directory prevents private source/data files being published.
    allowed = {'.html', '.css', '.js', '.svg', '.wav', '.json', '.onnx', '.wasm', '.txt'}
    for source in (ROOT / 'static').rglob('*'):
        if source.is_file() and source.suffix in allowed:
            target = output / source.relative_to(ROOT / 'static')
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    manifest = json.loads((output / 'models' / 'ready.json').read_text())
    (ROOT / 'ai-build.json').write_text(json.dumps(manifest))
    print('Vercel static build ready: public/. Private data is excluded.')


if __name__ == '__main__':
    build()
