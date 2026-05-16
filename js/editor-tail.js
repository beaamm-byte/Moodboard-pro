function renderPropContent(o){
  const c=document.getElementById('pp-scroll');c.innerHTML='';
  addPropRow(c,'Opacity',`<input type="range" min="0" max="1" step="0.01" value="${o.opacity??1}" oninput="setProp('opacity',parseFloat(this.value));document.getElementById('pp-op-v').textContent=Math.round(this.value*100)+'%'">`,`<span id="pp-op-v">${Math.round((o.opacity??1)*100)}%</span>`);
  const imageObj=o.type==='image'?o:(o._isFrame&&o.getObjects?o.getObjects().find(x=>x.type==='image'):null);

  // TEXT
  if(o.type==='i-text'||o.type==='text'||o.type==='textbox'){
    const fontRow=document.createElement('div');fontRow.className='pp-row';
    const curFont=o.fontFamily||'Syne';
    fontRow.innerHTML=`<div class="pp-lbl">Font</div><select class="font-select" onchange="setPropOnTarget(this,'fontFamily',this.value)" style="font-family:${curFont}">${FONTS.map(f=>`<option value="${f.name}" style="font-family:${f.name}" ${f.name===curFont?'selected':''}>${f.label}</option>`).join('')}</select>`;
    c.appendChild(fontRow);
    const sizeRow=document.createElement('div');sizeRow.className='pp-row';
    sizeRow.innerHTML=`<div class="pp-lbl">Size & Style</div><div class="font-size-row"><input type="number" value="${o.fontSize||22}" min="6" max="300" onchange="setProp('fontSize',+this.value)" style="width:60px"><div class="font-style-row" style="flex:1"><button class="fstyle-btn ${o.fontWeight==='bold'?'active':''}" onclick="toggleFontStyle('fontWeight','bold','normal',this)"><b>B</b></button><button class="fstyle-btn ${o.fontStyle==='italic'?'active':''}" onclick="toggleFontStyle('fontStyle','italic','normal',this)"><i>I</i></button><button class="fstyle-btn ${o.underline?'active':''}" onclick="toggleFontStyle('underline',true,false,this)"><u>U</u></button></div></div>`;
    c.appendChild(sizeRow);
    const alignRow=document.createElement('div');alignRow.className='pp-row';
    alignRow.innerHTML=`<div class="pp-lbl">Align</div><div class="pp-btn-row">${['left','center','right'].map(a=>`<button class="pp-btn ${(o.textAlign||'left')===a?'active':''}" onclick="setProp('textAlign','${a}')">${a[0].toUpperCase()+a.slice(1)}</button>`).join('')}</div>`;
    c.appendChild(alignRow);
    addColorRow(c,'Color',o.fill||'#111827',(col)=>{setProp('fill',col);});
  }

  // SHAPES
  if(o.type==='rect'||o.type==='circle'){
    addColorRow(c,'Fill',o.fill||'#C8102E33',(col)=>setProp('fill',col));
    addColorRow(c,'Stroke',o.stroke||'#C8102E',(col)=>setProp('stroke',col));
    addPropRow(c,'Stroke Width',`<input type="range" min="0" max="20" step="1" value="${o.strokeWidth??2}" oninput="setProp('strokeWidth',+this.value)">`);
  }

  // IMAGE
  if(imageObj){
    const hasBW=(imageObj.filters||[]).some(f=>f&&f.type==='Grayscale');
    const cropAction=o._isFrame?'cropFramedImage()':'startCrop()';
    const row=document.createElement('div');row.className='pp-row';
    row.innerHTML=`<div class="pp-lbl">Image</div><div class="pp-btn-row">
      <button class="pp-btn" onclick="${cropAction}">Crop</button>
      <button class="pp-btn ${hasBW?'active':''}" onclick="toggleBW()">B&W</button>
      ${o._isFrame?'':'<button class="pp-btn" onclick="openFrameModal()">Frame</button>'}
    </div>
    <div style="margin-top:6px;"><button class="pp-btn" style="width:100%" onclick="extractColors()">Extract Colors</button></div>`;
    c.appendChild(row);
  }

  // FRAME GROUP - show "Remove Frame" option
  if(o._isFrame){
    const row=document.createElement('div');row.className='pp-row';
    row.innerHTML=`<div class="pp-lbl">Frame</div>
      <div class="pp-btn-row">
        <button class="pp-btn" onclick="editFrame()">Change Frame</button>
        <button class="pp-btn" onclick="removeFrame()" style="color:var(--red);border-color:var(--red)">Remove Frame</button>
      </div>
      <div style="font-size:10px;color:var(--txt3);margin-top:5px;">${o._isPolaroid?'Double-click to edit caption text':''}</div>`;
    c.appendChild(row);
  }

  // STICKY NOTE - color picker that correctly updates the rect inside the group
  if(o._isSticky){
    const row=document.createElement('div');row.className='pp-row';
    const currentStickyColor=o._stickyColor||STICKY_PALS[0];
    row.innerHTML=`<div class="pp-lbl">Note Color</div><div class="palette-grid" id="pal-sticky"></div>
      <div style="font-size:10px;color:var(--txt3);margin-top:6px;">Double-click to edit text</div>`;
    c.appendChild(row);
    const grid=row.querySelector('#pal-sticky');
    STICKY_PALS.forEach(col=>{
      const sw=document.createElement('div');sw.className='swatch';
      sw.style.cssText=`background:${col};width:22px;height:22px;border-radius:4px;border:2px solid ${col===currentStickyColor?'var(--txt)':'transparent'}`;
      sw.onclick=()=>{
        const bgRect=o.getObjects&&o.getObjects().find(x=>x.type==='rect');
        if(bgRect){bgRect.set('fill',col);o._stickyColor=col;cv.renderAll();}
        grid.querySelectorAll('.swatch').forEach(s=>s.style.borderColor='transparent');
        sw.style.borderColor='var(--txt)';
      };
      grid.appendChild(sw);
    });
  }

  addPropRow(c,'Layer',`<div class="pp-btn-row"><button class="pp-btn" onclick="cxFront()">Front</button><button class="pp-btn" onclick="cxBack()">Back</button></div>`);
  addPropRow(c,'Rotation',`<input type="range" min="0" max="360" value="${Math.round(o.angle||0)}" oninput="setProp('angle',+this.value);document.getElementById('pp-rot-v').textContent=this.value+'&deg;'">`,`<span id="pp-rot-v">${Math.round(o.angle||0)}&deg;</span>`);
}

