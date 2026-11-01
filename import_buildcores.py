"""Reproducible noncommercial teaching subset; no prices, assets or retailer data."""
from pathlib import Path
from collections import Counter, defaultdict, deque
import argparse
import hashlib
import json
import math
import re
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent
COMMIT = 'c6e319a47cbca29574e951d744e209c3de14f7d7'
BASE = 'https://github.com/buildcores/buildcores-open-db'
LIMITS = {'CPU':120, 'GPU':180, 'Motherboard':160, 'RAM':140, 'SSD':180,
          'HDD':40, 'PCCase':160, 'CPUCooler':100, 'PSU':140, 'Monitor':160,
          'Keyboard':160, 'Mouse':160, 'Headphones':80, 'NetworkCard':40,
          'Webcam':40, 'Laptop':40, 'Desk':20, 'Chair':20, 'Microphone':30, 'Speaker':30}
MAPPING = {'CPU':'cpu', 'GPU':'gpu', 'Motherboard':'board', 'RAM':'ram', 'SSD':'ssd',
           'HDD':'hdd', 'PCCase':'case', 'CPUCooler':'cooling', 'PSU':'psu',
           'Monitor':'monitor', 'Keyboard':'keyboard', 'Mouse':'mouse', 'Headphones':'audio',
           'NetworkCard':'network', 'Webcam':'webcam', 'Laptop':'laptop', 'Desk':'ergonomic',
           'Chair':'ergonomic', 'Microphone':'audio', 'Speaker':'audio'}
KNOWN_BRANDS = {x.casefold() for x in ['AMD','Intel','NVIDIA','ASUS','MSI','Gigabyte','ASRock','Biostar','Colorful','Zotac','Sapphire','PowerColor','XFX','PNY','Palit','Gainward','Inno3D','EVGA','Corsair','G.Skill','Kingston','Crucial','TEAMGROUP','ADATA','Patriot','Samsung','Western Digital','WD','Seagate','Toshiba','Solidigm','SK hynix','KIOXIA','Lexar','NZXT','Lian Li','Fractal Design','Cooler Master','Thermaltake','Antec','be quiet!','HYTE','Phanteks','MONTECH','Silverstone','Seasonic','Super Flower','FSP','Noctua','DeepCool','ARCTIC','Thermalright','ID-COOLING','AOC','Acer','BenQ','Dell','LG','Samsung','ViewSonic','Philips','Alienware','Sony','Logitech','Razer','SteelSeries','Zowie','BenQ Zowie','MCHOSE','IQUNIX','Wooting','Keychron','Akko','Varmilo','Ducky','Cherry','Leopold','VGN','VXE','ATK','Pulsar','Lamzu','Endgame Gear','Finalmouse','Glorious','HyperX','Sennheiser','Beyerdynamic','Audio-Technica','Shure','Rode','Elgato','TP-Link','ASUS ROG','Netgear','Ubiquiti','Linksys','Lenovo','HP','Apple','Microsoft','Wacom','Secretlab','Herman Miller','Haworth','Sihoo']}

def get(d, path):
    for key in path.split('.'):
        if not isinstance(d, dict): return None
        d = d.get(key)
    return d

