// -
// CONSTANTS
// -
const PALETTE=['#FFFFFF','#F5F5F4','#D6D3D1','#A8A29E','#78716C','#44403C','#1C1917',
'#EFF6FF','#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#C8102E','#A00020','#7A0015',
'#FFF1F2','#FFE4E6','#FECDD3','#FDA4AF','#FB7185','#F43F5E','#E11D48','#9F1239',
'#F0FDF4','#DCFCE7','#BBF7D0','#86EFAC','#4ADE80','#22C55E','#16A34A','#14532D',
'#FEFCE8','#FEF9C3','#FEF08A','#FDE047','#FACC15','#F59E0B','#D97706','#92400E',
'#FAF5FF','#F3E8FF','#E9D5FF','#D8B4FE','#C084FC','#A855F7','#7C3AED','#4C1D95',
'#F0FDFA','#CCFBF1','#99F6E4','#2DD4BF','#14B8A6','#0D9488','#134E4A',
'#FDF2F8','#FCE7F3','#FBCFE8','#F9A8D4','#F472B6','#EC4899','#9D174D'];

const FONTS=[
  {name:'Syne',label:'Syne - Modern'},
  {name:'Montserrat',label:'Montserrat - Clean'},
  {name:'Raleway',label:'Raleway - Elegant'},
  {name:'Poppins',label:'Poppins - Friendly'},
  {name:'Work Sans',label:'Work Sans - Professional'},
  {name:'Space Grotesk',label:'Space Grotesk - Tech'},
  {name:'Josefin Sans',label:'Josefin Sans - Geometric'},
  {name:'Oswald',label:'Oswald - Impact'},
  {name:'Bebas Neue',label:'Bebas Neue - Bold'},
  {name:'Anton',label:'Anton - Strong'},
  {name:'Abril Fatface',label:'Abril Fatface - Display'},
  {name:'Playfair Display',label:'Playfair Display - Serif'},
  {name:'Cormorant Garamond',label:'Cormorant - Literary'},
  {name:'Merriweather',label:'Merriweather - Reading'},
  {name:'Libre Baskerville',label:'Libre Baskerville - Classic'},
  {name:'Crimson Text',label:'Crimson Text - Editorial'},
  {name:'Roboto Slab',label:'Roboto Slab - Modern Serif'},
  {name:'Lato',label:'Lato - Versatile'},
  {name:'Nunito',label:'Nunito - Rounded'},
  {name:'DM Mono',label:'DM Mono - Monospace'},
  {name:'Dancing Script',label:'Dancing Script - Handwritten'},
  {name:'Special Elite',label:'Special Elite - Typewriter'},
];

const PROJ_COLS=['#C8102E','#dc2626','#16a34a','#d97706','#7c3aed','#0891b2','#db2777','#65a30d'];
const PROJECT_STATUSES=[
  {id:'draft',label:'Draft',color:'#8A8078'},
  {id:'in-progress',label:'In progress',color:'#C8102E'},
  {id:'review',label:'Review',color:'#D97706'},
  {id:'approved',label:'Approved',color:'#2D6A4F'},
  {id:'archived',label:'Archived',color:'#4B5563'}
];
const STICKY_PALS=['#fef08a','#bbf7d0','#fecaca','#bfdbfe','#e9d5ff','#fed7aa','#ccfbf1','#fce7f3'];
const STICKY_W=200, STICKY_H=170, STICKY_PAD=12;

