const $=id=>document.getElementById(id);
let catalogs=[],parts=[],hotspots=[],imageMeta=[],catalogHierarchy=null,current=null,zoom=1,dark=false,diagramRequest=0;
const imgByName=new Map(), metaByName=new Map();
Promise.all([
 fetch("data/catalogs.json").then(r=>r.json()),
 fetch("data/parts.json").then(r=>r.json()),
 fetch("data/hotspots.json").then(r=>r.json()),
 fetch("data/image-meta.json").then(r=>r.json()),
 fetch("data/catalog-hierarchy.json").then(async r=>{const packed=await r.json();if(packed.encoding==="gzip-base64"&&"DecompressionStream"in window){const bytes=Uint8Array.from(atob(packed.data),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));return JSON.parse(await new Response(stream).text())}return packed})
]).then(([c,p,h,m,tree])=>{
 catalogs=c.items||c; parts=p; hotspots=h; imageMeta=m; catalogHierarchy=tree;
 imageMeta.forEach(x=>metaByName.set(x.name,x));
 renderCatalogs(catalogs);
 const root=catalogs.find(x=>x.id==="33340.1")||catalogs.find(x=>x.title.toUpperCase().includes("AC 200-1"));
 if(root) selectCatalog(root.id);
});
function renderCatalogs(list){
const all=catalogs||[],byId=new Map(all.map(c=>[String(c.id),c])),children=new Map(),parent=catalogHierarchy?.parent||{};
const aliases=new Map();for(const c of all)for(const k of [c.id,c.variant,c.catalogId,c.catalog,c.key])if(k!==undefined&&k!==null&&String(k).trim())aliases.set(String(k).trim().toLowerCase(),String(c.id));
const resolveKey=v=>{const raw=String(v??"").trim();return byId.has(raw)?raw:(aliases.get(raw.toLowerCase())||null)};
for(const [childRaw,parRaw] of Object.entries(parent)){const child=resolveKey(childRaw),par=resolveKey(parRaw);if(!child||!par||child===par)continue;if(!children.has(par))children.set(par,[]);if(!children.get(par).includes(child))children.get(par).push(child)}
const q=$("catalogFilter").value.toLowerCase().trim();
const matches=c=>!q||(String(c.id)+" "+String(c.title)).toLowerCase().includes(q);
const memo=new Map();
function subtreeMatch(id,path=new Set()){if(memo.has(id))return memo.get(id);if(path.has(id))return false;const c=byId.get(id);if(!c)return false;const next=new Set(path);next.add(id);const yes=matches(c)||(children.get(id)||[]).some(ch=>subtreeMatch(ch,next));memo.set(id,yes);return yes}
const rootId=resolveKey(catalogHierarchy?.root);
const childIds=new Set([...children.values()].flat());
const roots=[...new Set([...(rootId?[rootId]:[]),...all.map(c=>String(c.id)).filter(id=>!childIds.has(id))])];
let shown=0;
function draw(id,path=new Set()){const c=byId.get(id);if(!c||path.has(id)||id==="0"||(q&&!subtreeMatch(id)))return "";const next=new Set(path);next.add(id);if(matches(c))shown++;const nested=(children.get(id)||[]).map(ch=>draw(ch,next)).join("");return `<div class="cat-tree-node"><div class="cat ${current?.id===c.id?"active":""}" data-v="${esc(c.id)}"><div>${esc(c.title)}</div><small>${esc(c.id)} · ${c.partCount} parts${c.hasDiagram?"":" · no diagram"}</small></div>${nested?`<div class="cat-tree-children" style="margin-left:12px;padding-left:10px;border-left:1px solid var(--border, #d1d5db)">${nested}</div>`:""}</div>`}
const el=$("catalogs");el.innerHTML=roots.map(id=>draw(id)).join("")||'<div class="diagram-message">No matching catalogs.</div>';
el.querySelectorAll("[data-v]").forEach(node=>node.onclick=()=>selectCatalog(node.dataset.v));
$("catalogCount").textContent=(q?shown:all.length)+" / "+all.length;
}
function selectCatalog(id){
 current=catalogs.find(x=>x.id===id); if(!current)return;
 renderCatalogs(catalogs); $("crumb").textContent=`AC200-1 › ${current.title} [${current.id}]`;
 renderDiagram(); renderParts(parts.filter(p=>p.catalog===id));
}
function renderDiagram(){
 const request=++diagramRequest;
 const selectedId=current.id, selectedImage=current.image;
 const src=selectedImage; const img=$("diagram");
 const wrap=$("canvasWrap");
 $("hotspots").innerHTML="";
 if(!src){
   img.removeAttribute("src");
   wrap.innerHTML='<div class="diagram-message">No diagram is available for this catalog.</div>';
   return;
 }
 // Rebuild the viewer after a catalog without an image so the canvas exists.
 if(!$("canvas")) wrap.innerHTML='<div id="canvas"><img id="diagram" alt="Exploded parts diagram"><div id="hotspots"></div></div>';
 const image=$("diagram");
 wrap.setAttribute("aria-busy","true");
 image.alt="Diagram for "+current.title;
 image.onload=()=>{if(request!==diagramRequest||current?.id!==selectedId||current?.image!==selectedImage)return;wrap.setAttribute("aria-busy","false");zoom=1;fitDiagram();renderHotspots();};
 image.onerror=()=>{if(request!==diagramRequest||current?.id!==selectedId||current?.image!==selectedImage)return;wrap.setAttribute("aria-busy","false");wrap.innerHTML='<div class="diagram-message">Diagram could not be loaded. Please check the connection or report the catalog ID: '+esc(selectedId)+'.</div>';};
 image.src="images/"+encodeURIComponent(src);
}
function renderHotspots(){
 const layer=$("hotspots"); layer.innerHTML="";
 if(!current?.image)return;
 const hs=hotspots.filter(h=>h.catalog===current.id && h.image===current.image);
 const meta=metaByName.get(current.image); if(!meta)return;
 hs.forEach(h=>{
   const d=document.createElement("div"); d.className="hot";
   d.style.left=(h.x/meta.width*100)+"%"; d.style.top=(h.y/meta.height*100)+"%";
   d.style.width=(h.w/meta.width*100)+"%"; d.style.height=(h.h/meta.height*100)+"%";
   d.title="Position "+h.position;
   d.onclick=()=>showPart(current.id,h.position,d);
   layer.appendChild(d);
 });
}
function renderParts(list){
 const body=$("parts"); body.innerHTML="";
 $("resultTitle").textContent=current?current.title:"Parts";
 $("resultCount").textContent=list.length+" records";
 list.forEach(p=>{
   const tr=document.createElement("tr");
   tr.innerHTML=`<td>${esc(p.position)}</td><td><b>${esc(p.partNumber)}</b></td><td>${esc(p.description)}</td><td>${esc(p.qty)}</td><td>${esc(p.catalog)}</td>`;
   tr.onclick=()=>showPart(p.catalog,p.position);
   body.appendChild(tr);
 });
}
function showPart(cat,pos,hot){
 const p=parts.find(x=>x.catalog===cat && x.position===pos);
 if(!p){return}
 if(hot){document.querySelectorAll(".hot").forEach(x=>x.classList.remove("sel"));hot.classList.add("sel")}
 $("mTitle").textContent=p.partNumber;
 $("mBody").innerHTML=[
 ["Description",p.description],["Position",p.position],["Quantity",p.qty],["Quantity Type",p.qtyType],
 ["Part Version",p.partVersion],["Catalog",p.catalog],["Catalog Version",p.catalogVersion],["Material Text No.",p.textNumber]
 ].map(x=>`<div class="kv"><b>${esc(x[0])}</b><span>${esc(x[1]||"—")}</span></div>`).join("");
 $("modal").classList.remove("hidden");
}
function fitDiagram(){
 const img=$("diagram"),wrap=$("canvasWrap"); if(!img?.naturalWidth||!wrap)return;
 const availableW=Math.max(120,wrap.clientWidth-16), availableH=Math.max(120,wrap.clientHeight-62);
 zoom=Math.max(.05,Math.min(availableW/img.naturalWidth,availableH/img.naturalHeight,1));
 applyZoom();
}
function applyZoom(){
 const canvas=$("canvas"),img=$("diagram");
 if(!canvas||!img)return;
 const naturalW=img.naturalWidth||img.width;
 const naturalH=img.naturalHeight||img.height;
 if(!naturalW||!naturalH)return;
 const displayW=Math.max(1,Math.round(naturalW*zoom));
 const displayH=Math.max(1,Math.round(naturalH*zoom));
 // Size the image and its hotspot layer together instead of CSS-transforming
 // an intrinsic-size canvas. Transforms leave the original layout box behind,
 // which can make the diagram appear clipped or stranded in a corner on mobile.
 canvas.style.width=displayW+"px";
 canvas.style.height=displayH+"px";
 canvas.style.transform="none";
 img.style.width=displayW+"px";
 img.style.height=displayH+"px";
 $("zoomLabel").textContent=Math.round(zoom*100)+"%";
}
$("zoomIn").onclick=()=>{zoom=Math.min(3,zoom*1.2);applyZoom()};
$("zoomOut").onclick=()=>{zoom=Math.max(.05,zoom/1.2);applyZoom()};
$("fitBtn").onclick=fitDiagram;const diagramWrap=$("canvasWrap");if("ResizeObserver" in window&&diagramWrap)new ResizeObserver(()=>{if(current?.image&&$("diagram")?.naturalWidth)fitDiagram()}).observe(diagramWrap);window.addEventListener("resize",()=>{if(current?.image)fitDiagram()});
function installTouchZoom(){
 const viewport=$("canvasWrap");if(!viewport)return;
 viewport.style.touchAction="none";
 let startDistance=0,startZoom=1,anchorX=0,anchorY=0;
 const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 const midpoint=t=>({x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2});
 const localPoint=(p,rect)=>({x:p.x-rect.left-viewport.clientLeft,y:p.y-rect.top-viewport.clientTop});
 viewport.addEventListener("touchstart",e=>{
  if(e.touches.length!==2||!$("canvas")||!$("diagram")?.naturalWidth)return;
  e.preventDefault();
  const rect=viewport.getBoundingClientRect(),mid=localPoint(midpoint(e.touches),rect);
  const style=getComputedStyle(viewport),padX=parseFloat(style.paddingLeft)||0,padY=parseFloat(style.paddingTop)||0;
  startDistance=Math.max(1,distance(e.touches));startZoom=zoom;
  // Lock the diagram point under the fingers at the start of the gesture.
  anchorX=(viewport.scrollLeft+mid.x-padX)/startZoom;
  anchorY=(viewport.scrollTop+mid.y-padY)/startZoom;
 },{passive:false});
 viewport.addEventListener("touchmove",e=>{
  if(e.touches.length!==2||!startDistance||!$("canvas")||!$("diagram")?.naturalWidth)return;
  e.preventDefault();
  const rect=viewport.getBoundingClientRect(),mid=localPoint(midpoint(e.touches),rect);
  const style=getComputedStyle(viewport),padX=parseFloat(style.paddingLeft)||0,padY=parseFloat(style.paddingTop)||0;
  zoom=Math.max(.05,Math.min(3,startZoom*distance(e.touches)/startDistance));
  applyZoom();
  // Keep the same diagram point beneath the moving midpoint.
  viewport.scrollLeft=Math.max(0,anchorX*zoom-mid.x+padX);
  viewport.scrollTop=Math.max(0,anchorY*zoom-mid.y+padY);
 },{passive:false});
 viewport.addEventListener("touchend",e=>{if(e.touches.length<2)startDistance=0},{passive:true});
 viewport.addEventListener("touchcancel",()=>{startDistance=0},{passive:true});
}
installTouchZoom();
$("close").onclick=()=>$("modal").classList.add("hidden");
$("modal").onclick=e=>{if(e.target.id==="modal")$("modal").classList.add("hidden")};
$("catalogFilter").oninput=()=>renderCatalogs(catalogs);
$("search").oninput=e=>{
 const q=e.target.value.trim().toLowerCase();
 if(!q){renderParts(parts.filter(p=>p.catalog===current?.id));return}
 const res=parts.filter(p=>[p.partNumber,p.description,p.position,p.catalog].some(v=>(v||"").toLowerCase().includes(q))).slice(0,500);
 $("resultTitle").textContent="Search results"; $("resultCount").textContent=res.length+" records";
 const body=$("parts");body.innerHTML="";
 res.forEach(p=>{const tr=document.createElement("tr");tr.innerHTML=`<td>${esc(p.position)}</td><td><b>${esc(p.partNumber)}</b></td><td>${esc(p.description)}</td><td>${esc(p.qty)}</td><td>${esc(p.catalog)}</td>`;tr.onclick=()=>{selectCatalog(p.catalog);setTimeout(()=>showPart(p.catalog,p.position),50)};body.appendChild(tr)});
};
$("themeBtn").onclick=()=>{dark=!dark;document.body.classList.toggle("dark",dark);$("themeBtn").textContent=dark?"☀":"☾"};
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
