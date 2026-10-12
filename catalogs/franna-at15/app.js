const state={catalogs:[],parts:[],hotspots:[],images:[],current:null,scale:1,x:0,y:0,diagramRequest:0};
const $=id=>document.getElementById(id);
const diagram=$('diagram'),canvas=$('canvas');
Promise.all(['catalogs','parts','hotspots','images'].map(x=>fetch('data/'+x+'.json').then(r=>{if(!r.ok)throw new Error('Unable to load '+x+'.json');return r.json()}))).then(([c,p,h,i])=>{state.catalogs=c;state.parts=p;state.hotspots=h;state.images=i;renderCatalogs(c);$('count').textContent=c.length;if(location.hash)openCatalog(decodeURIComponent(location.hash.slice(1)));else{const first=c.find(item=>item.image);if(first)openCatalog(first.id);}}).catch(error=>{console.error(error);$('empty').textContent='Catalog data could not be loaded. Please refresh the page.';$('empty').style.display='block';});
function renderCatalogs(list){const q=$('filter').value.toLowerCase();$('catalogs').innerHTML=list.filter(c=>(c.id+' '+c.title).toLowerCase().includes(q)).map(c=>`<div class="cat ${state.current?.id===c.id?'active':''}" data-id="${esc(c.id)}"><b>${esc(c.title||c.id)}</b><small>${esc(c.id)} · ${c.rows} rows</small></div>`).join('');document.querySelectorAll('.cat').forEach(e=>e.onclick=()=>openCatalog(e.dataset.id));}
function openCatalog(id){const c=state.catalogs.find(x=>x.id===id);if(!c)return;state.current=c;const request=++state.diagramRequest;location.hash=encodeURIComponent(id);$('title').textContent=(c.title||c.id)+' — '+c.id;renderCatalogs(state.catalogs);renderParts();const img=c.image||null;const box=$('hotspots');box.innerHTML='';box.style.width='0';box.style.height='0';diagram.onload=()=>{if(request!==state.diagramRequest||state.current!==c)return;diagram.style.display='block';$('empty').style.display='none';renderHotspots();requestAnimationFrame(fit);};diagram.onerror=()=>{if(request!==state.diagramRequest||state.current!==c)return;diagram.style.display='none';$('empty').textContent='Diagram image could not be loaded: '+img;$('empty').style.display='block';box.innerHTML='';};if(!img){diagram.removeAttribute('src');diagram.style.display='none';$('empty').textContent='No diagram is available for this catalog.';$('empty').style.display='block';}else{$('empty').textContent='Loading diagram…';$('empty').style.display='block';diagram.style.display='none';diagram.src='images/'+encodeURIComponent(img);}}
function renderParts(){const arr=state.parts.filter(p=>p.catalog===state.current.id);$('partCount').textContent=arr.length;$('rows').innerHTML=arr.map(p=>`<tr><td>${esc(p.position)}</td><td><a href="#" data-id="${esc(p.id)}">${esc(p.partNumber)}</a></td><td>${esc(p.description)}</td><td>${esc(p.quantity)}</td></tr>`).join('');document.querySelectorAll('#rows a').forEach(a=>a.onclick=e=>{e.preventDefault();showPart(a.dataset.id)});}
function renderHotspots(){const box=$('hotspots');box.innerHTML='';if(!state.current?.image)return;const meta=state.images.find(x=>x.file===state.current.image);if(!meta)return;box.style.width=meta.width+'px';box.style.height=meta.height+'px';state.hotspots.filter(h=>h.image===state.current.image).forEach(h=>{const d=document.createElement('div');d.className='hot';d.title=h.position;d.style.left=h.left+'px';d.style.top=h.top+'px';d.style.width=(h.right-h.left)+'px';d.style.height=(h.bottom-h.top)+'px';d.onclick=()=>{const p=state.parts.find(x=>x.catalog===state.current.id&&x.position===h.position);if(p)showPart(p.id);};box.appendChild(d);});}
function showPart(id){const p=state.parts.find(x=>x.id===id);if(!p)return;$('mpos').textContent='Position '+(p.position||'');$('mpart').textContent='Part Number: '+p.partNumber;$('mdesc').textContent=p.description||'No description';$('mqty').textContent='Quantity: '+(p.quantity||'');$('copy').onclick=()=>navigator.clipboard?.writeText(p.partNumber);$('modal').classList.add('show');}
function fit(){if(!diagram?.naturalWidth||!diagram.naturalHeight||!canvas)return;const w=canvas.clientWidth,h=canvas.clientHeight;if(w<40||h<40)return;const aw=Math.max(40,w-24),ah=Math.max(40,h-24);state.scale=Math.min(aw/diagram.naturalWidth,ah/diagram.naturalHeight,1);state.x=(w-diagram.naturalWidth*state.scale)/2;state.y=(h-diagram.naturalHeight*state.scale)/2;apply();}
function apply(){diagram.style.transform=`translate(${state.x}px,${state.y}px) scale(${state.scale})`;const hs=$('hotspots');hs.style.transform=`translate(${state.x}px,${state.y}px) scale(${state.scale})`;hs.style.transformOrigin='0 0';}

