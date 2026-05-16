function genId(){return Math.random().toString(36).slice(2)+Date.now().toString(36).slice(-4);}
function genLayerId(){return 'ly_'+genId();}

function newLayer(name){
  const id=genLayerId(),n=name||'Layer '+(layers.length+1);
  layers.unshift({id,name:n,visible:true,fabricIds:[]});
  activeLayerId=id; selectedLayerIds=new Set([id]);
  renderLayers(); updateLayerBadge(); return id;
}
function ensureDefaultLayer(){if(!layers.length)newLayer('Layer 1');if(!activeLayerId)activeLayerId=layers[0].id;}
function getActiveLayer(){return layers.find(l=>l.id===activeLayerId)||layers[0];}
function assignToLayer(fabricObj,layerId){
  const lid=layerId||activeLayerId; if(!lid)return;
  fabricObj.__lid=lid; fabricObj.__id=fabricObj.__id||genId();
  const layer=layers.find(l=>l.id===lid);
  if(layer&&!layer.fabricIds.includes(fabricObj.__id))layer.fabricIds.unshift(fabricObj.__id);
}
function getLayerObjects(layerId){
  const layer=layers.find(l=>l.id===layerId);
  const objs=cv?.getObjects().filter(o=>o.__lid===layerId)||[];
  if(!layer)return objs;
  const order=layer.fabricIds||[];
  return objs.sort((a,b)=>{
    const ia=order.indexOf(a.__id), ib=order.indexOf(b.__id);
    return (ia===-1?999999:ia)-(ib===-1?999999:ib);
  });
}
function hasDragType(e,type){
  return Array.from(e.dataTransfer?.types||[]).includes(type);
}
function onPathCreated(opt){
  const path=opt.path; if(!path)return;
  path.__id=genId(); ensureDefaultLayer(); assignToLayer(path,activeLayerId); onMod();
}
function syncLayerVisibility(){
  layers.forEach(layer=>{cv.getObjects().forEach(o=>{if(o.__lid===layer.id){o.visible=layer.visible;o.selectable=layer.visible&&tool==='select';o.evented=layer.visible&&tool==='select';}});});
  cv.renderAll();
}
function rebuildCanvasZOrder(){
  const ordered=[];
  [...layers].reverse().forEach(layer=>ordered.push(...getLayerObjects(layer.id).slice().reverse()));
  ordered.forEach((obj,idx)=>{
    if(typeof cv.moveObjectTo==='function')cv.moveObjectTo(obj,idx);
    else if(typeof cv.moveTo==='function')cv.moveTo(obj,idx);
    else if(typeof obj.moveTo==='function')obj.moveTo(idx);
  });
  cv.renderAll();
}

function syncLayerSelectionFromCanvas(){
  const active=cv?.getActiveObject();
  if(!active)return;
  const objs=active.type==='activeSelection'?active.getObjects():[active];
  const ids=[...new Set(objs.map(o=>o.__lid).filter(Boolean))];
  if(!ids.length)return;
  const orderedIds=layers.map(l=>l.id).filter(id=>ids.includes(id));
  selectedLayerIds=new Set(orderedIds);
  activeLayerId=orderedIds[0]||ids[0];
  ids.forEach(id=>_collapsedLayers.delete(id));
  renderLayers();
  updateLayerBadge();
  requestAnimationFrame(()=>{
    const row=document.querySelector(`.ly[data-layer-id="${activeLayerId}"]`);
    row?.scrollIntoView({block:'nearest'});
  });
}

