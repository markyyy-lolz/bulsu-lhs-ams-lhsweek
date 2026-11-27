import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const SUPABASE_URL = 'https://rfxzbuocxersgbshczbj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb';
const client = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
const $ = selector => document.querySelector(selector);
const studentInput = $('#studentID');
const recordButton = $('#recordButton');
const stationLabel = $('#stationLabel');
const stationDetail = $('#stationDetail');
const stationDot = $('#stationDot');
const activationNotice = $('#activationNotice');
const confirmation = $('#confirmation');
const demoButton = $('#demoButton');
const signOutButton = $('#stationSignOut');

const state = {
  authorized: false,
  operatorEmail: '',
  operatorRole: '',
  operatorClass: '',
  operatorScope: '',
  operatorExpires: '',
  demo: false,
  busy: false,
  demoLogs: [],
  lastResult: null,
  resetTimer: null
};
const demoRoster = [
  {student_id:'2023107337',full_name:'Demo Student',grade_level:'10',section:'Sample Section'},
  {student_id:'2023999999',full_name:'Sample Learner',grade_level:'9',section:'Demo Section'}
];

const camera={
  mode:'manual', scanner:null, generation:0, scanBusy:false, lastScans:new Map(),
  stopTask:Promise.resolve()
};
let scannerLibraryPromise=null;
const cameraStatus=$('#cameraStatus');
const cameraRetry=$('#restartCameraButton');
const scannerPlaceholder=$('#scannerPlaceholder');
function scannerMessage(message,failed=false){
  if(cameraStatus){cameraStatus.textContent=message;cameraStatus.classList.toggle('failed',failed);}
}
function stopCamera(){
  camera.generation++;
  camera.scanBusy=false;
  const old=camera.scanner;
  camera.scanner=null;
  if(old){
    camera.stopTask=Promise.resolve().then(()=>old.stop()).catch(()=>{}).then(()=>{
      try{old.clear()}catch(e){}
    });
  }
  if(scannerPlaceholder)scannerPlaceholder.hidden=false;
  if(cameraRetry)cameraRetry.hidden=true;
}
async function ensureBarcodeLibrary(){
  if(window.Html5Qrcode)return;
  if(!scannerLibraryPromise){
    scannerLibraryPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async=true;
      script.onload=resolve;
      script.onerror=()=>reject(new Error('Camera scanning library failed to load'));
      document.head.appendChild(script);
    }).catch(error=>{scannerLibraryPromise=null;throw error;});
  }
  await scannerLibraryPromise;
  if(!window.Html5Qrcode)throw new Error('Camera scanning is unavailable on this browser');
}
function studentIdFromScan(raw){
  const value=String(raw||'').trim();
  if(/^[0-9]{7,12}$/.test(value))return value;
  const tagged=value.match(/^(?:STUDENT[_ -]?ID|ID)[:= ]\s*([0-9]{7,12})$/i);
  return tagged?tagged[1]:null;
}
async function onCameraScan(raw){
  if(camera.mode!=='camera'||camera.scanBusy||state.busy)return;
  const studentId=studentIdFromScan(raw);
  if(!studentId){
    scannerMessage('Code read, but it does not contain a 7–12 digit Student ID. Use a school ID QR/barcode.',true);
    return;
  }
  const time=Date.now();
  for(const [id,stamp] of camera.lastScans){
    if(time-stamp>120000)camera.lastScans.delete(id);
  }
  // A card held in front of the camera must not generate an accidental OUT.
  if(camera.lastScans.has(studentId)){
    // Refresh the timestamp while the same QR is still in view; do not turn IN into OUT.
    camera.lastScans.set(studentId,time);
    return;
  }
  camera.scanBusy=true;
  camera.lastScans.set(studentId,time);
  scannerMessage('ID read. Checking attendance securely…');
  try{
    const status=await recordAttendance(null,studentId);
    if(status==='SUCCESS'){
      scannerMessage('Attendance recorded. Scan the next student ID.');
    }else if(status==='QUEUED'){
      scannerMessage('Saved offline. It will upload when the connection returns. Scan the next student ID.');
    }else if(status==='DUPLICATE'){
      scannerMessage('This ID was already recorded recently. No duplicate attendance was added.');
    }else{
      camera.lastScans.set(studentId,Date.now()-116000);
      scannerMessage('Attendance was not recorded. Verify the ID or class and scan again.',true);
    }
  }finally{camera.scanBusy=false;}
}
async function startCamera(){
  stopCamera();
  const generation=camera.generation;
  if(camera.mode!=='camera')return;
  if(!state.authorized&&!state.demo){
    scannerMessage('The Class Mayor or an approved attendance operator must sign in on this device before camera scanning.',true);
    return;
  }
  if(!navigator.mediaDevices?.getUserMedia){
    scannerMessage('Camera access is unsupported. Switch to Enter Student ID to continue.',true);
    if(cameraRetry)cameraRetry.hidden=false;
    return;
  }
  scannerMessage('Opening device camera…');
  if(cameraRetry)cameraRetry.hidden=true;
  try{
    await camera.stopTask;
    await ensureBarcodeLibrary();
    if(camera.mode!=='camera'||generation!==camera.generation)return;
    const formats=window.Html5QrcodeSupportedFormats||{};
    const supported=['QR_CODE','CODE_128','CODE_39','EAN_13','EAN_8','UPC_A']
      .map(key=>formats[key]).filter(value=>value!==undefined);
    const reader=new window.Html5Qrcode('attendanceReader',{
      formatsToSupport:supported.length?supported:undefined,verbose:false
    });
    camera.scanner=reader;
    if(scannerPlaceholder)scannerPlaceholder.hidden=true;
    await reader.start({facingMode:'environment'},
      {fps:10,qrbox:document.body.classList.contains('kiosk')?((w,h)=>{const q=Math.floor(Math.min(w,h)*.75);return{width:q,height:q}}):{width:210,height:180}},
      raw=>{void onCameraScan(raw);},()=>{});
    if(generation!==camera.generation||camera.mode!=='camera'){
      try{await reader.stop()}catch(e){}
      try{reader.clear()}catch(e){}
      return;
    }
    scannerMessage('Camera ready. Scan a classmate’s Student ID QR code or barcode.');
  }catch(error){
    if(generation!==camera.generation)return;
    stopCamera();
    scannerMessage('Could not start camera: '+(error?.message||'Camera permission denied')+
      '. Enter Student ID manually or retry.',true);
    if(cameraRetry)cameraRetry.hidden=false;
  }
}
function selectAttendanceMethod(method){
  const next=method==='camera'?'camera':'manual';
  if(camera.mode===next && next==='manual')return;
  camera.mode=next;
  const manual=next==='manual';
  $('#manualAttendancePanel').hidden=!manual;
  $('#cameraAttendancePanel').hidden=manual;
  $('#manualMethodButton').classList.toggle('selected',manual);
  $('#cameraMethodButton').classList.toggle('selected',!manual);
  $('#manualMethodButton').setAttribute('aria-selected',String(manual));
  $('#cameraMethodButton').setAttribute('aria-selected',String(!manual));
  confirmation.replaceChildren();
  if(manual){
    stopCamera();
    scannerMessage('Camera stopped. Manual entry is ready.');
    studentInput.focus();
  }else{
    void startCamera();
  }
}
$('#manualMethodButton').addEventListener('click',()=>selectAttendanceMethod('manual'));
$('#cameraMethodButton').addEventListener('click',()=>selectAttendanceMethod('camera'));
cameraRetry.addEventListener('click',()=>{if(camera.mode==='camera')void startCamera();});