function installPinchZoom(){
 const viewport=$('canvas');if(!viewport)return;
 viewport.style.touchAction='none';
 let startDistance=0,startScale=1,worldX=0,worldY=0,midX=0,midY=0,pan=null,suppressClick=false,suppressTimer=null;
 const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 const midpoint=t=>({x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2});
 viewport.addEventListener('touchstart',e=>{
  if(e.touches.length===1){pan={x:e.touches[0].clientX,y:e.touches[0].clientY,moved:false};startDistance=0;return}
  if(e.touches.length!==2)return;
  e.preventDefault();pan=null;
  const rect=viewport.getBoundingClientRect(),mid=midpoint(e.touches);
  startDistance=distance(e.touches);startScale=state.scale;
  midX=mid.x-rect.left;midY=mid.y-rect.top;
  worldX=(midX-state.x)/state.scale;worldY=(midY-state.y)/state.scale;
 },{passive:false});
 viewport.addEventListener('touchmove',e=>{
  if(e.touches.length===1&&pan){
   const t=e.touches[0],dx=t.clientX-pan.x,dy=t.clientY-pan.y;
   if(!pan.moved&&Math.hypot(t.clientX-pan.startX,t.clientY-pan.startY)>6)pan.moved=true;
   if(!pan.startX&&!pan.startY){pan.startX=pan.x;pan.startY=pan.y}
   if(Math.hypot(t.clientX-pan.startX,t.clientY-pan.startY)>6)pan.moved=true;
   if(pan.moved){e.preventDefault();state.x+=dx;state.y+=dy;apply();suppressClick=true;clearTimeout(suppressTimer);suppressTimer=setTimeout(()=>suppressClick=false,450)}
   pan.x=t.clientX;pan.y=t.clientY;return;
  }
  if(e.touches.length!==2||!startDistance)return;
  e.preventDefault();
  const next=Math.max(.05,Math.min(8,startScale*distance(e.touches)/startDistance));
  const rect=viewport.getBoundingClientRect(),mid=midpoint(e.touches),x=mid.x-rect.left,y=mid.y-rect.top;
  state.scale=next;state.x=x-worldX*next;state.y=y-worldY*next;apply();
 },{passive:false});
 const end=()=>{startDistance=0;pan=null};
 viewport.addEventListener('touchend',end,{passive:true});viewport.addEventListener('touchcancel',end,{passive:true});
 viewport.addEventListener('click',e=>{if(!suppressClick||!e.target.closest('.hot'))return;e.preventDefault();e.stopImmediatePropagation();suppressClick=false;clearTimeout(suppressTimer)},true);
}
installPinchZoom();
$('zin').onclick=()=>{state.scale=Math.min(state.scale*1.25,8);apply()};$('zout').onclick=()=>{state.scale=Math.max(state.scale/1.25,.05);apply()};$('fit').onclick=fit;$('reset').onclick=fit;$('filter').oninput=()=>renderCatalogs(state.catalogs);$('search').oninput=e=>{const q=e.target.value.toLowerCase();if(!q)return renderCatalogs(state.catalogs);const ps=state.parts.filter(p=>(p.partNumber+' '+p.description+' '+p.position+' '+p.catalog).toLowerCase().includes(q));const ids=[...new Set(ps.map(p=>p.catalog))];renderCatalogs(state.catalogs.filter(c=>ids.includes(c.id)));};$('theme').onclick=()=>document.body.classList.toggle('dark');$('close').onclick=()=>$('modal').classList.remove('show');$('modal').onclick=e=>{if(e.target.id==='modal')$('modal').classList.remove('show')};window.addEventListener('resize',()=>{if(state.current&&diagram.naturalWidth)requestAnimationFrame(fit)},{passive:true});if('ResizeObserver'in window)new ResizeObserver(()=>{if(state.current&&diagram.naturalWidth)requestAnimationFrame(fit)}).observe(canvas);
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
