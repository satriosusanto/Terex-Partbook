const S={cats:[],parts:[],hot:{},imgs:{},meta:{},current:null,zoom:1,filteredCats:[],openGroups:new Set(['BOOM','UPPERSTRUCTURE','CARRIER','OPTIONS'])};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const catalogGroups=[{name:'BOOM',suffix:'_F'},{name:'UPPERSTRUCTURE',suffix:'_T'},{name:'CARRIER',suffix:'_P'},{name:'OPTIONS',suffix:'_O'}];
function catalogGroup(c,rootId){
 const variant=catalogGroups.find(g=>rootId&&c.id===rootId+g.suffix);
 if(variant)return variant.name;
 if(c.id===rootId)return '';
 if(/^\d+F-/.test(c.id))return 'BOOM';
 if(/^\d+T-/.test(c.id))return 'UPPERSTRUCTURE';
 if(/^90P-/.test(c.id))return 'OPTIONS';
 if(/^\d+P-/.test(c.id))return 'CARRIER';
 return 'OTHER';
}
async function getJSON(path){const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw Error(`${path} ${r.status}`);return r.json()}
function setStatus(msg,kind=''){ $('status').textContent=msg; $('status').className='status '+kind; }
async function load(){
 try{
  setStatus('Loading PartBook…');
  [S.cats,S.parts,S.hot,S.imgs,S.meta]=await Promise.all([
   getJSON('data/catalogs.json'),getJSON('data/parts.json'),getJSON('data/hotspots.json'),getJSON('data/images.json'),getJSON('data/image-meta.json')
  ]);
  $('catCount').textContent=S.cats.length; $('partTotal').textContent=S.parts.length.toLocaleString();
  initCatalogTreeExpansion();
  S.filteredCats=S.cats; renderCats();
  const hash=decodeURIComponent(location.hash.slice(1)); if(hash) openCat(hash,false);
  setStatus('Ready','ok');
 }catch(e){console.error(e);setStatus('Failed to load data','error');$('viewer').innerHTML='<div class="empty"><div class="emptyIcon">⚠</div><b>PartBook data could not be loaded</b><span>Upload the complete repository, including the <code>data</code> and <code>images</code> folders.</span></div>';}
}
function initCatalogTreeExpansion(){
 const root=S.cats.find(c=>/ BASE$/.test(c.id)); const rootId=root?.id;
 catalogGroups.forEach(g=>{
  const matches=S.cats.filter(c=>catalogGroup(c,rootId)===g.name);
  const overview=matches.find(c=>rootId&&c.id===rootId+g.suffix);
  matches.filter(c=>!overview||c.id!==overview.id).forEach(c=>{
   const m=String(c.id).match(/^(\d{2}[FTP])-(\d{4})-/);
   const family=m?m[1]:'Other catalogs';
   const subgroup=m?m[2]:'';
   S.openGroups.add(`${g.name}|family|${family}`);
   S.openGroups.add(`${g.name}|sub|${family}|${subgroup}`);
  });
 });
}
function renderCats(){
 const root=S.cats.find(c=>/ BASE$/.test(c.id)); const rootId=root?.id;
 const rootMatch=S.filteredCats.find(c=>c.id===rootId);
 const rootButton=rootMatch?`<button class="cat treeRoot ${S.current?.id===rootMatch.id?'active':''}" data-id="${esc(rootMatch.id)}"><b>${esc(rootMatch.title)}</b><small>Model overview</small></button>`:'';
 const groups=catalogGroups.map(g=>{
  const matches=S.filteredCats.filter(c=>catalogGroup(c,rootId)===g.name);
  if(!matches.length)return '';
  const overview=matches.find(c=>rootId&&c.id===rootId+g.suffix);
  const children=matches.filter(c=>!overview||c.id!==overview.id);
  const expanded=S.openGroups.has(g.name);
  const overviewButton=overview?`<button class="treeGroupOpen ${S.current?.id===overview.id?'active':''}" data-id="${esc(overview.id)}" title="Open ${esc(g.name)} overview diagram">${esc(g.name)}</button>`:`<span class="treeGroupOpen">${esc(g.name)}</span>`;
  // Catalog IDs encode a family (e.g. 01F) and a subgroup (e.g. 0000).
  // Preserve every catalog as a leaf; do not infer parent/child links from part rows.
  const families=new Map();
  children.forEach(c=>{
   const m=String(c.id).match(/^(\d{2}[FTP])-(\d{4})-/);
   const family=m?m[1]:'Other catalogs';
   const subgroup=m?m[2]:'';
   if(!families.has(family))families.set(family,new Map());
   const subs=families.get(family);
   if(!subs.has(subgroup))subs.set(subgroup,[]);
   subs.get(subgroup).push(c);
  });
  const familyHtml=[...families.entries()].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).map(([family,subs])=>{
   const familyKey=`${g.name}|family|${family}`;
   const familyOpen=S.openGroups.has(familyKey);
   const subHtml=[...subs.entries()].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).map(([subgroup,items])=>{
    const subKey=`${g.name}|sub|${family}|${subgroup}`;
    const subOpen=S.openGroups.has(subKey);
    const heading=subgroup?subgroup:'Other';
    const descriptions=items.map(c=>String(c.title||'').replace(String(c.id),'').trim()).filter(Boolean);
    const counts=new Map();descriptions.forEach(name=>counts.set(name,(counts.get(name)||0)+1));
    const ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    const labelNames=ranked.length===1?ranked[0][0]:ranked.slice(0,2).map(x=>x[0]).join(' · ')+(ranked.length>2?` · +${ranked.length-2} more`:'');
    return `<section class="catTreeSub"><div class="catGroupHead catTreeSubHead"><span class="treeSubLabel"><b>${esc(heading)}</b>${labelNames?`<small class="treeSubDescription" title="${esc([...counts.keys()].join(' · '))}">${esc(labelNames)}</small>`:''}</span><span class="treeGroupCount">${items.length}</span><button class="treeToggle" data-tree-toggle="${esc(subKey)}" aria-label="${subOpen?'Collapse':'Expand'} ${esc(family)} ${esc(heading)}" aria-expanded="${subOpen}">${subOpen?'−':'+'}</button></div><div class="catGroupItems catTreeLeaves" ${subOpen?'':'hidden'}>${items.map(c=>`<button class="cat" data-id="${esc(c.id)}"><b>${esc(c.id)}</b><small>${esc(c.title.replace(c.id,'').replace(/^\s+/,''))}</small></button>`).join('')}</div></section>`;
   }).join('');
   return `<section class="catTreeFamily"><div class="catGroupHead catTreeFamilyHead"><span class="treeSubLabel">${esc(family)}</span><span class="treeGroupCount">${[...subs.values()].reduce((n,items)=>n+items.length,0)}</span><button class="treeToggle" data-tree-toggle="${esc(familyKey)}" aria-label="${familyOpen?'Collapse':'Expand'} ${esc(family)}" aria-expanded="${familyOpen}">${familyOpen?'−':'+'}</button></div><div class="catTreeFamilyItems" ${familyOpen?'':'hidden'}>${subHtml}</div></section>`;
  }).join('');
  return `<section class="catGroup"><div class="catGroupHead">${overviewButton}<span class="treeGroupCount">${children.length}</span><button class="treeToggle" data-group="${esc(g.name)}" aria-label="${expanded?'Collapse':'Expand'} ${esc(g.name)}" aria-expanded="${expanded}">${expanded?'−':'+'}</button></div><div class="catGroupItems catTreeGroups" ${expanded?'':'hidden'}>${familyHtml}</div></section>`;
 }).join('');
 const other=S.filteredCats.filter(c=>catalogGroup(c,rootId)==='OTHER');
 const otherGroup=other.length?`<section class="catGroup"><div class="catGroupHead"><span class="treeGroupOpen">OTHER CATALOGS</span><span class="treeGroupCount">${other.length}</span></div><div class="catGroupItems">${other.map(c=>`<button class="cat" data-id="${esc(c.id)}"><b>${esc(c.id)}</b><small>${esc(c.title.replace(c.id,'').replace(/^\s+/,''))}</small></button>`).join('')}</div></section>`:'';
 $('catalogs').innerHTML=rootButton+groups+otherGroup;
 document.querySelectorAll('#catalogs [data-id]').forEach(x=>x.onclick=()=>openCat(x.dataset.id));
 document.querySelectorAll('.treeToggle[data-group]').forEach(x=>x.onclick=()=>{
  const group=x.dataset.group;
  if(S.openGroups.has(group))S.openGroups.delete(group);else S.openGroups.add(group);
  renderCats();
 });
 document.querySelectorAll('.treeToggle[data-tree-toggle]').forEach(x=>x.onclick=()=>{
  const key=x.dataset.treeToggle;
  if(S.openGroups.has(key))S.openGroups.delete(key);else S.openGroups.add(key);
  renderCats();
 });
}
function setTreeExpanded(expanded){
 const root=S.cats.find(c=>/ BASE$/.test(c.id));const rootId=root?.id;
 catalogGroups.forEach(g=>{
  S.openGroups[expanded?'add':'delete'](g.name);
  S.cats.filter(c=>catalogGroup(c,rootId)===g.name&&!(rootId&&c.id===rootId+g.suffix)).forEach(c=>{
   const m=String(c.id).match(/^(\d{2}[FTP])-(\d{4})-/);
   const family=m?m[1]:'Other catalogs',subgroup=m?m[2]:'';
   S.openGroups[expanded?'add':'delete'](`${g.name}|family|${family}`);
   S.openGroups[expanded?'add':'delete'](`${g.name}|sub|${family}|${subgroup}`);
  });
 });
 const button=$('treeExpandToggle');
 if(button){button.dataset.expanded=String(expanded);button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'Collapse tree':'Expand tree';}
 renderCats();
}
function rowsFor(id){return S.parts.filter(p=>p.catalogId===id)}
function fitZoom(){
 const image=S.current?S.imgs[S.current.id]:null;
 const meta=image?(S.meta[image]||{width:3500,height:2500}):{width:3500,height:2500};
 const widthScale=($('viewer').clientWidth-20)/1600;
 const imageHeight=1600*(Number(meta.height)||2500)/(Number(meta.width)||3500);
 const heightScale=($('viewer').clientHeight-20)/imageHeight;
 return Math.max(.1,Math.min(3,widthScale,heightScale));
}
function setCatalogMenu(open){
 document.body.classList.toggle('catalogs-open',open);
 $('catalogToggle').setAttribute('aria-expanded',String(open));
 $('sidebarBackdrop').hidden=!open;
}
function openCat(id,push=true){
 const c=S.cats.find(x=>x.id===id); if(!c)return;
 setCatalogMenu(false);
 S.current=c; S.zoom=window.innerWidth<=700?fitZoom():1;
 if(push)history.pushState({id},'',`#${encodeURIComponent(id)}`);
 renderCats();
 $('title').textContent=c.title; $('crumb').textContent=c.id;
 const rows=rowsFor(id); $('stats').textContent=`${rows.length.toLocaleString()} parts`;
 $('partCount').textContent=rows.length?rows.length.toLocaleString():''; $('resultCount').textContent='';
 $('parts').innerHTML=rows.length?rows.map((p,i)=>`<tr data-i="${i}"><td>${esc(p.pos)}</td><td class="pn">${esc(p.partNumber)}</td><td class="desc">${esc(p.description||'')}</td><td class="qty">${esc(p.qty)}</td></tr>`).join(''):'<tr><td colspan="4" class="noRows">No part rows are stored for this catalog node.</td></tr>';
 document.querySelectorAll('#parts tr[data-i]').forEach(r=>r.onclick=()=>showPart(rows[+r.dataset.i]));
 draw();
}
function draw(){
 const im=S.imgs[S.current.id];
 if(!im){$('viewer').innerHTML='<div class="empty"><b>No diagram</b><span>No diagram image is registered for this catalog.</span></div>';return}
 const web=im.replace(/\.(?:jpe?g|tiff?)$/i,'.jpg'); const meta=S.meta[im]||{width:3500,height:2500};
 S.imageHeight=Math.round(1600*meta.height/meta.width);
 $('imgName').textContent=`${im} · ${meta.width}×${meta.height}`;
 $('viewer').innerHTML=`<div class="canvas" id="canvas"><img id="diagram" src="images/${encodeURIComponent(web)}" alt="${esc(S.current.title)}"><div id="hots"></div></div>`;
 applyZoom(); const image=$('diagram');
 image.onload=()=>{
  const hs=S.hot[im]||[]; const layer=$('hots'); layer.innerHTML=hs.map(h=>{
   const l=+h.left,t=+h.top,r=+h.right,b=+h.bottom;
   const label=h.type==='N'?`Pos ${h.text}`:h.text;
   return `<button class="hot ${h.type==='G'?'group':''}" style="left:${l/meta.width*100}%;top:${t/meta.height*100}%;width:${(r-l)/meta.width*100}%;height:${(b-t)/meta.height*100}%" data-type="${esc(h.type)}" data-text="${esc(h.text)}" title="${esc(label)}"><span>${esc(h.text)}</span></button>`;
  }).join('');
  layer.querySelectorAll('.hot').forEach(x=>x.onclick=()=>handleHotspot(x.dataset.type,x.dataset.text));
 };
 image.onerror=()=>{
  $('viewer').innerHTML=`<div class="empty"><div class="emptyIcon">⚠</div><b>Diagram image could not be loaded</b><span>Expected repository file: <code>images/${esc(web)}</code></span></div>`;
 };
}
function handleHotspot(type,text){
 if(type==='G'){const target=S.cats.find(c=>c.id===text);if(target){openCat(target.id);return}}
 const rows=rowsFor(S.current.id); const p=rows.find(x=>String(x.pos)===String(text));
 if(p){showPart(p);return}
 if(type==='G'){$('q').value=text;doSearch()}
}
function applyZoom(){const image=$('diagram');if(image){image.style.width=`${1600*S.zoom}px`;image.style.height=`${Math.round(S.imageHeight*S.zoom)}px`;}$('zoomPct').textContent=Math.round(S.zoom*100)+'%';}
function setZoom(v){S.zoom=Math.max(.1,Math.min(3,v));applyZoom()}
function showPart(p){
 $('mPart').textContent=p.partNumber||'—';$('mDesc').textContent=p.description||'No description';$('mPos').textContent=p.pos||'—';$('mQty').textContent=p.qty||'—';$('mCat').textContent=p.catalogId||'—';$('copyPart').dataset.value=p.partNumber||'';$('modal').hidden=false;
}
function doSearch(){
 const q=norm($('q').value.trim()); if(!q){$('results').innerHTML='<div class="searchHint">Enter a part number, description, position, or catalog code.</div>';$('resultCount').textContent='';return}
 const out=S.parts.filter(p=>norm(`${p.partNumber} ${p.description} ${p.catalogId} ${p.pos}`).includes(q));
 $('resultCount').textContent=out.length.toLocaleString();
 $('results').innerHTML=out.length?out.slice(0,1000).map((p,i)=>`<button class="result" data-i="${i}"><b>${esc(p.partNumber)} <span>• Pos ${esc(p.pos)}</span></b><div>${esc(p.description||'')}</div><small>${esc(p.catalogId)} · Qty ${esc(p.qty)}</small></button>`).join(''):'<div class="noResult">No results found.</div>';
 document.querySelector('[data-tab="search"]').click(); document.querySelectorAll('.result[data-i]').forEach(x=>x.onclick=()=>{const p=out[+x.dataset.i];openCat(p.catalogId);setTimeout(()=>showPart(p),0)});
}
function filterCats(v){
 const q=norm(v); const rootId=S.cats.find(c=>/ BASE$/.test(c.id))?.id;
 const group=catalogGroups.find(g=>norm(g.name).includes(q));
 S.filteredCats=S.cats.filter(c=>norm(`${c.id} ${c.title}`).includes(q)||(group&&catalogGroup(c,rootId)===group.name));
 renderCats();
}
function reset(){setCatalogMenu(false);S.current=null;history.pushState({},'',location.pathname+location.search);$('q').value='';$('catFilter').value='';S.filteredCats=S.cats;renderCats();$('title').textContent='Select a catalog';$('crumb').textContent='All Catalogs';$('stats').textContent='';$('parts').innerHTML='';$('partCount').textContent='';$('imgName').textContent='';$('viewer').innerHTML='<div class="empty"><div class="emptyIcon">▧</div><b>Select a catalog</b><span>Choose a catalog from the left panel to view its exploded diagram.</span></div>'}