def positive(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v > 0

def clean(v):
    if isinstance(v, list): return ' / '.join(str(x) for x in v if x is not None and x != '') or None
    if v is None or v == '' or v == [] or isinstance(v, dict): return None
    if isinstance(v, bool): return '是' if v else '否'
    return str(v).strip()

def socket(v):
    return re.sub(r'\s+', '', v).upper() if isinstance(v, str) and v.strip() else None

def form(v):
    if not isinstance(v, str): return None
    s = re.sub(r'[\s_-]', '', v).lower()
    return {'microatx':'Micro-ATX', 'matx':'Micro-ATX', 'min itx':'Mini-ITX',
            'miniitx':'Mini-ITX', 'itx':'Mini-ITX', 'atx':'ATX', 'eatx':'E-ATX'}.get(s)

FIELDS = {
 'CPU':[('插槽','socket',''),('核心数','cores.total',''),('线程数','cores.threads',''),('标称 TDP','specifications.tdp','W'),('内存代际','specifications.memory.types',''),('架构','microarchitecture',''),('最高加速频率','clocks.performance.boost','GHz')],
 'GPU':[('GPU 芯片','chipset',''),('显存容量','memory','GB'),('显存类型','memory_type',''),('显卡长度','length','mm'),('槽位宽度','total_slot_width',' 槽'),('标称 TDP','tdp','W'),('接口','interface','')],
 'Motherboard':[('插槽','socket',''),('板型','form_factor',''),('内存代际','memory.ram_type',''),('芯片组','chipset',''),('内存插槽','memory.slots',' 个'),('内存容量上限','memory.max','GB'),('无线网络','wireless_networking','')],
 'RAM':[('内存代际','ram_type',''),('套装总容量','capacity','GB'),('套条数量','modules.quantity',' 条'),('标称速率','speed',' MT/s'),('CAS 延迟','cas_latency',''),('外形','form_factor',''),('配置档支持','profile_support','')],
 'SSD':[('容量','capacity','GB'),('存储类型','storage_type',''),('外形','form_factor',''),('接口','interface',''),('NVMe','nvme','')],
 'HDD':[('容量','capacity','GB'),('存储类型','storage_type',''),('外形','form_factor',''),('接口','interface','')],
 'PCCase':[('板型定位','form_factor',''),('支持主板板型','supported_motherboard_form_factors',''),('显卡最大长度','max_video_card_length','mm'),('风冷最大高度','max_cpu_cooler_height','mm'),('外形尺寸','dimensions','mm'),('侧板','side_panel','')],
 'CPUCooler':[('扣具插槽范围','cpu_sockets',''),('水冷','water_cooled',''),('标称高度','height','mm'),('冷排规格','radiator_size','mm'),('风扇最高转速','max_fan_rpm',' RPM')],
 'PSU':[('额定功率','wattage','W'),('电源规格','form_factor',''),('效率标识','efficiency_rating',''),('线材形式','modular',''),('电源长度','length','mm')],
 'Monitor':[('屏幕尺寸','screen_size',' 英寸'),('刷新率','refresh_rate','Hz'),('面板','panel_type',''),('接口','connectors',''),('HDR 标识','hdr',''),('同步技术','adaptive_sync','')],
 'Keyboard':[('轴体','switch',''),('轴体类型','switch_type',''),('配列','size',''),('布局','layout',''),('连接方式','connectivity',''),('背光','backlighting','')],
 'Mouse':[('连接方式','connectivity',''),('传感器','sensor',''),('最高 DPI','max_dpi',''),('重量','weight','g'),('适用握法','grip_types','')],
 'Headphones':[('连接方式','connection_types',''),('适用平台','platforms',''),('特点','features',''),('耳垫材质','ear_pad_material','')],
 'Microphone':[('连接方式','connectivity_type',''),('指向性','polar_pattern',''),('特点','features','')],
 'Speaker':[('声道','configuration',''),('功率','wattage','W')],
 'NetworkCard':[('接口','interface',''),('连接方式','connection_type','')],
 'Webcam':[('连接方式','connectivity_type',''),('分辨率','resolution',''),('帧率','frame_rate',' FPS')],
 'Laptop':[], 'Desk':[('桌面宽度','work_surface_dimensions_mm.width','mm'),('桌面深度','work_surface_dimensions_mm.depth','mm'),('升降方式','height_adjustment_type',''),('承重标称','max_supported_weight_kg','kg')], 'Chair':[]}

def normalize(d, category, path):
    m=d.get('metadata') or {}; name=m.get('name'); uid=d.get('opendb_id')
    if not isinstance(name,str) or not name.strip() or uid != Path(path).stem or not clean(m.get('manufacturer')): return None
    specs={}; fit={}; metrics={}
    for label, key, unit in FIELDS[category]:
        value=get(d,key)
        # Numeric zero in community specifications often means unavailable, not a measured zero.
        if isinstance(value,(int,float)) and not isinstance(value,bool) and not positive(value):continue
        value=clean(value)
        if value is not None:specs[label]=value+unit
    for key,value in [('socket',socket(d.get('socket'))),('form',form(d.get('form_factor')))]:
        if value:fit[key]=value
    if fit.get('socket'):specs['插槽']=fit['socket']
    def num(key,value):
        if positive(value):fit[key]=value
    memory=get(d,'memory.ram_type') if category=='Motherboard' else d.get('ram_type') if category=='RAM' else None
    if isinstance(memory,str) and re.fullmatch(r'DDR[2-5]',memory):fit['memory']=[memory]
    if category=='CPU':
        mt=get(d,'specifications.memory.types')
        if isinstance(mt,list):fit['memory']=[v for v in mt if isinstance(v,str) and re.fullmatch(r'DDR[2-5]',v)]
        igpu=get(d,'specifications.integratedGraphics.model')
        if isinstance(igpu,str) and igpu.strip() and igpu.lower() not in ['0','n/a','unknown']:fit['igpu']=igpu.lower() not in ['none','no']
        num('tdp',get(d,'specifications.tdp')); metrics['cores']=get(d,'cores.total')
    if category=='Motherboard':num('slots',get(d,'memory.slots'))
    if category=='RAM':
        num('modules',get(d,'modules.quantity'));fit['ramForm']=d.get('form_factor'); metrics.update(capacity=d.get('capacity'),speed=d.get('speed'))
    if category=='PCCase':
        num('maxGpuLength',d.get('max_video_card_length'));num('maxCoolerHeight',d.get('max_cpu_cooler_height'));num('maxPsuLength',d.get('max_psu_length'))
        forms=d.get('supported_motherboard_form_factors')
        if isinstance(forms,list):fit['boardForms']=[form(v) for v in forms if form(v)]
        psuforms=d.get('supported_power_supply_form_factors')
        if isinstance(psuforms,list) and psuforms:fit['psuForms']=psuforms
        dims=d.get('dimensions_mm')
        if isinstance(dims,dict) and all(positive(dims.get(k)) and dims[k]<=2000 for k in ['width','height','depth']):
            fit['dimensions']={k:dims[k] for k in ['width','height','depth']}
            metrics['volume']=round(dims['width']*dims['height']*dims['depth']/1e6,2)
            specs['外形体积（计算）']=str(metrics['volume'])+'L'
    if category=='GPU':num('length',d.get('length'));num('tdp',d.get('tdp')); metrics['capacity']=d.get('memory')
    if category=='CPUCooler':
        sockets=d.get('cpu_sockets')
        if isinstance(sockets,list):fit['socketSupport']=[socket(v) for v in sockets if socket(v)]
        if isinstance(d.get('water_cooled'),bool):fit['waterCooled']=d['water_cooled']
        if d.get('water_cooled') is False:num('height',d.get('height'))
    if category=='PSU':
        num('watts',d.get('wattage'));num('length',d.get('length'))
        if d.get('form_factor'):fit['psuForm']=d['form_factor']
        metrics['watts']=d.get('wattage')
    if category in ['SSD','HDD']:metrics['capacity']=d.get('capacity')
    if category=='Monitor':
        metrics['hz']=d.get('refresh_rate')
        x=get(d,'resolution.horizontalRes');y=get(d,'resolution.verticalRes')
        if positive(x) and positive(y):specs['分辨率']=f'{x} × {y}'
    for key in list(metrics):
        if not positive(metrics[key]):del metrics[key]
    variant=clean(m.get('variant')); series=clean(m.get('series')); manufacturer=clean(m.get('manufacturer')) or '未标注厂商'
    if not specs:specs['资料状态']='仅收录型号身份，详细规格待核对'
    if series:specs['系列']=series
    mpn=m.get('part_numbers')
    aliases=[x for x in mpn[:6] if isinstance(x,str) and len(x)<120] if isinstance(mpn,list) else []
    p={'id':'bc-'+uid,'cat':MAPPING[category],'brand':manufacturer,'name':name.strip(),
       'summary':f'{manufacturer} 的{series or category}型号记录。'+('可从下方参数认识它的规格。' if len(specs)>1 else '社区记录尚缺详细规格。'),
       'specs':specs,'fit':fit,'metrics':metrics,'aliases':aliases,'origin':'opendb',
       'source':BASE+'/blob/'+COMMIT+'/'+path,'sourcePath':path,'sourceId':uid,
       'note':'来自 OpenDB 社区快照，未逐项通过本页独立核验；空值与数值 0 不补成实测值。完整版本、安装条件和 BIOS 支持请回到厂商资料确认。'}
    url=get(d,'general_product_information.manufacturer_url')
    if isinstance(url,str) and url.startswith(('https://','http://')):p['manufacturerUrl']=url
    if variant:p['variant']=variant
    return p

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--archive',default='research/buildcores-snapshot.zip');parser.add_argument('--download',action='store_true',help='Download the pinned official GitHub snapshot if absent'); args=parser.parse_args()
    archive=ROOT/args.archive
    if not archive.exists() and args.download:
        archive.parent.mkdir(parents=True,exist_ok=True)
        urllib.request.urlretrieve(f'https://codeload.github.com/buildcores/buildcores-open-db/zip/{COMMIT}',archive)
    candidates=defaultdict(list); counts=Counter(); skipped=0
    with zipfile.ZipFile(archive) as z:
        for entry in z.infolist():
            parts=entry.filename.split('/')
            if len(parts)!=4 or parts[1]!='open-db' or not parts[-1].endswith('.json'):continue
            counts[parts[2]]+=1
            category=parts[2]
            if category not in MAPPING and category!='Storage':continue
            d=json.loads(z.read(entry))
            if category=='Storage':category='SSD' if d.get('storage_type')=='SSD' else 'HDD' if d.get('storage_type')=='HDD' else ''
            if category not in MAPPING:continue
            p=normalize(d,category,'/'.join(parts[1:]))
            if p:candidates[category].append((p,d.get('metadata',{}).get('releaseYear')))
            else:skipped+=1
        license_dir=ROOT/'third-party/buildcores';license_dir.mkdir(parents=True,exist_ok=True)
        for name in ['LICENSE.txt','NOTICE.md','README.md']:
            key=next(k for k in z.namelist() if k.count('/')==1 and k.endswith('/'+name));(license_dir/name).write_bytes(z.read(key))
    selected=[]; selected_counts={}
    # Deterministic, manufacturer-balanced sample; richer records first within each brand.
    for category,limit in LIMITS.items():
        groups=defaultdict(list)
        for p,year in candidates[category]:groups[p['brand'].casefold()].append((p,year))
        for g in groups.values():g.sort(key=lambda x:(-int(bool(x[0].get('manufacturerUrl'))),-len(x[0]['specs']),-int(x[1] or 0),x[0]['sourceId']))
        group_keys=sorted(groups,key=lambda k:(k not in KNOWN_BRANDS,-int(any(p.get('manufacturerUrl') for p,_ in groups[k])),k))
        queues=[deque(groups[k]) for k in group_keys]
        chosen=[]
        while queues and len(chosen)<limit:
            for q in queues:
                if q and len(chosen)<limit:chosen.append(q.popleft()[0])
            queues=[q for q in queues if q]
        selected.extend(chosen);selected_counts[category]=len(chosen)
    assert len(set(p['id'] for p in selected))==len(selected)
    manifest={'name':'BuildCores OpenDB','commit':COMMIT,'date':'2026-11-01','license':'CC BY-NC-SA 4.0',
              'url':BASE,'licenseUrl':'https://creativecommons.org/licenses/by-nc-sa/4.0/',
              'sourceRecordCount':sum(counts.values()),'sourceCategories':dict(counts),
              'importedCount':len(selected),'importedCategories':selected_counts,'skippedIdentityRecords':skipped,
              'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
              'changes':'按厂商分组抽取 2000 条教学样本；筛选字段、翻译标签、规范插槽和板型、计算机箱外形体积，去除价格、零售商、图片与缺失数值。'}
    out=license_dir/'teaching-subset.json';out.write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
    (license_dir/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'opendb-data.js').write_text('/* Data adapted from BuildCores OpenDB; CC BY-NC-SA 4.0. See third-party/buildcores. */\nconst openDbManifest='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\nconst openDbProducts='+json.dumps(selected,ensure_ascii=False,separators=(',',':'))+';\nproductCatalog.push(...openDbProducts);\n',encoding='utf-8')
    print(json.dumps({'imported':len(selected),'sourceRecords':sum(counts.values()),'categories':selected_counts,'bytes':(ROOT/'opendb-data.js').stat().st_size},ensure_ascii=False))

if __name__=='__main__':main()
