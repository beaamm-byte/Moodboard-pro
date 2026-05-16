function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function closeSearchDropdown() {
  const dd = document.getElementById('search-dropdown');
  if (dd) dd.style.display = 'none';
  const inp = document.getElementById('home-search');
  if (inp) inp.value = '';
  renderHome();
}

// Close dropdown when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) closeSearchDropdown();
});
// -
// WELCOME POPUP - shows once on first visit
// -
// -
// CUSTOM CONFIRM DIALOG (replaces native confirm())
// -
function customConfirm(msg, onOk, title='¿Estás segura?', okLabel='Eliminar', okDanger=true){
  const ov=document.getElementById('confirm-overlay');
  document.getElementById('confirm-title').textContent=title;
  document.getElementById('confirm-msg').textContent=msg;
  const okBtn=document.getElementById('confirm-ok');
  okBtn.textContent=okLabel;
  okBtn.style.background=okDanger?'var(--red)':'var(--accent)';
  okBtn.style.borderColor=okDanger?'var(--red)':'var(--accent)';
  ov.classList.add('on');
  const close=()=>ov.classList.remove('on');
  okBtn.onclick=()=>{ close(); onOk(); };
  document.getElementById('confirm-cancel').onclick=close;
}

// -
// FEEDBACK
// -
function openFeedback(){ openM('m-feedback'); }
function sendFeedback(){
  const email=document.getElementById('fb-email').value.trim();
  const msg=document.getElementById('fb-msg').value.trim();
  if(!msg)return toast('Por favor escribe un mensaje');
  if(!email||!/\S+@\S+\.\S+/.test(email))return toast('Por favor incluye tu correo para que pueda responderte');

  const btn=document.querySelector('#m-feedback .mbtn.pri');
  if(btn){btn.textContent='Enviando...';btn.disabled=true;}

  // Formspree - reemplaza el ID con el tuyo de formspree.io
  // Para activar: ve a https://formspree.io - New Form - pega tu email - copia el endpoint
  const FORMSPREE_ENDPOINT='https://formspree.io/f/mzdynnlv';

  fetch(FORMSPREE_ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({
      email,
      message:msg,
      _subject:'MOODBOARD-PRO',
      _replyto:email,
    })
  })
  .then(r=>{
    if(r.ok){
      closeM('m-feedback');
      document.getElementById('fb-email').value='';
      document.getElementById('fb-msg').value='';
      toast('Mensaje enviado. ¡Gracias por tu feedback!');
    } else {
      // Fallback: open mailto if Formspree fails
      const subject=encodeURIComponent('MOODBOARD-PRO');
      const body=encodeURIComponent(`De: ${email}\n\n${msg}`);
      window.open(`mailto:contact@beatrizmoron.com?subject=${subject}&body=${body}`);
      closeM('m-feedback');
      toast('Se ha abierto tu correo como alternativa');
    }
  })
  .catch(()=>{
    // Network error - fallback to mailto
    const subject=encodeURIComponent('MOODBOARD-PRO');
    const body=encodeURIComponent(`De: ${email}\n\n${msg}`);
    window.open(`mailto:contact@beatrizmoron.com?subject=${subject}&body=${body}`);
    closeM('m-feedback');
    toast('Sin conexión - se ha abierto tu correo');
  })
  .finally(()=>{
    if(btn){btn.textContent='Enviar >';btn.disabled=false;}
  });
}
// -
// CANVAS ITEM RIGHT-CLICK MENU
// -
let _cvCtxPid=null, _cvCtxCid=null;
function openCvCtx(pid,cid,x,y){
  _cvCtxPid=pid; _cvCtxCid=cid;
  const m=document.getElementById('cv-ctxm');
  m.style.left=x+'px'; m.style.top=y+'px'; m.style.display='block';
  document.getElementById('cvc-switch').onclick=()=>{ closeCvCtx(); switchCv(pid,cid); };
  document.getElementById('cvc-rename').onclick=()=>{ closeCvCtx(); startRenCv(pid,cid,{stopPropagation:()=>{}}); };
  document.getElementById('cvc-dupe').onclick=()=>{ closeCvCtx(); duplicateCanvas(pid,cid); };
  document.getElementById('cvc-pdf').onclick=()=>{ closeCvCtx(); exportCanvasPDF(pid,cid); };
  document.getElementById('cvc-del').onclick=()=>{ closeCvCtx(); delCv(pid,cid,{stopPropagation:()=>{}}); };
}
function closeCvCtx(){ document.getElementById('cv-ctxm').style.display='none'; }
document.addEventListener('click',()=>closeCvCtx());
document.addEventListener('keydown',e=>{ if(e.key==='Escape')closeCvCtx(); });

function duplicateCanvas(pid,cid){
  autoSave();
  const src=projects[pid].canvases[cid];
  const newId=genId();
  const newName=src.name+' copy';
  projects[pid].canvases[newId]={name:newName, json:src.json?JSON.parse(JSON.stringify(src.json)):null};
  saveLS(); renderCvList(); toast(`Canvas duplicated: "${newName}"`);
}