function renderLayers(){ _renderLayersImpl(); }
function _renderLayersImpl(){
  const list=document.getElementById('layer-list'); if(!list)return;
  list.innerHTML='';
  layers.forEach((layer,idx)=>{
    const layerObjs=getLayerObjects(layer.id);
    const isSel=selectedLayerIds.has(layer.id);
    const isActiveLy=layer.id===activeLayerId;
    const isLocked=!!layer.locked;
    const isGroup=layerObjs.length>0;
    const isCollapsed=_collapsedLayers.has(layer.id);
    const activeObj=cv?.getActiveObject();
    const activeObjs=activeObj?(activeObj.type==='activeSelection'?activeObj.getObjects():[activeObj]):[];
    const hasCanvasSelection=activeObjs.some(o=>o.__lid===layer.id);

    const row=document.createElement('div');
    row.className='ly'+(isSel?' sel':'')+(isActiveLy?' active-layer':'')+(hasCanvasSelection?' canvas-selected':'')+(isLocked?' locked-layer':'');
    row.dataset.idx=String(idx);
    row.dataset.layerId=layer.id;
    row.addEventListener('contextmenu',e=>{
      e.preventDefault(); e.stopPropagation();
      openLayerCtx(layer.id,e.clientX,e.clientY);
    });

    const visBtn=document.createElement('button');
    visBtn.className='ly-vis';
    visBtn.innerHTML=layer.visible
      ?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
      :'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    visBtn.addEventListener('click',e=>{e.stopPropagation();toggleLayerVis(layer.id,e);});

    const handle=document.createElement('div');
    handle.className='ly-drag';
    handle.draggable=!isLocked;
    handle.style.cursor=isLocked?'not-allowed':'grab';
    handle.innerHTML='<svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><circle cx="6" cy="4" r="1.5"/><circle cx="14" cy="4" r="1.5"/><circle cx="6" cy="10" r="1.5"/><circle cx="14" cy="10" r="1.5"/><circle cx="6" cy="16" r="1.5"/><circle cx="14" cy="16" r="1.5"/></svg>';

    const ico=document.createElement('div');
    ico.className='ly-ico';
    ico.innerHTML=lyIco(layer);

    // Name label - dblclick opens rename modal (same as canvas)
    const lbl=document.createElement('span');
    lbl.className='ly-lbl';
    lbl.textContent=layer.name;
    lbl.title='Double-click to rename';
    lbl.addEventListener('dblclick',e=>{
      e.stopPropagation();
      e.preventDefault();
      // Open the rename layer modal
      openRenameLayerModal(layer.id, layer.name);
    });

    const lockBtn=document.createElement('button');
    lockBtn.className='ly-lock'+(isLocked?' locked-on':'');
    lockBtn.title=isLocked?'Unlock':'Lock';
    lockBtn.innerHTML=isLocked
      ?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      :'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
    lockBtn.addEventListener('click',e=>{e.stopPropagation();toggleLayerLock(layer.id,e);});

    const delBtn=document.createElement('button');
    delBtn.className='ly-del';
    delBtn.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    delBtn.addEventListener('click',e=>{e.stopPropagation();deleteLayer(layer.id,e);});

    // Chevron for groups
    if(isGroup){
      const chev=document.createElement('button');
      chev.className='ly-chevron'+(isCollapsed?'':' open');
      chev.innerHTML='<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
      chev.addEventListener('click',e=>{
        e.stopPropagation();
        if(_collapsedLayers.has(layer.id))_collapsedLayers.delete(layer.id);
        else _collapsedLayers.add(layer.id);
        renderLayers();
        schedulePersist(250);
      });
      row.appendChild(handle);
      row.appendChild(visBtn);
      row.appendChild(chev);
    } else {
      const spacer=document.createElement('span');
      spacer.style.cssText='width:14px;flex-shrink:0;display:inline-block';
      row.appendChild(handle);
      row.appendChild(visBtn);
      row.appendChild(spacer);
    }

    row.appendChild(ico);
    row.appendChild(lbl);
    if(isGroup&&!isCollapsed){
      const cnt=document.createElement('span');
      cnt.style.cssText='font-size:9px;color:var(--txt3);flex-shrink:0;margin-right:2px;';
      cnt.textContent=layerObjs.length;
      row.appendChild(cnt);
    }
    row.appendChild(lockBtn);
    row.appendChild(delBtn);

    // Row click
    row.addEventListener('click',e=>{
      if(e.target.closest('.ly-drag,.ly-vis,.ly-del,.ly-lock,.ly-chevron'))return;
      if(isLocked){toast(`Layer "${layer.name}" is locked`);return;}
      if(e.shiftKey||e.ctrlKey||e.metaKey){
        if(selectedLayerIds.has(layer.id))selectedLayerIds.delete(layer.id);
        else selectedLayerIds.add(layer.id);
      } else {
        selectedLayerIds=new Set([layer.id]);
        activeLayerId=layer.id;
        const objs=cv.getObjects().filter(o=>o.__lid===layer.id&&o.visible!==false&&!isLocked);
        if(objs.length===1)cv.setActiveObject(objs[0]);
        else if(objs.length>1){const sel=new fabric.ActiveSelection(objs,{canvas:cv});cv.setActiveObject(sel);}
        else cv.discardActiveObject();
        cv.renderAll();showPropPanel();
      }
      renderLayers();updateLayerBadge();
    });

    // - Drag via document-level mousemove (reliable, works through overflow containers) -
    row.draggable=false;
    if(!isLocked){
      handle.addEventListener('mousedown',e=>{
        e.stopPropagation();
        row.draggable=true;
        return;
        e.preventDefault(); e.stopPropagation();
        const srcIdx=idx;
        let targetIdx=srcIdx;
        handle.style.cursor='grabbing';
        row.style.opacity='0.5';
        row.style.outline='1px dashed var(--accent)';

        const allRowEls=[...list.querySelectorAll('.ly')];
        const getRows=()=>allRowEls.map(r=>{
          const rect=r.getBoundingClientRect();
          return {top:rect.top,bottom:rect.bottom,mid:rect.top+rect.height/2,el:r,idx:+r.dataset.idx};
        });

        const onMove=ev=>{
          const y=ev.clientY;
          allRowEls.forEach(r=>{r.style.borderTop='';r.style.borderBottom='';});
          const rows=getRows();
          const hit=rows.find(r=>y>=r.top&&y<=r.bottom);
          if(!hit)return;
          const after=y>hit.mid;
          targetIdx=hit.idx+(after?1:0);
          if(targetIdx>srcIdx)targetIdx--;
          if(targetIdx<0)targetIdx=0;
          if(targetIdx>layers.length-1)targetIdx=layers.length-1;
          hit.el.style[after?'borderBottom':'borderTop']='2px solid var(--accent)';
        };
        const onUp=()=>{
          document.removeEventListener('mousemove',onMove);
          document.removeEventListener('mouseup',onUp);
          handle.style.cursor='grab';
          row.style.opacity='';
          row.style.outline='';
          allRowEls.forEach(r=>{r.style.borderTop='';r.style.borderBottom='';});
          if(targetIdx!==srcIdx) moveLayer(srcIdx,targetIdx);
        };
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });
      row.addEventListener('dragstart',e=>{
        if(!row.draggable){e.preventDefault();return;}
        dragSrcIdx=idx;
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',String(idx));
        row.style.opacity='0.45';
      });
      row.addEventListener('dragover',e=>{
        e.preventDefault();
        const r=row.getBoundingClientRect();
        const after=e.clientY>r.top+r.height/2;
        row.style.borderTop=after?'':'2px solid var(--accent)';
        row.style.borderBottom=after?'2px solid var(--accent)':'';
      });
      row.addEventListener('dragleave',()=>{
        row.style.borderTop='';
        row.style.borderBottom='';
      });
      row.addEventListener('drop',e=>{
        e.preventDefault();e.stopPropagation();
        if(hasDragType(e,'application/x-mbp-layer')||hasDragType(e,'application/x-mbp-object'))return;
        const from=dragSrcIdx??parseInt(e.dataTransfer.getData('text/plain'),10);
        const r=row.getBoundingClientRect();
        const after=e.clientY>r.top+r.height/2;
        let to=idx+(after?1:0);
        if(from<to)to--;
        moveLayer(from,to);
      });
      row.addEventListener('dragend',()=>{
        row.draggable=false;
        dragSrcIdx=null;
        [...list.querySelectorAll('.ly')].forEach(r=>{r.style.opacity='';r.style.borderTop='';r.style.borderBottom='';});
      });
      handle.addEventListener('dragstart',e=>{
        dragSrcIdx=idx;
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('application/x-mbp-layer',JSON.stringify({fromIdx:idx,layerId:layer.id}));
        row.style.opacity='0.45';
      });
    }

    row.addEventListener('dragover',e=>{
      if(!hasDragType(e,'application/x-mbp-layer')&&!hasDragType(e,'application/x-mbp-object'))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const r=row.getBoundingClientRect();
      const after=e.clientY>r.top+r.height/2;
      row.style.borderTop=after?'':'2px solid var(--accent)';
      row.style.borderBottom=after?'2px solid var(--accent)':'';
    },true);
    row.addEventListener('drop',e=>{
      if(!hasDragType(e,'application/x-mbp-layer')&&!hasDragType(e,'application/x-mbp-object'))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if(hasDragType(e,'application/x-mbp-layer')){
        const data=JSON.parse(e.dataTransfer.getData('application/x-mbp-layer')||'{}');
        const from=data.fromIdx??dragSrcIdx;
        const r=row.getBoundingClientRect();
        const after=e.clientY>r.top+r.height/2;
        let to=idx+(after?1:0);
        if(from<to)to--;
        moveLayer(from,to);
      }else{
        const data=JSON.parse(e.dataTransfer.getData('application/x-mbp-object')||'{}');
        moveObjectToLayer(data.objectId,layer.id);
      }
    },true);

    list.appendChild(row);
    if(isGroup&&!isCollapsed){
      layerObjs.forEach(obj=>{
        const child=document.createElement('div');
        const isObjSelected=activeObjs.some(active=>active.__id===obj.__id);
        child.className='ly-child'+(isObjSelected?' selected-object':'');
        child.draggable=true;
        child.dataset.objectId=obj.__id;
        child.style.cssText='display:flex;align-items:center;gap:6px;margin:1px 4px 1px 36px;padding:4px 6px;border-radius:4px;font-size:10px;color:var(--txt3);cursor:pointer;';
        child.innerHTML=`<span style="width:14px;display:flex;align-items:center;justify-content:center;">${objIco(obj)}</span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(objLabel(obj))}</span>`;
        child.addEventListener('mouseenter',()=>{child.style.background='var(--hover)';});
        child.addEventListener('mouseleave',()=>{child.style.background=isObjSelected?'var(--acl)':'transparent';});
        child.addEventListener('click',e=>{
          e.stopPropagation();
          if(isLocked){toast(`Layer "${layer.name}" is locked`);return;}
          activeLayerId=layer.id;
          selectedLayerIds=new Set([layer.id]);
          cv.setActiveObject(obj);
          cv.renderAll();
          showPropPanel();
          renderLayers();
          updateLayerBadge();
        });
        child.addEventListener('dblclick',e=>{
          e.preventDefault();e.stopPropagation();
          openRenameObjectModal(obj);
        });
        child.addEventListener('dragstart',e=>{
          e.stopPropagation();
          obj.__id=obj.__id||genId();
          e.dataTransfer.effectAllowed='move';
          e.dataTransfer.setData('application/x-mbp-object',JSON.stringify({objectId:obj.__id,fromLayerId:layer.id}));
          child.style.opacity='0.45';
        });
        child.addEventListener('dragover',e=>{
          if(!hasDragType(e,'application/x-mbp-object'))return;
          e.preventDefault();
          const r=child.getBoundingClientRect();
          const after=e.clientY>r.top+r.height/2;
          child.style.borderTop=after?'':'2px solid var(--accent)';
          child.style.borderBottom=after?'2px solid var(--accent)':'';
        });
        child.addEventListener('dragleave',()=>{child.style.borderTop='';child.style.borderBottom='';});
        child.addEventListener('drop',e=>{
          if(!hasDragType(e,'application/x-mbp-object'))return;
          e.preventDefault();e.stopPropagation();
          const data=JSON.parse(e.dataTransfer.getData('application/x-mbp-object')||'{}');
          const r=child.getBoundingClientRect();
          const after=e.clientY>r.top+r.height/2;
          moveObjectToLayer(data.objectId,layer.id,obj.__id,after);
        });
        child.addEventListener('dragend',()=>{
          [...list.querySelectorAll('.ly-child')].forEach(c=>{c.style.opacity='';c.style.borderTop='';c.style.borderBottom='';});
        });
        child.addEventListener('contextmenu',e=>{
          e.preventDefault(); e.stopPropagation();
          cv.setActiveObject(obj);
          openLayerCtx(layer.id,e.clientX,e.clientY);
        });
        list.appendChild(child);
      });
    }
  });
}
function objLabel(o){
  if(o.__name)return o.__name;
  if(o.type==='image')return 'Image';
  if(o.type==='path')return 'Draw path';
  if(o.type==='rect')return 'Rectangle';
  if(o.type==='circle')return 'Circle';
  if(o.type==='textbox'||o.type==='i-text'||o.type==='text')return (o.text||'Text').slice(0,40);
  if(o._isSticky)return 'Sticky note';
  if(o._isPolaroid)return 'Polaroid frame';
  if(o._isFrame)return 'Frame';
  if(o.type==='group')return 'Group';
  return o.type||'Object';
}
function objIco(o){
  const t=o._isSticky?'note':o._isPolaroid?'polaroid':o.type;
  const map={
    image:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C8102E" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    path:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/></svg>',
    rect:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    circle:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>',
    textbox:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    'i-text':'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    text:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    note:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    polaroid:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="1"/><rect x="7" y="6" width="10" height="8"/></svg>',
    group:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><rect x="2" y="2" width="9" height="9"/><rect x="13" y="13" width="9" height="9"/></svg>',
  };
  return map[t]||map.group;
}
function openLayerCtx(layerId,x,y){
  closeCtx();
  closeCvCtx();
  const m=document.getElementById('layer-ctxm');
  const layer=layers.find(l=>l.id===layerId);
  if(!m||!layer)return;
  const objs=cv.getObjects().filter(o=>o.__lid===layerId);
  const active=cv.getActiveObject();
  const activeObjs=active?(active.type==='activeSelection'?active.getObjects():[active]):[];
  const canMoveHere=activeObjs.length&&activeObjs.some(o=>o.__lid!==layerId);
  const isExpanded=!_collapsedLayers.has(layerId);
  m.innerHTML=`
    <div class="ci" data-act="rename"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Rename</div>
    <div class="ci" data-act="select"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> Select objects <span style="font-size:10px;color:var(--txt3);margin-left:auto;">${objs.length}</span></div>
    <div class="ci" data-act="expand"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg> ${isExpanded?'Collapse':'Expand'}</div>
    <div class="ci ln"></div>
    <div class="ci" data-act="visibility"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg> ${layer.visible?'Hide':'Show'}</div>
    <div class="ci" data-act="lock"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> ${layer.locked?'Unlock':'Lock'}</div>
    <div class="ci ln"></div>
    <div class="ci ${canMoveHere?'':'disabled'}" data-act="move-here"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> Move selection here</div>
    <div class="ci" data-act="extract"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/></svg> Move selection to new layer</div>
    ${selectedLayerIds.size>1?'<div class="ci" data-act="merge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="9" height="9"/><rect x="13" y="13" width="9" height="9"/></svg> Merge selected layers</div>':''}
    <div class="ci" data-act="duplicate"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Duplicate layer</div>
    <div class="ci ln"></div>
    <div class="ci danger" data-act="delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg> Delete layer</div>`;
  m.querySelectorAll('.ci').forEach(item=>{
    if(item.classList.contains('disabled'))return;
    item.onclick=()=>{handleLayerCtxAction(layerId,item.dataset.act);closeLayerCtx();};
  });
  m.style.left=x+'px';
  m.style.top=y+'px';
  m.style.display='block';
}
function closeLayerCtx(){const m=document.getElementById('layer-ctxm');if(m)m.style.display='none';}
document.addEventListener('click',e=>{if(!e.target.closest('#layer-ctxm'))closeLayerCtx();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLayerCtx();});
function handleLayerCtxAction(layerId,act){
  const layer=layers.find(l=>l.id===layerId);
  if(!layer)return;
  if(act==='rename')return openRenameLayerModal(layerId,layer.name);
  if(act==='select')return selectLayerObjects(layerId);
  if(act==='expand'){if(_collapsedLayers.has(layerId))_collapsedLayers.delete(layerId);else _collapsedLayers.add(layerId);renderLayers();schedulePersist(250);return;}
  if(act==='visibility')return toggleLayerVis(layerId,{stopPropagation:()=>{}});
  if(act==='lock')return toggleLayerLock(layerId,{stopPropagation:()=>{}});
  if(act==='move-here')return moveActiveObjectsToLayer(layerId);
  if(act==='extract')return cxNewLayer();
  if(act==='merge')return groupSelectedLayers();
  if(act==='duplicate')return duplicateLayer(layerId);
  if(act==='delete')return deleteLayer(layerId,null);
}
function selectLayerObjects(layerId){
  const layer=layers.find(l=>l.id===layerId);
  if(!layer||layer.locked)return;
  const objs=cv.getObjects().filter(o=>o.__lid===layerId&&o.visible!==false);
  activeLayerId=layerId;
  selectedLayerIds=new Set([layerId]);
  if(objs.length===1)cv.setActiveObject(objs[0]);
  else if(objs.length>1)cv.setActiveObject(new fabric.ActiveSelection(objs,{canvas:cv}));
  else cv.discardActiveObject();
  cv.renderAll();renderLayers();updateLayerBadge();
}
function moveActiveObjectsToLayer(layerId){
  const active=cv.getActiveObject();
  if(!active)return toast('Select an object first');
  const objs=active.type==='activeSelection'?active.getObjects():[active];
  objs.forEach(obj=>{
    obj.__id=obj.__id||genId();
    moveObjectToLayer(obj.__id,layerId);
  });
  activeLayerId=layerId;selectedLayerIds=new Set([layerId]);
  rebuildCanvasZOrder();renderLayers();commitCanvasChange({persistDelay:500});toast('Moved to layer');
}
function duplicateLayer(layerId){
  const layer=layers.find(l=>l.id===layerId);
  if(!layer)return;
  const objs=cv.getObjects().filter(o=>o.__lid===layerId);
  const newId=newLayer(layer.name+' copy');
  let pending=objs.length;
  if(!pending){renderLayers();commitCanvasChange({persistDelay:500});return;}
  objs.forEach(obj=>{
    obj.clone(cl=>{
      cl.__id=genId();cl.__lid=newId;
      cl.set({left:(obj.left||0)+18,top:(obj.top||0)+18,selectable:true,evented:true,hasControls:true,hasBorders:true});
      if(cl._isSticky)attachStickyDblClick(cl,cl._stickyColor||STICKY_PALS[0]);
      if(cl._isPolaroid)attachPolaroidDblClick(cl);
      cv.add(cl);
      assignToLayer(cl,newId);
      pending--;
      if(!pending){rebuildCanvasZOrder();renderLayers();commitCanvasChange({persistDelay:500});toast('Layer duplicated');}
    });
  });
}
function lyIco(layer){const fabObj=cv?.getObjects().find(o=>o.__lid===layer.id);if(!fabObj)return`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--txt3)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>`;const m={image:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C8102E" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,'i-text':`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,rect:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,circle:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`,group:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><rect x="2" y="2" width="9" height="9"/><rect x="13" y="2" width="9" height="9"/><rect x="13" y="13" width="9" height="9"/><rect x="2" y="13" width="9" height="9"/></svg>`,path:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/></svg>`};return m[fabObj.type]||m['i-text'];}
// - Rename Layer Modal -
let _renamingLayerId=null;
let _renamingObjectId=null;
function openRenameLayerModal(id, currentName){
  _renamingLayerId=id;
  _renamingObjectId=null;
  const title=document.querySelector('#m-ly h3'); if(title)title.textContent='Rename Layer';
  document.getElementById('m-ly-n').value=currentName;
  openM('m-ly');
  setTimeout(()=>document.getElementById('m-ly-n').select(),40);
}
function openRenameObjectModal(obj){
  if(!obj)return;
  obj.__id=obj.__id||genId();
  _renamingObjectId=obj.__id;
  _renamingLayerId=null;
  const title=document.querySelector('#m-ly h3'); if(title)title.textContent='Rename Object';
  document.getElementById('m-ly-n').value=objLabel(obj);
  openM('m-ly');
  setTimeout(()=>document.getElementById('m-ly-n').select(),40);
}
function confirmRenameLayer(){
  const name=document.getElementById('m-ly-n').value.trim();
  if(name&&_renamingObjectId){
    const obj=cv.getObjects().find(o=>o.__id===_renamingObjectId);
    if(obj)obj.__name=name;
  } else if(name&&_renamingLayerId){
    const layer=layers.find(l=>l.id===_renamingLayerId);
    if(layer) layer.name=name;
  }
  _renamingLayerId=null;
  _renamingObjectId=null;
  closeM('m-ly');
  renderLayers();
  commitCanvasChange({persistDelay:500});
}
// Allow Enter key in rename modal
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&document.getElementById('m-ly').classList.contains('on'))confirmRenameLayer();
});
function moveLayer(fromIdx,toIdx){
  if(fromIdx==null||toIdx==null||fromIdx===toIdx)return;
  if(fromIdx<0||fromIdx>=layers.length)return;
  toIdx=Math.max(0,Math.min(toIdx,layers.length-1));
  const[item]=layers.splice(fromIdx,1);
  layers.splice(toIdx,0,item);
  activeLayerId=item.id;
  selectedLayerIds=new Set([item.id]);
  rebuildCanvasZOrder();
  renderLayers();
  requestAnimationFrame(()=>renderLayers());
  updateLayerBadge();
  saveH();
  schedulePersist(500);
}
function moveObjectToLayer(objectId,targetLayerId,beforeObjectId=null,after=false){
  const obj=cv.getObjects().find(o=>o.__id===objectId);
  const target=layers.find(l=>l.id===targetLayerId);
  if(!obj||!target)return;
  if(target.locked)return toast(`Layer "${target.name}" is locked`);
  layers.forEach(layer=>{layer.fabricIds=(layer.fabricIds||[]).filter(id=>id!==objectId);});
  obj.__lid=targetLayerId;
  target.fabricIds=target.fabricIds||[];
  let insertIdx=beforeObjectId?target.fabricIds.indexOf(beforeObjectId):-1;
  if(insertIdx<0)insertIdx=target.fabricIds.length;
  if(after)insertIdx++;
  target.fabricIds.splice(insertIdx,0,objectId);
  activeLayerId=targetLayerId;
  selectedLayerIds=new Set([targetLayerId]);
  cv.setActiveObject(obj);
  rebuildCanvasZOrder();
  renderLayers();
  requestAnimationFrame(()=>renderLayers());
  updateLayerBadge();
  commitCanvasChange({persistDelay:500});
}
function toggleLayerVis(id,e){e.stopPropagation();const layer=layers.find(l=>l.id===id);if(!layer)return;layer.visible=!layer.visible;syncLayerVisibility();renderLayers();commitCanvasChange({persistDelay:500});}
function startRenameLayer(id,span,e){
  e.stopPropagation();const layer=layers.find(l=>l.id===id);if(!layer)return;
  const inp=document.createElement('input');inp.className='ly-lbl-input';inp.value=layer.name;
  span.replaceWith(inp);inp.focus();inp.select();
  const finish=()=>{layer.name=inp.value.trim()||layer.name;renderLayers();};
  inp.addEventListener('blur',finish);
  inp.addEventListener('keydown',e2=>{if(e2.key==='Enter'){e2.stopPropagation();inp.blur();}if(e2.key==='Escape'){renderLayers();}});
}
function deleteLayer(id,e){if(e&&e.stopPropagation)e.stopPropagation();if(layers.length===1)return toast('Cannot delete the only layer');const layer=layers.find(l=>l.id===id);if(!layer)return;cv.getObjects().filter(o=>o.__lid===id).forEach(o=>cv.remove(o));layers=layers.filter(l=>l.id!==id);selectedLayerIds.delete(id);if(activeLayerId===id)activeLayerId=layers[0]?.id||null;cv.discardActiveObject();cv.renderAll();renderLayers();updateLayerBadge();commitCanvasChange({syncOrder:true,persistDelay:500});}
function updateLayerBadge(){
  const badge=document.getElementById('active-layer-badge');
  if(!badge)return;
  const layer=getActiveLayer();
  if(layer){badge.textContent='Active: '+layer.name;badge.classList.add('on');}
  clearTimeout(window._badgeTimer);
  window._badgeTimer=setTimeout(()=>badge.classList.remove('on'),2000);
}
function groupSelectedLayers(){if(selectedLayerIds.size<2)return toast('Ctrl/Shift+click 2+ layers to group');const selected=layers.filter(l=>selectedLayerIds.has(l.id));const allFabIds=selected.flatMap(l=>l.fabricIds);const minIdx=Math.min(...selected.map(l=>layers.indexOf(l)));const newId=genLayerId();const newL={id:newId,name:'Group '+(layers.filter(l=>l.name.startsWith('Group')).length+1),visible:true,fabricIds:allFabIds};cv.getObjects().forEach(o=>{if(allFabIds.includes(o.__id))o.__lid=newId;});layers=layers.filter(l=>!selectedLayerIds.has(l.id));layers.splice(Math.min(minIdx,layers.length),0,newL);activeLayerId=newId;selectedLayerIds=new Set([newId]);renderLayers();updateLayerBadge();commitCanvasChange({persistDelay:500});toast('Grouped -> '+newL.name);}
function ungroupLayer(){const sel=layers.find(l=>selectedLayerIds.has(l.id));if(!sel)return toast('Select a layer first');if(sel.fabricIds.length<2)return toast('Only 1 object in this layer');const idx=layers.indexOf(sel);const newLayers=[];cv.getObjects().filter(o=>o.__lid===sel.id).forEach((o,i)=>{const nid=genLayerId();const nl={id:nid,name:sel.name+' '+(i+1),visible:true,fabricIds:[o.__id]};o.__lid=nid;newLayers.push(nl);});layers.splice(idx,1,...newLayers);activeLayerId=newLayers[0]?.id||activeLayerId;selectedLayerIds=new Set(newLayers.map(l=>l.id));renderLayers();commitCanvasChange({persistDelay:500});toast('Split into '+newLayers.length+' layers');}
function deleteSelectedLayers(){if(!selectedLayerIds.size)return toast('Select layers first');if(layers.length<=selectedLayerIds.size)return toast('Cannot delete all layers');[...selectedLayerIds].forEach(id=>deleteLayer(id,null));}

