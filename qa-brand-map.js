(async()=>{
 const results=[],wait=()=>new Promise(r=>setTimeout(r,100)),assert=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name)},set=(id,value)=>{const el=document.querySelector(id);el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}))},click=s=>document.querySelector(s).click();
 location.hash='brands';await wait();brandQuery='';brandFilter='全部';brandMapView='hot';brandRankCategory='keyboard';brandRankBudget='all';document.querySelector('#main').innerHTML=brandPage();renderBrands();
 assert('158 illustrated brand cards',document.querySelectorAll('.brand-card').length===158&&document.querySelectorAll('.brand-card img').length===158);
 const pictures=[...document.querySelectorAll('#main img')];await Promise.all(pictures.map(img=>{img.loading='eager';return img.decode()}));assert('Every visible brand and ranking photo decodes',pictures.every(i=>i.naturalWidth>0));
 assert('Three requested brands featured with images',document.querySelectorAll('.bm-feature img').length===3&&document.querySelector('.bm-featured').textContent.includes('IQUNIX'));
 click('[data-bm-gallery]');await wait();assert('Gallery shortcut stays on brand route',location.hash==='#brands'&&!document.querySelector('.bm-ranking'));click('[data-bm-view=hot]');
 assert('Ten keyboard entries with original attention ranks',document.querySelectorAll('.bm-rank-card').length===10&&document.querySelector('.bm-rank-num').textContent==='#1');
 assert('References and date shown',document.querySelector('.bm-method').textContent.includes('2026-11-01')&&document.querySelectorAll('.bm-photo-credit[href^="https://"]').length===10);
 click('[data-bm-view=value]');assert('Candidate method identifies price and user score proxy',document.querySelector('.bm-method').textContent.includes('未计算性能价格比'));
 const candidatePrices=[...document.querySelectorAll('.bm-price')].map(el=>Number(el.firstChild.textContent.replace(/[^\d.]/g,'')));assert('Budget candidates sorted ascending',candidatePrices.every((p,i)=>i===0||p>=candidatePrices[i-1]));
 set('#bm-budget','100');assert('Budget ceiling filters actual prices',document.querySelectorAll('.bm-rank-card').length>0&&[...document.querySelectorAll('.bm-price')].every(el=>Number(el.firstChild.textContent.replace(/[^\d.]/g,''))<=100));
 click('[data-brand-search-clear]');assert('Clear resets price ceiling',document.querySelector('#bm-budget').value==='all');
 for(const term of ['卓威','迈从','铝厂','EV63']){set('#brand-search',term);assert('Alias search '+term,document.querySelectorAll('.brand-card').length===1)}
 assert('EV63 resolves IQUNIX brand',document.querySelector('.brand-card h3').textContent==='IQUNIX 铝厂');
 click('[data-brand-search-clear]');set('#brand-category','gpu');assert('GPU category retains 16 brands',document.querySelectorAll('.brand-card').length===16);
 click('[data-bm-view=gallery]');assert('Gallery view hides rankings and retains images',!document.querySelector('.bm-ranking')&&document.querySelectorAll('.brand-card img').length===16);
 click('[data-brand-search-clear]');click('[data-bm-view=hot]');
 let available=0;
 for(const c of categories){click('[data-bm-category="'+c.id+'"]');const cards=document.querySelectorAll('.brand-card');assert('Category '+c.id+' has illustrated brands',cards.length>0&&[...cards].every(el=>!!el.querySelector('img[src]')));if(BRAND_MAP_DATA.rankings[c.id].items.length){available++;assert('Ranking '+c.id+' shows photos and original source',document.querySelectorAll('.bm-rank-card img').length===10&&!!document.querySelector('.bm-method a'))}else assert('Unavailable '+c.id+' is explicit',document.querySelector('.bm-empty').textContent.includes('暂未收录'));assert('No overflow '+c.id+' at '+innerWidth,document.documentElement.scrollWidth<=innerWidth)}
 assert('18 sourced ranking categories',available===18);
 click('[data-brand-search-clear]');click('[data-brand-search-shortcut="迈从"]');assert('Requested brand shortcut works',document.querySelectorAll('.brand-card').length===1&&document.querySelector('#brand-search').value==='迈从');
 click('.brand-tags button');await wait();assert('Brand topic opens teaching dialog',document.querySelector('#lesson-dialog').open);closeDialog();
 brandQuery='';brandFilter='全部';brandMapView='hot';brandRankCategory='keyboard';brandRankBudget='all';location.hash='home';await wait();location.hash='brands';await wait();window.scrollTo(0,0);
 return results;
})()