// -
// STATE
// -
let cv, tool='select', curProj=null, curCv=null;
let projects={}, hist={}, histLock=false;
let panning=false,panStart={x:0,y:0},panBase={x:0,y:0};
let renamingProjId=null,renamingCvId=null,newCvForProj=null;
let cropRect=null,cropTarget=null;
let layers=[],activeLayerId=null,selectedLayerIds=new Set(),dragSrcIdx=null;
let propPinned=false;
let eyedropperActive=false,eyedropperTarget=null,eyedropperProp=null;
let propTarget=null;
let activeTagFilter=null;
let activeStatusFilter=null;
let homeTabActive='projects';
let _modalTags=[];
let _modalStatus='draft';
let _prePanTool='select';
let _colorHistory=[]; // last 8 used colors
let _pendingComparePayload=null;
let _lastSaveErrorToast=0;
let comparePaletteOverride=null;
let comparePickColorIndex=null;
let compareSlots=[];
let comparePendingSlot=null;
let compareReturnScreen='home-screen';
let _switchLoadSeq=0;
const _collapsedLayers=new Set();
const RULER_SIZE=20;
const GUIDE_SNAP=8;
let rulersEnabled=true;
let manualGuides={x:[],y:[]};
let smartGuides={x:[],y:[]};
let guideDrag=null;
let hoveredManualGuide=null;
let tT; // toast timer
let _clipboard=null; // cross-canvas clipboard: stores serialized Fabric object JSON // layer ids that are visually collapsed
let _imageAssetDb=null;
let _imageAssetCache=new Map();
let _imageAssetInitPromise=null;
let _workspaceDb=null;
let _workspaceInitPromise=null;
let _lastMissingAssetKeys=[];

function loadLS(){
  try{
    const r=localStorage.getItem('mbp6');
    if(r)projects=JSON.parse(r);
  }catch(e){}
  return Promise.resolve(!!Object.keys(projects||{}).length);
}

function trimNonEssentialProjectData(){
  Object.values(projects||{}).forEach(p=>{
    if(!p)return;
    p.thumbnail=null;
    if(Array.isArray(p.comparisons)){
      p.comparisons=p.comparisons.slice(0,4).map(c=>({
        id:c.id,
        name:c.name,
        canvasId:c.canvasId,
        createdAt:c.createdAt,
        summary:c.summary,
        palette:c.palette||[],
        refs:(c.refs||[]).map(r=>({name:r.name,palette:r.palette||[],tone:r.tone,mood:r.mood,contrast:r.contrast}))
      }));
    }
    if(Array.isArray(p.palettes))p.palettes=p.palettes.slice(0,12);
  });
}

async function saveLS(){
  const snapshot={v:1,projects,updatedAt:Date.now()};
  try{
    localStorage.setItem('mbp6',JSON.stringify(projects));
  }catch(e){
    console.warn('MoodBoard Pro localStorage save failed',e);
    trimNonEssentialProjectData();
    try{
      localStorage.setItem('mbp6',JSON.stringify(projects));
    }catch(e2){
      console.warn('MoodBoard Pro compact localStorage save failed',e2);
    }
    const now=Date.now();
    if(now-_lastSaveErrorToast>15000){
      toast?.('No se pudo guardar: reduce el tamaño o número de imágenes');
      _lastSaveErrorToast=now;
    }
  }
  saveWorkspaceState(snapshot).catch(()=>{});
  return true;
}

function initImageAssetStore(){
  if(_imageAssetInitPromise)return _imageAssetInitPromise;
  _imageAssetInitPromise=new Promise(resolve=>{
    if(!('indexedDB' in window)){
      resolve(false);
      return;
    }
    const req=indexedDB.open('mbp-assets',2);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('images'))db.createObjectStore('images');
      if(!db.objectStoreNames.contains('workspace'))db.createObjectStore('workspace');
    };
    req.onsuccess=()=>{
      _imageAssetDb=req.result;
      try{
        const tx=_imageAssetDb.transaction('images','readonly');
        const store=tx.objectStore('images');
        const keysReq=store.getAllKeys();
        const valsReq=store.getAll();
        let keys=null, vals=null, settled=false;
        const finish=()=>{
          if(settled||!keys||!vals)return;
          settled=true;
          keys.forEach((k,i)=>_imageAssetCache.set(String(k),vals[i]));
          resolve(true);
        };
        keysReq.onsuccess=()=>{keys=keysReq.result||[];finish();};
        valsReq.onsuccess=()=>{vals=valsReq.result||[];finish();};
        keysReq.onerror=()=>{if(!settled){settled=true;resolve(true);}};
        valsReq.onerror=()=>{if(!settled){settled=true;resolve(true);}};
      }catch(e){
        resolve(true);
      }
    };
    req.onerror=()=>resolve(false);
  });
  return _imageAssetInitPromise;
}

function putImageAsset(dataUrl){
  return putImageAssetWithKey('img_'+genId(),dataUrl);
}