function initCanvas(){
  const cw=document.getElementById('cw');
  cv=new fabric.Canvas('c',{
    width:cw.clientWidth,height:cw.clientHeight,
    backgroundColor:null,preserveObjectStacking:true,
    selection:true,selectionColor:'rgba(200,16,46,0.07)',
    selectionBorderColor:'#C8102E',selectionLineWidth:1,
    allowTouchScrolling:false,
    enableRetinaScaling:true,
  });
  cv.backgroundColor=null;
  cv.lowerCanvasEl.style.background='transparent';
  cv.upperCanvasEl.style.touchAction='none';
  cv.lowerCanvasEl.style.touchAction='none';
  updBrush();
  cv.on('object:added',onMod);
  cv.on('object:modified',()=>commitCanvasChange({historyDelay:250,persistDelay:700}));
  cv.on('object:removed',onMod);
  cv.on('path:created',onPathCreated);
  let _propDebounce=null;
  const debouncedShowProp=()=>{
    clearTimeout(_propDebounce);
    _propDebounce=setTimeout(()=>{ propTarget=cv.getActiveObject(); showPropPanel(); },120);
  };
  cv.on('selection:created',()=>{ propTarget=cv.getActiveObject(); syncLayerSelectionFromCanvas(); debouncedShowProp(); });
  cv.on('selection:updated',()=>{ propTarget=cv.getActiveObject(); syncLayerSelectionFromCanvas(); debouncedShowProp(); });
  cv.on('selection:cleared',()=>{ clearTimeout(_propDebounce); renderLayers(); if(!propPinned)hidePropPanel(); });
  cv.on('mouse:down',evDown);
  cv.on('mouse:move',evMove);
  cv.on('mouse:up',evUp);
  cv.on('mouse:wheel',evWheel);
  cv.on('after:render',()=>{renderRulers();renderGuideLayer();});
  cv.wrapperEl.addEventListener('contextmenu',e=>{
    e.preventDefault();
    if(tool==='draw'){positionDrawControls(e.clientX,e.clientY);return;}
    openCtx(e.clientX,e.clientY);
  });
  document.addEventListener('mousedown',e=>{if(!e.target.closest('#ctxm'))closeCtx();});
  const cwEl=document.getElementById('cw');
  cwEl.addEventListener('dragover',e=>{e.preventDefault();document.getElementById('drop-hl').classList.add('on');});
  cwEl.addEventListener('dragleave',()=>document.getElementById('drop-hl').classList.remove('on'));
  cwEl.addEventListener('drop',evDrop);
  document.getElementById('ruler-top')?.addEventListener('pointerdown',e=>startGuideDrag('x',e));
  document.getElementById('ruler-left')?.addEventListener('pointerdown',e=>startGuideDrag('y',e));
  document.addEventListener('paste',evPaste);
  document.addEventListener('keydown',evKey);
  window.addEventListener('resize',()=>{ fitEditorCanvas(); });
  syncRulerMode();
}