function formatTime(value) {
  return new Date(value).toLocaleTimeString('en-PH', {
    timeZone:'Asia/Manila', hour:'2-digit', minute:'2-digit', second:'2-digit'
  });
}
function phDay(value=new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB',{
    timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(value);
  const fields = Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return fields.year+'-'+fields.month+'-'+fields.day;
}
function updateClock() {
  const date=new Date();
  $('#clockTime').textContent=formatTime(date);
  $('#clockDate').textContent=date.toLocaleDateString('en-PH',{timeZone:'Asia/Manila',weekday:'short',month:'short',day:'numeric',year:'numeric'})+' · PHT';
  window.lscKiosk?.tick({ready:state.demo||state.authorized,demo:state.demo,label:state.operatorRole==='class_mayor'?'Class Mayor':state.operatorRole==='attendance_volunteer'?'Volunteer':state.operatorRole==='official'?'LSC Official':'Station ready',offline:!navigator.onLine,queued:getQueue().length});
}
function updateStation() {
  if(state.demo) {
    stationLabel.textContent='Demo terminal active';
    stationDetail.textContent='Simulated attendance only. No data is being sent to Supabase.';
  } else if(state.authorized) {
    stationLabel.textContent='Attendance station ready';
    stationDetail.textContent=(state.operatorRole==='class_mayor'?'Class Mayor · your assigned class only':state.operatorRole==='attendance_volunteer'?'Approved Volunteer · '+(state.operatorScope==='whole_school'?'whole-school station':'assigned section only'):'LSC Official · whole-school access')+'\nRecorded by: '+state.operatorEmail+(state.operatorClass?'\nAssigned class: '+state.operatorClass:'')+(state.operatorExpires?'\nAuthorized until: '+new Date(state.operatorExpires).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}):'');
    stationDetail.style.whiteSpace='pre-line';
  } else {
    stationLabel.textContent='LSC account sign-in required';
    stationDetail.textContent='An LSC Official, Class Mayor, or approved attendance volunteer must sign in on this browser before live entries can be recorded.';
  }
  stationDot.classList.toggle('ok',state.demo||state.authorized);
  recordButton.disabled=state.busy||(!state.demo&&!state.authorized);
  demoButton.textContent=state.demo?'Exit Demo Mode':'Try Demo Mode';
  activationNotice.hidden=state.demo||state.authorized;
  if(signOutButton)signOutButton.hidden=state.demo||!state.authorized;
  activationNotice.innerHTML='<strong>Attendance terminal is locked.</strong> Sign in as a <a href="./login.html">Class Mayor or LSC Official</a> using this browser. Only supervised stations can record real attendance.';
}

