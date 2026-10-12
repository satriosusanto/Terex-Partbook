const $=id=>document.getElementById(id);
let catalogs=[],parts=[],hotspots=[],imageMeta=[],current=null,zoom=1,dark=false,diagramRequest=0;
const imgByName=new Map(), metaByName=new Map();
Promise.all([
 fetch("data/catalogs.json").then(r=>r.json()),
 fetch("data/parts.json").then(r=>r.json()),
 fetch("data/hotspots.json").then(r=>r.json()),
 fetch("data/image-meta.json").then(r=>r.json())
]).then(([c,p,h,m])=>{
 catalogs=c.items||c; parts=p; hotspots=h; imageMeta=m;
 imageMeta.forEach(x=>metaByName.set(x.name,x));
 renderCatalogs(catalogs);
 const root=catalogs.find(x=>x.id==="33340.1")||catalogs.find(x=>x.title.toUpperCase().includes("AC 200-1"));
 if(root) selectCatalog(root.id);
});
function renderCatalogs(list){
 const q=$("catalogFilter").value.toLowerCase();
 const el=$("catalogs"); el.innerHTML="";
 let shown=0;
 list.filter(x=>(x.id+" "+x.title).toLowerCase().includes(q)).forEach(c=>{
   shown++; const d=document.createElement("div"); d.className="cat"+(current?.id===c.id?" active":"");
   d.innerHTML=`<div>${esc(c.title)}</div><small>${esc(c.id)} · ${c.partCount} parts${c.hasDiagram?"":" · no diagram"}</small>`;
   d.onclick=()=>selectCatalog(c.id); el.appendChild(d);
 });
 $("catalogCount").textContent=shown+" / "+list.length;
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
$("fitBtn").onclick=fitDiagram;window.addEventListener("resize",()=>{if(current?.image)fitDiagram()});
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
