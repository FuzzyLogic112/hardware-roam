"""Check imported data against original records and essential missing-value boundaries."""
import json
import math
import pathlib
import zipfile
from import_buildcores import normalize, COMMIT

root=pathlib.Path(__file__).resolve().parent
ps=json.loads((root/'third-party/buildcores/teaching-subset.json').read_text(encoding='utf-8'))
z=zipfile.ZipFile(root/'research/buildcores-snapshot.zip')
prefix=z.namelist()[0]
checks=[]
def check(name,value):
    assert value,name
    checks.append({'name':name,'pass':True})
check('2000 unique selected records',len(ps)==2000 and len({p['id'] for p in ps})==2000)
check('Source snapshot pinned',all(COMMIT in p['source'] for p in ps))
for p in ps:
    raw=json.loads(z.read(prefix+p['sourcePath']))
    assert raw['opendb_id']==p['sourceId'] and raw['metadata']['name'].strip()==p['name']
    assert raw['metadata']['manufacturer']==p['brand']
    if 'dimensions' in p['fit']:
        assert p['fit']['dimensions']==raw['dimensions_mm']
check('All 2000 identities and dimensions traced to source',True)
sample={'opendb_id':'test','metadata':{'name':'test','manufacturer':'test'},'length':0,'memory':0,'tdp':None}
p=normalize(sample,'GPU','open-db/GPU/test.json')
check('Zero and absent dimensions never become usable measurements','length' not in p['fit'] and 'tdp' not in p['fit'] and not p['metrics'])
sample['length']=-12;p=normalize(sample,'GPU','open-db/GPU/test.json')
check('Negative dimension discarded','length' not in p['fit'])
cpu={'opendb_id':'test','metadata':{'name':'test','manufacturer':'test'},'specifications':{'integratedGraphics':{'model':'0'}}}
check('Placeholder iGPU model stays unknown','igpu' not in normalize(cpu,'CPU','open-db/CPU/test.json')['fit'])
aio={'opendb_id':'test','metadata':{'name':'test','manufacturer':'test'},'water_cooled':True,'height':55}
check('AIO coldplate height never becomes tower clearance','height' not in normalize(aio,'CPUCooler','open-db/CPUCooler/test.json')['fit'])
sample['opendb_id']='mismatch'
check('Mismatched source identity rejected',normalize(sample,'GPU','open-db/GPU/test.json') is None)
print(json.dumps(checks,ensure_ascii=False))
