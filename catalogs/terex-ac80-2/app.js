const S={cats:[],parts:[],hot:{},imgs:{},meta:{},current:null,zoom:1,filteredCats:[]};
const $=id=>document.getElementById(id); const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,''); const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function getJSON(p){const r=await fetch(p);if(!r.ok)throw Error(`${p} ${r.status}`);return r.json()}
async function load(){try{setStatus('Loading PartBook…');[S.cats,S.parts,S.hot,S.imgs,S.meta]=await Promise.all(['data/catalogs.json','data/parts.json','data/hotspots.json','data/images.json','data/image-meta.json'].map(getJSON));$('catCount').textContent=S.cats.length;$('partTotal').textContent=S.parts.length.toLocaleString();S.filteredCats=S.cats;renderCats();const h=decodeURIComponent(location.hash.slice(1));if(h)openCat(h,false);setStatus('Ready','ok')}catch(e){console.error(e);setStatus('Failed to load data','error');$('viewer').innerHTML='<div class="empty"><div class="emptyIcon">⚠</div><b>PartBook data could not be loaded</b><span>Make sure data and images folders are uploaded.</span></div>'}}
function setStatus(m,t=''){ $('status').textContent=m;$('status').className=`status ${t}` }
function renderCats(){ $('catalogs').innerHTML=S.filteredCats.map(c=>`<button class="cat ${S.current?.id===c.id?'active':''}" data-id="${esc(c.id)}"><b>${esc(c.id)}</b><small>${esc(c.title)}</small><em>${c.partCount||0}</em></button>`).join('');document.querySelectorAll('.cat').forEach(b=>b.onclick=()=>openCat(b.dataset.id)) }
const rowsFor=id=>S.parts.filter(p=>p.catalogId===id);
function openCat(id,push=true){const c=S.cats.find(x=>x.id===id);if(!c)return;S.current=c;S.zoom=1;if(push)history.pushState({id},'',`#${encodeURIComponent(id)}`);renderCats();$('title').textContent=`${c.id} — ${c.title}`;$('crumb').textContent='TEREX AC80-2';const rows=rowsFor(id);$('stats').textContent=`${rows.length.toLocaleString()} parts`;$('partCount').textContent=rows.length.toLocaleString();$('parts').innerHTML=rows.length?rows.map((p,i)=>`<tr data-i="${i}"><td>${esc(p.pos)}</td><td class="pn">${esc(p.partNumber)}</td><td class="desc">${esc(p.description||'')}</td><td class="qty">${esc(p.qty)}</td></tr>`).join(''):`<tr><td colspan="4" class="noRows">No parts found.</td></tr>`;document.querySelectorAll('#parts tr[data-i]').forEach(r=>r.onclick=()=>showPart(rows[Number(r.dataset.i)]));drawDiagram()}
function drawDiagram(){const src=S.imgs[S.current.id], file=S.current.image|| (src?null:null);if(!file){$('imgName').textContent='';$('viewer').innerHTML='<div class="empty"><div class="emptyIcon">▧</div><b>No diagram available</b><span>This catalog has no image registered in the source database.</span></div>';return}const meta=S.meta[src]||{width:1800,height:2545,file};$('imgName').textContent=`${src} · ${meta.width}×${meta.height}`;$('viewer').innerHTML=`<div class="canvas" id="canvas"><img id="diagram" src="images/${encodeURIComponent(file)}" alt="${esc(S.current.title)}"><div id="hots"></div></div>`;const im=$('diagram');im.onload=()=>{const hs=S.hot[src]||[];$('hots').innerHTML=hs.map(h=>{const l=Number(h.left),t=Number(h.top),r=Number(h.right),b=Number(h.bottom);return `<button class="hot" style="left:${l/meta.width*100}%;top:${t/meta.height*100}%;width:${Math.max(0,r-l)/meta.width*100}%;height:${Math.max(0,b-t)/meta.height*100}%;" data-text="${esc(h.text)}"><span>${esc(h.text)}</span></button>`}).join('');document.querySelectorAll('.hot').forEach(b=>b.onclick=()=>{const p=rowsFor(S.current.id).find(x=>String(x.pos)===String(b.dataset.text));if(p)showPart(p)});fitDiagram()};im.onerror=()=>setStatus('Diagram image failed to load','error');applyZoom()}
function applyZoom(){const c=$('canvas'),im=$('diagram');if(!c)return;c.style.transform='none';c.style.transformOrigin='top left';c.style.width=`${1600*S.zoom}px`;if(im)im.style.width='100%';$('zoomPct').textContent=`${Math.round(S.zoom*100)}%`}
function fitDiagram(){const im=$('diagram'),viewer=$('viewer');if(!im?.naturalWidth||!im.naturalHeight||!viewer)return;const availableW=Math.max(120,viewer.clientWidth-20),availableH=Math.max(120,viewer.clientHeight-20);const fitScale=Math.min(availableW/1600,availableH/(1600*im.naturalHeight/im.naturalWidth),1);setZoom(fitScale)}function setZoom(v){S.zoom=Math.max(.05,Math.min(3,v));applyZoom()}
function showPart(p){$('mPart').textContent=p.partNumber||'—';$('mDesc').textContent=p.description||'No description';$('mPos').textContent=p.pos||'—';$('mQty').textContent=p.qty||'—';$('mCat').textContent=p.catalogId||'—';$('copyPart').dataset.value=p.partNumber||'';$('modal').hidden=false}
function doSearch(){const q=norm($('q').value.trim());if(!q){$('results').innerHTML='<div class="searchHint">Enter a part number, description, position, or catalog code.</div>';return}const r=S.parts.filter(p=>norm(`${p.partNumber} ${p.description} ${p.catalogId} ${p.pos}`).includes(q));$('resultCount').textContent=r.length.toLocaleString();$('results').innerHTML=r.slice(0,1000).map((p,i)=>`<button class="result" data-i="${i}"><b>${esc(p.partNumber)} <span>• Pos ${esc(p.pos)}</span></b><div>${esc(p.description||'')}</div><small>${esc(p.catalogId)} · Qty ${esc(p.qty)}</small></button>`).join('')||'<div class="searchHint">No results.</div>';document.querySelector('[data-tab="search"]').click();document.querySelectorAll('.result[data-i]').forEach(b=>b.onclick=()=>{const p=r[Number(b.dataset.i)];openCat(p.catalogId);setTimeout(()=>showPart(p),0)})}
function installViewerGestures(){
 const viewport=$('viewer');if(!viewport)return;
 viewport.style.touchAction='none';
 const pointers=new Map();let pinch=null,drag=null,suppressClick=false,suppressTimer=null;
 const canvas=()=>$('canvas');
 function point(event){return{x:event.clientX,y:event.clientY}}
 function begin(event){
  if(!canvas())return;
  pointers.set(event.pointerId,point(event));
  if(pointers.size===2){
   const [a,b]=pointers.values(),distance=Math.hypot(a.x-b.x,a.y-b.y);
   if(!distance)return;
   pinch={distance,startScale:S.zoom};drag=null;
   for(const id of pointers.keys()){try{viewport.setPointerCapture(id)}catch(_){}}
  }else if(pointers.size===1)drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
 }
 function move(event){
  if(!pointers.has(event.pointerId))return;
  pointers.set(event.pointerId,point(event));
  if(pointers.size>=2&&pinch){
   event.preventDefault();const [a,b]=pointers.values(),midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;
   const rect=viewport.getBoundingClientRect(),c=canvas();if(!c)return;
   const cr=c.getBoundingClientRect(),localX=midX-rect.left-viewport.clientLeft,localY=midY-rect.top-viewport.clientTop;
   const originX=viewport.scrollLeft+cr.left-rect.left-viewport.clientLeft,originY=viewport.scrollTop+cr.top-rect.top-viewport.clientTop;
   const scaleBefore=S.zoom,anchorX=(viewport.scrollLeft+localX-originX)/scaleBefore,anchorY=(viewport.scrollTop+localY-originY)/scaleBefore;
   const requested=pinch.startScale*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance;
   setZoom(requested);
   viewport.scrollLeft=originX+anchorX*S.zoom-localX;viewport.scrollTop=originY+anchorY*S.zoom-localY;
   return;
  }
  if(!drag||drag.id!==event.pointerId)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)>7){drag.moved=true;try{viewport.setPointerCapture(event.pointerId)}catch(_){}}
  if(drag.moved){
   event.preventDefault();viewport.scrollLeft-=dx;viewport.scrollTop-=dy;suppressClick=true;
   clearTimeout(suppressTimer);suppressTimer=setTimeout(()=>{suppressClick=false},450);
  }
  drag.x=event.clientX;drag.y=event.clientY;
 }
 function finish(event){
  pointers.delete(event.pointerId);
  if(pointers.size<2)pinch=null;
  if(!pointers.size)drag=null;
 }
 viewport.addEventListener('pointerdown',begin);
 viewport.addEventListener('pointermove',move);
 viewport.addEventListener('pointerup',finish);
 viewport.addEventListener('pointercancel',finish);
 viewport.addEventListener('click',event=>{
  if(!suppressClick||!event.target.closest('.hot'))return;
  event.preventDefault();event.stopImmediatePropagation();suppressClick=false;clearTimeout(suppressTimer);
 },true);
 viewport.addEventListener('wheel',event=>{
  if(!event.ctrlKey||!canvas())return;
  event.preventDefault();const rect=viewport.getBoundingClientRect(),c=canvas(),cr=c.getBoundingClientRect();
  const x=event.clientX-rect.left-viewport.clientLeft,y=event.clientY-rect.top-viewport.clientTop;
  const originX=viewport.scrollLeft+cr.left-rect.left-viewport.clientLeft,originY=viewport.scrollTop+cr.top-rect.top-viewport.clientTop;
  const anchorX=(viewport.scrollLeft+x-originX)/S.zoom,anchorY=(viewport.scrollTop+y-originY)/S.zoom;
  setZoom(S.zoom*(event.deltaY<0?1.12:1/1.12));
  viewport.scrollLeft=originX+anchorX*S.zoom-x;viewport.scrollTop=originY+anchorY*S.zoom-y;
 },{passive:false});
}