// ===== Offline queue: scans made while the connection is down are kept on this device and synced later =====
const QUEUE_KEY='lsc_offline_queue_v1',FAILED_KEY='lsc_offline_failed_v1',AUTH_KEY='lsc_offline_auth_v1';
const readJSON=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
function isNetworkError(e){
  if(!e)return false;
  const m=String(e.message||e);
  return e.name==='AuthRetryableFetchError'||e.status===0||/failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(m);
}
const getQueue=()=>readJSON(QUEUE_KEY,[]);
const setQueue=q=>{writeJSON(QUEUE_KEY,q);renderSyncBar();};
const syncBar=document.createElement('div');
syncBar.id='syncBar';syncBar.setAttribute('role','status');syncBar.hidden=true;
syncBar.style.cssText='max-width:460px;margin:14px auto 0;border-radius:12px;padding:12px 16px;font-size:12px;line-height:1.6;text-align:left;border:1px solid #f4dfb2;background:#fff7e8;color:#9a6b22';
activationNotice.parentNode.insertBefore(syncBar,activationNotice.nextSibling);
let syncing=false;
function renderSyncBar(){
  const q=getQueue(),failed=readJSON(FAILED_KEY,[]),offline=!navigator.onLine;
  if(!q.length&&!failed.length&&!offline){syncBar.hidden=true;return;}
  syncBar.hidden=false;syncBar.replaceChildren();
  const line=(t,b)=>{const d=document.createElement('div');if(b)d.style.fontWeight='800';d.textContent=t;syncBar.append(d);};
  if(offline)line('⚠ No connection — scanning still works.',true);
  if(q.length)line((syncing?'Syncing ':'')+q.length+' scan'+(q.length===1?'':'s')+' saved on this device'+(offline?' · will upload when you are back online.':syncing?'…':' · uploading shortly.'));
  if(failed.length){
    line(failed.length+' scan'+(failed.length===1?'':'s')+' could not be recorded:',true);
    failed.slice(-5).forEach(f=>line('• '+f.student_id+' at '+formatTime(f.at)+' — '+f.reason));
    const btn=document.createElement('button');btn.type='button';btn.textContent='Dismiss';btn.style.cssText='margin-top:6px;border:1px solid #e0c98f;background:#fff;border-radius:8px;padding:5px 10px;font-weight:700';
    btn.onclick=()=>{writeJSON(FAILED_KEY,[]);renderSyncBar();};syncBar.append(btn);
  }
}
function queueScan(id){
  const q=getQueue(),now=Date.now();
  const recent=q.filter(x=>x.student_id===id).at(-1);
  if(recent&&now-new Date(recent.at).getTime()<45000)return {status:'DUPLICATE_QUEUED',at:recent.at};
  const key=(crypto.randomUUID?crypto.randomUUID():String(now)+Math.random().toString(16).slice(2))+'';
  const at=new Date(now).toISOString();
  q.push({key,student_id:id,at});setQueue(q);
  return {status:'QUEUED',at};
}
async function flushQueue(){
  if(syncing||state.demo||!state.authorized||!navigator.onLine)return;
  let q=getQueue();if(!q.length)return;
  syncing=true;renderSyncBar();
  try{
    while(q.length){
      const item=q[0];
      const {data,error}=await client.rpc('lsc_record_attendance_offline',{p_student_id:item.student_id,p_scanned_at:item.at,p_key:item.key});
      if(error){
        if(isNetworkError(error))break;
        const failed=readJSON(FAILED_KEY,[]);failed.push({student_id:item.student_id,at:item.at,reason:error.message||'Rejected'});writeJSON(FAILED_KEY,failed);
      }
      q=q.slice(1);setQueue(q);
    }
  }finally{syncing=false;renderSyncBar();}
}
window.addEventListener('online',()=>{renderSyncBar();checkAuthorization().then(flushQueue);});
window.addEventListener('offline',renderSyncBar);
setInterval(()=>{if(getQueue().length&&navigator.onLine)flushQueue();},15000);
async function checkAuthorization() {
  if(state.demo)return;
  const prev={authorized:state.authorized,operatorEmail:state.operatorEmail,operatorRole:state.operatorRole,operatorClass:state.operatorClass,operatorScope:state.operatorScope,operatorExpires:state.operatorExpires};
  let offlineFail=false;
  try {
    if(!navigator.onLine)throw Object.assign(new Error('Failed to fetch'),{status:0});
    const {data:{user},error}=await client.auth.getUser();
    if(error&&isNetworkError(error))throw error;
    state.authorized=false;state.operatorEmail='';state.operatorRole='';state.operatorClass='';state.operatorScope='';state.operatorExpires='';updateStation();
    if(error||!user){
      updateStation();
      if(camera.mode==='camera'){
        stopCamera();
        scannerMessage('Session expired or missing. Sign in as an authorized attendance operator.',true);
      }
      return;
    }
    const {data:access,error:accessError}=await client.rpc('lsc_attendance_access');
    if(accessError&&isNetworkError(accessError))throw accessError;
    state.authorized=!accessError&&access?.authorized===true &&
      ['official','class_mayor','attendance_volunteer'].includes(access.role);
    if(state.authorized){
      state.operatorEmail=user.email||access.email||'';
      state.operatorRole=access.role;
      state.operatorScope=access.scope||'';
      state.operatorClass=access.class_label||'';
      state.operatorExpires=access.expires_at||'';
      writeJSON(AUTH_KEY,{uid:user.id,email:state.operatorEmail,role:state.operatorRole,scope:state.operatorScope,cls:state.operatorClass,exp:state.operatorExpires});
    }else{try{localStorage.removeItem(AUTH_KEY)}catch{}}
  }catch(error) {
    if(isNetworkError(error)){
      offlineFail=true;
      // Stay usable offline: keep the last verified authorization (the database re-checks everything when scans sync).
      if(prev.authorized)Object.assign(state,prev);
      else{
        const cached=readJSON(AUTH_KEY,null);
        const {data:{session}}=await client.auth.getSession().catch(()=>({data:{session:null}}));
        const stillValid=cached&&(!cached.exp||new Date(cached.exp)>new Date());
        if(cached&&session?.user?.id===cached.uid&&stillValid){
          state.authorized=true;state.operatorEmail=cached.email;state.operatorRole=cached.role;state.operatorScope=cached.scope;state.operatorClass=cached.cls;state.operatorExpires=cached.exp;
        }
      }
    }else console.warn('LSC station authorization failed:',error?.message||'unknown error');
  }
  renderSyncBar();
  updateStation();
  if(!state.authorized&&!offlineFail&&camera.mode==='camera'&&!state.demo&&camera.scanner){
    stopCamera();
    scannerMessage('Your attendance session is no longer authorized. Sign in again.',true);
  }
  if(state.authorized&&state.operatorRole==='class_mayor')selfieGate();
}
// ===== Last 5 scans (shown under the result so a wrong scan can be spotted later) =====
const RECENT_KEY='lsc_recent_scans_v1';
let recentScans=(()=>{try{const a=JSON.parse(sessionStorage.getItem(RECENT_KEY));return Array.isArray(a)?a.slice(0,5):[]}catch{return []}})();
const recentBox=document.createElement('div');
recentBox.id='recentScans';recentBox.hidden=true;
confirmation.parentNode.insertBefore(recentBox,confirmation.nextSibling);
const RK={in:['TIME IN','in'],out:['TIME OUT','out'],dup:['ALREADY SCANNED','dup'],queued:['SAVED OFFLINE','queued'],err:['NOT RECORDED','err']};
function renderRecent(){
  recentBox.replaceChildren();recentBox.hidden=!recentScans.length;
  if(!recentScans.length)return;
  const h=document.createElement('div');h.className='recent-title';h.textContent='LAST '+recentScans.length+' SCAN'+(recentScans.length===1?'':'S');
  recentBox.append(h);
  recentScans.forEach(x=>{
    const row=document.createElement('div');row.className='recent-row '+(RK[x.kind]?.[1]||'');
    const tag=document.createElement('span');tag.className='recent-tag';tag.textContent=RK[x.kind]?.[0]||'';
    const who=document.createElement('span');who.className='recent-who';
    const n=document.createElement('b');n.textContent=x.name||'';
    const m=document.createElement('small');m.textContent=[x.sub,x.id].filter(Boolean).join(' · ');
    who.append(n,m);
    const t=document.createElement('time');t.textContent=x.time||'';
    row.append(tag,who,t);recentBox.append(row);
  });
}
function pushRecent(o){
  recentScans.unshift({kind:o.kind,name:o.name||'',sub:o.sub||'',id:o.id||'',time:o.time||''});
  recentScans=recentScans.slice(0,5);
  try{sessionStorage.setItem(RECENT_KEY,JSON.stringify(recentScans))}catch{}
  renderRecent();
}
renderRecent();
function appendMessage(type,title,lines) {
  if(state.resetTimer)clearTimeout(state.resetTimer);
  releaseArrivalPhotoUrl();
  confirmation.replaceChildren();
  const card=document.createElement('div');
  card.className='result'+(type==='OUT'?' out':type==='ERROR'?' err':'');
  const small=document.createElement('div');
  small.className='eyebrow';
  small.style.marginBottom='8px';
  small.style.color='inherit';
  small.textContent=type==='ERROR'?'NOT RECORDED':type==='QUEUED'?'SAVED OFFLINE — NOT YET UPLOADED':type==='DUPLICATE'?'DUPLICATE ENTRY — NO NEW RECORD':'ATTENDANCE RECORDED'+(state.demo?' — DEMO':'');
  const heading=document.createElement('div');
  heading.className='result-title';
  heading.textContent=title;
  const metadata=document.createElement('div');
  metadata.className='result-meta';
  metadata.textContent=lines.join('\n');
  metadata.style.whiteSpace='pre-line';
  card.append(small,heading,metadata);
  confirmation.append(card);
  {
    const kind=type==='ERROR'?'err':type==='QUEUED'?'queued':type==='DUPLICATE'?'dup':'out';
    const named=kind==='out'||kind==='dup';
    const sig={kind,name:named?String(lines[0]||title).split(' · ')[0]:title,
      sub:named?String(lines[1]||'').trim():'',time:named?String(lines[2]||'').split(' · ')[0]:'',
      note:named?(kind==='dup'?'No new record was added.':''):lines[0]||'',id:named?String(lines[0]||'').split(' · ')[1]:null};
    window.lscKiosk?.isOn()&&window.lscKiosk.signal(sig);
    pushRecent(kind==='queued'?{...sig,name:String(lines[0]||'Saved offline'),time:formatTime(Date.now())}:kind==='err'?{...sig,name:title,sub:lines[0]||''}:sig);
  }
  if(state.resetTimer)clearTimeout(state.resetTimer);
  if(type!=='ERROR')state.resetTimer=setTimeout(()=>{
    confirmation.replaceChildren();
    if(camera.mode==='manual')studentInput.focus();
  },8000);
}
let activeArrivalPhotoUrl=null;
function releaseArrivalPhotoUrl() {
  if(activeArrivalPhotoUrl){URL.revokeObjectURL(activeArrivalPhotoUrl);activeArrivalPhotoUrl=null;}
}
async function loadStudentPhotoUrl(studentId) {
  const id=String(studentId||'').trim();
  if(!/^[0-9]{7,12}$/.test(id)||state.demo)return null;
  try {
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError||!session?.access_token)return null;
    const response=await fetch(SUPABASE_URL+'/functions/v1/lsc-student-photo',{
      method:'POST',
      headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({student_id:id}),cache:'no-store'
    });
    if(!response.ok)return null;
    const blob=await response.blob();
    if(!/^image\/(jpeg|png|webp)$/.test(blob.type)||!blob.size||blob.size>5*1024*1024)return null;
    return URL.createObjectURL(blob);
  } catch(error) {
    console.warn('Student photo unavailable; showing placeholder.');
    return null;
  }
}
function attachArrivalPhoto(card,url,studentName) {
  if(!card?.isConnected||!url){if(url)URL.revokeObjectURL(url);return;}
  releaseArrivalPhotoUrl();activeArrivalPhotoUrl=url;
  const frame=card.querySelector('.arrival-photo');
  const placeholder=card.querySelector('.arrival-photo-placeholder');
  if(!frame||!placeholder)return;
  const image=document.createElement('img');
  image.className='arrival-photo-image';
  image.alt=(studentName||'Student')+' photo';
  image.decoding='async';
  image.addEventListener('load',()=>{
    if(!card.isConnected)return;
    placeholder.hidden=true;
    frame.classList.add('has-photo');
  },{once:true});
  image.addEventListener('error',()=>{image.remove();if(activeArrivalPhotoUrl===url)releaseArrivalPhotoUrl();},{once:true});
  image.src=url;
  frame.append(image);
}
function appendArrivalCard(result,studentId) {
  if(state.resetTimer)clearTimeout(state.resetTimer);
  releaseArrivalPhotoUrl();
  confirmation.replaceChildren();
  const card=document.createElement('div');
  card.className='result arrival-result';
  const eyebrow=document.createElement('div');
  eyebrow.className='eyebrow arrival-eyebrow';
  eyebrow.textContent='ATTENDANCE RECORDED'+(state.demo?' — DEMO':'');
  const layout=document.createElement('div');
  layout.className='arrival-layout';
  const frame=document.createElement('div');
  frame.className='arrival-photo';
  const placeholder=document.createElement('div');
  placeholder.className='arrival-photo-placeholder';
  const placeholderIcon=document.createElement('span');
  placeholderIcon.className='arrival-placeholder-icon';
  placeholderIcon.setAttribute('aria-hidden','true');
  placeholderIcon.textContent='👤';
  const placeholderText=document.createElement('span');
  placeholderText.textContent='No photo';
  placeholder.append(placeholderIcon,placeholderText);
  frame.append(placeholder);
  const details=document.createElement('div');
  details.className='arrival-details';
  const title=document.createElement('h3');
  title.className='arrival-name';
  title.textContent=result.full_name||'Student';
  const section=document.createElement('p');
  section.className='arrival-section';
  const sectionName=[result.grade_level?'Grade '+result.grade_level:'',result.section||''].filter(Boolean).join(' · ');
  section.textContent=sectionName||'Section not provided';
  const timeLabel=document.createElement('div');
  timeLabel.className='arrival-time-label';
  timeLabel.textContent='TIME IN';
  const time=document.createElement('time');
  time.className='arrival-time';
  time.dateTime=result.recorded_at||'';
  time.textContent=formatTime(result.recorded_at)+' PHT';
  const studentCode=document.createElement('div');
  studentCode.className='arrival-student-id';
  studentCode.textContent='Student ID · '+(result.student_id||studentId);
  const operator=document.createElement('div');
  operator.className='arrival-operator';
  operator.textContent='Recorded by · '+(result.recorded_by_email||state.operatorEmail||'Demo Mode');
  details.append(title,section,timeLabel,time,studentCode,operator);
  layout.append(frame,details);
  card.append(eyebrow,layout);
  confirmation.append(card);
  {const sig={kind:'in',id:result.student_id||studentId,name:result.full_name||'Student',sub:sectionName||'',time:formatTime(result.recorded_at)};window.lscKiosk?.signal(sig);pushRecent(sig);}
  if(state.resetTimer)clearTimeout(state.resetTimer);
  state.resetTimer=setTimeout(()=>{
    if(card.isConnected)confirmation.replaceChildren();
    releaseArrivalPhotoUrl();state.resetTimer=null;
    if(camera.mode==='manual')studentInput.focus();
  },6500);
  return card;
}
function simulate(studentId) {
  const student=demoRoster.find(s=>s.student_id===studentId);
  if(!student)throw new Error('Not a registered demo ID. Try 2023107337.');
  const previous=state.demoLogs.filter(l=>l.student_id===studentId&&l.day===phDay()).at(-1);
  const now=new Date();
  if(previous&&now-new Date(previous.recorded_at)<45000){
    return {...student,status:'DUPLICATE',event_type:previous.event_type,recorded_at:previous.recorded_at};
  }
  const event_type=previous?.event_type==='IN'?'OUT':'IN';
  const recorded_at=now.toISOString();
  state.demoLogs.push({student_id:studentId,event_type,day:phDay(now),recorded_at});
  return {...student,status:'SUCCESS',event_type,recorded_at,recorded_by_email:'Demo Mode',recorded_by_role:'demo'};
}
async function recordAttendance(event=null,scannedId=null) {
  if(event)event.preventDefault();
  if(state.busy)return false;
  const id=String(scannedId??studentInput.value).trim();
  if(!/^[0-9]{7,12}$/.test(id)){
    appendMessage('ERROR','Invalid Student ID',['Please enter a numeric ID containing 7–12 digits.']);return false;
  }
  if(!state.demo&&!state.authorized){
    appendMessage('ERROR','Station not activated',['Sign in with your approved LSC or Volunteer Attendance account on this device.']);return false;
  }
  state.busy=true;updateStation();
  recordButton.textContent='Saving attendance…';
  try {
    let result;
    if(state.demo){
      result=simulate(id);
    } else {
      let queued=null;
      if(!navigator.onLine)queued=queueScan(id);
      else{
        const {data,error}=await client.rpc('lsc_record_attendance',{p_student_id:id});
        if(error&&isNetworkError(error))queued=queueScan(id);
        else if(error)throw error;
        else{result=data;void flushQueue();}
      }
      if(queued){
        const dup=queued.status==='DUPLICATE_QUEUED';
        appendMessage(dup?'DUPLICATE':'QUEUED',dup?'Already saved':'Saved offline',[
          'Student ID · '+id,
          formatTime(queued.at)+' · Philippine Standard Time',
          dup?'Scanned a moment ago. No extra entry was saved.':'No connection. This scan is kept on this device and uploads automatically when the internet is back.',
          'IN or OUT is decided when it syncs.'
        ]);
        studentInput.value='';
        return dup?'DUPLICATE':'QUEUED';
      }
    }
    const status=result.status||'SUCCESS';
    if(status==='SUCCESS'&&result.event_type==='IN'){
      const arrivalCard=appendArrivalCard(result,id);
      void loadStudentPhotoUrl(result.student_id||id).then(url=>{
        if(url){attachArrivalPhoto(arrivalCard,url,result.full_name);window.lscKiosk?.photo(url,result.student_id||id);}
      });
    }else{
      if(window.lscKiosk?.isOn()&&!window.lscKiosk.cachedPhoto(result.student_id||id)){
        void loadStudentPhotoUrl(result.student_id||id).then(url=>{if(url)window.lscKiosk.photo(url,result.student_id||id,true);});
      }
      appendMessage(status==='DUPLICATE'?'DUPLICATE':result.event_type,
        (status==='DUPLICATE'?'Previous ':'Time ')+result.event_type,
        [
          (result.full_name||'Student')+' · '+(result.student_id||id),
          (result.grade_level||'')+' '+(result.section||''),
          formatTime(result.recorded_at)+' · Philippine Standard Time',
          'Recorded by: '+(result.recorded_by_email||state.operatorEmail||'Unknown operator')+
             (result.recorded_by_role==='class_mayor'?' (Class Mayor)':result.recorded_by_role==='official'?' (LSC Official)':result.recorded_by_role==='attendance_volunteer'?' (Approved Volunteer)':''),
          ...(status==='DUPLICATE'?['No extra attendance record was created.']:[])
        ]
      );
    }
    studentInput.value='';
    return status;
  }catch(e){
    appendMessage('ERROR','Unable to record attendance',[e.message||'Please contact the station operator.']);
    if(e.code==='42501'&&!state.demo)await checkAuthorization();
    return false;
  }finally{
    state.busy=false;recordButton.textContent='Record Attendance →';updateStation();
    if(camera.mode==='manual')studentInput.focus();
  }
}
$('#studentForm').addEventListener('submit',recordAttendance);
$('#keypad').addEventListener('click',event=>{
  const key=event.target.closest('[data-key]')?.dataset.key;
  if(!key)return;
  if(key==='Clear')studentInput.value='';
  else if(key==='Back')studentInput.value=studentInput.value.slice(0,-1);
  else studentInput.value=(studentInput.value+key).slice(0,12);
  studentInput.focus();
});
studentInput.addEventListener('input',()=>{
  studentInput.value=studentInput.value.replace(/\D/g,'').slice(0,12);
});
demoButton.addEventListener('click',async()=>{
  if(camera.mode==='camera')selectAttendanceMethod('manual');
  if(state.demo){
    state.demo=false;state.demoLogs=[];confirmation.replaceChildren();
    if(state.resetTimer)clearTimeout(state.resetTimer);
    releaseArrivalPhotoUrl();
    await checkAuthorization();
  }else{
    state.demo=true;state.demoLogs=[];confirmation.replaceChildren();
    if(state.resetTimer)clearTimeout(state.resetTimer);
    releaseArrivalPhotoUrl();
    updateStation();
  }
  studentInput.focus();
});
if(signOutButton)signOutButton.addEventListener('click',async()=>{
  if(!window.confirm('Sign out of this supervised attendance station?'))return;
  selectAttendanceMethod('manual');
  if(state.resetTimer)clearTimeout(state.resetTimer);
  releaseArrivalPhotoUrl();
  const {error}=await client.auth.signOut();
  if(error){appendMessage('ERROR','Sign-out unavailable',[error.message]);return}
  confirmation.replaceChildren();
  studentInput.value='';
  await checkAuthorization();
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&camera.mode==='camera'){
    stopCamera();
    scannerMessage('Camera stopped while the page was in the background. Tap Restart Camera to continue.');
    if(cameraRetry)cameraRetry.hidden=false;
  }else if(!document.hidden&&!state.demo)checkAuthorization();
});
window.addEventListener('pagehide',stopCamera);