function exportCanvasPDF(pid,cid){
  // If it's the current canvas, export directly
  if(pid===curProj&&cid===curCv){ expPDF(); return; }
  // Otherwise switch to it first, then export
  const prev={pid:curProj,cid:curCv};
  switchCv(pid,cid);
  setTimeout(()=>{
    expPDF();
    // Switch back after export
    setTimeout(()=>switchCv(prev.pid,prev.cid),500);
  },300);
}
function initWelcome(){
  if(!localStorage.getItem('mbp_welcomed')){
    document.getElementById('welcome-overlay').style.display='flex';
  }
}
function closeWelcome(){
  document.getElementById('welcome-overlay').style.display='none';
  localStorage.setItem('mbp_welcomed','1');
}
function closeWelcomeAndOpenGuide(){
  closeWelcome();
  setTimeout(()=>openGuide(),200);
}
function openGuide(){
  document.getElementById('guide-overlay').classList.add('on');
  switchGuideTab('guide'); // always open on guide tab
}
function closeGuide(){
  document.getElementById('guide-overlay').classList.remove('on');
}
function switchGuideTab(tab){
  const isGuide=tab==='guide';
  document.getElementById('guide-body').style.display=isGuide?'block':'none';
  document.getElementById('guide-about-panel').style.display=isGuide?'none':'block';
  document.getElementById('gtab-guide').classList.toggle('active',isGuide);
  document.getElementById('gtab-about').classList.toggle('active',!isGuide);
}
document.addEventListener('DOMContentLoaded',()=>{
  const ov=document.getElementById('welcome-overlay');
  if(ov)ov.addEventListener('click',e=>{if(e.target===ov)closeWelcome();});
  const gov=document.getElementById('guide-overlay');
  if(gov)gov.addEventListener('click',e=>{if(e.target===gov)closeGuide();});
});
window.addEventListener('load',()=>initWelcome());

function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('on');clearTimeout(tT);tT=setTimeout(()=>el.classList.remove('on'),2800);}

// -
// SESSION TIMER
// -
let sessionStart=null;
function startSessionTimer(){
  sessionStart=Date.now();
  const el=document.getElementById('session-timer');
  if(el)el.style.display='';
  if(window._timerInterval)clearInterval(window._timerInterval);
  window._timerInterval=setInterval(()=>{
    const s=Math.floor((Date.now()-sessionStart)/1000);
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
    const el2=document.getElementById('session-timer');
    if(el2)el2.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  },1000);
}

// -
// ZEN MODE (Presentation)
// -
function toggleZen(){
  document.body.classList.toggle('zen-mode');
  const isZen = document.body.classList.contains('zen-mode');
  const btn = document.getElementById('zen-btn');
  if(btn) btn.classList.toggle('active', isZen);
  // Never touch cv.backgroundColor - CSS handles the white bg via body.zen-mode #cw
  if(cv) cv.renderAll();

  if(isZen){
    renderZenStrip();
    const firstCanvas=Object.keys(projects[curProj]?.canvases||{})[0];
    if(curProj&&curCv&&firstCanvas&&!projects[curProj].canvases[curCv]) switchCv(curProj, firstCanvas);
  } else {
    const strip = document.getElementById('zen-cv-strip');
    if(strip) strip.innerHTML='';
  }
}

function renderZenStrip(){
  const strip=document.getElementById('zen-cv-strip');
  if(!strip||!curProj||!projects[curProj])return;
  const entries=Object.entries(projects[curProj].canvases||{});
  const idx=Math.max(0, entries.findIndex(([cid])=>cid===curCv));
  const total=entries.length;
  const projName=projects[curProj].name||'Project';
  const cvName=projects[curProj].canvases[curCv]?.name||'Canvas';
  strip.innerHTML='';

  const meta=document.createElement('div');
  meta.className='zen-strip-meta';
  meta.innerHTML=`<div class="zen-strip-proj">${escHtml(projName)}</div><div class="zen-strip-cv">${escHtml(cvName)}</div><div class="zen-strip-count">${idx+1}/${total} canvases</div>`;
  strip.appendChild(meta);

  const prev=document.createElement('button');
  prev.className='zen-nav';
  prev.title='Previous canvas';
  prev.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
  prev.onclick=()=>zenStep(-1);
  strip.appendChild(prev);

  const list=document.createElement('div');
  list.className='zen-cv-list';
  entries.forEach(([cid,cvData])=>{
    const b=document.createElement('button');
    b.className='zen-cv-btn'+(cid===curCv?' active':'');
    b.textContent=cvData.name;
    b.onclick=()=>switchZenCanvas(cid);
    list.appendChild(b);
  });
  strip.appendChild(list);

  const next=document.createElement('button');
  next.className='zen-nav';
  next.title='Next canvas';
  next.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
  next.onclick=()=>zenStep(1);
  strip.appendChild(next);

  const hint=document.createElement('div');
  hint.className='zen-shortcut';
  hint.textContent='Esc · exit  Arrow keys · navigate';
  strip.appendChild(hint);
}

function switchZenCanvas(cid){
  if(!curProj||!projects[curProj]||!projects[curProj].canvases[cid])return;
  const cw=document.getElementById('cw');
  cw?.classList.add('zen-fade');
  switchCv(curProj,cid);
  renderZenStrip();
  setTimeout(()=>cw?.classList.remove('zen-fade'),180);
}