$('catalogToggle').onclick=()=>setCatalogMenu(!document.body.classList.contains('catalogs-open'));$('sidebarBackdrop').onclick=()=>setCatalogMenu(false);document.addEventListener('keydown',e=>{if(e.key==='Escape')setCatalogMenu(false)});window.addEventListener('resize',()=>{
 if(window.innerWidth>700)setCatalogMenu(false);
 if(S.current)setZoom(window.innerWidth<=700?fitZoom():1);
});
const viewerPointers=new Map();let pinchGesture=null,panPointer=null;
$('viewer').addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch')return;
 viewerPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(e.isTrusted)$('viewer').setPointerCapture(e.pointerId);
 if(viewerPointers.size===2){
  const [a,b]=viewerPointers.values(),image=$('diagram'),viewer=$('viewer');
  if(!image)return;
  const rect=image.getBoundingClientRect(),viewerRect=viewer.getBoundingClientRect();
  const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;
  pinchGesture={
   distance:Math.hypot(a.x-b.x,a.y-b.y),
   zoom:S.zoom,
   anchorX:(midX-rect.left)/S.zoom,
   anchorY:(midY-rect.top)/S.zoom,
   originX:rect.left-viewerRect.left-viewer.clientLeft+viewer.scrollLeft,
   originY:rect.top-viewerRect.top-viewer.clientTop+viewer.scrollTop
  };
  panPointer=null;
 }else if(viewerPointers.size===1){
  panPointer={x:e.clientX,y:e.clientY};
 }
});
$('viewer').addEventListener('pointermove',e=>{
 if(!viewerPointers.has(e.pointerId))return;
 viewerPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 const viewer=$('viewer');
 if(viewerPointers.size>=2&&pinchGesture){
  e.preventDefault();
  const [a,b]=viewerPointers.values(),distance=Math.hypot(a.x-b.x,a.y-b.y);
  const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;
  setZoom(pinchGesture.zoom*distance/pinchGesture.distance);
  const viewerRect=viewer.getBoundingClientRect();
  viewer.scrollLeft=pinchGesture.originX+pinchGesture.anchorX*S.zoom-(midX-viewerRect.left-viewer.clientLeft);
  viewer.scrollTop=pinchGesture.originY+pinchGesture.anchorY*S.zoom-(midY-viewerRect.top-viewer.clientTop);
 }else if(viewerPointers.size===1&&panPointer){
  e.preventDefault();
  viewer.scrollLeft-=e.clientX-panPointer.x;
  viewer.scrollTop-=e.clientY-panPointer.y;
  panPointer={x:e.clientX,y:e.clientY};
 }
});
function finishViewerPointer(e){
 viewerPointers.delete(e.pointerId);
 if(viewerPointers.size<2)pinchGesture=null;
 if(viewerPointers.size===1){
  const remaining=viewerPointers.values().next().value;
  panPointer={x:remaining.x,y:remaining.y};
 }else panPointer=null;
}
$('viewer').addEventListener('pointerup',finishViewerPointer);
$('viewer').addEventListener('pointercancel',finishViewerPointer);
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('partsPanel').hidden=b.dataset.tab!=='parts';$('searchPanel').hidden=b.dataset.tab!=='search'});
$('searchBtn').onclick=doSearch;$('q').onkeydown=e=>{if(e.key==='Enter')doSearch()};$('q').addEventListener('input',debounce(doSearch,220));$('clearSearch').onclick=()=>{$('q').value='';$('results').innerHTML='<div class="searchHint">Enter a part number, description, position, or catalog code.</div>';$('resultCount').textContent='';document.querySelector('[data-tab="parts"]').click()};$('catFilter').addEventListener('input',debounce(e=>filterCats(e.target.value),150));$('treeExpandToggle').onclick=()=>setTreeExpanded($('treeExpandToggle').dataset.expanded!=='true');$('resetBtn').onclick=reset;$('back').onclick=()=>{const id=decodeURIComponent(location.hash.slice(1));if(id)history.back();else reset()};
$('zoomIn').onclick=()=>setZoom(S.zoom+.1);$('zoomOut').onclick=()=>setZoom(S.zoom-.1);$('zoomFit').onclick=()=>setZoom(fitZoom());
$('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('pb-dark',document.body.classList.contains('dark')?'1':'0')};if(localStorage.getItem('pb-dark')==='1')document.body.classList.add('dark');
$('close').onclick=()=>$('modal').hidden=true;$('modal').onclick=e=>{if(e.target.id==='modal')$('modal').hidden=true};$('aboutBtn').onclick=()=>$('about').hidden=false;$('aboutClose').onclick=()=>$('about').hidden=true;$('about').onclick=e=>{if(e.target.id==='about')$('about').hidden=true};
$('copyPart').onclick=async()=>{const v=$('copyPart').dataset.value;if(v){try{await navigator.clipboard.writeText(v);$('copyPart').textContent='Copied ✓';setTimeout(()=>$('copyPart').textContent='Copy Part Number',1200)}catch{$('copyPart').textContent=v}}};
window.onpopstate=()=>{const id=decodeURIComponent(location.hash.slice(1));id?openCat(id,false):reset()};
load();