$('searchBtn').onclick=doSearch;$('q').onkeydown=e=>{if(e.key==='Enter')doSearch()};$('clearSearch').onclick=()=>{$('q').value='';doSearch()};$('catFilter').oninput=e=>{const q=norm(e.target.value);S.filteredCats=S.cats.filter(c=>norm(`${c.id} ${c.title}`).includes(q));renderCats()};$('resetBtn').onclick=()=>{location.hash='';S.current=null;renderCats();$('title').textContent='Select a catalog';$('crumb').textContent='All Catalogs';$('viewer').innerHTML='<div class="empty"><div class="emptyIcon">▧</div><b>Select a catalog</b><span>Choose a catalog from the left panel to view its exploded diagram.</span></div>'};$('zoomIn').onclick=()=>setZoom(S.zoom+.25);$('zoomOut').onclick=()=>setZoom(S.zoom-.25);$('zoomFit').onclick=fitDiagram;installViewerGestures();window.addEventListener('resize',()=>{if(S.current)fitDiagram()});$('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('ac80-dark',document.body.classList.contains('dark')?'1':'0')};if(localStorage.getItem('ac80-dark')==='1')document.body.classList.add('dark');$('aboutBtn').onclick=()=>$('about').hidden=false;$('aboutClose').onclick=()=>$('about').hidden=true;$('close').onclick=()=>$('modal').hidden=true;$('copyPart').onclick=async()=>{const v=$('copyPart').dataset.value;if(v)await navigator.clipboard.writeText(v)};document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const s=b.dataset.tab;$('partsPanel').hidden=s!=='parts';$('searchPanel').hidden=s!=='search'});$('back').onclick=()=>history.length>1?history.back():$('resetBtn').click();window.onpopstate=()=>{const id=decodeURIComponent(location.hash.slice(1));if(id)openCat(id,false)};load();
