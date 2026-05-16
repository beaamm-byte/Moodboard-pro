// Properties panel extracted from index.html
// -
// PROPERTIES PANEL
// -
function hidePropPanel(){document.getElementById('prop-panel').classList.remove('on');}
function showPropPanel(){
  const o=cv.getActiveObject();if(!o){if(!propPinned)hidePropPanel();return;}
  document.getElementById('prop-panel').classList.add('on');
  renderPropContent(o);
}
function getEditableImageFromSelection(){
  const o=cv.getActiveObject();
  if(!o)return null;
  if(o.type==='image')return o;
  if(o._isFrame&&o.getObjects)return o.getObjects().find(x=>x.type==='image')||null;
  return null;
}
function addPropRow(container,label,inputHtml,valHtml=''){
  const row=document.createElement('div');row.className='pp-row';
  row.innerHTML=`<div class="pp-lbl"><span>${label}</span>${valHtml}</div>${inputHtml}`;
  container.appendChild(row);
}

function addColorRow(container, label, currentColor, onChange) {
  const safeCol = (typeof currentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(currentColor))
    ? currentColor : '#C8102E';
  const row = document.createElement('div');
  row.className = 'pp-row';
  const uid = 'col_' + Math.random().toString(36).slice(2);

  row.innerHTML = `
    <div class="pp-lbl">${label}</div>
    <div class="pp-color-row">
      <input type="color" class="pp-color-input" id="${uid}" value="${safeCol}"
        oninput="syncColorPicker(this,'${uid}',_ppOnChange_${uid})">
      <!-- Hex text input -->
      <input type="text" id="${uid}_hex" maxlength="7" value="${safeCol}"
        placeholder="#000000"
        style="width:68px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;
               color:var(--txt);font-family:'DM Mono',monospace;font-size:11px;padding:4px 6px;
               outline:none;text-transform:uppercase;"
        oninput="syncHexInput(this,'${uid}',_ppOnChange_${uid})"
        onfocus="this.select()">
    </div>
    <div class="palette-grid" id="${uid}_grid"></div>
    <!-- Recent colors strip -->
    <div id="${uid}_history" style="display:flex;gap:3px;flex-wrap:wrap;margin-top:4px;min-height:0;"></div>`;

  // Store callback globally so inline handlers can find it
  window[`_ppOnChange_${uid}`] = (color) => {
    onChange(color);
    addToColorHistory(color);
    renderHistoryStrip(row.querySelector(`#${uid}_history`));
  };

  // Palette grid
  const grid = row.querySelector(`#${uid}_grid`);
  PALETTE.forEach(col => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (col === safeCol ? ' sel' : '');
    sw.style.background = col;
    if (col === '#FFFFFF' || col === '#ffffff') sw.style.border = '2px solid var(--border2)';
    sw.onclick = () => {
      window[`_ppOnChange_${uid}`](col);
      const inp = row.querySelector('input[type=color]');
      const hex = row.querySelector(`#${uid}_hex`);
      if (inp && /^#[0-9a-fA-F]{6}$/.test(col)) inp.value = col;
      if (hex) hex.value = col.toUpperCase();
      grid.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
      sw.classList.add('sel');
    };
    grid.appendChild(sw);
  });

  // Initial history strip
  renderHistoryStrip(row.querySelector(`#${uid}_history`), window[`_ppOnChange_${uid}`], row, uid);

  container.appendChild(row);
}

function syncColorPicker(picker, uid, cb) {
  const hex = picker.value;
  const hexInput = document.getElementById(uid + '_hex');
  if (hexInput) hexInput.value = hex.toUpperCase();
  if (cb) cb(hex);
}

function syncHexInput(input, uid, cb) {
  let val = input.value.trim();
  if (!val.startsWith('#')) val = '#' + val;
  input.value = val.toUpperCase();
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    const picker = document.getElementById(uid);
    if (picker) picker.value = val;
    if (cb) cb(val);
  }
}

function renderHistoryStrip(container, cb, row, uid) {
  if (!container) return;
  container.innerHTML = '';
  if (!_colorHistory.length) return;
  const label = document.createElement('div');
  label.style.cssText = 'font-size:9px;font-weight:700;color:var(--txt3);letter-spacing:.5px;text-transform:uppercase;width:100%;margin-bottom:3px;';
  label.textContent = 'Recent';
  container.appendChild(label);
  _colorHistory.forEach(hex => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = hex; sw.title = hex;
    if (hex === '#ffffff' || hex === '#FFFFFF') sw.style.border = '1.5px solid var(--border2)';
    sw.onclick = () => {
      if (cb) cb(hex);
      else {
        const obj = cv.getActiveObject() || propTarget; if (!obj) return;
        setProp('fill', hex);
      }
      if (row && uid) {
        const picker = document.getElementById(uid);
        const hexInput = document.getElementById(uid + '_hex');
        if (picker && /^#[0-9a-fA-F]{6}$/.test(hex)) picker.value = hex;
        if (hexInput) hexInput.value = hex.toUpperCase();
      }
    };
    container.appendChild(sw);
  });
}

