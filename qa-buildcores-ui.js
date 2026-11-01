(async()=>{
 const checks=[];const assert=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name)};
 const wait=()=>new Promise(r=>setTimeout(r,100));
 const nav=async id=>{if(location.hash==='#'+id)route();else location.hash=id;await wait()};
 const draft=JSON.stringify(currentPlan),theme=dark;
 try{
 assert('Mobile breakpoint under test',innerWidth<=760);
 assert('Default dark theme initialized',document.body.classList.contains('dark')===dark&&dark);
 const start=getComputedStyle(document.body).getPropertyValue('--bg');document.querySelector('#theme').click();assert('Theme switches to light',!dark&&!document.body.classList.contains('dark')&&getComputedStyle(document.body).getPropertyValue('--bg')!==start);document.querySelector('#theme').click();assert('Theme switches back to dark',dark&&document.body.classList.contains('dark'));
 await nav('catalog');assert('Mobile filter panel starts collapsed',!document.querySelector('.ui-catalog-filters').classList.contains('is-expanded')&&getComputedStyle(document.querySelector('#catalog-facets')).display==='none');
 document.querySelector('.ui-filter-toggle').click();assert('Mobile filters expand accessibly',document.querySelector('.ui-filter-toggle').getAttribute('aria-expanded')==='true'&&getComputedStyle(document.querySelector('#catalog-facets')).display!=='none');
 document.querySelector('.ui-filter-toggle').click();assert('Mobile filters collapse',document.querySelector('.ui-filter-toggle').getAttribute('aria-expanded')==='false');
 assert('Closed navigation excluded from keyboard focus',document.querySelector('.sidebar').inert&&!document.querySelector('.workspace').inert);
 document.querySelector('#ui-menu').click();assert('Menu reveals navigation and blocks background',document.querySelector('#ui-menu').getAttribute('aria-expanded')==='true'&&!document.querySelector('.sidebar').inert&&document.querySelector('.workspace').inert&&!document.querySelector('#ui-nav-shade').hidden);
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert('Escape closes menu and returns focus',!document.body.classList.contains('ui-nav-open')&&document.activeElement.id==='ui-menu'&&!document.querySelector('.workspace').inert);
 document.querySelector('#ui-menu').click();document.querySelector('#ui-nav-shade').click();assert('Backdrop closes navigation',!document.body.classList.contains('ui-nav-open'));
 document.querySelector('#ui-menu').click();document.querySelector('[data-nav=studio]').click();await wait();assert('Navigation selection closes drawer',currentRoute==='studio'&&!document.body.classList.contains('ui-nav-open')&&!document.querySelector('.workspace').inert);
 assert('3D scene remains available in workbench',!!document.querySelector('#hardware-canvas')&&document.querySelectorAll('[data-scene]').length===2);
 await nav('home');assert('Homepage has interactive PC and functional starting points',!!document.querySelector('.ui-home-scene #hardware-canvas')&&document.querySelectorAll('.ui-start-grid [data-plan-preset]').length===2);
 document.querySelector('.ui-start-grid [data-plan-preset=am5]').click();await wait();assert('Homepage quick start loads real learning plan',currentRoute==='planner'&&currentPlan.slots.cpu==='ryzen7600'&&Object.keys(currentPlan.slots).length===8);
 await nav('catalog');assert('Cards identify generic illustrations',Array.from(document.querySelectorAll('.ui-product-visual')).every(n=>n.textContent.includes('示意')||n.querySelector('img')));
 assert('Mobile header controls do not overlap branding',document.querySelector('.logo').getBoundingClientRect().right<document.querySelector('.global-open').getBoundingClientRect().left);
 assert('No external fonts or scripts added',!document.querySelector('script[src],link[rel=stylesheet]'));
 assert('No horizontal page overflow',document.documentElement.scrollWidth<=innerWidth);
 return checks;
 }finally{currentPlan=JSON.parse(draft);persistPlan();dark=theme;document.body.classList.toggle('dark',dark);save('hw-roam-theme',dark?'dark':'light');updateTheme();setUiNav(false);await nav('home')}
})()