function zenStep(delta){
  if(!curProj||!projects[curProj])return;
  const ids=Object.keys(projects[curProj].canvases||{});
  if(!ids.length)return;
  const idx=Math.max(0,ids.indexOf(curCv));
  const nextId=ids[(idx+delta+ids.length)%ids.length];
  switchZenCanvas(nextId);
}

// -
// TAGS - Modal helpers
// -
function openProjModal(id,name,tags){
  _modalTags=[...(tags||[])];
  document.getElementById('m-proj-t').textContent=id?'Edit Project':'New Project';
  document.getElementById('m-proj-n').value=name||('Project '+(Object.keys(projects).length+1));
  renamingProjId=id||null;
  renderModalTagChips();
  openM('m-proj');
  setTimeout(()=>document.getElementById('m-proj-n').select(),40);
}

function addTagFromModal(){
  const inp=document.getElementById('m-proj-tag-input');
  const v=inp.value.trim().toLowerCase().replace(/\s+/g,'-').slice(0,20);
  if(v&&!_modalTags.includes(v)){_modalTags.push(v);renderModalTagChips();}
  inp.value='';inp.focus();
}
function removeModalTag(tag){_modalTags=_modalTags.filter(t=>t!==tag);renderModalTagChips();}
function renderModalTagChips(){
  const c=document.getElementById('m-proj-tag-chips');
  c.innerHTML=_modalTags.map(t=>`<span class="tag-chip">${t}<span class="tag-x" onclick="removeModalTag('${t}')">x</span></span>`).join('');
}

// -
// TRASH / SOFT DELETE
// -
function switchTab(tab){
  homeTabActive=tab;
  document.getElementById('tab-projects').classList.toggle('active',tab==='projects');
  document.getElementById('tab-trash').classList.toggle('active',tab==='trash');
  renderHome();
}

// -
// LAYER LOCK
// -
function toggleLayerLock(id,e){
  e.stopPropagation();
  const layer=layers.find(l=>l.id===id); if(!layer)return;
  layer.locked=!layer.locked;
  // Apply to fabric objects
  cv.getObjects().forEach(o=>{
    if(o.__lid===id){
      if(layer.locked){o.selectable=false;o.evented=false;}
      else if(layer.visible&&tool==='select'){o.selectable=true;o.evented=true;}
    }
  });
  cv.discardActiveObject(); cv.renderAll(); renderLayers(); commitCanvasChange({persistDelay:500});
  toast(layer.locked?`Layer "${layer.name}" locked`:`Layer "${layer.name}" unlocked`);
}

// -
// SMART GUIDES
// -
const SG_THRESH=6; // snap threshold in px
let _sgLines=[];

function clearSmartGuides(){
  _sgLines.forEach(l=>l.remove());
  _sgLines=[];
}

function showSmartGuides(opt){
  clearSmartGuides();
  const moving=opt.target; if(!moving)return;
  const mb=moving.getBoundingRect(true,true);
  const mCX=mb.left+mb.width/2, mCY=mb.top+mb.height/2;
  const cw=document.getElementById('cw');

  cv.getObjects().forEach(o=>{
    if(o===moving||o.name==='__cropRect')return;
    const ob=o.getBoundingRect(true,true);
    const oCX=ob.left+ob.width/2, oCY=ob.top+ob.height/2;

    // Center X alignment
    if(Math.abs(mCX-oCX)<SG_THRESH){
      const line=document.createElement('div');
      line.className='sg-line v'; line.style.left=oCX+'px';
      cw.appendChild(line); _sgLines.push(line);
    }
    // Center Y alignment
    if(Math.abs(mCY-oCY)<SG_THRESH){
      const line=document.createElement('div');
      line.className='sg-line h'; line.style.top=oCY+'px';
      cw.appendChild(line); _sgLines.push(line);
    }
    // Edge alignments: left edge
    if(Math.abs(mb.left-ob.left)<SG_THRESH||Math.abs(mb.left-(ob.left+ob.width))<SG_THRESH){
      const x=Math.abs(mb.left-ob.left)<SG_THRESH?ob.left:ob.left+ob.width;
      const line=document.createElement('div');
      line.className='sg-line v'; line.style.left=x+'px';
      cw.appendChild(line); _sgLines.push(line);
    }
    // Top edge
    if(Math.abs(mb.top-ob.top)<SG_THRESH||Math.abs(mb.top-(ob.top+ob.height))<SG_THRESH){
      const y=Math.abs(mb.top-ob.top)<SG_THRESH?ob.top:ob.top+ob.height;
      const line=document.createElement('div');
      line.className='sg-line h'; line.style.top=y+'px';
      cw.appendChild(line); _sgLines.push(line);
    }
  });
  setTimeout(clearSmartGuides,600);
}

// -
// FRAME / POLAROID
// -
function clearSmartGuides(){
  smartGuides={x:[],y:[]};
  renderGuideLayer();
}

function showSmartGuides(opt){
  const moving=opt?.target;
  if(!moving)return;
  snapToGuides(moving,opt);
}

let frameMode='standard';

