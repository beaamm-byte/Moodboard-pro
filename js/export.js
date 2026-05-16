function doExport(scope='all'){
  autoSave();
  let data, filename;
  if(scope==='project'&&curProj){
    const proj={};
    proj[curProj]=projects[curProj];
    data={v:6,projects:proj};
    filename=(projects[curProj].name||'project').replace(/[^a-z0-9]/gi,'_')+'.mb';
  } else {
    data={v:6,projects};
    filename='moodboard-workspace.mb';
  }
  const raw=JSON.stringify(data);
  const encoded='mbpro|'+btoa(unescape(encodeURIComponent(raw)));
  dlBlob(new Blob([encoded],{type:'application/octet-stream'}),filename);
  toast('Exported: '+filename);
}
function doImport(){document.getElementById('imp-in').click();}
function handleImport(e){
  const f=e.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=ev=>{
    try{
      let raw=ev.target.result.trim();
      // Decode .mb format (Base64 with prefix)
      if(raw.startsWith('mbpro|')){
        raw=decodeURIComponent(escape(atob(raw.slice(6))));
      }
      const d=JSON.parse(raw);
      if(!d.projects)return toast('Invalid .mb file');
      customConfirm('This will replace ALL current projects. Make sure you have a backup first.', ()=>{
        projects=d.projects; hist={}; saveLS();
        curProj=null; curCv=null;
        renderHome(); showScreen('home-screen');
        toast('Workspace imported!');
      }, 'Replace all projects?', 'Replace', true);
    }catch(err){toast('Could not read file - make sure it is a valid .mb file');}
  };
  rd.readAsText(f);e.target.value='';
}
async function expPDF(scope='current'){
  const {jsPDF}=window.jspdf;

  if(scope==='current'){
    const prevBg=cv.backgroundColor;
    cv.backgroundColor='#ffffff';
    cv.renderAll();
    const url=cv.toDataURL({format:'jpeg',multiplier:1.5,quality:.95});
    cv.backgroundColor=prevBg;
    cv.renderAll();
    const img=new Image();
    img.onload=()=>{
      const pdf=new jsPDF({orientation:img.width>img.height?'landscape':'portrait',unit:'px',format:[img.width,img.height]});
      pdf.addImage(url,'JPEG',0,0,img.width,img.height);
      const name=(projects[curProj]?.canvases[curCv]?.name||'canvas').replace(/[^a-z0-9]/gi,'_');
      pdf.save(name+'.pdf');
      toast('PDF exported');
    };
    img.src=url;
    return;
  }

  if(!curProj)return toast('No project selected');
  const canvases=Object.entries(projects[curProj].canvases);
  if(!canvases.length)return;

  toast('Generating PDF... please wait');
  projects[curProj].canvases[curCv].json=JSON.stringify({
    canvas:canvasJSON(),layers,activeLayerId,
    collapsedLayerIds:getCollapsedLayerIds(),
    viewport:cv.viewportTransform.slice()
  });

  let pdf=null;
  for(let i=0;i<canvases.length;i++){
    const [,cvData]=canvases[i];
    const dataUrl=await renderCanvasToDataUrl(cvData);
    if(!dataUrl)continue;
    const img=await loadImgPromise(dataUrl);
    const w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
    if(!pdf)pdf=new jsPDF({orientation:w>h?'landscape':'portrait',unit:'px',format:[w,h]});
    else pdf.addPage([w,h], w>h?'landscape':'portrait');
    pdf.addImage(dataUrl,'JPEG',0,0,w,h);
  }

  if(pdf){
    const projName=(projects[curProj].name||'project').replace(/[^a-z0-9]/gi,'_');
    pdf.save(projName+'.pdf');
    toast('Multi-page PDF exported ('+canvases.length+' canvas'+(canvases.length>1?'es':'')+')');
  }
}

function renderCanvasToDataUrl(cvData){
  return new Promise(resolve=>{
    if(!cvData.json){resolve(null);return;}
    const tmpEl=document.createElement('canvas');
    tmpEl.width=cv.width; tmpEl.height=cv.height;
    const tmp=new fabric.Canvas(tmpEl,{backgroundColor:'#ffffff',preserveObjectStacking:true,enableRetinaScaling:false});
    const d=typeof cvData.json==='string'?JSON.parse(cvData.json):cvData.json;
    tmp.loadFromJSON(d.canvas||d,()=>{
      tmp.backgroundColor='#ffffff';
      tmp.renderAll();
      const url=tmp.toDataURL({format:'jpeg',multiplier:1.5,quality:.95});
      tmp.dispose();
      resolve(url);
    });
  });
}

function loadImgPromise(src){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>resolve(img);
    img.src=src;
  });
}

function toggleExportMenu(){
  const m=document.getElementById('export-menu');
  if(!m)return;
  const isOpen=m.style.display!=='none';
  if(isOpen){m.style.display='none';return;}
  if(!propPinned)hidePropPanel();
  if(m.parentElement!==document.body)document.body.appendChild(m);
  const btn=document.getElementById('export-btn');
  if(btn){
    const r=btn.getBoundingClientRect();
    m.style.top=(r.bottom+5)+'px';
    m.style.right=(window.innerWidth-r.right)+'px';
    m.style.left='auto';
  }
  m.style.display='block';
}
function closeExportMenu(){
  const m=document.getElementById('export-menu');
  if(m)m.style.display='none';
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#export-wrap'))closeExportMenu();
});