function putImageAssetWithKey(key,dataUrl){
  return initImageAssetStore().then(()=>{
    const safeKey=String(key);
    _imageAssetCache.set(safeKey,dataUrl);
    if(_imageAssetDb){
      try{
        const tx=_imageAssetDb.transaction('images','readwrite');
        tx.objectStore('images').put(dataUrl,safeKey);
      }catch(e){}
    }
    return safeKey;
  });
}

function getImageAsset(key){
  return _imageAssetCache.get(String(key))||null;
}

async function getImageAssetForExport(key){
  const safeKey=String(key);
  const cached=_imageAssetCache.get(safeKey);
  if(cached)return cached;
  await initImageAssetStore();
  if(!_imageAssetDb)return null;
  return new Promise(resolve=>{
    try{
      const tx=_imageAssetDb.transaction('images','readonly');
      const req=tx.objectStore('images').get(safeKey);
      req.onsuccess=()=>{
        const data=req.result||null;
        if(data)_imageAssetCache.set(safeKey,data);
        resolve(data);
      };
      req.onerror=()=>resolve(null);
      tx.onabort=()=>resolve(null);
    }catch(e){
      resolve(null);
    }
  });
}

async function registerImageAssetFromObject(img){
  if(!img||img.type!=='image')return null;
  const src=img.getSrc?.()||img._originalElement?.src||img._element?.src||img.src||'';
  if(typeof src!=='string'||!src.startsWith('data:image/'))return null;
  const key=await putImageAsset(src);
  img.__assetKey=key;
  return key;
}

function normalizeAssetRefs(value){
  if(!value||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(normalizeAssetRefs);
  const out={};
  Object.entries(value).forEach(([k,v])=>{
    if(k==='textBaseline'&&v==='alphabetical'){
      out[k]='alphabetic';
      return;
    }
    if(k==='src'&&typeof v==='string'&&v.startsWith('mbasset:')){
      const key=v.slice(8);
      out[k]=getImageAsset(key)||v;
      return;
    }
    out[k]=normalizeAssetRefs(v);
  });
  return out;
}

function migrateCanvasImageAssets(){
  if(!cv)return Promise.resolve();
  const imgs=cv.getObjects().filter(o=>o.type==='image');
  return Promise.all(imgs.map(img=>registerImageAssetFromObject(img))).then(()=>true);
}

function loadWorkspaceState(){
  const tryLoadFromDb=(db,store,key)=>new Promise(resolve=>{
    if(!db){resolve(null);return;}
    try{
      const tx=db.transaction(store,'readonly');
      const req=tx.objectStore(store).get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>resolve(null);
    }catch(e){resolve(null);}
  });
  return initWorkspaceStore().then(async()=>{
    let state=await tryLoadFromDb(_workspaceDb,'state','workspace');
    if(state&&state.projects)return state;
    const legacy=await initImageAssetStore().then(()=>tryLoadFromDb(_imageAssetDb,'workspace','workspace'));
    if(legacy&&legacy.projects){
      saveWorkspaceState(legacy).catch(()=>{});
      return legacy;
    }
    return null;
  });
}

function saveWorkspaceState(snapshot){
  return initWorkspaceStore().then(()=>new Promise(resolve=>{
    if(!_workspaceDb){resolve(false);return;}
    try{
      const tx=_workspaceDb.transaction('state','readwrite');
      tx.objectStore('state').put(snapshot,'workspace');
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>resolve(false);
      tx.onabort=()=>resolve(false);
    }catch(e){
      resolve(false);
    }
  }));
}

function initWorkspaceStore(){
  if(_workspaceInitPromise)return _workspaceInitPromise;
  _workspaceInitPromise=new Promise(resolve=>{
    if(!('indexedDB' in window)){
      resolve(false);
      return;
    }
    const req=indexedDB.open('mbp-workspace',1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('state'))db.createObjectStore('state');
    };
    req.onsuccess=()=>{
      _workspaceDb=req.result;
      resolve(true);
    };
    req.onerror=()=>resolve(false);
  });
  return _workspaceInitPromise;
}