function openFrameModal(){
  const o=cv.getActiveObject();
  if(!o||o.type!=='image')return toast('Select an image first');
  frameMode='standard';
  document.getElementById('frame-opt-standard').classList.add('active');
  document.getElementById('frame-opt-polaroid').classList.remove('active');
  document.getElementById('frame-polaroid-extra').style.display='none';
  document.getElementById('frame-border-sz').value=20;
  document.getElementById('frame-border-val').textContent='20px';
  openM('m-frame');
}

function selectFrameOpt(mode){
  frameMode=mode;
  document.getElementById('frame-opt-standard').classList.toggle('active',mode==='standard');
  document.getElementById('frame-opt-polaroid').classList.toggle('active',mode==='polaroid');
  document.getElementById('frame-polaroid-extra').style.display=mode==='polaroid'?'block':'none';
}

function applyFrame(){
  closeM('m-frame');
  const img=cv.getActiveObject();
  if(!img||img.type!=='image')return toast('Select an image first');

  const border=parseInt(document.getElementById('frame-border-sz').value)||20;
  const caption=document.getElementById('frame-caption').value||'';
  const iw=img.getScaledWidth(), ih=img.getScaledHeight();
  const il=img.left, it=img.top;
  const bottomExtra=frameMode==='polaroid'?Math.max(border*2.5,60):border;

  // White frame rect (behind image)
  const frame=new fabric.Rect({
    left:0, top:0,
    width:iw+border*2, height:ih+border+bottomExtra,
    fill:'#ffffff',
    shadow:new fabric.Shadow({color:'rgba(0,0,0,0.2)',blur:20,offsetX:2,offsetY:6}),
    selectable:false, evented:false,
  });

  // Re-position image relative to group origin
  img.set({left:border, top:border, selectable:false, evented:false});

  const groupItems=[frame, img];

  if(frameMode==='polaroid'){
    const captionText=new fabric.Textbox(caption||'Write here...',{
      left:border,
      top:ih+border+8,
      width:iw,                          // constrained to image width
      fontSize:Math.max(14,bottomExtra/3.5),
      fontFamily:'Special Elite',
      fill:'#374151',
      textAlign:'center',
      breakWords:true,
      splitByGrapheme:false,
      selectable:false, evented:false,
    });
    groupItems.push(captionText);
  }

  const group=new fabric.Group(groupItems,{
    left:il-border, top:it-border,
    subTargetCheck:true,
    _isFrame:true,
    _isPolaroid:frameMode==='polaroid',
  });

  // Double-click on polaroid - exit group, enter text editing, re-group on exit
  if(frameMode==='polaroid'){
    group.on('mousedblclick', function(opt){
      const grp = this;
      // Find the IText caption (last item in group)
      const allItems = grp.getObjects();
      const itext = findEditableText(allItems);
      if (!itext) return;

      // Save group position before breaking it up
      const grpLeft = grp.left;
      const grpTop  = grp.top;

      // Convert group to individual active selection (Fabric 5 way)
      const sel = grp.toActiveSelection();
      cv.discardActiveObject();

      // Make only the text selectable/editable temporarily
      allItems.forEach(o => { o.selectable = false; o.evented = false; });
      itext.selectable = true;
      itext.evented    = true;

      cv.setActiveObject(itext);
      itext.enterEditing();
      itext.selectAll();
      cv.renderAll();

      // Re-group when editing finishes
      const regroup = () => {
        itext.off('editing:exited', regroup);
        itext.exitEditing();

        // Collect all items still on canvas
        const stillOn = allItems.filter(o => cv.getObjects().includes(o));
        stillOn.forEach(o => cv.remove(o));

        const ng = new fabric.Group(stillOn, {
          left: grpLeft, top: grpTop,
          subTargetCheck: true,
          _isFrame: true, _isPolaroid: true,
        });
        ng.__id  = genId();
        ng.__lid = grp.__lid || activeLayerId;
        ng.set({ selectable:true, evented:true, hasControls:true, hasBorders:true });

        // Re-attach the same dblclick handler
        attachPolaroidDblClick(ng);

        cv.add(ng);
        cv.setActiveObject(ng);
        assignToLayer(ng, ng.__lid);
        rebuildCanvasZOrder();
        cv.renderAll();
      };

      itext.on('editing:exited', regroup);
    });
  }

  // Extract dblclick attachment so it can be reused after re-grouping
  function attachPolaroidDblClick(grp){
    grp.on('mousedblclick', function(opt){
      const g = this;
      const allItems = g.getObjects();
      const itext = findEditableText(allItems);
      if (!itext) return;
      const grpLeft = g.left, grpTop = g.top;
      g.toActiveSelection();
      cv.discardActiveObject();
      allItems.forEach(o => { o.selectable = false; o.evented = false; });
      itext.selectable = true; itext.evented = true;
      cv.setActiveObject(itext);
      itext.enterEditing(); itext.selectAll(); cv.renderAll();
      const regroup2 = () => {
        itext.off('editing:exited', regroup2);
        itext.exitEditing();
        const stillOn = allItems.filter(o => cv.getObjects().includes(o));
        stillOn.forEach(o => cv.remove(o));
        const ng2 = new fabric.Group(stillOn, { left:grpLeft, top:grpTop, subTargetCheck:true, _isFrame:true, _isPolaroid:true });
        ng2.__id=genId(); ng2.__lid=g.__lid||activeLayerId;
        ng2.set({selectable:true,evented:true,hasControls:true,hasBorders:true});
        attachPolaroidDblClick(ng2);
        cv.add(ng2); cv.setActiveObject(ng2);
        assignToLayer(ng2, ng2.__lid); rebuildCanvasZOrder(); cv.renderAll();
      };
      itext.on('editing:exited', regroup2);
    });
  }

  // Remove original image from canvas and add the grouped frame
  cv.remove(img);
  group.__id=genId();
  group.set({selectable:true,evented:true,hasControls:true,hasBorders:true});
  ensureDefaultLayer();
  assignToLayer(group,activeLayerId);
  cv.add(group); cv.setActiveObject(group); rebuildCanvasZOrder(); cv.renderAll();
  toast(frameMode==='polaroid'?'Polaroid frame applied':'Frame applied');
}

