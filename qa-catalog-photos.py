"""Check every catalog image binding, source and published file."""
from pathlib import Path
from collections import Counter
from PIL import Image
import json
ROOT=Path(__file__).resolve().parent
d=json.loads((ROOT/'assets/catalog/manifest.json').read_text(encoding='utf8'))
assert len(d['items'])==2020
assert dict(Counter(i['kind'] for i in d['items'].values()))==d['counts']
assert all(i['asset'] in d['assets'] and i['imageName'] and i['source'].startswith(('http://','https://')) for i in d['items'].values())
for pid,i in d['items'].items():
    assert i['kind'] in ['model','series','reference','example']
    if i['kind']=='reference':
        r=d['items'][i['referenceProductId']]
        assert r['kind']!='reference' and r['asset']==i['asset'] and r['imageName']==i['imageName']
for asset in d['assets'].values():
    path=ROOT/asset['file']
    assert path.is_file() and path.stat().st_size==asset['bytes']
    with Image.open(path) as im:
        assert im.width==asset['width'] and im.height==asset['height']
        im.verify()
    assert (ROOT/'docs'/asset['file']).read_bytes()==path.read_bytes()
assert json.loads((ROOT/'catalog-photos-data.js').read_text(encoding='utf8').split('const CATALOG_PHOTOS=',1)[1].rstrip().rstrip(';'))==d
online=(ROOT/'docs/index.html').read_text(encoding='utf8')
assert all(asset['src'] in online for asset in d['assets'].values())
print(f"PASS: all 2020 image bindings, {len(d['assets'])} decoded image files and published copies; kinds={d['counts']}")
