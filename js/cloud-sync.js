let mbpCloudClient=null;
let mbpCloudSaveTimer=null;
let mbpCloudSaving=false;

function initCloudClient(){
  if(mbpCloudClient)return mbpCloudClient;
  if(!window.supabase||!window.MBP_SUPABASE_URL||!window.MBP_SUPABASE_KEY){
    console.warn('MoodBoard Pro cloud sync not configured');
    return null;
  }
  mbpCloudClient=window.supabase.createClient(window.MBP_SUPABASE_URL,window.MBP_SUPABASE_KEY);
  return mbpCloudClient;
}

function getCloudWorkspace(){
  return {
    id:localStorage.getItem('mbp_cloud_workspace_id')||'',
    token:localStorage.getItem('mbp_cloud_workspace_token')||''
  };
}

function setCloudWorkspace(id,token){
  localStorage.setItem('mbp_cloud_workspace_id',id);
  localStorage.setItem('mbp_cloud_workspace_token',token);
}

function getCloudPayload(){
  return {
    v:1,
    projects,
    updatedAt:Date.now()
  };
}

async function ensureCloudWorkspace(){
  const existing=getCloudWorkspace();
  if(existing.id&&existing.token)return existing;
  const client=initCloudClient();
  if(!client)throw new Error('Cloud sync is not configured');
  const {data,error}=await client.rpc('mbp_create_workspace');
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  if(!row?.workspace_id||!row?.write_token)throw new Error('Cloud workspace creation returned no credentials');
  setCloudWorkspace(row.workspace_id,row.write_token);
  return {id:row.workspace_id,token:row.write_token};
}

async function saveCloudWorkspace(snapshot=getCloudPayload(),opts={}){
  if(mbpCloudSaving)return false;
  const client=initCloudClient();
  if(!client)return false;
  mbpCloudSaving=true;
  try{
    const ws=await ensureCloudWorkspace();
    const {data,error}=await client.rpc('mbp_save_workspace',{
      p_workspace_id:ws.id,
      p_write_token:ws.token,
      p_data:snapshot
    });
    if(error)throw error;
    if(data!==true)throw new Error('Cloud save rejected');
    if(!opts.silent)toast?.('Cloud saved');
    return true;
  }catch(e){
    console.warn('MoodBoard Pro cloud save failed',e);
    if(!opts.silent)toast?.('No se pudo guardar en la nube');
    return false;
  }finally{
    mbpCloudSaving=false;
  }
}

function scheduleCloudSave(snapshot){
  if(!getCloudWorkspace().id)return;
  clearTimeout(mbpCloudSaveTimer);
  mbpCloudSaveTimer=setTimeout(()=>saveCloudWorkspace(snapshot,{silent:true}),1800);
}

async function cloudSaveNow(){
  try{ await autoSave?.(); }catch(e){}
  await saveCloudWorkspace(getCloudPayload(),{silent:false});
}

async function loadCloudWorkspace(opts={}){
  const client=initCloudClient();
  if(!client)return false;
  const ws=getCloudWorkspace();
  if(!ws.id||!ws.token){
    toast?.('No cloud workspace linked yet');
    return false;
  }
  try{
    const {data,error}=await client.rpc('mbp_load_workspace',{
      p_workspace_id:ws.id,
      p_write_token:ws.token
    });
    if(error)throw error;
    if(!data?.projects)throw new Error('Cloud workspace has no projects');
    projects=data.projects;
    hist={};
    curProj=null;
    curCv=null;
    localStorage.removeItem('mbp_last_proj');
    localStorage.removeItem('mbp_last_cv');
    await saveLS();
    renderHome?.();
    showScreen?.('home-screen');
    if(!opts.silent)toast?.('Cloud workspace loaded');
    return true;
  }catch(e){
    console.warn('MoodBoard Pro cloud load failed',e);
    if(!opts.silent)toast?.('No se pudo cargar desde la nube');
    return false;
  }
}

function cloudLoadNow(){
  const run=()=>loadCloudWorkspace({silent:false});
  if(typeof customConfirm==='function'){
    customConfirm('This will replace the current local workspace with the cloud copy.',run,'Load cloud workspace','Load',false);
  }else{
    run();
  }
}

function cloudShowRecovery(){
  const ws=getCloudWorkspace();
  if(!ws.id||!ws.token)return toast?.('No cloud workspace linked yet');
  const recovery=`${location.origin}${location.pathname}?workspace=${encodeURIComponent(ws.id)}&token=${encodeURIComponent(ws.token)}`;
  navigator.clipboard?.writeText(recovery).then(()=>toast?.('Recovery link copied')).catch(()=>{
    prompt('Recovery link',recovery);
  });
}

async function cloudImportFromUrl(){
  const params=new URLSearchParams(location.search);
  const id=params.get('workspace');
  const token=params.get('token');
  if(!id||!token)return;
  setCloudWorkspace(id,token);
  await loadCloudWorkspace({silent:false});
  history.replaceState(null,'',location.pathname);
}
