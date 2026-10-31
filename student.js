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
    studentInput.focus();
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
async function recordAttendance(event) {
  event.preventDefault();
  if(state.busy)return;
  const id=studentInput.value.trim();
  if(!/^[0-9]{7,12}$/.test(id)){
    appendMessage('ERROR','Invalid Student ID',['Please enter a numeric ID containing 7–12 digits.']);return;
  }
  if(!state.demo&&!state.authorized){
    appendMessage('ERROR','Station not activated',['Sign in with your approved LSC or Volunteer Attendance account on this device.']);return;
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
  }catch(e){
    appendMessage('ERROR','Unable to record attendance',[e.message||'Please contact the station operator.']);
  }finally{
    state.busy=false;recordButton.textContent='Record Attendance →';updateStation();studentInput.focus();
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
  if(state.demo){
    state.demo=false;state.demoLogs=[];confirmation.replaceChildren();
    await checkAuthorization();
  }else{
    state.demo=true;state.demoLogs=[];confirmation.replaceChildren();updateStation();
  }
  studentInput.focus();
});
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&!state.demo)checkAuthorization();
});
updateClock();setInterval(updateClock,1000);
// Expiring or revoked approval is always checked again by the database for every entry.
setInterval(()=>{if(!document.hidden&&!state.demo&&!state.busy)checkAuthorization()},120000);
updateStation();checkAuthorization().then(()=>studentInput.focus());