function collectAssetKeysFromValue(value, out=new Set()){
  if(!value||typeof value!=='object')return out;
  if(Array.isArray(value)){
    value.forEach(v=>collectAssetKeysFromValue(v,out));
    return out;
  }
  Object.entries(value).forEach(([k,v])=>{
    if(k==='src'&&typeof v==='string'&&v.startsWith('mbasset:')){
      out.add(v.slice(8));
      return;
    }
    collectAssetKeysFromValue(v,out);
  });
  return out;
}

async function compactDataImageRefs(value){
  if(!value||typeof value!=='object')return value;
  if(Array.isArray(value)){
    const arr=[];
    for(let i=0;i<value.length;i++)arr[i]=await compactDataImageRefs(value[i]);
    return arr;
  }
  const out={};
  for(const [k,v] of Object.entries(value)){
    if(k==='src'&&typeof v==='string'&&v.startsWith('data:image/')){
      const key=await putImageAsset(v);
      out[k]='mbasset:'+key;
      continue;
    }
    out[k]=await compactDataImageRefs(v);
  }
  return out;
}

async function compactCanvasJsonAssets(json){
  if(!json)return {json,changed:false};
  const parsed=typeof json==='string'?JSON.parse(json):json;
  const compacted=await compactDataImageRefs(parsed);
  const out=typeof json==='string'?JSON.stringify(compacted):compacted;
  return {json:out,changed:out!==json};
}

async function compactWorkspaceImageAssets(workspace=projects){
  let changed=false;
  for(const proj of Object.values(workspace||{})){
    for(const cvData of Object.values(proj?.canvases||{})){
      if(!cvData||!cvData.json)continue;
      const res=await compactCanvasJsonAssets(cvData.json);
      if(res.changed){
        cvData.json=res.json;
        changed=true;
      }
    }
  }
  return changed;
}

async function preloadImageAssetBundle(assets={}){
  const entries=Object.entries(assets||{});
  for(const [key,dataUrl] of entries){
    if(typeof dataUrl==='string'&&dataUrl.startsWith('data:image/')){
      await putImageAssetWithKey(key,dataUrl);
    }
  }
  return true;
}

async function buildAssetBundleForProjects(workspace=projects){
  const keys=new Set();
  Object.values(workspace||{}).forEach(proj=>{
    Object.values(proj?.canvases||{}).forEach(cvData=>{
      if(!cvData||!cvData.json)return;
      try{
        const parsed=typeof cvData.json==='string'?JSON.parse(cvData.json):cvData.json;
        collectAssetKeysFromValue(parsed,keys);
      }catch(e){}
    });
  });
  const assets={};
  _lastMissingAssetKeys=[];
  for(const key of keys){
    const data=await getImageAssetForExport(key);
    if(data)assets[key]=data;
    else _lastMissingAssetKeys.push(String(key));
  }
  return assets;
}

function createCv(projId,name){
  const id=genId();
  projects[projId].canvases[id]={name,json:null};
  return id;
}

