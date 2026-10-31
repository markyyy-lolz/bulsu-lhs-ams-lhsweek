import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const client = createClient(
  'https://rfxzbuocxersgbshczbj.supabase.co',
  'sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb',
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
  if(camera.lastScans.has(studentId))return;
  camera.scanBusy=true;
  camera.lastScans.set(studentId,time);
  scannerMessage('ID read. Checking attendance securely…');
  try{
    const ok=await recordAttendance(null,studentId);
    if(ok){
      scannerMessage('Attendance recorded. Scan the next student ID.');
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
      {fps:10,qrbox:{width:210,height:180}},
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
async function checkAuthorization() {
  if(state.demo)return;
  state.authorized=false;state.operatorEmail='';state.operatorRole='';state.operatorClass='';state.operatorScope='';state.operatorExpires='';updateStation();
  try {
    const {data:{user},error}=await client.auth.getUser();
    if(error||!user){updateStation();return;}
    const {data:access,error:accessError}=await client.rpc('lsc_attendance_access');
    state.authorized=!accessError&&access?.authorized===true &&
      ['official','class_mayor','attendance_volunteer'].includes(access.role);
    if(state.authorized){
      state.operatorEmail=user.email||access.email||'';
      state.operatorRole=access.role;
      state.operatorScope=access.scope||'';
      state.operatorClass=access.class_label||'';
      state.operatorExpires=access.expires_at||'';
    }
  }catch(error) {
    console.warn('LSC station authorization failed:',error?.message||'unknown error');
  }
  updateStation();
  if(!state.authorized&&camera.mode==='camera'&&!state.demo&&camera.scanner){
    stopCamera();
    scannerMessage('Your attendance session is no longer authorized. Sign in again.',true);
  }
}
function appendMessage(type,title,lines) {
  confirmation.replaceChildren();
  const card=document.createElement('div');
  card.className='result'+(type==='OUT'?' out':type==='ERROR'?' err':'');
  const small=document.createElement('div');
  small.className='eyebrow';
  small.style.marginBottom='8px';
  small.style.color='inherit';
  small.textContent=type==='ERROR'?'NOT RECORDED':type==='DUPLICATE'?'DUPLICATE ENTRY — NO NEW RECORD':'ATTENDANCE RECORDED'+(state.demo?' — DEMO':'');
  const heading=document.createElement('div');
  heading.className='result-title';
  heading.textContent=title;
  const metadata=document.createElement('div');
  metadata.className='result-meta';
  metadata.textContent=lines.join('\n');
  metadata.style.whiteSpace='pre-line';
  card.append(small,heading,metadata);
  confirmation.append(card);
  if(state.resetTimer)clearTimeout(state.resetTimer);
  if(type!=='ERROR')state.resetTimer=setTimeout(()=>{
    confirmation.replaceChildren();
    if(camera.mode==='manual')studentInput.focus();
  },8000);
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
      const {data,error}=await client.rpc('lsc_record_attendance',{p_student_id:id});
      if(error)throw error;
      result=data;
    }
    const status=result.status||'SUCCESS';
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
    studentInput.value='';
    return true;
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
    await checkAuthorization();
  }else{
    state.demo=true;state.demoLogs=[];confirmation.replaceChildren();updateStation();
  }
  studentInput.focus();
});
if(signOutButton)signOutButton.addEventListener('click',async()=>{
  if(!window.confirm('Sign out of this supervised attendance station?'))return;
  selectAttendanceMethod('manual');
  if(state.resetTimer)clearTimeout(state.resetTimer);
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
updateClock();setInterval(updateClock,1000);
// Expiring or revoked approval is always checked again by the database for every entry.
setInterval(()=>{if(!document.hidden&&!state.demo&&!state.busy)checkAuthorization()},120000);
updateStation();checkAuthorization().then(()=>studentInput.focus());