// -
// COLOR PALETTE EXTRACTION
// -
function attachPolaroidDblClick(grp){
  grp.off('mousedblclick');
  grp.on('mousedblclick', function(){
    const g = this;
    const allItems = g.getObjects();
    const itext = findEditableText(allItems);
    if (!itext) return;
    const grpLeft = g.left, grpTop = g.top;
    const layerId = g.__lid || activeLayerId;
    const originalId = g.__id || genId();

    g.toActiveSelection();
    cv.discardActiveObject();
    allItems.forEach(o => { o.selectable = false; o.evented = false; });
    itext.selectable = true;
    itext.evented = true;
    cv.setActiveObject(itext);
    itext.enterEditing();
    itext.selectAll();
    cv.renderAll();

    const regroup = () => {
      itext.off('editing:exited', regroup);
      itext.exitEditing();
      const stillOn = allItems.filter(o => cv.getObjects().includes(o));
      stillOn.forEach(o => cv.remove(o));
      const ng = new fabric.Group(stillOn, {
        left:grpLeft, top:grpTop,
        subTargetCheck:true,
        _isFrame:true, _isPolaroid:true,
      });
      ng.__id=originalId;
      ng.__lid=layerId;
      ng.set({selectable:true,evented:true,hasControls:true,hasBorders:true});
      attachPolaroidDblClick(ng);
      cv.add(ng);
      cv.setActiveObject(ng);
      assignToLayer(ng, layerId);
      rebuildCanvasZOrder();
      cv.renderAll();
      commitCanvasChange({persistDelay:500});
    };
    itext.on('editing:exited', regroup);
  });
}

function extractColors(){
  const img=getEditableImageFromSelection();
  if(!img||img.type!=='image')return toast('Select an image first');
  const NUM_COLORS=5;
  const tmp=document.createElement('canvas');
  const W=80,H=80; tmp.width=W; tmp.height=H;
  const ctx=tmp.getContext('2d');
  const el=img._element||img._originalElement;
  if(!el)return toast('Cannot read image pixels');
  try{ctx.drawImage(el,0,0,W,H);}catch(e){return toast('Cross-origin image - cannot extract colors');}
  const data=ctx.getImageData(0,0,W,H).data;
  const buckets={};
  for(let i=0;i<data.length;i+=4){
    const r=Math.round(data[i]/32)*32,g=Math.round(data[i+1]/32)*32,b=Math.round(data[i+2]/32)*32;
    const key=`${r},${g},${b}`;
    buckets[key]=(buckets[key]||0)+1;
  }
  const sorted=Object.entries(buckets).sort((a,b)=>b[1]-a[1]);
  const colors=sorted.slice(0,NUM_COLORS*3)
    .filter(([k])=>{const [r,g,b]=k.split(',').map(Number);return !(r>240&&g>240&&b>240)&&!(r<15&&g<15&&b<15);})
    .slice(0,NUM_COLORS)
    .map(([k])=>{const [r,g,b]=k.split(',').map(Number);return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;});

  // Store for placing on canvas
  window._lastExtractedColors=[...colors];
  window._lastExtractedImg=img;

  // - Show in prop panel -
  const c=document.getElementById('pp-scroll'); if(!c)return;
  const existing=c.querySelector('.extracted-palette-row');
  if(existing)existing.remove();

  const row=document.createElement('div');
  row.className='pp-row extracted-palette-row';
  row.innerHTML=`
    <div class="pp-lbl">Extracted Colors <span style="font-size:9px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--txt3)">· click=apply · drag to reorder</span></div>
    <div id="ep-grid" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px;"></div>
    <button class="pp-btn" style="width:100%" onclick="placePaletteOnCanvas()">Add palette to canvas</button>`;
  c.insertBefore(row,c.firstChild);

  renderExtractedSwatches(row.querySelector('#ep-grid'));
  toast('Colors extracted - drag to reorder, click pipette to change');
}