function startEyedropperForProp(label, uid, cb){
  const o=cv.getActiveObject()||propTarget; if(!o)return;
  const propMap={'Fill':'fill','Stroke':'stroke','Color':'fill','Text Color':'fill'};
  const prop=propMap[label]||'fill';
  // After sampling, also update the hex text input and history
  const wrappedCb=(color)=>{
    o.set(prop,color); cv.renderAll();
    addToColorHistory(color);
    if(uid){
      const picker=document.getElementById(uid);
      const hexInput=document.getElementById(uid+'_hex');
      if(picker&&/^#[0-9a-fA-F]{6}$/.test(color))picker.value=color;
      if(hexInput)hexInput.value=color.toUpperCase();
    }
    if(cb)cb(color);
    // Re-render history strips
    document.querySelectorAll('[id$="_history"]').forEach(el=>{
      renderHistoryStrip(el);
    });
  };
  startEyedropper(o,prop,wrappedCb);
}

function toggleFontStyle(prop,onVal,offVal,btn){
  const o=cv.getActiveObject();if(!o)return;
  const cur=o[prop];const next=cur===onVal?offVal:onVal;
  o.set(prop,next);normalizeTextBox(o);cv.renderAll();btn.classList.toggle('active',next===onVal);commitCanvasChange({historyDelay:250,persistDelay:700});
}

function addToColorHistory(color){
  if(!color||color.length<4)return;
  _colorHistory=_colorHistory.filter(c=>c!==color);
  _colorHistory.unshift(color);
  if(_colorHistory.length>8)_colorHistory.length=8;
}

function setPropOnTarget(el,prop,val){
  const o=cv.getActiveObject()||propTarget;
  if(!o)return;
  o.set(prop,val);
  if(prop==='fontFamily'||prop==='fontSize'||prop==='fontWeight'||prop==='fontStyle'){
    normalizeTextBox(o);
  }
  if(prop==='fill'||prop==='stroke')addToColorHistory(val);
  cv.requestRenderAll();
  el.style.fontFamily=val;
  commitCanvasChange({historyDelay:250,persistDelay:700});
}

function setProp(prop,val){
  const o=cv.getActiveObject()||propTarget;
  if(!o)return;
  o.set(prop,val);
  if(prop==='fontFamily'||prop==='fontSize'||prop==='fontWeight'||prop==='fontStyle'){
    normalizeTextBox(o);
  }
  if(prop==='fill'||prop==='stroke')addToColorHistory(val);
  cv.requestRenderAll();
  commitCanvasChange({historyDelay:250,persistDelay:700});
}

// -
// PROP PANEL - PIN / DRAG
// -
function togglePinPanel(){
  propPinned=!propPinned;
  const panel=document.getElementById('prop-panel');
  const wrap=document.getElementById('right-panel-wrap');
  const btn=document.getElementById('pin-btn');
  btn.classList.toggle('active',propPinned);
  if(propPinned){
    panel.classList.add('pinned');
    wrap.appendChild(panel);
    panel.style.cssText='';// clear inline drag styles
  } else {
    panel.classList.remove('pinned');
    document.getElementById('cw').appendChild(panel);
    panel.style.right='12px';panel.style.top='12px';
  }
}

function makePropDraggable(){
  const panel=document.getElementById('prop-panel');
  const hdr=document.getElementById('prop-header');
  let isDragging=false,ox=0,oy=0;
  ['pointerdown','mousedown','click','dblclick','wheel'].forEach(type=>{
    panel.addEventListener(type,e=>e.stopPropagation());
  });
  // Use pointer events so stylus/pen also works
  hdr.addEventListener('pointerdown',e=>{
    if(propPinned||e.target.closest('button'))return;
    isDragging=true;
    hdr.setPointerCapture(e.pointerId);
    const r=panel.getBoundingClientRect();
    ox=e.clientX-r.left; oy=e.clientY-r.top;
    e.stopPropagation();
    e.preventDefault();
  });
  hdr.addEventListener('pointermove',e=>{
    if(!isDragging)return;
    const cw=document.getElementById('cw').getBoundingClientRect();
    const w=panel.offsetWidth,h=panel.offsetHeight;
    const x=Math.max(6,Math.min(e.clientX-cw.left-ox,cw.width-w-6));
    const y=Math.max(6,Math.min(e.clientY-cw.top-oy,cw.height-h-6));
    panel.style.left=x+'px';
    panel.style.top=y+'px';
    panel.style.right='auto';
    e.stopPropagation();
    e.preventDefault();
  });
  const stopDrag=e=>{isDragging=false;e.stopPropagation();};
  hdr.addEventListener('pointerup',stopDrag);
  hdr.addEventListener('pointercancel',stopDrag);
}

// -