function setTool(t){
  tool=t;
  ['select','draw','pan'].forEach(id=>{const el=document.getElementById('tool-'+id);if(el)el.classList.toggle('active',id===t);});
  const dc=document.getElementById('draw-controls');
  dc?.classList.toggle('on',t==='draw');
  if(t==='draw'){positionDrawControls();cv.isDrawingMode=true;cv.selection=false;cv.defaultCursor='crosshair';cv.getObjects().forEach(o=>{o.selectable=false;o.evented=false;});}
  else if(t==='pan'){dc?.classList.remove('on');cv.isDrawingMode=false;cv.selection=false;cv.defaultCursor='grab';cv.getObjects().forEach(o=>{o.selectable=false;o.evented=false;});}
  else{dc?.classList.remove('on');cv.isDrawingMode=false;cv.selection=true;cv.defaultCursor='default';cv.hoverCursor='move';applyLayerStateToObjects();}
  cv.renderAll();
}

function initDrawControls(){
  const btn=document.getElementById('tool-draw');
  const dc=document.getElementById('draw-controls');
  if(!btn||!dc)return;
  btn.addEventListener('contextmenu',e=>{e.preventDefault();setTool('draw');positionDrawControls(e.clientX,e.clientY);});
  dc.addEventListener('pointerdown',e=>e.stopPropagation());
  dc.addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',e=>{
    if(tool==='draw')return;
    if(!e.target.closest('#draw-controls'))dc.classList.remove('on');
  });
  window.addEventListener('resize',()=>{if(dc.classList.contains('on'))positionDrawControls();});
}

