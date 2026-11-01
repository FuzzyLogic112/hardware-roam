/* Self-contained perspective 3D scene, rendered locally without network libraries. */
function hardwareStage(full=false){return `<section class="hardware-stage ${full?'stage-full':''}" aria-label="电脑硬件3D互动展台">
<div class="stage-top"><span class="stage-badge">可交互 3D 模型</span><div class="stage-tabs" role="group" aria-label="展台场景"><button data-scene="tower" class="active" aria-pressed="true">主机内部</button><button data-scene="desk" aria-pressed="false">桌面外设</button></div></div>
<div class="stage-viewport"><canvas id="hardware-canvas" tabindex="0" role="img" aria-label="3D电脑模型。拖动旋转，滚轮或双指缩放；键盘方向键旋转，加减号缩放。也可使用下方配件按钮选择零件。"></canvas><div class="stage-gesture" aria-hidden="true">拖动旋转 · 滚轮 / 双指缩放</div><div class="stage-orbit-tools" role="group" aria-label="视角控制"><button data-view="left" aria-label="向左旋转">↶</button><button data-view="right" aria-label="向右旋转">↷</button><button data-view="in" aria-label="放大模型">＋</button><button data-view="out" aria-label="缩小模型">−</button><button data-view="focus" aria-label="聚焦选中的零件" disabled>◎</button><button data-view="reset" aria-label="重置视角">⌂</button></div></div>
<div class="stage-controls"><label class="explode-label" for="explode-3d"><span>整机</span><input id="explode-3d" type="range" min="0" max="100" value="15" aria-label="拆解展开程度"><span>拆解</span></label><label class="stage-shell"><input id="shell-3d" type="checkbox" checked>机箱框架</label></div>
<div class="stage-parts" role="group" aria-label="选择零件"></div><div class="stage-inspector" aria-live="polite"><div><strong id="part-title">先选一个零件</strong><p id="part-description">点击模型或上方标签，看看它负责什么。</p></div><button class="stage-learn" id="part-learn" disabled>打开讲解 ↗</button></div><p class="stage-disclaimer">教学结构模型 · 非特定品牌实物 · 不用于判断真实装配尺寸</p></section>`}

