let mbpCloudClient=null;
let mbpCloudSaveTimer=null;
let mbpCloudSaving=false;
let mbpCloudSession=null;

function initCloudClient(){
  if(mbpCloudClient)return mbpCloudClient;
  if(!window.supabase||!window.MBP_SUPABASE_URL||!window.MBP_SUPABASE_KEY){
    console.warn('MoodBoard Pro cloud sync not configured');
    return null;
  }
  mbpCloudClient=window.supabase.createClient(window.MBP_SUPABASE_URL,window.MBP_SUPABASE_KEY);
  return mbpCloudClient;
}

async function initCloudAuth(){
  const client=initCloudClient();
  if(!client?.auth)return null;
  try{
    const {data}=await client.auth.getSession();
    mbpCloudSession=data?.session||null;
    client.auth.onAuthStateChange((_event,session)=>{
      mbpCloudSession=session||null;
      if(session?.user?.email)localStorage.setItem('mbp_cloud_email',session.user.email);
    });
    if(mbpCloudSession?.user?.email)localStorage.setItem('mbp_cloud_email',mbpCloudSession.user.email);
    if(mbpCloudSession&&localStorage.getItem('mbp_cloud_email_pending')==='1'){
      localStorage.removeItem('mbp_cloud_email_pending');
      await cloudFinishEmailSync({saveCurrent:true});
    }else if(mbpCloudSession&&!Object.keys(projects||{}).length){
      await cloudFinishEmailSync({saveCurrent:false,loadExisting:true,silent:true});
    }
    return mbpCloudSession;
  }catch(e){
    console.warn('MoodBoard Pro auth init failed',e);
    return null;
  }
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

function isCloudEmailLinked(){
  return !!mbpCloudSession?.user;
}

async function ensureUserCloudWorkspace(email='',accepted=false){
  const client=initCloudClient();
  if(!client)throw new Error('Cloud sync is not configured');
  const {data,error}=await client.rpc('mbp_ensure_user_workspace',{
    p_email:email||mbpCloudSession?.user?.email||localStorage.getItem('mbp_cloud_email')||'',
    p_terms_accepted:!!accepted
  });
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  return row||{workspace_id:data,created:false};
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
    if(isCloudEmailLinked()){
      await ensureUserCloudWorkspace('',true);
      const {data,error}=await client.rpc('mbp_save_user_workspace',{p_data:snapshot});
      if(error)throw error;
      if(data!==true)throw new Error('Cloud save rejected');
      if(!opts.silent)toast?.('Cloud backup saved');
      return true;
    }
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
  if(!getCloudWorkspace().id&&!isCloudEmailLinked())return;
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
  if(isCloudEmailLinked()){
    try{
      const {data,error}=await client.rpc('mbp_load_user_workspace');
      if(error)throw error;
      return await applyCloudPayload(data,opts);
    }catch(e){
      console.warn('MoodBoard Pro email cloud load failed',e);
      if(!opts.silent)toast?.('No se pudo cargar desde la nube');
      return false;
    }
  }
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
    return await applyCloudPayload(data,opts);
  }catch(e){
    console.warn('MoodBoard Pro cloud load failed',e);
    if(!opts.silent)toast?.('No se pudo cargar desde la nube');
    return false;
  }
}

async function applyCloudPayload(data,opts={}){
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
  if(isCloudEmailLinked())return toast?.('Email sync is active. Use Sync with email on the other device.');
  const ws=getCloudWorkspace();
  if(!ws.id||!ws.token)return toast?.('No cloud workspace linked yet');
  const recovery=`${location.origin}${location.pathname}?workspace=${encodeURIComponent(ws.id)}&token=${encodeURIComponent(ws.token)}`;
  navigator.clipboard?.writeText(recovery).then(()=>toast?.('Recovery link copied')).catch(()=>{
    prompt('Recovery link',recovery);
  });
}

function openCloudLinkModal(){
  const inp=document.getElementById('cloud-link-input');
  if(inp)inp.value='';
  openM?.('m-cloud-link');
  setTimeout(()=>inp?.focus(),40);
}

function cloudRestoreFromTypedLink(){
  const raw=document.getElementById('cloud-link-input')?.value.trim();
  if(!raw)return toast?.('Paste a cloud access link first');
  let url;
  try{url=new URL(raw,location.href);}catch(e){return toast?.('Invalid cloud access link');}
  const id=url.searchParams.get('workspace');
  const token=url.searchParams.get('token');
  if(!id||!token)return toast?.('Invalid cloud access link');
  closeM?.('m-cloud-link');
  const run=async()=>{
    setCloudWorkspace(id,token);
    await loadCloudWorkspace({silent:false});
  };
  if(typeof customConfirm==='function'){
    customConfirm('This will replace the current local workspace with the cloud copy from the access link.',run,'Restore cloud backup','Restore',false);
  }else{
    run();
  }
}

function openCloudEmailModal(){
  const email=document.getElementById('cloud-email-input');
  const consent=document.getElementById('cloud-email-consent');
  if(email)email.value=localStorage.getItem('mbp_cloud_email')||mbpCloudSession?.user?.email||'';
  if(consent)consent.checked=false;
  openM?.('m-cloud-email');
  setTimeout(()=>email?.focus(),40);
}

async function cloudSendEmailLink(){
  const client=initCloudClient();
  if(!client?.auth)return toast?.('Cloud email sync is not configured');
  const email=document.getElementById('cloud-email-input')?.value.trim();
  const consent=document.getElementById('cloud-email-consent')?.checked;
  if(!email||!/\S+@\S+\.\S+/.test(email))return toast?.('Enter a valid email');
  if(!consent)return toast?.('Accept cloud sync terms to continue');
  try{
    localStorage.setItem('mbp_cloud_email',email);
    localStorage.setItem('mbp_cloud_email_pending','1');
    const {error}=await client.auth.signInWithOtp({
      email,
      options:{emailRedirectTo:location.origin+location.pathname}
    });
    if(error)throw error;
    closeM?.('m-cloud-email');
    toast?.('Check your email for the sync link');
  }catch(e){
    console.warn('MoodBoard Pro email sync failed',e);
    toast?.('No se pudo enviar el enlace de sincronización');
  }
}

async function cloudFinishEmailSync(opts={}){
  const email=mbpCloudSession?.user?.email||localStorage.getItem('mbp_cloud_email')||'';
  const info=await ensureUserCloudWorkspace(email,true);
  if(opts.saveCurrent&&info?.created){
    try{ await autoSave?.(); }catch(e){}
    await saveCloudWorkspace(getCloudPayload(),{silent:true});
    toast?.('Email sync enabled');
    return true;
  }
  if(opts.saveCurrent||opts.loadExisting){
    if(opts.saveCurrent)toast?.('Email sync enabled');
    return loadCloudWorkspace({silent:!!opts.silent});
  }
  return true;
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
