const $=id=>document.getElementById(id);
let catalogs=[],parts=[],hotspots=[],imageMeta=[],catalogHierarchy=null,current=null,zoom=1,dark=false,diagramRequest=0;
const imgByName=new Map(), metaByName=new Map();
const ac200ExpandedCatalogs=new Set(["33340.1"]);
async function getJson(path){
 const response=await fetch(path,{cache:"no-cache"});
 if(!response.ok)throw new Error(path+" returned HTTP "+response.status);
 return response.json();
}
async function loadHierarchy(){
 try{
  const packed=await getJson("data/catalog-hierarchy.json");
  if(packed.encoding!=="gzip-base64")return packed;
  if(!("DecompressionStream" in window))throw new Error("GZIP decompression is unavailable in this browser");
  const bytes=Uint8Array.from(atob(packed.data),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
 }catch(error){
  // The catalog and diagram viewer must still start if the optional hierarchy index
  // cannot be decoded. Verified OEM parent links below will remain available.
  console.warn("AC200 hierarchy index unavailable; using verified hierarchy anchors.",error);
  return {root:"33340.1",parent:{}};
 }
}
async function loadOptionalJson(path,fallback){
 try{return await getJson(path)}
 catch(error){console.error("AC200 optional data failed:",path,error);return fallback}
}
Promise.all([
 getJson("data/catalogs.json"),
 loadOptionalJson("data/parts.json",[]),
 loadOptionalJson("data/hotspots.json",[]),
 loadOptionalJson("data/image-meta.json",[]),
 loadHierarchy()
]).then(([c,p,h,m,tree])=>{
 catalogs=c.items||c; parts=Array.isArray(p)?p:(p.items||[]); hotspots=Array.isArray(h)?h:(h.items||[]); imageMeta=Array.isArray(m)?m:(m.items||[]); catalogHierarchy=tree;
 imageMeta.forEach(x=>metaByName.set(x.name,x));
 renderCatalogs(catalogs);
 const root=catalogs.find(x=>String(x.id)==="33340.1")||catalogs.find(x=>String(x.title||"").toUpperCase().includes("AC 200-1"));
 if(root)selectCatalog(root.id);
 else throw new Error("AC200 root catalog 33340.1 is missing from data/catalogs.json");
}).catch(error=>{
 console.error("AC200 required catalog initialization failed:",error);
 const crumb=$("crumb"),wrap=$("canvasWrap");
 if(crumb)crumb.textContent="Catalog index failed to load";
 if(wrap)wrap.innerHTML='<div class="diagram-message">The AC200 catalog index could not be loaded. Check the browser connection and open the catalog again. Technical detail: '+esc(error.message||error)+'</div>';
});
const catalogLabels={
  "33340.1":"AC 200-1 (33340.1)",
  "45314212":"UNDERCARRIAGE (45314212 G)","45338212":"SUPERSTRUCTURE (45338212 B)","45337812":"ATTACHMENT (45337812 B)",
  "45142412":"MOUNTING PARTS (45142412 C)","45265312":"DRIVE (45265312 A)","45095812":"OUTRIGGERS (45095812 D)",
  "45328312":"TRAVELLING MECHANISM (45328312 _)","45294012":"TIRES (45294012 B)","45287512":"MOUNTING CABIN (45287512 D)",
  "45142512":"PNEUMATIC (45142512 B)","45081512":"HYDRAULIC (45081512 E)","45218012":"ELECTRIC (45218012 G)",
  "12666612":"CENTRAL LUBRICATION (12666612 C)","45078112":"MOUNTING PARTS (45078112 C)",
  "45212912":"SLEW GEAR / SLEW RING (45212912 _)","45267012":"DRIVE (45267012 A)",
  "45206812":"WINCHES / HOIST GEARS (45206812 D)","45318812":"COUNTERWEIGHTS (45318812 _)","45206212":"LUFFING CYLINDER (45206212 A)",
  "45203512":"MOUNTING CABIN (45203512 A)","45202012":"HYDRAULIC (45202012 F)","45176912":"ELECTRIC (45176912 E)",
  "45079012":"CENTRAL LUBE ARR. (45079012 A)","45337612":"BOOM (45337612 B)","45337412":"MAIN BOOM EXTENSION (45337412 B)",
  "45337312":"MAIN BOOM EXTENSION (45337312 A)","45338412":"MOUNTING RUNNER (45338412 A)",
  "29020912":"HEAD SHEAVE (29020912 B)","17524012":"HD ATTACHMENT (17524012 B)",
  "45079312":"HOOK BLOCKS / SINGLE LINE HOOKS (45079312 _)","45338312":"ADD. MOUNTING PARTS (45338312 A)"
};
function getCatalogTitle(c){
 const id=String(c?.id??"");
 const known=catalogLabels[id];
 if(known)return known;
 const rows=parts.filter(p=>String(p.partNumber??"")===id&&String(p.catalog??"")!==id&&String(p.description??"").trim());
 const hierarchyParent=String(catalogHierarchy?.parent?.[id]??"");
 const row=rows.find(p=>String(p.catalog??"")===hierarchyParent)||rows[0];
 const description=String(row?.description??"").trim();
 if(!description)return c?.title||id;
 const version=String(row?.partVersion??"").trim();
 const identity=[id,version&&version!=="_"?version:""].filter(Boolean).join(" ");
 return `${description} (${identity})`;
}
function renderCatalogs(list){
 const all=catalogs||[];
 const ids=all.map(c=>String(c.id));
 const byId=new Map(all.map(c=>[String(c.id),c]));
 const aliases=new Map();
 const addAlias=(value,id)=>{
  if(value===undefined||value===null)return;
  const raw=String(value).trim();if(!raw)return;
  const normal=raw.toLowerCase(),compact=normal.replace(/[\\s_-]+/g,"");
  if(!aliases.has(normal))aliases.set(normal,String(id));
  if(!aliases.has(compact))aliases.set(compact,String(id));
 };
 for(const c of all)for(const key of [c.id,c.variant,c.catalogId,c.catalog,c.key])addAlias(key,c.id);
 const resolveKey=value=>{
  const raw=String(value??"").trim();
  if(byId.has(raw))return raw;
  return aliases.get(raw.toLowerCase())||aliases.get(raw.toLowerCase().replace(/[\\s_-]+/g,""))||null;
 };
 const verifiedParent={
  "45314212":"33340.1","45338212":"33340.1","45337812":"33340.1",
  "45142412":"45314212","45265312":"45314212","45095812":"45314212","45328312":"45314212",
  "45294012":"45314212","45287512":"45314212","45142512":"45314212","45081512":"45314212",
  "45218012":"45314212","12666612":"45314212",
  "45078112":"45338212","45212912":"45338212","45267012":"45338212","45206812":"45338212",
  "45318812":"45338212","45206212":"45338212","45203512":"45338212","45202012":"45338212",
  "45176912":"45338212","45079012":"45338212",
  "45337612":"45337812","45337412":"45337812","45337312":"45337812","45338412":"45337812",
  "29020912":"45337812","17524012":"29020912","45079312":"45337812","45338312":"45337812"
 };
 const fixedRoot=resolveKey("33340.1");
 const controlledParents=new Set(["33340.1","45314212","45338212","45337812","29020912"].map(resolveKey).filter(Boolean));
 const verifiedByChild=new Map();
 for(const [childRaw,parentRaw] of Object.entries(verifiedParent)){
  const child=resolveKey(childRaw),parent=resolveKey(parentRaw);
  if(child&&parent&&child!==parent)verifiedByChild.set(child,parent);
 }
 const parentById=new Map();
 for(const [childRaw,parentRaw] of Object.entries(catalogHierarchy?.parent||{})){
  const child=resolveKey(childRaw),parent=resolveKey(parentRaw);
  if(!child||!parent||child===parent||!byId.has(child)||!byId.has(parent))continue;
  if(!parentById.has(child))parentById.set(child,parent);
 }
 for(const [child,parent] of [...parentById.entries()]){
  if(controlledParents.has(parent)||verifiedByChild.has(child))parentById.delete(child);
 }
 for(const [child,parent] of verifiedByChild)parentById.set(child,parent);
 if(fixedRoot)parentById.delete(fixedRoot);
 for(const start of ids){
  const path=[],seenAt=new Map();let node=start;
  while(node&&parentById.has(node)){
   if(seenAt.has(node)){
    const cycle=path.slice(seenAt.get(node));
    const victim=cycle.find(id=>!verifiedByChild.has(id)&&id!==fixedRoot)
      ??cycle.find(id=>id!==fixedRoot)??cycle[0];
    if(victim)parentById.delete(victim);
    break;
   }
   seenAt.set(node,path.length);path.push(node);node=parentById.get(node);
  }
 }
 const children=new Map(ids.map(id=>[id,[]]));
 for(const [child,parent] of parentById){
  if(children.has(parent)&&children.has(child)&&!children.get(parent).includes(child))children.get(parent).push(child);
 }
 const verifiedOrder=new Map();
 for(const [childRaw,parentRaw] of Object.entries(verifiedParent)){
  const child=resolveKey(childRaw),parent=resolveKey(parentRaw);
  if(!child||!parent)continue;
  if(!verifiedOrder.has(parent))verifiedOrder.set(parent,[]);
  verifiedOrder.get(parent).push(child);
 }
 children.forEach((childList,parent)=>{
  const preferred=verifiedOrder.get(parent);
  if(!preferred)return;
  const rank=new Map(preferred.map((id,index)=>[id,index]));
  childList.sort((left,right)=>{
   const a=rank.get(left),b=rank.get(right);
   return a!==undefined||b!==undefined?(a??Number.MAX_SAFE_INTEGER)-(b??Number.MAX_SAFE_INTEGER):0;
  });
 });
 const rootId=fixedRoot||resolveKey(catalogHierarchy?.root);
 let roots=[...new Set([...(rootId?[rootId]:[]),...ids.filter(id=>!parentById.has(id))])];
 const hiddenRootIds=new Set();
 const placeholderChildren=children.get("0")||[];
 if(roots.includes("0")){
  hiddenRootIds.add("0");
  roots=roots.filter(id=>id!=="0");
  roots=[...new Set([...placeholderChildren,...roots])];
 }
 const reachable=new Set();
 const markReachable=id=>{
  if(reachable.has(id))return;
  reachable.add(id);(children.get(id)||[]).forEach(markReachable);
 };
 roots.forEach(markReachable);
 for(const id of ids){
  if(hiddenRootIds.has(id)||reachable.has(id))continue;
  roots.push(id);markReachable(id);
 }
 const q=$("catalogFilter")?.value.toLowerCase().trim()||"";
 const matches=c=>!q||[c.id,c.title,getCatalogTitle(c)].join(" ").toLowerCase().includes(q);
 const memo=new Map();
 function subtreeMatch(id,path=new Set()){
  if(memo.has(id))return memo.get(id);
  if(path.has(id))return false;
  const c=byId.get(id);if(!c)return false;
  const next=new Set(path);next.add(id);
  const yes=matches(c)||(children.get(id)||[]).some(ch=>subtreeMatch(ch,next));
  memo.set(id,yes);return yes;
 }
 const renderedIds=new Set();
 function draw(id,path=new Set()){
  const c=byId.get(id);
  if(!c||path.has(id)||renderedIds.has(id)||hiddenRootIds.has(id)||(q&&!subtreeMatch(id)))return "";
  renderedIds.add(id);
  const next=new Set(path);next.add(id);
  const childIds=(children.get(id)||[]).filter(ch=>!hiddenRootIds.has(ch));
  const hasChildren=childIds.length>0;
  const expanded=ac200ExpandedCatalogs.has(id);
  const nested=childIds.map(ch=>draw(ch,next)).join("");
  return `<div class="cat-tree-node" data-node-id="${esc(id)}"><div class="ac200-native-row">${hasChildren?`<button type="button" class="ac200-native-toggle" data-toggle="${esc(id)}" aria-label="${expanded?"Collapse":"Expand"} ${esc(getCatalogTitle(c))}" aria-expanded="${expanded}">${expanded?"−":"+"}</button>`:'<span class="ac200-native-spacer"></span>'}<div class="cat ${current?.id===c.id?"active":""}" data-v="${esc(c.id)}"><div>${esc(getCatalogTitle(c))}</div><small>${esc(c.id)} · ${c.partCount} parts${c.hasDiagram?"":" · no diagram"}</small></div></div>${hasChildren?`<div class="ac200-native-children" data-parent="${esc(id)}" style="display:${expanded?"block":"none"};margin-left:12px;padding-left:10px;border-left:1px solid var(--border, #d1d5db)">${nested}</div>`:""}</div>`;
 }
 const el=$("catalogs");
 el.innerHTML=roots.map(id=>draw(id)).join("")||'<div class="diagram-message">No matching catalogs.</div>';
 el.querySelectorAll(".cat[data-v]").forEach(node=>node.onclick=()=>selectCatalog(node.dataset.v));
 el.querySelectorAll("[data-toggle]").forEach(button=>button.onclick=event=>{
  event.preventDefault();event.stopPropagation();
  const id=button.dataset.toggle;
  if(ac200ExpandedCatalogs.has(id))ac200ExpandedCatalogs.delete(id);else ac200ExpandedCatalogs.add(id);
  const branch=[...el.querySelectorAll(".ac200-native-children")].find(node=>node.dataset.parent===id);
  const expanded=ac200ExpandedCatalogs.has(id);
  if(branch)branch.style.display=expanded?"block":"none";
  button.textContent=expanded?"−":"+";
  button.setAttribute("aria-expanded",String(expanded));
  button.setAttribute("aria-label",`${expanded?"Collapse":"Expand"} ${byId.get(id)?.title||id}`);
 });
 $("catalogCount").textContent=(q?all.filter(c=>matches(c)).length:all.length)+" / "+all.length;
}
function selectCatalog(id){
 current=catalogs.find(x=>x.id===id); if(!current)return;
 renderCatalogs(catalogs); $("crumb").textContent=`AC200-1 › ${getCatalogTitle(current)} [${current.id}]`;
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
 image.dataset.fallbackStage="0";
 image.onload=()=>{if(request!==diagramRequest||current?.id!==selectedId||current?.image!==selectedImage)return;wrap.setAttribute("aria-busy","false");zoom=1;fitDiagram();renderHotspots();};
 image.onerror=()=>{
  if(request!==diagramRequest||current?.id!==selectedId||current?.image!==selectedImage)return;
  const stage=Number(image.dataset.fallbackStage||"0");
  const file=encodeURIComponent(selectedImage);
  // Try independent public asset hosts in case a browser/network blocks one source.
  if(stage===0){
   image.dataset.fallbackStage="1";
   image.src="https://raw.githubusercontent.com/satriosusanto/Terex-Partbook/main/catalogs/terex-ac200-1/images/"+file;
   return;
  }
  if(stage===1){
   image.dataset.fallbackStage="2";
   image.src="https://cdn.jsdelivr.net/gh/satriosusanto/Terex-Partbook@main/catalogs/terex-ac200-1/images/"+file;
   return;
  }
  wrap.setAttribute("aria-busy","false");
  wrap.innerHTML='<div class="diagram-message">Diagram could not be loaded from three image sources. Catalog ID: '+esc(selectedId)+' · File: '+esc(selectedImage)+'. Check the browser Network tab for the failed image requests.</div>';
 };
 image.src=new URL("images/"+encodeURIComponent(src),document.baseURI).href;
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
const filterToggle=$("filterToggle"),catalogFilter=$("catalogFilter");
if(filterToggle&&catalogFilter)filterToggle.onclick=()=>{
 const opening=catalogFilter.hidden;
 catalogFilter.hidden=!opening;
 filterToggle.setAttribute("aria-expanded",String(opening));
 if(opening)catalogFilter.focus();
 else{catalogFilter.value="";renderCatalogs(catalogs)}
};
catalogFilter.oninput=()=>renderCatalogs(catalogs);
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