function mountHardwareStage(onLearn,options={}){
 const canvas=document.querySelector('#hardware-canvas');if(!canvas)return ()=>{};
 const host=canvas.closest('.hardware-stage'),ctx=canvas.getContext('2d');
 if(!ctx){host.innerHTML='<p>当前浏览器无法显示互动模型。请使用较新的浏览器，或继续浏览配件图鉴。</p>';return ()=>{}}
 const names={cpu:['处理器 CPU','执行程序与逻辑，协调电脑里的工作。'],board:['主板','连接零件的枢纽，决定平台与扩展能力。'],ram:['内存 RAM','正在运行的程序使用的临时工作台。'],gpu:['显卡 GPU','生成画面，也加速部分渲染与计算。'],ssd:['固态硬盘 SSD','断电后仍保存系统、软件与文件。'],psu:['电源 PSU','把电能稳定地分配给各个部件。'],cooling:['散热器','把芯片热量带走，帮助性能稳定。'],case:['机箱','保护和固定零件，也组织空气流动。'],monitor:['显示器','把电脑生成的画面展示给你。'],keyboard:['键盘','输入文字和指令，布局与手感很重要。'],mouse:['鼠标','用手部动作控制指针，形状要适合你的手。'],audio:['耳机','播放声音；舒适度、连接和延迟各有取舍。']};
 let scene='tower',yaw=-.55,pitch=-.19,zoom=1,explode=.15,targetExplode=.15,shell=true,selected=null,hovered=null;
 let width=400,height=420,scale=60,alive=true,frame=0,dirty=true,hitFaces=[],labels=[],camera=12;
 let pointerStart=null,pointerMoved=false,lastPinch=null;
 const pointers=new Map(),unsubs=[];
 let assemblyStep=Math.max(0,Math.min(8,options.step||0)),motion=1,motionStarted=0,focus=[0,0,0];
 const stepRequired={board:0,cpu:0,ram:1,ssd:2,cooling:3,case:4,psu:5,gpu:6};
 const movingParts=[['cpu'],['ram'],['ssd'],['cooling'],['board','cpu','ram','ssd','cooling'],['psu'],['gpu'],[],[]];
 const assemblyOffset=()=>assemblyStep===4?[0,.6,-1.1]:assemblyStep===5?[-.8,0,.7]:assemblyStep===6?[0,.6,-.6]:[0,.5,-.8];
 function movePoint(point,id){if(!options.assembly||motion>=1||!movingParts[assemblyStep].includes(id))return point;const off=assemblyOffset();return point.map((n,i)=>n+off[i]*(1-motion))}
 if(options.assembly){explode=0;targetExplode=0;selected=assemblyLessons[assemblyStep].part;host.classList.add('assembly-model');host.querySelector('#explode-3d').value=0}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const colors={frame:'#9faec3',board:'#284b55',chip:'#354553',metal:'#bfc9db',edge:'#71869d',ram:'#5667a3',gold:'#d3b37b',gpu:'#71819a',dark:'#243747',cool:'#aabbd1',screen:'#344c72',keys:'#c3cddc',accent:'#8478f1'};
 const on=(el,event,fn,opts)=>{el.addEventListener(event,fn,opts);unsubs.push(()=>el.removeEventListener(event,fn,opts))};
 function rot(p){let x=p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),z=-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);return [x,p[1]*Math.cos(pitch)-z*Math.sin(pitch),p[1]*Math.sin(pitch)+z*Math.cos(pitch)]}
 function project(p){const v=rot(p.map((n,i)=>n-focus[i])),k=camera/(camera+v[2]);return {x:width/2+v[0]*scale*k,y:height*.51-v[1]*scale*k,z:v[2],k}}
 function polygon(points,color,id=null,alpha=1,stroke=true){if(options.assembly&&id&&(stepRequired[id]??0)>assemblyStep)return;faces.push({points:points.map(p=>movePoint(p,id)),color,id,alpha,stroke})}
 let faces=[];
 function box(x,y,z,w,h,d,color,id,offset=[0,0,0],alpha=1){
  x+=offset[0]*explode;y+=offset[1]*explode;z+=offset[2]*explode;
  const v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(p=>[x+p[0]*w/2,y+p[1]*h/2,z+p[2]*d/2]);
  for(const idx of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])polygon(idx.map(i=>v[i]),color,id,alpha);
 }
 function disc(x,y,z,r,color,id,offset=[0,0,0],plane='xy',segments=24){const pts=[];for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;pts.push([x+(plane==='yz'?0:Math.cos(a)*r)+offset[0]*explode,y+(plane==='xz'?0:(plane==='yz'?Math.cos(a):Math.sin(a))*r)+offset[1]*explode,z+(plane==='xy'?0:Math.sin(a)*r)+offset[2]*explode])}polygon(pts,color,id,1,false)}
 function fan(x,y,z,r,id,offset=[0,0,0],plane='xy'){
  const at=(u,v,t)=>{const p=plane==='xz'?[x+u,y-t,z+v]:plane==='yz'?[x+t,y+u,z+v]:[x+u,y+v,z-t];return p.map((n,i)=>n+offset[i]*explode)};
  function disk(radius,t,color){const pts=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;pts.push(at(Math.cos(a)*radius,Math.sin(a)*radius,t))}polygon(pts,color,id,1,false)}
  disk(r,0,colors.dark);disk(r*.81,.007,colors.edge);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;polygon([[0,0],[Math.cos(a)*r*.78,Math.sin(a)*r*.78],[Math.cos(a+.5)*r*.7,Math.sin(a+.5)*r*.7],[Math.cos(a+.65)*r*.22,Math.sin(a+.65)*r*.22]].map(([u,v])=>at(u,v,.014)),colors.chip,id)}
  disk(r*.22,.022,colors.metal);
 }
 function label(id,point,text){if(options.assembly&&(stepRequired[id]??0)>assemblyStep)return;labels.push({id,point:movePoint(point,id),text})}
 function tower(){
  const bo=[-.3,.1,.7],co=[-.8,1.2,-1.2],ra=[1.0,.8,-.4],gp=[-.3,-.2,-1.6],ss=[.9,-.6,-1.0],ps=[-.5,-.7,-.3],cl=[-1,1.5,-2.2];
  if(shell&&(!options.assembly||assemblyStep>=4)){for(const x of [-1.58,1.58])for(const z of [-.9,1.22])box(x,0,z,.10,5.1,.10,colors.frame,'case');for(const y of [-2.5,2.5]){for(const z of [-.9,1.22])box(0,y,z,3.25,.1,.10,colors.frame,'case');for(const x of [-1.58,1.58])box(x,y,.16,.1,.1,2.2,colors.frame,'case')}
   box(0,-2.47,.16,3.16,.10,2.1,colors.metal,'case');box(0,2.47,.16,3.16,.08,2.1,colors.metal,'case');
   box(1.48,.05,.17,.10,4.84,2.0,colors.frame,'case',[.9,0,.25],.2);
   for(let i=0;i<3;i++)fan(1.52,1.65-i*1.5,.15,.52,'cooling',[.8,0,0],'yz');
   label('case',[1.7,2.4,.2],'机箱');
  }
  box(-.12,.45,.96,2.65,3.75,.13,colors.board,'board',bo);
  // Motherboard slots, ports and copper-colored signal lanes.
  for(let i=0;i<8;i++)box(-1.24,1.8-i*.27,.78,.15,.16,.20,colors.metal,'board',bo);
  for(let i=0;i<6;i++)box(-.7+i*.24,-.45,.85,.12,.58,.10,colors.chip,'board',bo);
  for(let i=0;i<5;i++){box(-.9+i*.26,.1,.874,.012,1.15,.008,colors.gold,'board',bo);box(-.3,-.9+i*.13,.874,1.15,.012,.008,colors.gold,'board',bo)}
  box(-.3,1.24,.65,.85,.85,.2,colors.edge,'cpu',co);box(-.3,1.24,.52,.70,.70,.08,colors.metal,'cpu',co);
  for(let i=0;i<8;i++){box(-.68+i*.11,.76,.65,.03,.12,.03,colors.gold,'cpu',co);box(-.68+i*.11,1.72,.65,.03,.12,.03,colors.gold,'cpu',co)}
  for(const x of [.63,.92]){box(x,1.25,.54,.14,1.75,.31,colors.ram,'ram',ra);for(let i=0;i<5;i++)box(x,1.86-i*.29,.367,.11,.19,.03,colors.chip,'ram',ra);box(x,.35,.53,.13,.06,.3,colors.gold,'ram',ra)}
  // A conventional horizontal GPU: fans face down, not out through the case side.
  box(-.08,-.65,.02,2.54,.49,1.0,colors.gpu,'gpu',gp);box(-.08,-.38,.02,2.35,.05,.94,colors.chip,'gpu',gp);
  for(let i=0;i<3;i++)fan(-.87+i*.79,-.91,.02,.30,'gpu',gp,'xz');
  box(-.05,-.35,.45,1.7,.07,.10,colors.gold,'gpu',gp);
  box(.24,-1.37,.71,.96,.31,.10,colors.ram,'ssd',ss);for(let i=0;i<3;i++)box(-.02+i*.27,-1.37,.647,.18,.21,.04,colors.chip,'ssd',ss);box(.76,-1.37,.7,.09,.25,.08,colors.gold,'ssd',ss);
  box(-.45,-1.98,.04,1.84,.73,1.54,colors.dark,'psu',ps);fan(-.45,-1.98,-.75,.28,'psu',ps);
  // Front-to-rear cooler orientation: fin stack and front intake fan lie along the case X axis.
  for(let i=0;i<12;i++)box(-.72+i*.07,1.24,.12,.025,1.10,1.0,colors.cool,'cooling',cl);
  box(.16,1.24,.12,.12,1.12,1.05,colors.dark,'cooling',cl);fan(.23,1.24,.12,.46,'cooling',cl,'yz');
  if(!options.assembly||assemblyStep>=7){
   const alpha=options.assembly&&assemblyStep===7?.15+.85*motion:1;
   box(1.12,.48,.71,.09,1.45,.09,colors.gold,null,[0,0,0],alpha);
   box(.36,-1.72,.72,1.62,.07,.07,colors.edge,null,[0,0,0],alpha);
   box(1.13,-.77,.72,.07,1.85,.07,colors.edge,null,[0,0,0],alpha);
   box(-1.08,.05,.75,.06,3.25,.06,colors.gold,null,[0,0,0],alpha);
  }
  const point=(p,o)=>p.map((n,i)=>n+o[i]*explode);
  label('board',point([-1.35,.35,1],bo),'主板');label('cpu',point([-.3,1.4,.5],co),'CPU');label('ram',point([1.0,1.8,.3],ra),'内存');label('gpu',point([.4,-.72,-.43],gp),'显卡');label('ssd',point([.3,-1.37,.64],ss),'SSD');label('psu',point([-.45,-2.05,-.8],ps),'电源');label('cooling',point([-.5,1.48,-.58],cl),'散热');
 }
 function desk(){
  const mo=[0,.3,.5],ke=[0,-.1,-.5],mu=[.6,0,-.3],au=[-.4,.1,-.2];
  box(0,-1.6,.05,7.9,.14,4.8,colors.metal,null);
  box(0,.7,.9,4.7,2.65,.19,colors.dark,'monitor',mo);box(0,.73,.79,4.42,2.36,.025,colors.screen,'monitor',mo);
  // Screen content: a simplified workbench, not a raster pasted onto the display.
  box(-1.72,.73,.762,.6,2.13,.01,colors.chip,'monitor',mo);
  for(let i=0;i<4;i++)box(-1.71,1.45-i*.36,.75,.42,.06,.015,colors.metal,'monitor',mo);
  for(let i=0;i<3;i++)box(-.8+i*.9,.97,.74,.66,.66,.02,i===0?colors.accent:colors.edge,'monitor',mo);
  for(let i=0;i<4;i++)box(.1,.23-i*.14,.74,2.3,.034,.01,colors.metal,'monitor',mo);
  box(0,-.97,1.1,.24,.85,.18,colors.edge,'monitor',mo);box(0,-1.42,.8,1.35,.1,.8,colors.edge,'monitor',mo);
  box(-.5,-1.42,-.82,3.2,.21,1.1,colors.edge,'keyboard',ke);
  for(let row=0;row<4;row++)for(let col=0;col<13;col++)box(-1.93+col*.235,-1.27,-.47-row*.215,.20,.10,.175,col<2?colors.accent:colors.keys,'keyboard',ke);
  box(-.5,-1.25,-1.25,1.14,.09,.16,colors.keys,'keyboard',ke);
  box(2.02,-1.43,-.85,.68,.1,1.42,colors.board,'mouse',mu);box(2.02,-1.26,-.78,.49,.25,.84,colors.keys,'mouse',mu);box(2.02,-1.095,-.57,.055,.05,.17,colors.edge,'mouse',mu);
  // Headphone arc with two earcups.
  for(let i=0;i<15;i++){const a=Math.PI*.1+i/14*Math.PI*.8;box(-3+Math.cos(a)*.68,-.56+Math.sin(a)*.84,-.2,.15,.18,.18,colors.dark,'audio',au)}
  box(-3.65,-.78,-.2,.27,.64,.43,colors.dark,'audio',au);box(-2.35,-.78,-.2,.27,.64,.43,colors.dark,'audio',au);
  label('monitor',[0,1.95+mo[1]*explode,.76+mo[2]*explode],'显示器');label('keyboard',[-.5,-1.2,-1.2+ke[2]*explode],'键盘');label('mouse',[2.15+mu[0]*explode,-1.1,-1+mu[2]*explode],'鼠标');label('audio',[-3.3+au[0]*explode,-.3,-.2],'耳机');
 }
 function shade(hex,factor){const n=parseInt(hex.slice(1),16);return `rgb(${[n>>16,(n>>8)&255,n&255].map(c=>Math.max(0,Math.min(255,Math.round(c*factor)))).join(',')})`}
 function makeParts(){const ids=scene==='tower'?['cpu','board','ram','gpu','ssd','psu','cooling','case']:['monitor','keyboard','mouse','audio'];host.querySelector('.stage-parts').innerHTML=ids.map(id=>`<button data-part3d="${id}" aria-pressed="${selected===id}" ${options.assembly&&(stepRequired[id]??0)>assemblyStep?'disabled':''}>${names[id][0]}</button>`).join('')}
 function choose(id){selected=id;host.querySelector('[data-view=focus]').disabled=false;host.querySelector('#part-title').textContent=names[id][0];host.querySelector('#part-description').textContent=names[id][1];host.querySelector('#part-learn').disabled=false;host.querySelectorAll('[data-part3d]').forEach(b=>{b.classList.toggle('active',b.dataset.part3d===id);b.setAttribute('aria-pressed',b.dataset.part3d===id)});dirty=true;requestDraw()}
 function draw(){
  if(!alive)return;frame=0;
  const moving=Math.abs(explode-targetExplode)>.001;
  const installing=motion<1;if(installing)motion=reduced?1:Math.min(1,(performance.now()-motionStarted)/950);
  if(moving)explode=reduced?targetExplode:explode+(targetExplode-explode)*.15;
  if(!dirty&&!moving&&!installing)return;dirty=false;
  const dark=document.body.classList.contains('dark');
  ctx.clearRect(0,0,width,height);scale=Math.min(width/(scene==='tower'?7.8:10.2),height/(scene==='tower'?7.3:6.6))*zoom/(1+explode*.12);
  // Subtle floor grid and a projected ground shadow anchor the model.
  ctx.strokeStyle=dark?'#8c9db31b':'#344b7420';ctx.lineWidth=.7;
  for(let n=-6;n<=6;n++){for(const pair of [[[n,-2.7,-5],[n,-2.7,5]],[[-6,-2.7,n],[6,-2.7,n]]]){const a=project(pair[0]),b=project(pair[1]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
  faces=[];labels=[];scene==='tower'?tower():desk();
  const projected=faces.map(f=>{const vs=f.points.map(p=>rot(p.map((n,i)=>n-focus[i]))),ps=f.points.map(project);const a=vs[0],b=vs[1],c=vs[2],u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...normal)||1;const light=.70+.25*Math.abs((normal[0]*-.35+normal[1]*.7+normal[2]*-.6)/len);return {...f,ps,depth:vs.reduce((s,p)=>s+p[2],0)/vs.length,light}}).sort((a,b)=>b.depth-a.depth);
  hitFaces=[];
  for(const f of projected){ctx.beginPath();f.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.globalAlpha=f.alpha;const isSelected=f.id&&f.id===selected,isHover=f.id&&f.id===hovered;ctx.fillStyle=shade(isSelected?'#9182ed':isHover?'#a2aad9':f.color,f.light);ctx.fill();if(f.stroke){ctx.strokeStyle=isSelected?(dark?'#c2baff':'#6658c1'):dark?'#0d172d44':'#142b4540';ctx.lineWidth=isSelected?1:.5;ctx.stroke()}ctx.globalAlpha=1;if(f.id&&f.alpha>.35)hitFaces.push(f)}
  // Labels are drawn last. Their hit targets match the visible label boxes.
  const used=[];
  for(const l of labels){const p=project(l.point);let x=p.x,y=p.y;ctx.font='11px "Microsoft YaHei", sans-serif';const textWidth=ctx.measureText(l.text).width+15;const bw=textWidth,bh=23;x=Math.max(6,Math.min(width-bw-6,x-bw/2));y=Math.max(8,Math.min(height-40,y-34));for(let i=0;i<6&&used.some(r=>x<r.x+r.w&&x+bw>r.x&&y<r.y+r.h&&y+bh>r.y);i++)y+=25;y=Math.min(height-35,y);used.push({x,y,w:bw,h:bh});ctx.strokeStyle=dark?'#b9aed766':'#61588866';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(x+bw/2,y+bh/2);ctx.stroke();ctx.fillStyle=selected===l.id?(dark?'#b6afff':'#5149c8'):(dark?'#253246ed':'#ffffffed');ctx.strokeStyle=dark?'#62728e':'#ced6e5';ctx.beginPath();ctx.roundRect(x,y,bw,bh,5);ctx.fill();ctx.stroke();ctx.fillStyle=selected===l.id?'#fff':dark?'#e7edf8':'#334159';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(l.text,x+bw/2,y+bh/2);l.hit={x,y,w:bw,h:bh}}
  if(moving||installing)requestDraw();
 }
 function requestDraw(){if(alive&&!frame)frame=requestAnimationFrame(draw)}
 function update(){dirty=true;requestDraw()}
 function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);update()}
 function pointInPolygon(x,y,ps){let inside=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if(((a.y>y)!==(b.y>y))&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside}
 function pick(clientX,clientY){const r=canvas.getBoundingClientRect(),x=clientX-r.left,y=clientY-r.top;for(let i=labels.length-1;i>=0;i--){const h=labels[i].hit;if(h&&x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)return labels[i].id}for(let i=hitFaces.length-1;i>=0;i--)if(pointInPolygon(x,y,hitFaces[i].ps))return hitFaces[i].id;return null}
 function clampView(){pitch=Math.max(-1.1,Math.min(1.1,pitch));zoom=Math.max(.65,Math.min(1.8,zoom));update()}
 on(canvas,'pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);pointerMoved=false;pointerStart={x:e.clientX,y:e.clientY};if(pointers.size>1){pointerMoved=true;const a=[...pointers.values()];lastPinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}});
 on(canvas,'pointermove',e=>{const old=pointers.get(e.pointerId);if(!old){const hit=pick(e.clientX,e.clientY);if(hovered!==hit){hovered=hit;canvas.style.cursor=hit?'pointer':'grab';update()}return}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)pointerMoved=true;if(pointers.size>=2){const a=[...pointers.values()],dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(lastPinch>0)zoom*=dist/lastPinch;lastPinch=dist;pointerMoved=true}else{yaw+=(e.clientX-old.x)*.009;pitch+=(e.clientY-old.y)*.007}canvas.style.cursor='grabbing';clampView()});
 on(canvas,'pointerup',e=>{const wasClick=!pointerMoved&&pointers.size===1;pointers.delete(e.pointerId);lastPinch=null;if(wasClick){const id=pick(e.clientX,e.clientY);if(id)choose(id)}canvas.style.cursor='grab'});
 on(canvas,'pointercancel',e=>{pointers.delete(e.pointerId);pointerMoved=true;lastPinch=null});
 on(canvas,'pointerleave',()=>{hovered=null;update()});
 on(canvas,'wheel',e=>{e.preventDefault();zoom*=Math.exp(-e.deltaY*.001);clampView()},{passive:false});
 on(canvas,'keydown',e=>{const key=e.key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(key))return;e.preventDefault();if(key==='ArrowLeft')yaw-=.15;if(key==='ArrowRight')yaw+=.15;if(key==='ArrowUp')pitch-=.12;if(key==='ArrowDown')pitch+=.12;if(key==='+'||key==='=')zoom+=.12;if(key==='-')zoom-=.12;if(key==='Home'){yaw=-.55;pitch=-.19;zoom=1;focus=[0,0,0]}clampView()});
 on(host,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.part3d)choose(b.dataset.part3d);if(b.id==='part-learn'&&selected)onLearn(selected);if(b.dataset.scene&&!options.assembly){scene=b.dataset.scene;yaw=scene==='tower'?-.55:-.2;pitch=scene==='tower'?-.19:-.52;zoom=1;focus=[0,0,0];selected=null;hovered=null;host.querySelector('[data-view=focus]').disabled=true;host.querySelectorAll('[data-scene]').forEach(t=>{t.classList.toggle('active',t.dataset.scene===scene);t.setAttribute('aria-pressed',t.dataset.scene===scene)});host.querySelector('.stage-shell').hidden=scene!=='tower';makeParts();host.querySelector('#part-title').textContent='先选一个零件';host.querySelector('#part-description').textContent='点击模型或上方标签，看看它负责什么。';host.querySelector('#part-learn').disabled=true;update()}if(b.dataset.view){const v=b.dataset.view;if(v==='left')yaw-=.3;if(v==='right')yaw+=.3;if(v==='in')zoom+=.15;if(v==='out')zoom-=.15;if(v==='focus'&&selected){const part=labels.find(l=>l.id===selected);if(part){focus=[...part.point];zoom=1.4}}if(v==='reset'){yaw=scene==='tower'?-.55:-.2;pitch=scene==='tower'?-.19:-.52;zoom=1;focus=[0,0,0];targetExplode=options.assembly?0:.15;host.querySelector('#explode-3d').value=options.assembly?0:15}clampView()}});
 on(host.querySelector('#explode-3d'),'input',e=>{targetExplode=Number(e.target.value)/100;update()});
 on(host.querySelector('#shell-3d'),'change',e=>{shell=e.target.checked;update()});
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
 const themeObserver=new MutationObserver(update);themeObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
 function applyAssemblyStep(step,play=false){assemblyStep=Math.max(0,Math.min(8,step));focus=[0,0,0];zoom=1;targetExplode=0;host.querySelector('#explode-3d').value=0;motion=play&&!reduced?0:1;motionStarted=performance.now();canvas.dataset.assemblyStep=String(assemblyStep);host.querySelector('.stage-badge').textContent=`第 ${assemblyStep+1} 步 · ${assemblyLessons[assemblyStep].title}`;makeParts();choose(assemblyLessons[assemblyStep].part);update()}
 on(host,'hw-assembly-step',e=>{if(options.assembly)applyAssemblyStep(e.detail.step,e.detail.play)});
 makeParts();if(options.assembly)applyAssemblyStep(assemblyStep);resize();
 return ()=>{alive=false;cancelAnimationFrame(frame);resizeObserver.disconnect();themeObserver.disconnect();unsubs.forEach(f=>f());pointers.clear()};
}
