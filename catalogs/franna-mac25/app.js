const $=s=>document.querySelector(s);let catalogs=[],parts=[],hotspots=[],images=[],active=null,scale=1,loadToken=0,searchToken=0;let byImg={},byCat={},byCatalogTitle=new Map();
Promise.all(['catalogs','parts','hotspots','images'].map(x=>fetch(`data/${x}.json`,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(x+' data HTTP '+r.status);return r.json()}))).then(([c,p,h,i])=>{catalogs=c;parts=p;hotspots=h;images=i;catalogs.forEach(c=>byCatalogTitle.set(String(c.id),String(c.title||'').trim()));images.forEach(x=>byImg[x.catalog]=x);parts.forEach(x=>(byCat[x.catalog]??=[]).push(x));renderCats();if(window.matchMedia('(max-width:700px)').matches){document.body.classList.add('catalogs-open');const menu=document.querySelector('#catalogToggle');if(menu)menu.setAttribute('aria-expanded','true');const backdrop=document.querySelector('.sidebarBackdrop');if(backdrop)backdrop.hidden=false;}const hash=decodeURIComponent(location.hash.slice(1));if(hash)openCat(hash);}).catch(error=>{console.error('MAC25 catalog initialization failed',error);const box=document.querySelector('#cats');if(box)box.innerHTML='<div class="tree-empty">Catalog data could not be loaded. Refresh the page and try again.</div>';});
const MAC25_ASSEMBLY_NAMES={T177667:'ASSY FRONT BODY MAC25',T177668:'ASSY REAR BODY MAC25',PLMXA3035:'BOOM ASSEMBLY FULL POWER',T177670:'ASSY POWERTRAIN MAC25',T191850:'ASSY PNEUMATIC MAC25',T177672:'ASSY HYDRAULIC MAC25',T177673:'ASSY ELECTRICAL MAC25',T167887:'ASSY OPTIONS MAC25',PLMXA9001:'SERVICE KITS MAC25'};
const expandedCatalogIds=new Set();
function renderCats(){
 const filter=$('#catfilter'),container=$('#cats');
 if(!filter||!container)return;
 const query=filter.value.trim().toLowerCase();
 const byId=new Map(catalogs.map(c=>[String(c.id),c]));
 const root=catalogs.find(c=>String(c.id)==='MAC25*69557884')||catalogs.find(c=>String(c.id).startsWith('MAC25*'));
 if(!root){container.innerHTML='<div class="tree-empty">Catalog hierarchy unavailable</div>';return;}
 const names={T177667:'ASSY FRONT BODY MAC25',T177668:'ASSY REAR BODY MAC25',PLMXA3035:'BOOM ASSEMBLY FULL POWER',T177670:'ASSY POWERTRAIN MAC25',T191850:'ASSY PNEUMATIC MAC25',T177672:'ASSY HYDRAULIC MAC25',T177673:'ASSY ELECTRICAL MAC25',T167887:'ASSY OPTIONS MAC25',PLMXA9001:'SERVICE KITS MAC25',PLMXA1057Q:'SUNDRY ITEMS / FUEL REPTO',PLMXA1081D:'KIT HOSE GREASELINE BEKA MAX',PLMXA1082D:'CENTRAL GREASELINE ASSEMBLY',PLMXA8036C:'FIRE EXTINGUISHER 4.5KG ASSEMBLY',PLMXS1022C:'SERVICE KIT OM906 100HR FILTERS ONLY',T131354A:'ASSY SEAT ISRI 6860/870 RH WITH ARMS',T131357A:'ASSY SEAT ISRI 6860/870 RH LONG FASTENERS',T131768C:'ASSY CABIN STANDARD AC',T137316I:'ASSY PRE DELIVERY ASSEMBLY MAC 25-4',T138394F:'ASSY CABIN AUTO MAC25-4',T138459F:'ASSY COVER FRONT BODY MAC 25-4',T138764B:'ASSY CENTER PIVOT JOINING MAC 25-4',T140170B:'ASSY CABIN GLASS MAC25',T150306A:'ASSY LIGHT WORK BONNET AT40',T151027A:'ASSY LIGHT ROTARY BONNET',T151028B:'ASSY LIGHTS WORK BOOM AT40',T151029A:'ASSY LIGHTS WORK BOOM AT40'};
 function label(c,row){return String((row&&row.description||'').trim()||(c.title&&c.title!==c.id?c.title:'')||names[c.id]||c.id);}
 function getChildren(c){const seen=new Set();return (Array.isArray(c.children)?c.children:[]).map(row=>({row,child:byId.get(String(row.part_number||row.id||''))})).filter(x=>{if(!x.child||x.child.id===c.id||seen.has(x.child.id))return false;seen.add(x.child.id);return true;});}
 function make(c,row,anc){if(anc.has(String(c.id)))return null;const next=new Set(anc);next.add(String(c.id));return {id:String(c.id),label:label(c,row),row,children:getChildren(c).map(x=>make(x.child,x.row,next)).filter(Boolean)};}
 const tree=make(root,null,new Set());
 function matches(n){return !query||[n.id,n.label,n.row&&n.row.part_number,n.row&&n.row.description,n.row&&n.row.position].join(' ').toLowerCase().includes(query)||n.children.some(matches);}
 function node(n,level,path,isRoot){if(!matches(n))return '';const kids=n.children.filter(matches),has=n.children.length>0,expanded=!!query||expandedCatalogIds.has(n.id)||isRoot;if(isRoot)expandedCatalogIds.add(n.id);const title=n.label+(isRoot?'':' ('+n.id+')');const toggle=has?'<button type="button" class="tree-toggle" data-tree-path="'+esc(path)+'" data-tree-id="'+esc(n.id)+'" aria-expanded="'+(expanded?'true':'false')+'">'+(expanded?'⊖':'⊕')+'</button>':'<span class="tree-spacer">•</span>';let out='<div class="tree-row '+(isRoot?'tree-root':'tree-node')+(active===n.id?' active':'')+'" data-catalog="'+esc(n.id)+'" style="--tree-level:'+level+'">'+toggle+'<span class="tree-label">'+esc(title)+'</span></div>';if(has)out+='<div class="tree-children" data-tree-children="'+esc(path)+'" '+(expanded?'':'hidden')+'>'+kids.map((k,i)=>node(k,level+1,path+'.'+i,false)).join('')+'</div>';return out;}
 let markup=node(tree,0,'r',true);
 // Fail-safe: always render the root and its immediate assemblies even if recursive child mapping fails.
 if(!markup||!markup.includes('tree-row')){const rows=(root.children||[]).map(row=>{const id=String(row.part_number||row.id||'');const c=byId.get(id);const title=c?label(c,row):(String(row.description||'').trim()||names[id]||id);return '<div class="tree-row tree-node" data-catalog="'+esc(id)+'" style="--tree-level:1"><span class="tree-spacer">•</span><span class="tree-label">'+esc(title+' ('+id+')')+'</span></div>';}).join('');markup='<div class="tree-row tree-root" data-catalog="'+esc(root.id)+'" style="--tree-level:0"><span class="tree-spacer">•</span><span class="tree-label">'+esc(root.title||root.id)+'</span></div>'+rows;}
 container.innerHTML=markup;
 container.querySelectorAll('.tree-toggle').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const branch=Array.from(container.querySelectorAll('[data-tree-children]')).find(el=>el.dataset.treeChildren===btn.dataset.treePath);if(!branch)return;branch.hidden=!branch.hidden;if(branch.hidden)expandedCatalogIds.delete(btn.dataset.treeId);else expandedCatalogIds.add(btn.dataset.treeId);btn.textContent=branch.hidden?'⊕':'⊖';btn.setAttribute('aria-expanded',String(!branch.hidden));}));
 container.querySelectorAll('[data-catalog]').forEach(row=>row.addEventListener('click',e=>{if(e.target.closest('.tree-toggle'))return;openCat(row.dataset.catalog);}));
}
function catRow(c,level=1,label=''){const title=label||c.title||c.id;return `<div class="tree-row tree-node ${active===c.id?'active':''}" data-catalog="${esc(c.id)}" style="--tree-level:${level}"><span class="tree-spacer"></span><span class="tree-label">${esc(title)}</span></div>`}
function partDescription(p){const description=String(p?.description??'').trim();if(description)return description;const partNumber=String(p?.part_number??'').trim();if(!partNumber)return '';const knownName=String(MAC25_ASSEMBLY_NAMES[partNumber]||'').trim();if(knownName)return knownName;const catalogTitle=String(byCatalogTitle.get(partNumber)??'').trim();if(catalogTitle&&catalogTitle!==partNumber)return catalogTitle;const samePart=parts.find(x=>String(x.part_number??'').trim()===partNumber&&String(x.description??'').trim()&&String(x.description??'').trim()!==partNumber);if(samePart)return String(samePart.description).trim();const sameHotspot=hotspots.find(x=>String(x.part_number??'').trim()===partNumber&&String(x.description??'').trim());if(sameHotspot)return String(sameHotspot.description).trim();return ''}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function openCat(id){const token=++loadToken;active=id;if(location.hash!=='#'+encodeURIComponent(id))history.replaceState(null,'','#'+encodeURIComponent(id));renderCats();let im=byImg[id];$('#crumb').textContent=(id+' — '+(catalogs.find(c=>c.id===id)?.title||''));let cv=$('#canvas'),ctx=cv.getContext('2d');$('#empty').style.display='none';$('#hotspots').innerHTML='';if(!im){cv.width=800;cv.height=500;scale=1;$('#diagramStage').style.width='800px';$('#diagramStage').style.height='500px';$('#diagramContent').style.width='800px';$('#diagramContent').style.height='500px';$('#diagramContent').style.transform='none';cv.style.width='800px';cv.style.height='500px';ctx.clearRect(0,0,800,500);ctx.fillStyle='#888';ctx.fillText('No diagram for this assembly',30,40);renderResults(byCat[id]||[]);return}try{let resp=await fetch('images-web/'+encodeURIComponent(im.webImage));if(token!==loadToken)return;if(!resp.ok)throw Error(`Diagram ${im.webImage} ${resp.status}`);let image=new Image();image.src=URL.createObjectURL(await resp.blob());try{await image.decode();if(token!==loadToken)return;const sourceWidth=image.naturalWidth||Number(im.width)||800;const sourceHeight=image.naturalHeight||Number(im.height)||500;const maxCanvasDimension=6000;const renderScale=Math.min(1,maxCanvasDimension/Math.max(sourceWidth,sourceHeight));cv.width=Math.max(1,Math.round(sourceWidth*renderScale));cv.height=Math.max(1,Math.round(sourceHeight*renderScale));$('#diagramStage').style.width=cv.width+'px';$('#diagramStage').style.height=cv.height+'px';cv.style.width=cv.width+'px';cv.style.height=cv.height+'px';ctx.drawImage(image,0,0,cv.width,cv.height);$('#hotspots').style.width=cv.width+'px';$('#hotspots').style.height=cv.height+'px';scale=1;fit();drawHotspots(id,im.image,Number(im.width)||sourceWidth,Number(im.height)||sourceHeight)}finally{URL.revokeObjectURL(image.src)}}catch(e){if(token!==loadToken)return;console.error(e);cv.width=800;cv.height=500;scale=1;$('#diagramStage').style.width='800px';$('#diagramStage').style.height='500px';$('#diagramContent').style.width='800px';$('#diagramContent').style.height='500px';$('#diagramContent').style.transform='none';cv.style.width='800px';cv.style.height='500px';ctx.clearRect(0,0,800,500);ctx.fillStyle='#f66';ctx.fillText('Diagram could not be loaded: '+e,20,30)}renderResults(byCat[id]||[])}
function findHotspotPart(x){
 const catalog=String(x.catalog??'');
 const partNumber=String(x.part_number??'').trim();
 const position=String(x.position??'').split('.')[0];
 const sameRow=(rows)=>{
  if(rows.length===1)return rows[0];
  if(rows.length>1){
   const signatures=new Set(rows.map(y=>JSON.stringify([y.part_number,y.description,y.qty,y.type,y.level])));
   if(signatures.size===1)return rows[0];
  }
  return null;
 };
 // Prefer the BOM row identified by catalog + callout position + part number.
 // IDs in the recovered export are not globally unique for a few legacy rows.
 const exact=parts.filter(y=>String(y.catalog??'')===catalog
  &&String(y.position??'').split('.')[0]===position
  &&(!partNumber||String(y.part_number??'').trim()===partNumber));
 const resolved=sameRow(exact);
 if(resolved)return resolved;
 // Use the ID only as a fallback when it resolves unambiguously.
 if(x.part_id){
  const byId=parts.filter(y=>String(y.id)===String(x.part_id)
   &&String(y.catalog??'')===catalog
   &&(!partNumber||String(y.part_number??'').trim()===partNumber));
  return sameRow(byId);
 }
 return null;
}
function drawHotspots(catalogId,img,w,h){
 const hs=hotspots.filter(x=>String(x.catalog)===String(catalogId)&&x.image===img);
 const layer=$('#hotspots');
 hs.forEach(x=>{
  const d=document.createElement('div');d.className='hs';d.dataset.partNumber=x.part_number||'';d.dataset.position=x.position;
  d.setAttribute('role','button');d.setAttribute('aria-label',`Position ${x.position}, part ${x.part_number||'not linked'}`);d.tabIndex=0;
  d.style.left=(x.left/w*100)+'%';d.style.top=(x.top/h*100)+'%';d.style.width=((x.right-x.left)/w*100)+'%';d.style.height=((x.bottom-x.top)/h*100)+'%';
  d.title=`Pos ${x.position}${x.part_number?' · '+x.part_number:''}`;
  const activate=()=>{
   const p=findHotspotPart(x);
   if(p){
    const description=partDescription(p)||String(x.description||'').trim()||'Description not available in source data';
    alert('Position: '+(x.position||'—')+'\\nPart Number: '+(p.part_number||x.part_number||'—')+'\\nDescription: '+description+'\\nQty: '+(p.qty??'—'));
    return;
   }
   if(String(x.part_number||'').trim()){
    const basePosition=String(x.position||'').split('.')[0];
    const matches=parts.filter(y=>String(y.catalog)===String(x.catalog)&&String(y.position)===basePosition&&String(y.part_number)===String(x.part_number));
    const quantities=[...new Set(matches.map(y=>String(y.qty??'').trim()).filter(Boolean))];
    const qtyLabel=quantities.length===1&&matches.length===1?quantities[0]:'Not uniquely linked to one BOM row';
    alert('Position: '+(x.position||'—')+'\\nPart Number: '+x.part_number+'\\nDescription: '+(String(x.description||'').trim()||'Description not available in source data')+'\\nQty: '+qtyLabel);
    return;
   }
   alert('Position: '+(x.position||'—')+'\\nNo matching part record was found for this callout in the extracted MAC25 BOM data.');
  };
  d.onclick=activate;
  d.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}};
  layer.appendChild(d);
 });
}
function renderResults(list){
 $('#count').textContent=list.length+' parts';
 const shown=list.slice(0,500);
 const header='<div class="row table-head" role="row"><div>Position</div><div>Part Number</div><div>Description</div><div>Qty</div></div>';
 const rows=shown.map((p,index)=>{
  const description=partDescription(p);
  return '<div class="row part-row" role="row" data-row-index="'+index+'"><div class="pos">'+esc(p.position||'—')+'</div><div class="part-number"><b>'+esc(p.part_number||'—')+'</b></div><div class="part-description">'+esc(description||'Description unavailable in source data')+'</div><div class="qty">'+esc(p.qty||'—')+'</div></div>';
 }).join('');
 const results=$('#results');
 results.innerHTML=header+rows;
 results.querySelectorAll('.part-row').forEach(row=>row.addEventListener('click',()=>{
  const p=shown[Number(row.dataset.rowIndex)];
  if(!p)return;
  alert('Part Number: '+(p.part_number||'—')+'\\nDescription: '+(partDescription(p)||'—')+'\\nQty: '+(p.qty||'—')+'\\nPosition: '+(p.position||'—'));
 }));
}
function applyScale(){let cv=$('#canvas'),stage=$('#diagramStage'),content=$('#diagramContent'),layer=$('#hotspots');if(!cv||!stage||!content||!layer||!cv.width||!cv.height)return;stage.style.width=`${cv.width*scale}px`;stage.style.height=`${cv.height*scale}px`;content.style.width=`${cv.width}px`;content.style.height=`${cv.height}px`;content.style.transform=`scale(${scale})`;content.style.transformOrigin='top left';cv.style.width=`${cv.width}px`;cv.style.height=`${cv.height}px`;layer.style.width=`${cv.width}px`;layer.style.height=`${cv.height}px`;layer.style.transform='none';}
function fit(){
 const v=$('#viewer'),cv=$('#canvas');
 if(!v||!cv||!cv.width||!cv.height)return;
 const width=v.getBoundingClientRect().width;
 // A hidden/transitioning viewer can briefly report zero width on mobile.
 // Retry a bounded number of frames rather than leaving the diagram at scale 1.
 if(width<120){let attempts=0;const retry=()=>{if(attempts++<12&&v.getBoundingClientRect().width<120){requestAnimationFrame(retry);return;}if(v.getBoundingClientRect().width>=120)fit();};requestAnimationFrame(retry);return;}
 const usableWidth=Math.max(80,width-16);
 const compact=window.matchMedia('(max-width:800px)').matches;
 const usableHeight=Math.max(100,v.clientHeight-16);
 const widthScale=usableWidth/cv.width;
 // Fit the complete diagram width on every screen. On mobile, constraining
 // both width and height made wide OEM sheets shrink to a narrow strip.
 // Keep the viewer scrollable vertically for tall sheets; pinch zoom remains available.
 scale=Math.max(.01,Math.min(1,widthScale));
 applyScale();
 v.scrollLeft=0;v.scrollTop=0;
}
let fitFrame=0;
function scheduleFit(){cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(()=>fit());}
if('ResizeObserver'in window){const viewer=$('#viewer');if(viewer)new ResizeObserver(scheduleFit).observe(viewer);}
window.addEventListener('orientationchange',()=>setTimeout(scheduleFit,120));
window.addEventListener('pageshow',scheduleFit);
if(window.visualViewport)window.visualViewport.addEventListener('resize',scheduleFit);

