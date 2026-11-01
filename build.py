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
html=html.replace('<link rel="stylesheet" href="brand-map.css">','<style>'+(root/'brand-map.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="stylesheet" href="catalog-photos.css">','<style>'+(root/'catalog-photos.css').read_text(encoding='utf-8')+'</style>')
data=(root/'data.js').read_text(encoding='utf-8')
app=(root/'app.js').read_text(encoding='utf-8')
scripts=['catalog-data.js','opendb-data.js','hardware3d.js','learning-upgrade.js','buildcores-upgrade.js','buildcores-ui.js']
script='const ASSETS='+json.dumps(media,ensure_ascii=False)+';\n'+data+'\n'+'\n'.join((root/name).read_text(encoding='utf-8') for name in scripts)
brand_data=json.loads((root/'assets/brands/manifest.json').read_text(encoding='utf-8'))
(root/'brand-map-data.js').write_text('/* Public study images and dated ZOL attention snapshots; see assets/brands/README.md. */\nconst BRAND_MAP_DATA='+json.dumps(brand_data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
for item in list(brand_data['images'].values())+[r['media'] for s in brand_data['rankings'].values() for r in s['items']]:
 item['src']='data:image/webp;base64,'+base64.b64encode((root/item['file']).read_bytes()).decode()
catalog_photos=json.loads((root/'assets/catalog/manifest.json').read_text(encoding='utf-8'))
(root/'catalog-photos-data.js').write_text('/* Attributed product photographs, independent of OpenDB specifications. */\nconst CATALOG_PHOTOS='+json.dumps(catalog_photos,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
for asset in catalog_photos['assets'].values():
 asset['src']='data:image/webp;base64,'+base64.b64encode((root/asset['file']).read_bytes()).decode()
script+='\nconst BRAND_MAP_DATA='+json.dumps(brand_data,ensure_ascii=False)+';\n'+(root/'brand-map.js').read_text(encoding='utf-8')+'\nconst CATALOG_PHOTOS='+json.dumps(catalog_photos,ensure_ascii=False)+';\n'+(root/'catalog-photos.js').read_text(encoding='utf-8')+'\n'+app
assert '</script' not in script.lower()
html=re.sub(r'<script src="data.js"></script>.*?<script src="app.js"></script>',lambda _: '<script>'+script+'</script>',html,flags=re.S)
target=root/'硬件漫游.html'
target.write_text(html,encoding='utf-8')
print(f'{target}\n{target.stat().st_size:,} bytes')

(root/'硬件漫游-3D版.html').write_text(html,encoding='utf-8')
(root/'硬件漫游-进阶版.html').write_text(html,encoding='utf-8')

(root/'硬件漫游-BuildCores学习版.html').write_text(html,encoding='utf-8')