// ===== Class mayor selfie check-in (once per day, when enabled by the LSC) =====
const SELFIE_DAY_KEY='lsc_selfie_day',SELFIE_Q_KEY='lsc_selfie_queue';
const phtDay=()=>new Date(Date.now()+8*3600e3).toISOString().slice(0,10);
let selfieBusy=false;
async function flushSelfieQueue(){
  const q=readJSON(SELFIE_Q_KEY,null);if(!q)return;
  try{const {error}=await client.rpc('lsc_submit_selfie',{p_image:q.image||null,p_reason:q.reason||null});
    if(!error||!isNetworkError(error))localStorage.removeItem(SELFIE_Q_KEY);}catch{}
}
async function selfieGate(){
  if(selfieBusy||state.demo)return;
  try{if(localStorage.getItem(SELFIE_DAY_KEY)===phtDay()){flushSelfieQueue();return;}}catch{}
  if(!navigator.onLine)return;
  selfieBusy=true;
  try{
    const {data,error}=await client.rpc('lsc_selfie_needed');
    if(error||data!==true){if(!error)try{localStorage.setItem(SELFIE_DAY_KEY,phtDay())}catch{}selfieBusy=false;return;}
  }catch{selfieBusy=false;return;}
  const wasCam=camera.mode==='camera';
  stopCamera();
  const ov=document.createElement('div');ov.id='selfieGate';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:#0b1220;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;text-align:center;font-family:Poppins,system-ui,sans-serif';
  ov.innerHTML='<h2 style="margin:0">Class Mayor check-in</h2><p id="sgMsg" style="margin:0;max-width:340px">Take a selfie to confirm it is you opening attendance today.</p>'+
   '<video id="sgVid" autoplay playsinline muted style="width:min(78vw,320px);aspect-ratio:3/4;object-fit:cover;border-radius:16px;background:#000;transform:scaleX(-1)"></video>'+
   '<img id="sgImg" alt="Selfie preview" hidden style="width:min(78vw,320px);aspect-ratio:3/4;object-fit:cover;border-radius:16px">'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button id="sgSnap" class="primary" type="button">Take selfie</button><button id="sgRetake" type="button" hidden>Retake</button><button id="sgUse" class="primary" type="button" hidden>Use this photo</button></div>'+
   '<button id="sgSkip" type="button" hidden style="background:none;border:0;color:#9db4ff;text-decoration:underline">Camera not working? Continue with a reason</button>';
  document.body.appendChild(ov);
  const q=id=>ov.querySelector(id),msg=q('#sgMsg'),vid=q('#sgVid'),img=q('#sgImg');
  let stream=null,jpeg=null;
  const stopStream=()=>{try{stream&&stream.getTracks().forEach(t=>t.stop())}catch{}stream=null;};
  const finish=async(image,reason)=>{
    stopStream();
    try{
      const {error}=await client.rpc('lsc_submit_selfie',{p_image:image,p_reason:reason});
      if(error&&isNetworkError(error))localStorage.setItem(SELFIE_Q_KEY,JSON.stringify({image,reason}));
      else if(error){msg.textContent='Could not save: '+error.message;return;}
    }catch{try{localStorage.setItem(SELFIE_Q_KEY,JSON.stringify({image,reason}))}catch{}}
    try{localStorage.setItem(SELFIE_DAY_KEY,phtDay())}catch{}
    ov.remove();selfieBusy=false;
    if(wasCam)startCamera();
  };
  q('#sgSkip').onclick=()=>{const r=(prompt('Why can you not take a selfie? (required)')||'').trim();if(r)finish(null,r);};
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:640}},audio:false});
    vid.srcObject=stream;
  }catch{
    msg.textContent='Camera is not available.';q('#sgSnap').hidden=true;q('#sgSkip').hidden=false;return;
  }
  q('#sgSkip').hidden=false;
  q('#sgSnap').onclick=()=>{
    if(!vid.videoWidth)return;
    const w=360,h=Math.round(w*vid.videoHeight/vid.videoWidth),c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d');x.translate(w,0);x.scale(-1,1);x.drawImage(vid,0,0,w,h);
    jpeg=c.toDataURL('image/jpeg',.6);img.src=jpeg;
    vid.hidden=true;img.hidden=false;q('#sgSnap').hidden=true;q('#sgRetake').hidden=false;q('#sgUse').hidden=false;
  };
  q('#sgRetake').onclick=()=>{jpeg=null;img.hidden=true;vid.hidden=false;q('#sgSnap').hidden=false;q('#sgRetake').hidden=true;q('#sgUse').hidden=true;};
  q('#sgUse').onclick=()=>{if(jpeg)finish(jpeg,null);};
}
window.addEventListener('kiosk:enter',()=>{camera.mode='manual';selectAttendanceMethod('camera');updateClock();});
window.addEventListener('kiosk:exit',()=>{selectAttendanceMethod('manual');});
window.addEventListener('kiosk:id',e=>{if(!state.busy)void recordAttendance(null,e.detail);});
updateClock();setInterval(updateClock,1000);
// Expiring or revoked approval is always checked again by the database for every entry.
setInterval(()=>{if(!document.hidden&&!state.demo&&!state.busy)checkAuthorization()},120000);
updateStation();checkAuthorization().then(()=>studentInput.focus());
renderSyncBar();if(navigator.onLine)setTimeout(flushQueue,2500);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
