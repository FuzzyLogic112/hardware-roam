from pathlib import Path
import subprocess
import sys
import shutil
import json
import base64
import re

root=Path(__file__).resolve().parent
subprocess.run([sys.executable,str(root/'build.py')],cwd=root,check=True)
docs=root/'docs'
docs.mkdir(exist_ok=True)
html=(root/'硬件漫游-BuildCores学习版.html').read_text(encoding='utf-8')
photos=json.loads((root/'assets/catalog/manifest.json').read_text(encoding='utf-8'))
replacements={}
for asset in photos['assets'].values():
    path=root/asset['file']
    embedded='data:image/webp;base64,'+base64.b64encode(path.read_bytes()).decode()
    replacements[embedded]=asset['src']
    dest=docs/asset['file'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,dest)
html=re.sub(r'data:image/webp;base64,[A-Za-z0-9+/=]+',lambda m:replacements.get(m.group(),m.group()),html)
(docs/'index.html').write_text(html,encoding='utf-8')
for name in ['manifest.json','README.md']:
    shutil.copy2(root/'assets/catalog'/name,docs/'assets/catalog'/name)
(docs/'.nojekyll').write_text('',encoding='utf-8')
for name in ['LICENSE.txt','NOTICE.md','manifest.json']:
    dest=docs/'licenses/buildcores'/name
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(root/'third-party/buildcores'/name,dest)
print('GitHub Pages output refreshed: docs/index.html')
