const $=s=>document.querySelector(s);let catalogs=[],parts=[],hotspots=[],images=[],active=null,scale=1,loadToken=0,searchToken=0;let byImg={},byCat={};
Promise.all(['catalogs','parts','hotspots','images'].map(x=>fetch(`data/${x}.json`).then(r=>r.json()))).then(([c,p,h,i])=>{catalogs=c;parts=p;hotspots=h;images=i;images.forEach(x=>byImg[x.catalog]=x);parts.forEach(x=>(byCat[x.catalog]??=[]).push(x));renderCats();const hash=decodeURIComponent(location.hash.slice(1));if(hash)openCat(hash);});
function renderCats(){
  const q=$('#catfilter').value.trim().toLowerCase();
  const root=catalogs.find(c=>c.id==='MAC25*69557884')||catalogs.find(c=>Array.isArray(c.children)&&c.id.startsWith('MAC25*'));
  if(!root){$('#cats').innerHTML='<div class="tree-empty">Root catalog not found</div>';return}
  const assemblyNames={
    T177667:'ASSY FRONT BODY MAC25',T177668:'ASSY REAR BODY MAC25',
    PLMXA3035:'BOOM ASSEMBLY FULL POWER',T177670:'ASSY POWERTRAIN MAC25',
    T191850:'ASSY PNEUMATIC MAC25',T177672:'ASSY HYDRAULIC MAC25',
    T177673:'ASSY ELECTRICAL MAC25',T167887:'ASSY OPTIONS MAC25',
    PLMXA9001:'SERVICE KITS MAC25'
  };
  const catalogById=new Map(catalogs.map(c=>[c.id,c]));
  const childCatalogs=c=>{
    const seen=new Set();
    return (c.children||[]).map(row=>catalogById.get(row.part_number||row.id)).filter(child=>{
      if(!child||child.id===c.id||seen.has(child.id))return false;
      seen.add(child.id);return true;
    });
  };
  const labelFor=c=>assemblyNames[c.id]||c.title||c.id;
  const matches=(c)=>{
    const text=[c.id,c.title,labelFor(c),...(c.children||[]).flatMap(p=>[p.part_number,p.description,p.position])].join(' ').toLowerCase();
    return !q||text.includes(q)||childCatalogs(c).some(matches);
  };
  const expanded=new Set([root.id]);
  const renderNode=(c,level,ancestry)=>{
    const children=childCatalogs(c).filter(matches);
    const isExpanded=expanded.has(c.id);
    const hasChildren=children.length>0;
    const label=labelFor(c)+(assemblyNames[c.id]?' ('+c.id+')':'');
    let html='<div class="tree-row '+(level===0?'tree-root':'tree-node')+' '+(active===c.id?'active':'')+'" data-catalog="'+esc(c.id)+'" style="--tree-level:'+level+'">';
    if(hasChildren){html+='<button class="tree-toggle" type="button" data-toggle="'+esc(c.id)+'" aria-label="Expand/collapse '+esc(label)+'" aria-expanded="'+isExpanded+'">'+(isExpanded?'⊖':'⊕')+'</button>'}
    else{html+='<span class="tree-branch tree-leaf" aria-hidden="true">•</span>'}
    html+='<span class="tree-label">'+(level===0?'<b>'+esc(label)+'</b>':esc(label))+'</span></div>';
    if(hasChildren&&isExpanded){
      html+='<div class="tree-children">';
      for(const child of children){if(ancestry.has(child.id))continue;const next=new Set(ancestry);next.add(child.id);html+=renderNode(child,level+1,next)}
      html+='</div>';
    }
    return html;
  };
  $('#cats').innerHTML=matches(root)?renderNode(root,0,new Set([root.id])):'<div class="tree-empty">No matching catalogs</div>';
  $('#cats').querySelectorAll('[data-catalog]').forEach(row=>row.addEventListener('click',e=>{
    if(e.target.closest('.tree-toggle'))return;
    openCat(row.dataset.catalog);
  }));
  $('#cats').querySelectorAll('[data-toggle]').forEach(button=>button.addEventListener('click',e=>{
    e.stopPropagation();const id=button.dataset.toggle;const node=button.closest('.tree-row');const nextExpanded=button.getAttribute('aria-expanded')!=='true';
    if(nextExpanded)expanded.add(id);else expanded.delete(id);
    const childrenBox=node.nextElementSibling;if(childrenBox&&childrenBox.classList.contains('tree-children'))childrenBox.remove();
    button.setAttribute('aria-expanded',String(nextExpanded));button.textContent=nextExpanded?'⊖':'⊕';
    if(nextExpanded){const catalog=catalogById.get(id);const kids=childCatalogs(catalog).filter(matches);const container=document.createElement('div');container.className='tree-children';const ancestry=new Set();let parent=node;while(parent){if(parent.dataset?.catalog)ancestry.add(parent.dataset.catalog);parent=parent.parentElement?.closest('.tree-row')||null;}for(const child of kids){if(ancestry.has(child.id))continue;const next=new Set(ancestry);next.add(child.id);container.insertAdjacentHTML('beforeend',renderNode(child,(Number(node.style.getPropertyValue('--tree-level'))||0)+1,next));}node.insertAdjacentElement('afterend',container);wireTree(container);}
  }));
  function wireTree(container){
    container.querySelectorAll('[data-catalog]').forEach(row=>row.addEventListener('click',e=>{if(e.target.closest('.tree-toggle'))return;openCat(row.dataset.catalog)}));
    container.querySelectorAll('[data-toggle]').forEach(button=>button.addEventListener('click',e=>{
      e.stopPropagation();const id=button.dataset.toggle;const row=button.closest('.tree-row');const nextExpanded=button.getAttribute('aria-expanded')!=='true';
      if(nextExpanded)expanded.add(id);else expanded.delete(id);const old=row.nextElementSibling;if(old&&old.classList.contains('tree-children'))old.remove();button.setAttribute('aria-expanded',String(nextExpanded));button.textContent=nextExpanded?'⊖':'⊕';
      if(nextExpanded){const c=catalogById.get(id);const kids=childCatalogs(c).filter(matches);const box=document.createElement('div');box.className='tree-children';const ancestry=new Set([id]);let parent=row.parentElement?.closest('.tree-row');while(parent){ancestry.add(parent.dataset.catalog);parent=parent.parentElement?.closest('.tree-row')}const level=(Number(row.style.getPropertyValue('--tree-level'))||0)+1;for(const child of kids){if(ancestry.has(child.id))continue;const next=new Set(ancestry);next.add(child.id);box.insertAdjacentHTML('beforeend',renderNode(child,level,next));}row.insertAdjacentElement('afterend',box);wireTree(box);}
    }));
  }
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function openCat(id){const token=++loadToken;active=id;if(location.hash!=='#'+encodeURIComponent(id))history.replaceState(null,'','#'+encodeURIComponent(id));renderCats();let im=byImg[id];$('#crumb').textContent=(id+' — '+(catalogs.find(c=>c.id===id)?.title||''));let cv=$('#canvas'),ctx=cv.getContext('2d');$('#empty').style.display='none';$('#hotspots').innerHTML='';if(!im){cv.width=800;cv.height=500;ctx.clearRect(0,0,800,500);ctx.fillStyle='#888';ctx.fillText('No diagram for this assembly',30,40);renderResults(byCat[id]||[]);return}try{let resp=await fetch('images-web/'+encodeURIComponent(im.webImage));if(token!==loadToken)return;if(!resp.ok)throw Error(`Diagram ${im.webImage} ${resp.status}`);let image=new Image();image.src=URL.createObjectURL(await resp.blob());try{await image.decode();if(token!==loadToken)return;const sourceWidth=image.naturalWidth||Number(im.width)||800;const sourceHeight=image.naturalHeight||Number(im.height)||500;const maxCanvasDimension=6000;const renderScale=Math.min(1,maxCanvasDimension/Math.max(sourceWidth,sourceHeight));cv.width=Math.max(1,Math.round(sourceWidth*renderScale));cv.height=Math.max(1,Math.round(sourceHeight*renderScale));ctx.drawImage(image,0,0,cv.width,cv.height);$('#hotspots').style.width=cv.width+'px';$('#hotspots').style.height=cv.height+'px';scale=1;fit();drawHotspots(im.image,Number(im.width)||sourceWidth,Number(im.height)||sourceHeight)}finally{URL.revokeObjectURL(image.src)}}catch(e){if(token!==loadToken)return;console.error(e);cv.width=800;cv.height=500;ctx.clearRect(0,0,800,500);ctx.fillStyle='#f66';ctx.fillText('Diagram could not be loaded: '+e,20,30)}renderResults(byCat[id]||[])}
function drawHotspots(img,w,h){let hs=hotspots.filter(x=>x.image===img);let layer=$('#hotspots');hs.forEach(x=>{let d=document.createElement('div');d.className='hs';d.dataset.partNumber=x.part_number;d.dataset.position=x.position;d.setAttribute('role','button');d.setAttribute('aria-label',`Part ${x.part_number}, position ${x.position}`);d.tabIndex=0;d.style.left=(x.left/w*100)+'%';d.style.top=(x.top/h*100)+'%';d.style.width=((x.right-x.left)/w*100)+'%';d.style.height=((x.bottom-x.top)/h*100)+'%';d.title=`Pos ${x.position} ${x.part_number}`;d.onclick=()=>{let p=x.part_id?parts.find(y=>y.id===x.part_id):null;if(p){alert(`${p.part_number||'Part number unavailable'}\\n${p.description||''}\\nQty: ${p.qty??''}\\nPosition: ${p.position??x.position}`)}else{$('#crumb').textContent=`Position ${x.position}: no linked part record in extracted data`}};layer.appendChild(d)})}
function renderResults(list){$('#count').textContent=list.length+' parts';$('#results').innerHTML=list.slice(0,500).map(p=>`<div class="row" onclick="alert('${esc(p.part_number)}\\n${esc(p.description)}\\nQty: ${esc(p.qty)}\\nPosition: ${esc(p.position)}')"><div class="pos">${esc(p.position)}</div><div><b>${esc(p.part_number)}</b><br><span>${esc(p.description)}</span></div><div>${esc(p.qty)}</div><div>${esc(p.type)}</div></div>`).join('')}
function applyScale(){let cv=$('#canvas'),layer=$('#hotspots');if(!cv||!layer||!cv.width||!cv.height)return;cv.style.width=`${cv.width*scale}px`;cv.style.height=`${cv.height*scale}px`;cv.style.transform='none';layer.style.width=`${cv.width}px`;layer.style.height=`${cv.height}px`;layer.style.transform=`scale(${scale})`;layer.style.transformOrigin='top left';}
function fit(){let v=$('#viewer'),cv=$('#canvas');if(!v||!cv.width||!cv.height)return;let sx=Math.max(120,v.clientWidth-16)/cv.width,sy=Math.max(120,v.clientHeight-16)/cv.height;scale=Math.max(.05,Math.min(sx,sy,1));applyScale();}

function installPinchZoom(){const viewport=$('#viewer');if(!viewport)return;let startDistance=0,startScale=1,worldX=0,worldY=0,midX=0,midY=0;const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);const mid=t=>({x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2});viewport.addEventListener('touchstart',e=>{if(e.touches.length!==2)return;e.preventDefault();const r=viewport.getBoundingClientRect(),p=mid(e.touches);startDistance=dist(e.touches);startScale=scale;midX=p.x-r.left;midY=p.y-r.top;worldX=(viewport.scrollLeft+midX)/scale;worldY=(viewport.scrollTop+midY)/scale},{passive:false});viewport.addEventListener('touchmove',e=>{if(e.touches.length!==2||!startDistance)return;e.preventDefault();const next=Math.max(.05,Math.min(3,startScale*dist(e.touches)/startDistance));const r=viewport.getBoundingClientRect(),p=mid(e.touches);midX=p.x-r.left;midY=p.y-r.top;scale=next;applyScale();viewport.scrollLeft=Math.max(0,worldX*scale-midX);viewport.scrollTop=Math.max(0,worldY*scale-midY)},{passive:false});const end=()=>{startDistance=0};viewport.addEventListener('touchend',end,{passive:true});viewport.addEventListener('touchcancel',end,{passive:true});}
$('#catfilter').oninput=renderCats;$('#search').oninput=()=>{const token=++searchToken;let q=$('#search').value.trim().toLowerCase();let list=q?parts.filter(p=>(p.part_number+' '+p.description+' '+p.position+' '+p.catalog).toLowerCase().includes(q)).slice(0,500):[];if(!list.length){renderResults([]);return}const target=list[0].catalog;if(target!==active){openCat(target).then(()=>{if(token===searchToken)renderResults(list)})}else renderResults(list)};$('#fit').onclick=fit;window.addEventListener('resize',()=>{if(active&&$('#canvas')?.width&&$('#canvas')?.height)fit()});$('#zin').onclick=()=>zoom(1.2);$('#zout').onclick=()=>zoom(.8);function zoom(f){scale=Math.max(.05,Math.min(3,scale*f));applyScale()}$('#theme').onclick=()=>document.body.classList.toggle('dark');
