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
let rulersEnabled=false;
let manualGuides={x:[],y:[]};
let smartGuides={x:[],y:[]};
let guideDrag=null;
let hoveredManualGuide=null;
let tT; // toast timer
let _clipboard=null; // cross-canvas clipboard: stores serialized Fabric object JSON // layer ids that are visually collapsed

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
const FABRIC_CUSTOM_PROPS=['__id','__lid','__name','_isSticky','_stickyColor','_isFrame','_isPolaroid'];

function canvasJSON(){return cv.toJSON(FABRIC_CUSTOM_PROPS);}
function objectJSON(obj){return obj.toJSON(FABRIC_CUSTOM_PROPS);}