function renderExtractedSwatches(grid){
  if(!grid) return;
  grid.innerHTML='';
  const colors=window._lastExtractedColors||[];
  let dragSrc=null;

  colors.forEach((hex,i)=>{
    const wrap=document.createElement('div');
    wrap.style.cssText='position:relative;flex-shrink:0;';
    wrap.draggable=true;

    const sw=document.createElement('div');
    sw.style.cssText=`width:34px;height:34px;border-radius:6px;background:${hex};cursor:pointer;border:2px solid rgba(0,0,0,0.12);transition:transform .1s;box-sizing:border-box;`;
    sw.title=hex;
    // Click - apply to selected object
    sw.addEventListener('click', ()=>{
      const o=cv.getActiveObject()||propTarget;
      if(o){ setProp('fill',hex); toast('Applied '+hex); }
      else{ navigator.clipboard?.writeText(hex).catch(()=>{}); toast('Copiado '+hex); }
    });
    sw.addEventListener('mouseenter',()=>sw.style.transform='scale(1.15)');
    sw.addEventListener('mouseleave',()=>sw.style.transform='scale(1)');

    // Eyedropper button (appears on hover)
    const pip=document.createElement('button');
    pip.title='Pick color from canvas';
    pip.style.cssText='position:absolute;bottom:-1px;right:-1px;width:14px;height:14px;border-radius:50%;background:var(--surface);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;opacity:0;transition:opacity .15s;z-index:2;';
    pip.innerHTML='<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8Z"/></svg>';
    wrap.addEventListener('mouseenter',()=>pip.style.opacity='1');
    wrap.addEventListener('mouseleave',()=>pip.style.opacity='0');
    pip.addEventListener('click', e=>{
      e.stopPropagation();
      document.getElementById('cw').classList.add('eyedropper-mode');
      toast('Click on the canvas to pick a color');
      const handler=(opt)=>{
        const pointer=cv.getPointer(opt.e);
        const picked=sampleColor(Math.round(pointer.x),Math.round(pointer.y));
        if(picked){
          window._lastExtractedColors[i]=picked;
          addToColorHistory(picked);
          const epGrid=document.getElementById('ep-grid');
          renderExtractedSwatches(epGrid);
          toast('Color updated: '+picked);
        }
        document.getElementById('cw').classList.remove('eyedropper-mode');
        cv.off('mouse:down',handler);
      };
      cv.on('mouse:down',handler);
    });

    // Drag to reorder
    wrap.addEventListener('dragstart', e=>{ dragSrc=i; e.dataTransfer.effectAllowed='move'; wrap.style.opacity='0.5'; });
    wrap.addEventListener('dragend', ()=>wrap.style.opacity='');
    wrap.addEventListener('dragover', e=>{ e.preventDefault(); wrap.style.outline='2px solid var(--accent)'; });
    wrap.addEventListener('dragleave', ()=>wrap.style.outline='');
    wrap.addEventListener('drop', e=>{
      e.preventDefault(); wrap.style.outline='';
      if(dragSrc===null||dragSrc===i) return;
      const arr=window._lastExtractedColors;
      const [moved]=arr.splice(dragSrc,1);
      arr.splice(i,0,moved);
      dragSrc=null;
      const epGrid=document.getElementById('ep-grid');
      renderExtractedSwatches(epGrid);
    });

    wrap.appendChild(sw);
    wrap.appendChild(pip);
    grid.appendChild(wrap);
  });
}

function placePaletteOnCanvas(){
  const colors=window._lastExtractedColors;
  if(!colors||!colors.length)return toast('Extract colors from an image first');
  const img=window._lastExtractedImg;

  // Layout: vertical column of tall swatches (like the reference screenshot)
  const swW=70, swH=44, gap=2, padding=4;
  const totalW=swW+padding*2;
  const totalH=colors.length*(swH+gap)-gap+padding*2;

  // Default: place to the right of the image
  let px=cv.width/2, py=cv.height/2-totalH/2;
  if(img){
    const ib=img.getBoundingRect(true,true);
    px=ib.left+ib.width+12;
    py=ib.top;
  }

  // Outer white card - no shadow, just a subtle border
  const bg=new fabric.Rect({
    width:totalW, height:totalH, fill:'#ffffff', rx:6, ry:6,
    left:0, top:0, strokeWidth:1, stroke:'rgba(0,0,0,0.1)',
  });

  const items=[bg];
  colors.forEach((hex,i)=>{
    const rect=new fabric.Rect({
      width:swW, height:swH,
      fill:hex, rx:3, ry:3,
      left:padding,
      top:padding+i*(swH+gap),
    });
    items.push(rect);
  });

  const group=new fabric.Group(items,{
    left:px, top:py,
    selectable:true, evented:true, hasControls:true, hasBorders:true,
    _isPalette:true,
  });
  group.__id=genId();
  ensureDefaultLayer();
  assignToLayer(group,activeLayerId);
  cv.add(group);
  setTool('select');
  cv.setActiveObject(group);
  rebuildCanvasZOrder();
  cv.renderAll();
  toast('Palette card added - drag it anywhere you want');
}

