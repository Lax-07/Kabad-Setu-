"""Download pinned public browser AI assets; no account or API key required."""
import hashlib
import json
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REV='b75f4e52949639c3bb0b96546ea4149482f6e7ef'
MODEL='Xenova/owlvit-base-patch32'
FILES=['config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx']

def download(url,path,sha=None):
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists() and (not sha or hashlib.sha256(path.read_bytes()).hexdigest()==sha):
        print('Ready:',path.name,flush=True);return
    target=path.with_suffix(path.suffix+'.download')
    print('Downloading:',path.name,flush=True)
    subprocess.run(['curl','-fsSL','--retry','3','--connect-timeout','20','--max-time','600',url,'-o',str(target)],check=True)
    if sha and hashlib.sha256(target.read_bytes()).hexdigest()!=sha:
        raise RuntimeError('Model checksum mismatch')
    target.replace(path)

if __name__=='__main__':
    for filename in FILES:
        download(f'https://huggingface.co/{MODEL}/resolve/{REV}/{filename}',ROOT/'static'/'models'/MODEL/filename,
                 '06af49bd5db977936bcddad2b45d0031072673517579d15b8cb42bf015a94156' if filename.endswith('.onnx') else None)
    for filename in ['transformers.min.js']:
        download(f'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/{filename}',ROOT/'static'/'vendor'/filename)
    download('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/LICENSE',ROOT/'static'/'vendor'/'transformers-LICENSE.txt')
    download('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort-wasm-simd.wasm',ROOT/'static'/'vendor'/'ort-wasm-simd.wasm')
    download('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort-wasm.wasm',ROOT/'static'/'vendor'/'ort-wasm.wasm')
    (ROOT/'static'/'models'/'ready.json').write_text(json.dumps({'model':MODEL,'revision':REV,'runtime':'transformers.js 2.17.2; onnxruntime-web 1.14.0'}))
    print('Local AI assets are ready.',flush=True)