function positionDrawControls(x=null,y=null){
  const dc=document.getElementById('draw-controls'),btn=document.getElementById('tool-draw');
  if(!dc||!btn)return;
  if(x==null||y==null){
    const r=btn.getBoundingClientRect();
    x=r.left;
    y=r.bottom+6;
  }
  dc.style.left=Math.min(Math.max(8,x),window.innerWidth-dc.offsetWidth-8)+'px';
  dc.style.top=Math.min(Math.max(8,y),window.innerHeight-dc.offsetHeight-8)+'px';
  dc.classList.add('on');
}

function updBrush(){
  const sz=+document.getElementById('brush-sz').value,col=document.getElementById('brush-col').value;
  document.getElementById('bval').textContent=sz;
  if(!cv)return;
  if(!cv.freeDrawingBrush)cv.freeDrawingBrush=new fabric.PencilBrush(cv);
  cv.freeDrawingBrush.width=sz;cv.freeDrawingBrush.color=col;
}

function applyObjectControls(o){
  if(!o)return;
  o.set({
    borderColor:'#C8102E',
    cornerColor:'#C8102E',
    cornerStrokeColor:'#ffffff',
    editingBorderColor:'#C8102E',
    transparentCorners:false,
    cornerSize:10,
  });
}

function addObj(o){
  ensureDefaultLayer();
  const activeLayer=getActiveLayer();
  if(activeLayer?.locked){
    const openLayer=layers.find(l=>!l.locked&&l.visible!==false);
    if(openLayer)activeLayerId=openLayer.id;
    else return toast('Unlock a layer before adding objects');
  }
  o.__id=o.__id||genId();
  applyObjectControls(o);
  o.set({selectable:true,evented:true,hasControls:true,hasBorders:true});
  if(o.type==='image')registerImageAssetFromObject(o).catch(()=>{});
  assignToLayer(o,activeLayerId);cv.add(o);rebuildCanvasZOrder();
  setTool('select');cv.setActiveObject(o);cv.requestRenderAll();
  commitCanvasChange({persistDelay:500});
}