function getCollapsedLayerIds(){return [..._collapsedLayers];}
function setCollapsedLayerIds(ids=[]){
  _collapsedLayers.clear();
  ids.forEach(id=>_collapsedLayers.add(id));
}
function normalizeGuideValues(values=[]){
  return [...new Set(values.map(v=>Math.round(Number(v))).filter(v=>Number.isFinite(v)))].sort((a,b)=>a-b);
}
function normalizeManualGuides(){
  manualGuides={
    x:normalizeGuideValues(manualGuides?.x||[]),
    y:normalizeGuideValues(manualGuides?.y||[])
  };
}
function getGuideOffset(){return rulersEnabled?RULER_SIZE:0;}
function getEditorCanvasRect(){
  const cw=document.getElementById('cw');
  return cw?cw.getBoundingClientRect():null;
}
function getEditorCanvasSize(){
  const cw=document.getElementById('cw');
  const off=getGuideOffset();
  const w=Math.max(1,Math.floor((cw?.clientWidth||0)-off));
  const h=Math.max(1,Math.floor((cw?.clientHeight||0)-off));
  return {w,h,off};
}
function screenToCanvasPoint(clientX,clientY){
  if(!cv)return new fabric.Point(clientX,clientY);
  const rect=getEditorCanvasRect();
  const off=getGuideOffset();
  const pt=new fabric.Point((clientX-(rect?.left||0))-off,(clientY-(rect?.top||0))-off);
  const inv=fabric.util.invertTransform(cv.viewportTransform);
  return fabric.util.transformPoint(pt,inv);
}
function canvasToScreenPoint(x,y){
  if(!cv)return new fabric.Point(x,y);
  const pt=fabric.util.transformPoint(new fabric.Point(x,y),cv.viewportTransform);
  const off=getGuideOffset();
  return new fabric.Point(pt.x+off,pt.y+off);
}
function renderGuideLayer(){
  const layer=document.getElementById('guide-layer');
  if(!layer)return;
  layer.innerHTML='';
  if(!cv)return;
  const off=getGuideOffset();
  const lines=[];
  manualGuides.x.forEach(x=>lines.push({axis:'x',pos:x,type:'manual'}));
  manualGuides.y.forEach(y=>lines.push({axis:'y',pos:y,type:'manual'}));
  smartGuides.x.forEach(x=>lines.push({axis:'x',pos:x,type:'auto'}));
  smartGuides.y.forEach(y=>lines.push({axis:'y',pos:y,type:'auto'}));
  if(guideDrag?.axis&&Number.isFinite(guideDrag.pos)){
    lines.push({axis:guideDrag.axis,pos:guideDrag.pos,type:'manual',preview:true});
  }
  lines.forEach(g=>{
    const el=document.createElement('div');
    el.className=`guide-line ${g.type} ${g.axis==='x'?'v':'h'}${g.preview?' preview':''}`;
    if(g.type==='manual')el.dataset.guideKey=`${g.axis}:${Math.round(g.pos)}`;
    if(g.axis==='x'){
      const x=canvasToScreenPoint(g.pos,0).x;
      el.style.left=x+'px';
      el.style.top=off+'px';
      el.style.bottom='0';
      if(g.type==='manual'){
        el.title='Double click to remove guide';
        el.addEventListener('click',e=>{e.stopPropagation();hoveredManualGuide={axis:'x',value:g.pos};renderGuideLayer();});
        el.addEventListener('dblclick',e=>{e.stopPropagation();removeManualGuide('x',g.pos);});
      }
    }else{
      const y=canvasToScreenPoint(0,g.pos).y;
      el.style.top=y+'px';
      el.style.left=off+'px';
      el.style.right='0';
      if(g.type==='manual'){
        el.title='Double click to remove guide';
        el.addEventListener('click',e=>{e.stopPropagation();hoveredManualGuide={axis:'y',value:g.pos};renderGuideLayer();});
        el.addEventListener('dblclick',e=>{e.stopPropagation();removeManualGuide('y',g.pos);});
      }
    }
    if(g.type==='manual'&&hoveredManualGuide&&hoveredManualGuide.axis===g.axis&&Math.abs(hoveredManualGuide.value-g.pos)<0.5){
      el.style.boxShadow=g.axis==='x'?'0 0 0 2px rgba(37,99,235,.18)':'0 0 0 2px rgba(37,99,235,.18)';
    }
    layer.appendChild(el);
  });
}
function formatRulerValue(v){
  const n=Math.round(v);
  if(Math.abs(n)>=1000){
    const k=n/1000;
    return (Math.round(k*10)/10).toString().replace(/\.0$/,'')+'k';
  }
  return String(n);
}
function renderRulers(){
  const top=document.getElementById('ruler-top');
  const left=document.getElementById('ruler-left');
  const corner=document.getElementById('ruler-corner');
  if(!top||!left||!corner)return;
  top.innerHTML='';
  left.innerHTML='';
  if(!rulersEnabled||!cv)return;
  const off=getGuideOffset();
  const w=cv.getWidth();
  const h=cv.getHeight();
  const start=screenToCanvasPoint(off,off);
  const end=screenToCanvasPoint(off+w,off+h);
  const minX=Math.min(start.x,end.x);
  const maxX=Math.max(start.x,end.x);
  const minY=Math.min(start.y,end.y);
  const maxY=Math.max(start.y,end.y);
  const minor=10;
  const mid=50;
  const major=100;
  const xStart=Math.floor(minX/minor)*minor-minor;
  const xEnd=Math.ceil(maxX/minor)*minor+minor;
  for(let x=xStart;x<=xEnd;x+=minor){
    const p=canvasToScreenPoint(x,0);
    if(p.x<off-40||p.x>off+w+40)continue;
    const tick=document.createElement('div');
    const isMajor=x%major===0;
    const isMid=!isMajor&&x%mid===0;
    tick.className='ruler-tick v '+(isMajor?'major':isMid?'mid':'minor');
    tick.style.left=p.x+'px';
    tick.style.top='0';
    tick.style.bottom='0';
    tick.style.width='1px';
    tick.innerHTML=`<span class="ruler-mark v" style="height:${isMajor?'12px':isMid?'9px':'5px'}"></span>${isMajor?`<span class="ruler-label top">${formatRulerValue(x)}</span>`:''}`;
    top.appendChild(tick);
  }
  const yStart=Math.floor(minY/minor)*minor-minor;
  const yEnd=Math.ceil(maxY/minor)*minor+minor;
  for(let y=yStart;y<=yEnd;y+=minor){
    const p=canvasToScreenPoint(0,y);
    if(p.y<off-40||p.y>off+h+40)continue;
    const tick=document.createElement('div');
    const isMajor=y%major===0;
    const isMid=!isMajor&&y%mid===0;
    tick.className='ruler-tick h '+(isMajor?'major':isMid?'mid':'minor');
    tick.style.top=p.y+'px';
    tick.style.left='0';
    tick.style.right='0';
    tick.style.height='1px';
    tick.innerHTML=`<span class="ruler-mark h" style="width:${isMajor?'12px':isMid?'9px':'5px'}"></span>${isMajor?`<span class="ruler-label left">${formatRulerValue(y)}</span>`:''}`;
    left.appendChild(tick);
  }
}
function fitEditorCanvas(){
  if(!cv)return;
  const {w,h}=getEditorCanvasSize();
  cv.setWidth(w);
  cv.setHeight(h);
  cv.requestRenderAll();
  renderRulers();
  renderGuideLayer();
}
function setCanvasLoading(on,msg='Loading project'){
  const cw=document.getElementById('cw');
  const txt=document.querySelector('#canvas-loading span');
  if(txt)txt.textContent=msg;
  if(cw)cw.classList.toggle('loading',!!on);
}
function syncRulerMode(){
  const cw=document.getElementById('cw');
  if(cw)cw.classList.toggle('rulers-on',rulersEnabled);
  const btn=document.getElementById('rulers-btn');
  if(btn)btn.classList.toggle('active',rulersEnabled);
}
function toggleRulers(){
  rulersEnabled=!rulersEnabled;
  syncRulerMode();
  fitEditorCanvas();
}
function addManualGuide(axis,value){
  const key=axis==='x'?'x':'y';
  manualGuides[key].push(Math.round(value));
  manualGuides[key]=normalizeGuideValues(manualGuides[key]);
  renderGuideLayer();
  commitCanvasChange({persistDelay:350});
}
function removeManualGuide(axis,value){
  const key=axis==='x'?'x':'y';
  manualGuides[key]=normalizeGuideValues(manualGuides[key].filter(v=>Math.abs(v-value)>0.5));
  hoveredManualGuide=null;
  renderGuideLayer();
  commitCanvasChange({persistDelay:350});
}
function startGuideDrag(axis,e){
  if(!rulersEnabled||!cv)return;
  guideDrag={axis,pos:axis==='x'?screenToCanvasPoint(e.clientX,e.clientY).x:screenToCanvasPoint(e.clientX,e.clientY).y};
  renderGuideLayer();
  document.addEventListener('pointermove',trackGuideDrag);
  document.addEventListener('pointerup',endGuideDrag,{once:true});
  e.preventDefault();
  e.stopPropagation();
}
function trackGuideDrag(e){
  if(!guideDrag)return;
  const p=screenToCanvasPoint(e.clientX,e.clientY);
  guideDrag.pos=guideDrag.axis==='x'?p.x:p.y;
  renderGuideLayer();
}
function endGuideDrag(e){
  if(!guideDrag)return;
  const p=screenToCanvasPoint(e.clientX,e.clientY);
  const pos=guideDrag.axis==='x'?p.x:p.y;
  const axis=guideDrag.axis;
  guideDrag=null;
  document.removeEventListener('pointermove',trackGuideDrag);
  renderGuideLayer();
  addManualGuide(axis,pos);
}
function snapToGuides(moving, opt={}){
  if(!cv||!moving)return;
  const mb=moving.getBoundingRect(true,true);
  const refsX=[
    {pos:mb.left,delta:0},
    {pos:mb.left+(mb.width/2),delta:0},
    {pos:mb.left+mb.width,delta:0}
  ];
  const refsY=[
    {pos:mb.top,delta:0},
    {pos:mb.top+(mb.height/2),delta:0},
    {pos:mb.top+mb.height,delta:0}
  ];
  const candidates={manualX:[...manualGuides.x],manualY:[...manualGuides.y],autoX:[],autoY:[]};
  cv.getObjects().forEach(o=>{
    if(o===moving||o.name==='__cropRect'||o.__guide)return;
    if(o.visible===false)return;
    const b=o.getBoundingRect(true,true);
    candidates.autoX.push(b.left,b.left+(b.width/2),b.left+b.width);
    candidates.autoY.push(b.top,b.top+(b.height/2),b.top+b.height);
  });
  const pick=(refs,positions)=>{
    let best=null;
    refs.forEach(ref=>{
      positions.forEach(pos=>{
        const diff=pos-ref.pos;
        const abs=Math.abs(diff);
        if(abs<=GUIDE_SNAP&&(!best||abs<best.abs))best={abs,delta:diff,ref:ref.pos,pos};
      });
    });
    return best;
  };
  const manualX=pick(refsX,candidates.manualX);
  const manualY=pick(refsY,candidates.manualY);
  const autoX=manualX?null:pick(refsX,candidates.autoX);
  const autoY=manualY?null:pick(refsY,candidates.autoY);
  smartGuides={x:[],y:[]};
  let dx=0,dy=0;
  if(manualX){dx+=manualX.delta;}
  else if(autoX){dx+=autoX.delta; smartGuides.x=[autoX.pos];}
  if(manualY){dy+=manualY.delta;}
  else if(autoY){dy+=autoY.delta; smartGuides.y=[autoY.pos];}
  if(dx||dy){
    moving.left+=dx;
    moving.top+=dy;
    moving.setCoords();
  }
  renderGuideLayer();
  cv.requestRenderAll();
  return !!(manualX||manualY||autoX||autoY);
}
function clearSmartGuides(){
  smartGuides={x:[],y:[]};
  renderGuideLayer();
}
function getProjectStatus(id){
  return PROJECT_STATUSES.find(s=>s.id===id)||PROJECT_STATUSES[0];
}
function projectStatusBadge(statusId){
  const s=getProjectStatus(statusId);
  return `<span class="proj-status-badge" style="--status-color:${s.color}"><span class="proj-status-dot"></span>${escHtml(s.label)}</span>`;
}
function renderProjectStatusOptions(selected='draft'){
  return PROJECT_STATUSES.map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${s.label}</option>`).join('');
}
const FABRIC_CUSTOM_PROPS=['__id','__lid','__name','__assetKey','_isSticky','_stickyColor','_isFrame','_isPolaroid'];

if(typeof fabric!=='undefined'&&fabric.Image&&fabric.Image.prototype&&!fabric.Image.prototype.__mbpToObjectPatched){
  const _origImgToObject=fabric.Image.prototype.toObject;
  fabric.Image.prototype.toObject=function(propertiesToInclude){
    const obj=_origImgToObject.call(this,propertiesToInclude);
    if(this.__assetKey)obj.src='mbasset:'+this.__assetKey;
    return obj;
  };
  fabric.Image.prototype.__mbpToObjectPatched=true;
}

function canvasJSON(){return cv.toJSON(FABRIC_CUSTOM_PROPS);}
function objectJSON(obj){return obj.toJSON(FABRIC_CUSTOM_PROPS);}
