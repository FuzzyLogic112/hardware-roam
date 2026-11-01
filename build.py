from pathlib import Path
import json, base64, re

root=Path(__file__).resolve().parent
manifest=json.loads((root/'assets/manifest.json').read_text(encoding='utf-8'))
media={}
for key,asset in manifest.items():
 path=root/asset['file']
 mime='image/jpeg' if path.suffix=='.jpg' else 'image/png'
 media[key]={'src':f'data:{mime};base64,'+base64.b64encode(path.read_bytes()).decode(),'title':asset['title'],'source':asset['source']}
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+ (root/'style.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="stylesheet" href="hardware3d.css">','<style>'+(root/'hardware3d.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="stylesheet" href="upgrade.css">','<style>'+(root/'upgrade.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="stylesheet" href="buildcores.css">','<style>'+(root/'buildcores.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="stylesheet" href="buildcores-ui.css">','<style>'+(root/'buildcores-ui.css').read_text(encoding='utf-8')+'</style>')
data=(root/'data.js').read_text(encoding='utf-8')
app=(root/'app.js').read_text(encoding='utf-8')
script='const ASSETS='+json.dumps(media,ensure_ascii=False)+';\n'+data+'\n'+(root/'catalog-data.js').read_text(encoding='utf-8')+'\n'+(root/'opendb-data.js').read_text(encoding='utf-8')+'\n'+(root/'hardware3d.js').read_text(encoding='utf-8')+'\n'+(root/'learning-upgrade.js').read_text(encoding='utf-8')+'\n'+(root/'buildcores-upgrade.js').read_text(encoding='utf-8')+'\n'+(root/'buildcores-ui.js').read_text(encoding='utf-8')+'\n'+app
assert '</script' not in script.lower()
html=html.replace('<script src="data.js"></script><script src="catalog-data.js"></script><script src="opendb-data.js"></script><script src="hardware3d.js"></script><script src="learning-upgrade.js"></script><script src="buildcores-upgrade.js"></script><script src="buildcores-ui.js"></script><script src="app.js"></script>','<script>'+script+'</script>')
target=root/'硬件漫游.html'
target.write_text(html,encoding='utf-8')
print(f'{target}\n{target.stat().st_size:,} bytes')

(root/'硬件漫游-3D版.html').write_text(html,encoding='utf-8')
(root/'硬件漫游-进阶版.html').write_text(html,encoding='utf-8')

(root/'硬件漫游-BuildCores学习版.html').write_text(html,encoding='utf-8')