function normalizeTextBox(o){
  if(!o||!['i-text','text','textbox'].includes(o.type))return;
  if(o.isEditing)return;
  applyObjectControls(o);
  o.set({originX:'left',originY:'top',padding:8,splitByGrapheme:false,objectCaching:false,noScaleCache:true});
  o.initDimensions&&o.initDimensions();
  o.setCoords();
  cv?.requestRenderAll();
}

function addText(){
  const txt=new fabric.Textbox('Double-click to edit',{
    left:cv.width/2-145,
    top:cv.height/2-22,
    width:290,
    fontFamily:'Syne',
    fontSize:24,
    fill:'#111827',
    fontWeight:'700',
    lineHeight:1.18,
    textAlign:'left',
    editingBorderColor:'#C8102E',
    cornerColor:'#C8102E',
    borderColor:'#C8102E',
  });
  normalizeTextBox(txt);
  txt.on('editing:exited',()=>{normalizeTextBox(txt);commitCanvasChange({historyDelay:200,persistDelay:600});});
  addObj(txt);
  if(document.fonts?.ready){
    document.fonts.ready.then(()=>{normalizeTextBox(txt);commitCanvasChange({historyDelay:200,persistDelay:600});});
  }else{
    setTimeout(()=>normalizeTextBox(txt),250);
  }
}