// -
// REMOVE FRAME - extract image from frame group
// -
function removeFrame(){
  const grp=cv.getActiveObject();
  if(!grp||!grp._isFrame)return toast('Select a framed image first');

  const grpLeft=grp.left, grpTop=grp.top;
  const allItems=grp.getObjects();

  // Find the image inside the frame group
  const img=allItems.find(o=>o.type==='image');
  if(!img){
    // No image found - just ungroup everything
    const sel=grp.toActiveSelection();
    allItems.forEach(o=>{o.selectable=true;o.evented=true;});
    cv.renderAll();
    toast('Frame removed');
    return;
  }

  // Break the group
  grp.toActiveSelection();
  cv.discardActiveObject();

  // Remove all frame elements except the image
  allItems.forEach(o=>{
    if(o!==img) cv.remove(o);
  });

  // Restore image to selectable state at correct position
  img.set({
    selectable:true, evented:true, hasControls:true, hasBorders:true,
  });
  img.__lid=grp.__lid||activeLayerId;
  assignToLayer(img, img.__lid);

  cv.setActiveObject(img);
  rebuildCanvasZOrder();
  cv.renderAll();
  hidePropPanel();
  commitCanvasChange({syncOrder:true,persistDelay:500});
  toast('Frame removed - image restored');
}
function cropFramedImage(){
  removeFrame();
  setTimeout(()=>{
    const img=cv.getActiveObject();
    if(img&&img.type==='image')startCrop();
  },0);
}
function editFrame(){
  removeFrame();
  setTimeout(()=>{
    const img=cv.getActiveObject();
    if(img&&img.type==='image')openFrameModal();
  },0);
}
function switchCv(pid,cid){
  const loadSeq=++_switchLoadSeq;
  const finishLoad=()=>{ if(loadSeq===_switchLoadSeq) setCanvasLoading(false); };
  if(curProj&&curCv){
    // Save viewport transform alongside canvas data
    projects[curProj].canvases[curCv].json=JSON.stringify({
      canvas:canvasJSON(),layers,activeLayerId,manualGuides,
      collapsedLayerIds:getCollapsedLayerIds(),
      viewport:cv.viewportTransform.slice() // save pan/zoom state
    });
    saveLS();
  }
  curProj=pid;curCv=cid;
  localStorage.setItem('mbp_last_proj',pid);
  localStorage.setItem('mbp_last_cv',cid);
  const cvData=projects[pid].canvases[cid];
  const crumbProj=document.getElementById('crumb-proj');const crumbCv=document.getElementById('crumb-cv');
  if(crumbProj)crumbProj.textContent=projects[pid].name;
  if(crumbCv)crumbCv.textContent=cvData.name;
  if(cvData.json){
    try{
      const d=typeof cvData.json==='string'?JSON.parse(cvData.json):cvData.json;
      layers=d.layers||[];activeLayerId=d.activeLayerId||null;
      setCollapsedLayerIds(d.collapsedLayerIds||[]);
      manualGuides=d.manualGuides||{x:[],y:[]};
      normalizeManualGuides();
      if(!layers.length)newLayer('Layer 1');
      histLock=true;
      const canvasData=normalizeAssetRefs(d.canvas||d);
      cv.loadFromJSON(canvasData,()=>{
        if(loadSeq!==_switchLoadSeq)return;
        histLock=false;
        normalizeLayerMembership();
        cv.getObjects().forEach(o=>{
          const layer=layers.find(l=>l.id===o.__lid);
          if(layer&&layer.locked){o.selectable=false;o.evented=false;}
          else{applyObjectControls(o);o.selectable=true;o.evented=true;o.hasControls=true;o.hasBorders=true;}
        });
        restoreCanvasBehaviors();
        applyLayerStateToObjects();
        // Restore this canvas's own viewport (pan/zoom)
        if(d.viewport&&Array.isArray(d.viewport)&&d.viewport.length===6){
          cv.setViewportTransform(d.viewport);
        } else {
          cv.setViewportTransform([1,0,0,1,0,0]); // fresh canvases start at 100% centered
        }
        const zlbl=document.getElementById('zlbl');
        if(zlbl)zlbl.textContent=Math.round(cv.getZoom()*100)+'%';
        fitEditorCanvas();
        cv.renderAll();saveH();renderLayers();updateStatus();
        migrateCanvasImageAssets()?.then(()=>saveLS());
        if(document.body.classList.contains('zen-mode')) renderZenStrip();
        finishLoad();
      });
      setTimeout(finishLoad,6000);
    }catch(err){
      histLock=false;
      console.error('Failed to load canvas',err);
      finishLoad();
    }
  } else {
    histLock=true;
    cv.clear();cv.backgroundColor=null;layers=[];activeLayerId=null;setCollapsedLayerIds([]);
    manualGuides={x:[],y:[]};
    cv.setViewportTransform([1,0,0,1,0,0]);
    const zlbl=document.getElementById('zlbl');if(zlbl)zlbl.textContent='100%';
    newLayer('Layer 1');fitEditorCanvas();cv.renderAll();histLock=false;saveH();renderLayers();updateStatus();
    finishLoad();
    if(document.body.classList.contains('zen-mode')) renderZenStrip();
  }
  document.title=cvData.name+' - '+projects[pid].name+' - MoodBoard Pro';
  renderCvList();renderProjectPalettes();updateLayerBadge();
}
