from pathlib import Path
import subprocess
import sys
import shutil

root=Path(__file__).resolve().parent
subprocess.run([sys.executable,str(root/'build.py')],cwd=root,check=True)
docs=root/'docs'
docs.mkdir(exist_ok=True)
shutil.copy2(root/'硬件漫游-BuildCores学习版.html',docs/'index.html')
(docs/'.nojekyll').write_text('',encoding='utf-8')
for name in ['LICENSE.txt','NOTICE.md','manifest.json']:
    dest=docs/'licenses/buildcores'/name
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(root/'third-party/buildcores'/name,dest)
print('GitHub Pages output refreshed: docs/index.html')