function installPinchZoom(){const viewport=$('#viewer');if(!viewport)return;let startDistance=0,startScale=1,worldX=0,worldY=0,midX=0,midY=0;const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);const mid=t=>({x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2});viewport.addEventListener('touchstart',e=>{if(e.touches.length!==2)return;e.preventDefault();const r=viewport.getBoundingClientRect(),p=mid(e.touches);startDistance=dist(e.touches);startScale=scale;midX=p.x-r.left;midY=p.y-r.top;worldX=(viewport.scrollLeft+midX)/scale;worldY=(viewport.scrollTop+midY)/scale},{passive:false});viewport.addEventListener('touchmove',e=>{if(e.touches.length!==2||!startDistance)return;e.preventDefault();const next=Math.max(.05,Math.min(3,startScale*dist(e.touches)/startDistance));const r=viewport.getBoundingClientRect(),p=mid(e.touches);midX=p.x-r.left;midY=p.y-r.top;scale=next;applyScale();viewport.scrollLeft=Math.max(0,worldX*scale-midX);viewport.scrollTop=Math.max(0,worldY*scale-midY)},{passive:false});const end=()=>{startDistance=0};viewport.addEventListener('touchend',end,{passive:true});viewport.addEventListener('touchcancel',end,{passive:true});}
$('#catfilter').oninput=renderCats;$('#search').oninput=()=>{const token=++searchToken;let q=$('#search').value.trim().toLowerCase();let list=q?parts.filter(p=>(p.part_number+' '+p.description+' '+p.position+' '+p.catalog).toLowerCase().includes(q)).slice(0,500):[];if(!list.length){renderResults([]);return}const target=list[0].catalog;if(target!==active){openCat(target).then(()=>{if(token===searchToken)renderResults(list)})}else renderResults(list)};$('#fit').onclick=fit;window.addEventListener('resize',()=>{if(active&&$('#canvas')?.width&&$('#canvas')?.height)fit()});$('#zin').onclick=()=>zoom(1.2);$('#zout').onclick=()=>zoom(.8);function zoom(f){scale=Math.max(.05,Math.min(3,scale*f));applyScale()}$('#theme').onclick=()=>document.body.classList.toggle('dark');
