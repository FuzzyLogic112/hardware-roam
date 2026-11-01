"""Validate bundled photos and source snapshots without external network access."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent
d=json.loads((root/'assets/brands/manifest.json').read_text(encoding='utf8'))
assert len(d['images'])==158
assert sum(bool(s['items']) for s in d['rankings'].values())==18
assert sum(len(s['items']) for s in d['rankings'].values())==360
photos=list(d['images'].values())
for cat,s in d['rankings'].items():
    for i,r in enumerate(s['items'],1):
        assert r['category']==cat and r['sourceRank']==i
        assert r['referencePrice'] is None or r['referencePrice']>0
        assert r['sourceScore'] is None or 0<=r['sourceScore']<=10
        assert r['productUrl'].startswith('https://detail.zol.com.cn/')
        photos.append(r['media'])
for p in photos:
    assert p['source'].startswith('https://')
    with Image.open(root/p['file']) as image:
        image.verify()
    assert (root/p['file']).stat().st_size==p['bytes']
assert json.loads((root/'brand-map-data.js').read_text(encoding='utf8').split('const BRAND_MAP_DATA=',1)[1].rstrip().rstrip(';'))==d
print(f'PASS: 158 brands, 18 categories, 360 rankings, {len(photos)} verified image records')