function addSticky(){
  const bg=STICKY_PALS[Math.floor(Math.random()*STICKY_PALS.length)];
  const sticky=createStickyGroup(cv.width/2, cv.height/2, bg, 'Your note...');
  attachStickyDblClick(sticky,bg);
  addObj(sticky);
  return sticky;
}

function createStickyGroup(left, top, bg, text, opts={}){
  const noteW=opts.noteW||STICKY_W, noteH=opts.noteH||STICKY_H, pad=opts.pad||STICKY_PAD;
  const r=new fabric.Rect({
    width:noteW, height:noteH, fill:bg, rx:6, ry:6,
    shadow:new fabric.Shadow({color:'rgba(0,0,0,0.12)',blur:12,offsetX:2,offsetY:4}),
    originX:'center', originY:'center', left:0, top:0,
  });
  const t=new fabric.Textbox(text||'Your note...',{
    width:noteW-pad*2,
    fontSize:13, fontFamily:'DM Mono', fill:'#374151', editable:true,
    splitByGrapheme:false, breakWords:true, originX:'left', originY:'top',
    left:-(noteW/2)+pad, top:-(noteH/2)+pad,
  });
  const g=new fabric.Group([r,t],{
    left, top, originX:'center', originY:'center', subTargetCheck:true,
    _isSticky:true, _stickyColor:bg,
  });
  g.setControlsVisibility({mtr:true});
  g._stickyText=t;
  return g;
}

function attachStickyDblClick(grp,bg){
  if(!grp||grp.__stickyHooked)return;
  grp.__stickyHooked=true;
  grp.on('mousedblclick',()=>{
    const txt=grp.getObjects?.().find(o=>o.type==='textbox'||o.type==='i-text'||o.type==='text');
    if(!txt)return;
    cv.setActiveObject(txt);
    cv.requestRenderAll();
    txt.enterEditing?.();
    txt.selectAll?.();
  });
}

// -
