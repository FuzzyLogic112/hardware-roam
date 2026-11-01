(async()=>{
 const results=[];const tick=()=>new Promise(r=>setTimeout(r,120));
 for(const routeId of ['home','lessons','catalog','studio','dimensions','assembly','brands','lab','planner','quiz','glossary','sources']){
  location.hash=routeId;await tick();const overflow=document.documentElement.scrollWidth>innerWidth;results.push({route:routeId,width:innerWidth,pass:!overflow});if(overflow)throw Error('Horizontal overflow '+routeId+' '+document.documentElement.scrollWidth);
 }
 location.hash='dimensions';await tick();const canvas=document.querySelector('#dimensions-canvas');results.push({name:'Dimension canvas visible and within mobile viewport',pass:canvas.clientWidth>200&&canvas.clientWidth<=innerWidth});
 showProduct(openDbProducts.find(p=>p.cat==='case').id);await tick();results.push({name:'Community detail fits viewport',pass:document.querySelector('#lesson-dialog').getBoundingClientRect().width<=innerWidth&&document.documentElement.scrollWidth<=innerWidth});closeDialog();
 openGlobalSearch();document.querySelector('#global-query').value='AMD';document.querySelector('#global-query').dispatchEvent(new Event('input',{bubbles:true}));await tick();results.push({name:'Global search fits viewport',pass:document.querySelector('#global-search').getBoundingClientRect().width<=innerWidth&&document.documentElement.scrollWidth<=innerWidth});closeGlobalSearch();
 if(results.some(r=>!r.pass))throw Error(JSON.stringify(results));return results;
})()