// -
// OVERRIDE: renderHome with thumbnails, tags, trash
// -
function renderHome(){
  const grid=document.getElementById('home-proj-grid');
  grid.innerHTML='';
  const searchQ=(document.getElementById('home-search')?.value||'').trim().toLowerCase();
  const showTrash=homeTabActive==='trash';

  const statusBar=document.getElementById('status-filter-bar');
  if(statusBar){
    statusBar.innerHTML='';
    const allStatus=document.createElement('button');
    allStatus.className='status-filter-pill'+(activeStatusFilter===null?' active':'');
    allStatus.textContent='All status';
    allStatus.onclick=()=>{activeStatusFilter=null;renderHome();};
    statusBar.appendChild(allStatus);
    PROJECT_STATUSES.forEach(s=>{
      const pill=document.createElement('button');
      pill.className='status-filter-pill'+(activeStatusFilter===s.id?' active':'');
      pill.style.setProperty('--status-color',s.color);
      pill.textContent=s.label;
      pill.onclick=()=>{activeStatusFilter=activeStatusFilter===s.id?null:s.id;renderHome();};
      statusBar.appendChild(pill);
    });
  }

  // Build tag filter pills from all projects
  const allTags=new Set();
  Object.values(projects).forEach(p=>(p.tags||[]).forEach(t=>allTags.add(t)));
  const tagBar=document.getElementById('tag-filter-bar');
  if(tagBar){
    tagBar.innerHTML='';
    if(allTags.size){
      const anyPill=document.createElement('button');
      anyPill.className='tag-filter-pill'+(activeTagFilter===null?' active':'');
      anyPill.textContent='All';
      anyPill.onclick=()=>{activeTagFilter=null;renderHome();};
      tagBar.appendChild(anyPill);
      allTags.forEach(tag=>{
        const pill=document.createElement('button');
        pill.className='tag-filter-pill'+(activeTagFilter===tag?' active':'');
        pill.textContent=tag;
        pill.onclick=()=>{activeTagFilter=activeTagFilter===tag?null:tag;renderHome();};
        tagBar.appendChild(pill);
      });
    }
  }

  let entries=Object.entries(projects);
  // Filter by tab
  entries=entries.filter(([,p])=>showTrash?p.deleted===true:p.deleted!==true);
  // Filter by search
  if(searchQ)entries=entries.filter(([,p])=>(p.name||'').toLowerCase().includes(searchQ)||(p.tags||[]).some(t=>String(t).toLowerCase().includes(searchQ))||getProjectStatus(p.status).label.toLowerCase().includes(searchQ));
  if(activeStatusFilter)entries=entries.filter(([,p])=>(p.status||'draft')===activeStatusFilter);
  // Filter by active tag
  if(activeTagFilter)entries=entries.filter(([,p])=>(p.tags||[]).includes(activeTagFilter));

  entries.forEach(([pid,proj])=>{
    const card=document.createElement('div');
    card.className='proj-card'+(proj.deleted?' deleted-card':'');
    const firstCvId=Object.keys(proj.canvases)[0];
    const cvCount=Object.keys(proj.canvases).length;
    const thumbBg=proj.color+'22';

    // Thumbnail: use stored dataURL if available, else fallback
    let thumbHtml;
    if(proj.thumbnail){
      thumbHtml=`<img src="${proj.thumbnail}" style="width:100%;height:100%;object-fit:cover;" alt="">`;
    } else {
      thumbHtml=buildThumbHtml(pid,firstCvId,proj.color);
    }

    // Tags display
    const tagHtml=(proj.tags||[]).map(t=>`<span class="proj-card-tag">${escHtml(t)}</span>`).join('');

    const restoreBtn=proj.deleted?`<button class="proj-card-act proj-card-restore" onclick="restoreProject('${pid}',event)" title="Restore">Restore</button>`:'';
    const editBtn=!proj.deleted?`<button class="proj-card-act" onclick="editProject('${pid}',event)" title="Rename / Edit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`:'';

    card.innerHTML=`
      <div class="proj-card-thumb" style="background:${thumbBg}">${thumbHtml}</div>
      <div class="proj-card-body">
        <div class="proj-card-head">
          <div class="proj-card-name">${escHtml(proj.name)}</div>
          ${projectStatusBadge(proj.status)}
        </div>
        <div class="proj-card-meta">${cvCount} canvas${cvCount!==1?'es':''}</div>
        ${tagHtml?`<div class="proj-card-tags">${tagHtml}</div>`:''}
      </div>
      <div class="proj-card-acts">
        ${restoreBtn}${editBtn}
        <button class="proj-card-act" onclick="deleteOrTrashProject('${pid}',event)" title="${proj.deleted?'Delete permanently':'Move to trash'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
    if(!proj.deleted)card.onclick=e=>{if(e.target.closest('.proj-card-acts'))return;openEditor(pid,firstCvId);};
    grid.appendChild(card);
  });

  if(!showTrash){
    const newCard=document.createElement('div');
    newCard.className='proj-card proj-card-new';
    newCard.innerHTML=`<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>New Project</span>`;
    newCard.onclick=()=>newProjHome();
    grid.appendChild(newCard);
  }
}

// New project from home (open modal)
function newProjHome(){
  _modalTags=[];
  openProjModal(null,'Project '+(Object.keys(projects).filter(id=>!projects[id].deleted).length+1),[],'draft');
}
function editProject(id,e){
  e.stopPropagation();
  openProjModal(id,projects[id].name,projects[id].tags||[],projects[id].status||'draft');
}
function openProjModal(id,name,tags,status='draft'){
  _modalTags=[...(tags||[])];
  _modalStatus=status||'draft';
  document.getElementById('m-proj-t').textContent=id?'Edit Project':'New Project';
  document.getElementById('m-proj-n').value=name||'';
  const statusSelect=document.getElementById('m-proj-status');
  if(statusSelect){
    statusSelect.innerHTML=renderProjectStatusOptions(_modalStatus);
    statusSelect.value=_modalStatus;
    statusSelect.onchange=()=>{_modalStatus=statusSelect.value;};
  }
  renamingProjId=id||null;
  renderModalTagChips();
  openM('m-proj');
  setTimeout(()=>document.getElementById('m-proj-n').select(),40);
}

// Soft delete: move to trash
function deleteOrTrashProject(id,e){
  e.stopPropagation();
  const p=projects[id];
  if(p.deleted){
    customConfirm(`"${p.name}" se eliminará para siempre. No hay vuelta atrás.`, ()=>{
      delete projects[id]; saveLS(); renderHome(); toast('Project permanently deleted');
    }, 'Eliminar definitivamente', 'Eliminar', true);
  } else {
    customConfirm(`Mover "${p.name}" a la papelera?`, ()=>{
      projects[id].deleted=true; saveLS(); renderHome(); toast(`"${p.name}" moved to Trash`);
    }, 'Mover a Trash', 'Mover', false);
  }
}
function restoreProject(id,e){
  e.stopPropagation();
  projects[id].deleted=false; saveLS(); renderHome(); toast(`"${projects[id].name}" restored`);
}

// Override confirmProj to save tags
function confirmProj(){
  const name=document.getElementById('m-proj-n').value.trim()||'Untitled';
  const status=document.getElementById('m-proj-status')?.value||_modalStatus||'draft';
  closeM('m-proj');
  if(renamingProjId){
    projects[renamingProjId].name=name;
    projects[renamingProjId].tags=[..._modalTags];
    projects[renamingProjId].status=status;
    renamingProjId=null;saveLS();renderHome();
  } else {
    const pid=createProjWithTags(name,[..._modalTags],status);
    const cid=createCv(pid,'Board 1');
    saveLS();renderHome();openEditor(pid,cid);
  }
}
function createProjWithTags(name,tags,status='draft'){
  const id=genId();
  projects[id]={name,tags:tags||[],status:status||'draft',color:PROJ_COLS[Object.keys(projects).length%PROJ_COLS.length],canvases:{},thumbnail:null,deleted:false};
  return id;
}

// Override createProj to include tags/deleted fields
function createProj(name){
  const id=genId();
  projects[id]={name,tags:[],status:'draft',color:PROJ_COLS[Object.keys(projects).filter(k=>!projects[k].deleted).length%PROJ_COLS.length],canvases:{},thumbnail:null,deleted:false};
  return id;
}

// -
// OVERRIDE: autoSave with thumbnail generation
// -
function autoSave(){
  if(!curProj||!curCv||!cv)return;
  projects[curProj].canvases[curCv].json=JSON.stringify({
    canvas:canvasJSON(),
    layers,
    activeLayerId,
    collapsedLayerIds:getCollapsedLayerIds(),
    manualGuides,
    viewport:cv.viewportTransform.slice()
  });
  // Generate thumbnail compressed at low quality
  const prevBg=cv.backgroundColor;
  try{
    cv.backgroundColor='#ffffff';
    cv.renderAll();
    const thumb=cv.toDataURL({format:'jpeg',quality:0.4,multiplier:0.18});
    projects[curProj].thumbnail=thumb;
  }catch(e){}
  finally{
    cv.backgroundColor=prevBg;
    cv.renderAll();
  }
  saveLS();
  const el=document.getElementById('s-save');
  if(el)el.textContent='Saved '+new Date().toLocaleTimeString();
}

// -
// OVERRIDE: openEditor - start timer, smart guides hook, fix canvas size
// -
function openEditor(pid,cid){
  setCanvasLoading(true,'Loading project');
  showScreen('editor-screen');
  // Resize canvas NOW (screen is visible so clientWidth/Height are real)
  switchCv(pid,cid);
  startSessionTimer();
  // Re-attach smart guides
  cv.off('object:moving',showSmartGuides);
  cv.off('object:moved', clearSmartGuides);
  cv.on('object:moving',showSmartGuides);
  cv.on('object:moved', clearSmartGuides);
  // Second resize after a tick in case layout shifted
  setTimeout(()=>{
    fitEditorCanvas();
  },120);
}

// -
// OVERRIDE: renderLayers - add lock button
// -
// -
// LAYER STATE: which group-layers are collapsed
// -

// - Group-layer collapse: purely visual in the layer panel -
function toggleLayerCollapse(id, e) {
  e.stopPropagation();
  e.preventDefault();
  if (_collapsedLayers.has(id)) _collapsedLayers.delete(id);
  else _collapsedLayers.add(id);
  renderLayers(); // just re-render the panel
  schedulePersist(250);
}

// - Chevron CSS -
(function injectChevronCSS(){
  const s = document.createElement('style');
  s.textContent = `
    .ly-chevron{background:none;border:none;cursor:pointer;color:var(--txt3);padding:1px 2px;display:flex;flex-shrink:0;transition:transform .15s;}
    .ly-chevron svg{transition:transform .15s;}
    .ly-chevron.open svg{transform:rotate(90deg);}
    .ly-chevron:hover{color:var(--txt);}
  `;
  document.head.appendChild(s);
})();

// -
// OVERRIDE: renderPropContent - sticky fix, frame removal, extract colors
// -
