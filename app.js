import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const SB_URL = 'https://rfxzbuocxersgbshczbj.supabase.co';
const SB_KEY = 'sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb';
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const root = document.getElementById('app');
const state = {
  demo: false, user: null, role: null, page: 'kiosk', loading: false,
  students: [], logs: [], lastResult: null, query: '', recordDate: todayPH(),
  busy: false, mobileNav: false
};
let clearResultTimer = null;
const icons = {overview:'▦',kiosk:'▣',students:'♙',records:'◷'};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function todayPH(){
  const p = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const v = Object.fromEntries(p.filter(x=>x.type !== 'literal').map(x=>[x.type,x.value]));
  return v.year + '-' + v.month + '-' + v.day;
}
function timePH(ts){return ts ? new Date(ts).toLocaleTimeString('en-PH',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—';}
function datePH(ts){return ts ? new Date(ts).toLocaleDateString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric'}) : '—';}
function stampPH(){return new Date().toLocaleString('en-PH',{timeZone:'Asia/Manila',weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function toast(message, err=false){
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className='toast'+(err?' err':'');
  el.textContent=message; document.body.appendChild(el); setTimeout(()=>el.remove(),4500);
}
function demoStart(){
  state.demo=true; state.user={email:'demo@preview.invalid'}; state.role='admin';
  state.students=[
    {id:'demo1',student_id:'2023107337',full_name:'Demo Student',grade_level:'10',section:'Sample Section',active:true},
    {id:'demo2',student_id:'2023999999',full_name:'Sample Learner',grade_level:'9',section:'Demo Section',active:true}
  ]; state.logs=[]; state.page='kiosk'; state.lastResult=null; location.hash='kiosk'; render();
  toast('Demo mode: entries are not saved to Supabase.');
}
async function verifySession(){
  const {data:{session},error}=await sb.auth.getSession();
  if(error || !session){state.user=null;state.role=null;render();return;}
  const {data:role,error:roleError}=await sb.from('lsc_staff_roles').select('role').eq('user_id',session.user.id).maybeSingle();
  if(roleError || !role){await sb.auth.signOut();state.user=null;state.role=null;render();toast('Your account is not authorized for LSC Attendance.',true);return;}
  state.user=session.user;state.role=role.role; await loadData();render();
}
async function loadData(){
  if(state.demo)return;
  const [s,l]=await Promise.all([
    sb.from('lsc_students').select('id,student_id,full_name,grade_level,section,active,created_at').order('full_name',{ascending:true}).limit(2000),
    sb.from('lsc_attendance_events').select('id,student_id,event_type,event_date,recorded_at,lsc_students(student_id,full_name,grade_level,section)').eq('event_date',state.recordDate).order('recorded_at',{ascending:false}).limit(1000)
  ]);
  if(s.error || l.error){toast(s.error?.message || l.error?.message || 'Unable to load data.',true);return;}
  state.students=s.data || [];state.logs=l.data || [];
}
function brand(){return '<span class="mark">LSC</span><span><span class="brand-title" style="display:block">Attendance System</span><span class="brand-sub">BULSU LABORATORY HIGH SCHOOL</span></span>';}
function loginHTML(){return '<div class="login"><section class="login-art"><div style="display:flex;align-items:center;gap:12px">'+brand()+'</div><div><span class="eyebrow" style="color:#a9c7ff">LABORATORY HIGH SCHOOL • LSC</span><h2 class="big">Every arrival.<br>Every departure.<br>Accounted for.</h2><p>A simpler, faster way to monitor student attendance with secure ID-based time logging.</p></div><div class="art-bottom small" style="color:#adc2e6">LSC Attendance Monitor · Powered by Supabase</div></section><section class="login-side"><div class="login-box"><div class="eyebrow">AUTHORIZED STAFF ACCESS</div><h1>Welcome back</h1><p>Sign in with an approved school staff account to activate the attendance terminal.</p><form id="loginForm"><label class="field">Email address<input type="email" name="email" required autocomplete="username" placeholder="staff@example.edu.ph"></label><label class="field">Password<input type="password" name="password" required autocomplete="current-password" placeholder="Enter password"></label><button class="btn" type="submit" id="loginBtn">Sign in to Attendance</button></form><div style="display:flex;align-items:center;gap:12px;margin:22px 0;color:#9aa6b9;font-size:12px"><div style="height:1px;background:#e2e8f0;flex:1"></div>OR TRY THE INTERFACE<div style="height:1px;background:#e2e8f0;flex:1"></div></div><button type="button" class="btn btn-secondary" style="width:100%" data-act="demo">Try Demo Mode</button><div class="login-footer">Demo data stays in your browser session only. School authorization and an approved staff account are required for real attendance records. This prototype is not an official school service.</div></div></section></div>';}
function sidebar(){
  let menu=[['overview','Dashboard'],['kiosk','Attendance Kiosk'],['records','Attendance Records']];
  if(state.role==='admin')menu.splice(2,0,['students','Student Directory']);
  return '<aside class="sidebar'+(state.mobileNav?' open':'')+'"><div class="brand">'+brand()+'</div><div><div class="nav-section">WORKSPACE</div><nav class="nav">'+menu.map(v=>'<button class="nav-btn '+(state.page===v[0]?'active':'')+'" data-nav="'+v[0]+'"><span class="nav-ico">'+icons[v[0]]+'</span>'+v[1]+'</button>').join('')+'</nav></div><div class="sidebar-foot"><div class="small">Signed in as</div><div style="font-size:12px;font-weight:800;margin:5px 0;word-break:break-word">'+esc(state.user?.email || 'Demo Administrator')+'</div><div class="small">'+(state.demo?'PREVIEW MODE':esc(state.role?.toUpperCase()))+'</div><button class="side-signout" data-act="logout">↪ &nbsp;Sign out</button><div class="small" style="margin-top:25px">Independent prototype · School approval required</div></div></aside>';
}
function titleFor(){return ({overview:'Dashboard',kiosk:'Attendance Kiosk',students:'Student Directory',records:'Attendance Records'})[state.page]||'Attendance Kiosk';}
function appHTML(){
  return '<div class="shell">'+sidebar()+'<main class="main"><header class="top"><div class="top-left"><button class="hamb" data-act="menu" aria-label="Open menu">☰</button><div class="top-title">'+titleFor()+'</div></div><span class="top-time mono" id="clock">'+esc(stampPH())+' PHT</span><span class="tag"><span class="dot"></span>'+(state.demo?'DEMO SESSION':'STAFF SESSION ACTIVE')+'</span></header><div class="content">'+(state.page==='overview'?overviewHTML():state.page==='students'?studentsHTML():state.page==='records'?recordsHTML():kioskHTML())+'</div></main></div>';
}
function header(head,sub,extra=''){return '<div class="page-header"><div><div class="eyebrow" style="margin-bottom:8px">LSC ATTENDANCE MONITOR</div><h1>'+head+'</h1><p>'+sub+'</p></div>'+extra+'</div>';}
function metrics(){
  const day=todayPH(), todays=state.logs.filter(x=>x.event_date===day);
  const ins=todays.filter(x=>x.event_type==='IN').length;
  const outs=todays.filter(x=>x.event_type==='OUT').length;
  const latest=new Map(); [...todays].sort((a,b)=>new Date(a.recorded_at)-new Date(b.recorded_at)).forEach(x=>latest.set(x.student_id,x.event_type));
  const inside=[...latest.values()].filter(v=>v==='IN').length;
  return [['Registered Students',state.students.filter(s=>s.active).length,'♙','Active student roster'],['Time IN Today',ins,'↗','Recorded arrivals'],['Time OUT Today',outs,'↘','Recorded departures'],['Currently Inside',inside,'◉','Latest status is IN']];
}
function overviewHTML(){
  const m=metrics();
  return header('Overview','Student attendance at a glance · '+esc(datePH(new Date())))+
  '<section class="stats">'+m.map(x=>'<div class="card stat"><div class="stat-ico">'+x[2]+'</div><div class="stat-label">'+x[0]+'</div><div class="stat-num mono">'+x[1]+'</div><div class="stat-foot">'+x[3]+'</div></div>').join('')+'</section>'+
  '<div class="two-col"><div class="card pad"><div class="section-title"><h3>Recent Activity</h3><button class="btn btn-secondary" data-nav="records">View All</button></div>'+logTable(state.logs.filter(x=>x.event_date===todayPH()).slice(0,8),true)+'</div><div class="stack"><div class="log-ribbon"><div><h3>Ready for check-in?</h3><p>Record a Time IN or OUT with any registered student ID.</p></div><button class="btn btn-light" data-nav="kiosk">Open</button></div><div class="card pad"><div class="section-title"><h3>Quick Notes</h3></div><div class="info"><div class="bubble">✓</div><div><strong>Automatic alternation</strong><p>First entry of the Philippine school day is IN, then OUT, then IN.</p></div></div><div class="info"><div class="bubble">◷</div><div><strong>Reliable timestamps</strong><p>Real entries use the Supabase database clock, not the device clock.</p></div></div><div class="notice'+(state.demo?' warn':'')+'">'+(state.demo?'Demo mode only. No records are written to the school database.':'Access is limited to approved school staff accounts.')+'</div></div></div></div>';
}
function kioskHTML(){
  let r=state.lastResult;
  const result=r?'<div class="result '+(r.status==='ERROR'?'err':r.event_type==='OUT'?'out':'')+'" role="status"><div class="eyebrow" style="color:inherit;margin-bottom:6px">'+(r.status==='DUPLICATE'?'DUPLICATE ENTRY • NO NEW RECORD':r.status==='ERROR'?'NOT RECORDED':'ATTENDANCE RECORDED')+'</div><div class="result-title">'+(r.status==='ERROR'?'Unable to record attendance':r.event_type==='IN'?'✓ Time IN':'✓ Time OUT')+'</div><div class="result-meta">'+(r.status==='ERROR'?esc(r.message):'<b>'+esc(r.full_name)+'</b> · '+esc(r.student_id)+'<br>'+esc(r.grade_level||'')+' '+esc(r.section||'')+' · '+esc(timePH(r.recorded_at))+' PHT')+'</div></div>':'';
  return header('Attendance Kiosk','Enter a registered Student ID to log the next attendance event.')+
  '<div class="kiosk-layout"><section class="card kiosk-main"><div class="kiosk-icon">▣</div><h2>Student ID Entry</h2><p>Type or scan your Student ID, then press Enter.</p><form id="scanForm"><label for="studentID" class="hidden">Student ID</label><input id="studentID" class="id-input mono" name="studentID" type="text" inputmode="numeric" pattern="[0-9]{7,12}" maxlength="12" autocomplete="off" placeholder="2023••••••" aria-label="Student ID" required><div class="keypad">'+['1','2','3','4','5','6','7','8','9','Clear','0','⌫'].map(x=>'<button type="button" class="key '+(isNaN(Number(x))?'alt':'')+'" data-key="'+esc(x)+'">'+x+'</button>').join('')+'</div><button class="btn btn-record" id="scanBtn" type="submit"'+(state.busy?' disabled':'')+'>'+(state.busy?'Recording…':'Record Attendance →')+'</button></form>'+result+'<p class="tiny" style="color:#8b98ae;margin-top:25px">The next valid entry alternates between Time IN and Time OUT. A repeat within 45 seconds does not create a new record.</p></section>'+
  '<aside class="card kiosk-side"><h3>How it works</h3><div class="info"><div class="bubble">01</div><div><strong>Enter your Student ID</strong><p>Use the keyboard, touchscreen keypad, or a compatible scanner that types an ID.</p></div></div><div class="info"><div class="bubble">02</div><div><strong>Automatic detection</strong><p>The system finds your previous event for the current Philippine date and determines IN or OUT.</p></div></div><div class="info"><div class="bubble">03</div><div><strong>Instant confirmation</strong><p>Your event and database-recorded time appear here.</p></div></div><div class="notice warn">Attendance is recorded under the signed-in staff account. Keep this device supervised to prevent another student from entering someone else’s ID.</div></aside></div>';
}
function getStudent(log){return log.lsc_students||state.students.find(s=>s.id===log.student_id)||{};}
function logTable(rows,compact=false){
 if(!rows.length)return '<div class="empty"><div class="empty-icon">◷</div>No attendance entries for this date.</div>';
 return '<div class="table-wrap"><table class="table"><thead><tr><th>Student ID</th><th>Student Name</th><th>Event</th>'+(compact?'':'<th>Grade / Section</th>')+'<th>Time (PHT)</th></tr></thead><tbody>'+rows.map(l=>{const s=getStudent(l);return '<tr><td class="mono strong">'+esc(s.student_id||'—')+'</td><td>'+esc(s.full_name||'—')+'</td><td><span class="badge '+(l.event_type==='OUT'?'out':'')+'">TIME '+esc(l.event_type)+'</span></td>'+(compact?'':'<td>'+esc(s.grade_level||'')+' · '+esc(s.section||'')+'</td>')+'<td class="mono">'+esc(timePH(l.recorded_at))+'</td></tr>';}).join('')+'</tbody></table></div>';
}
function recordsHTML(){
 const q=state.query.trim().toLowerCase();
 const rows=state.logs.filter(x=>{let s=getStudent(x);return !q||(s.full_name||'').toLowerCase().includes(q)||(s.student_id||'').includes(q);});
 return header('Attendance Records','Search daily arrivals and departures and export a report.', '<button class="btn btn-secondary" data-act="refresh">↻ Refresh</button>')+
 '<div class="card pad"><form id="filterForm" class="toolbar"><label class="field">School date (PHT)<input type="date" name="date" id="dateField" value="'+esc(state.recordDate)+'" required></label><label class="field search">Search student<input type="search" name="search" id="recordSearch" placeholder="Student ID or name" value="'+esc(state.query)+'"></label><button type="submit" class="btn">Apply</button><button type="button" data-act="export" class="btn btn-secondary">↓ Export CSV</button></form><div class="section-title"><h3>Attendance Log</h3><span class="muted small">'+rows.length+' displayed · up to 1,000 records per date</span></div>'+logTable(rows)+'</div>';
}
function studentsHTML(){
 if(state.role!=='admin')return '<div class="notice">Administrator access required.</div>';
 const q=state.query.toLowerCase().trim();
 const rows=state.students.filter(s=>!q||s.student_id.includes(q)||s.full_name.toLowerCase().includes(q)||(s.section||'').toLowerCase().includes(q));
 return header('Student Directory','Manage authorized Student IDs and enrollment status.','<button class="btn" data-act="addStudent">+ Add Student</button>')+
 '<div class="card pad"><div class="toolbar"><label class="field search">Find a student<input type="search" id="studentSearch" placeholder="Search by name, ID or section" value="'+esc(state.query)+'"></label><span class="muted small">'+rows.length+' students</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Student ID</th><th>Full Name</th><th>Grade</th><th>Section</th><th>Status</th><th>Action</th></tr></thead><tbody>'+rows.map(s=>'<tr><td class="mono strong">'+esc(s.student_id)+'</td><td>'+esc(s.full_name)+'</td><td>'+esc(s.grade_level||'—')+'</td><td>'+esc(s.section||'—')+'</td><td><span class="badge '+(s.active?'':'off')+'">'+(s.active?'Active':'Inactive')+'</span></td><td><button class="linkbtn" data-act="editStudent" data-id="'+esc(s.id)+'">Edit</button></td></tr>').join('')+'</tbody></table></div>'+(rows.length?'':'<div class="empty">No students in this directory yet. Add one to start.</div>')+'</div>';
}
function render(){
 if(!state.user){root.innerHTML=loginHTML();return;}
 if(state.page==='students'&&state.role!=='admin')state.page='kiosk';
 root.innerHTML=appHTML();
 document.getElementById('studentID')?.focus();
}
async function logIn(form){
 const btn=form.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Signing in…';
 try{
  const email=form.elements.email.value.trim(),password=form.elements.password.value;
  const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
  await verifySession();
 }catch(e){toast(e.message||'Sign in failed',true);}
 finally{btn.disabled=false;btn.textContent='Sign in to Attendance';}
}
async function logOut(){
 if(!state.demo)await sb.auth.signOut();
 Object.assign(state,{demo:false,user:null,role:null,students:[],logs:[],lastResult:null,query:'',page:'kiosk',mobileNav:false});
 render();
}
async function scan(){
 if(state.busy)return;
 const field=document.getElementById('studentID');
 const id=(field?.value||'').trim();
 if(!/^[0-9]{7,12}$/.test(id)){state.lastResult={status:'ERROR',message:'Enter a numeric Student ID (7–12 digits).'};render();return;}
 state.busy=true;
 const btn=document.getElementById('scanBtn');if(btn){btn.disabled=true;btn.textContent='Recording…';}
 try{
  let result;
  if(state.demo){
   const student=state.students.find(s=>s.student_id===id&&s.active);
   if(!student)throw new Error('Demo Student ID not registered. Try 2023107337.');
   const latest=state.logs.filter(x=>x.student_id===student.id&&x.event_date===todayPH()).sort((a,b)=>new Date(b.recorded_at)-new Date(a.recorded_at))[0];
   const now=new Date();
   if(latest && now-new Date(latest.recorded_at)<45000){
    result={status:'DUPLICATE',event_type:latest.event_type,recorded_at:latest.recorded_at};
   }else{
    const event_type=latest?.event_type==='IN'?'OUT':'IN';
    state.logs.unshift({id:'demo-'+Date.now(),student_id:student.id,event_type,event_date:todayPH(),recorded_at:now.toISOString(),lsc_students:student});
    result={status:'SUCCESS',event_type,recorded_at:now.toISOString()};
   }
   result={...result,student_id:student.student_id,full_name:student.full_name,grade_level:student.grade_level,section:student.section};
  }else{
   const {data,error}=await sb.rpc('lsc_record_attendance',{p_student_id:id});
   if(error)throw error;result=data;
  }
  state.lastResult=result;
  if(!state.demo)await loadData();
  render();
  if(clearResultTimer)clearTimeout(clearResultTimer);
  clearResultTimer=setTimeout(()=>{state.lastResult=null;if(state.page==='kiosk')render();},7000);
 }catch(e){state.lastResult={status:'ERROR',message:e.message||'Please try again.'};render();}
 finally{state.busy=false;const btn2=document.getElementById('scanBtn');if(btn2){btn2.disabled=false;btn2.textContent='Record Attendance →';}}
}
function studentModal(student){
 document.querySelector('.modal-backdrop')?.remove();
 const isEdit=!!student;
 const modal=document.createElement('div');modal.className='modal-backdrop';
 modal.innerHTML='<div class="modal" role="dialog" aria-modal="true" aria-label="'+(isEdit?'Edit student':'New student')+'"><div class="modal-header"><h2>'+(isEdit?'Edit Student':'Add Student')+'</h2><button class="modal-close" data-act="closeModal" aria-label="Close dialog">✕</button></div><form id="studentForm"><input type="hidden" name="rowid" value="'+esc(student?.id||'')+'"><div class="stack"><label class="field">Student ID<input name="student_id" type="text" inputmode="numeric" pattern="[0-9]{7,12}" maxlength="12" required value="'+esc(student?.student_id||'')+'" placeholder="2023107337"></label><label class="field">Full Name<input name="full_name" required minlength="2" maxlength="160" value="'+esc(student?.full_name||'')+'" placeholder="Student full name"></label><div class="field-row"><label class="field">Grade Level<input name="grade_level" maxlength="30" value="'+esc(student?.grade_level||'')+'" placeholder="Grade 10"></label><label class="field">Section<input name="section" maxlength="80" value="'+esc(student?.section||'')+'" placeholder="Section"></label></div><label class="field">Enrollment status<select name="active"><option value="true" '+(!student||student.active?'selected':'')+'>Active</option><option value="false" '+(student&&!student.active?'selected':'')+'>Inactive</option></select></label></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-act="closeModal">Cancel</button><button type="submit" class="btn" id="saveStudentBtn">'+(isEdit?'Save Changes':'Add Student')+'</button></div></form></div>';
 document.body.appendChild(modal);modal.querySelector('input[name=student_id]')?.focus();
}
async function saveStudent(form){
 const rowid=form.elements.rowid.value;
 const value={student_id:form.elements.student_id.value.trim(),full_name:form.elements.full_name.value.trim(),grade_level:form.elements.grade_level.value.trim(),section:form.elements.section.value.trim(),active:form.elements.active.value==='true'};
 const btn=document.getElementById('saveStudentBtn');btn.disabled=true;
 try{
  if(!/^[0-9]{7,12}$/.test(value.student_id))throw new Error('Student ID must be 7–12 digits.');
  if(state.demo){
   if(state.students.some(s=>s.student_id===value.student_id&&s.id!==rowid))throw new Error('Student ID already exists.');
   if(rowid){let s=state.students.find(s=>s.id===rowid);Object.assign(s,value);}
   else state.students.push({...value,id:'demo'+Date.now()});
  }else{
   const query=rowid?sb.from('lsc_students').update(value).eq('id',rowid):sb.from('lsc_students').insert(value);
   const {error}=await query;if(error)throw error;await loadData();
  }
  document.querySelector('.modal-backdrop')?.remove();render();toast('Student saved successfully.');
 }catch(e){toast(e.message||'Unable to save student.',true);}
 finally{btn.disabled=false;}
}
function toCsvCell(value){let x=String(value??'');if(/^[=+\-@\t\r]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"';}
function exportCsv(){
 if(!state.logs.length){toast('No attendance entries to export.');return;}
 const q=state.query.trim().toLowerCase(), rows=state.logs.filter(l=>{const s=getStudent(l);return !q||(s.student_id||'').includes(q)||(s.full_name||'').toLowerCase().includes(q);});
 const body=[['Student ID','Full Name','Grade Level','Section','Date','Event','Time PHT'],...rows.map(l=>{const s=getStudent(l);return [s.student_id,s.full_name,s.grade_level,s.section,l.event_date,l.event_type,timePH(l.recorded_at)];})];
 const csv='\uFEFF'+body.map(row=>row.map(toCsvCell).join(',')).join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='LSC-Attendance-'+state.recordDate+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
root.addEventListener('submit',async e=>{
 if(e.target.id==='loginForm'){e.preventDefault();await logIn(e.target);}
 if(e.target.id==='scanForm'){e.preventDefault();await scan();}
 if(e.target.id==='studentForm'){e.preventDefault();await saveStudent(e.target);}
 if(e.target.id==='filterForm'){e.preventDefault();state.recordDate=e.target.elements.date.value||todayPH();state.query=e.target.elements.search.value.trim();await loadData();render();}
});
document.addEventListener('click',async e=>{
 const nav=e.target.closest('[data-nav]');
 if(nav){state.page=nav.dataset.nav;state.mobileNav=false;state.query='';location.hash=state.page;render();return;}
 const key=e.target.closest('[data-key]');
 if(key){const input=document.getElementById('studentID');if(!input)return;const value=key.dataset.key;if(value==='Clear')input.value='';else if(value==='⌫')input.value=input.value.slice(0,-1);else input.value=(input.value+value).slice(0,12);input.focus();return;}
 const b=e.target.closest('[data-act]');if(!b)return;
 const act=b.dataset.act;
 if(act==='demo')demoStart();
 if(act==='logout')await logOut();
 if(act==='menu'){state.mobileNav=!state.mobileNav;document.querySelector('.sidebar')?.classList.toggle('open',state.mobileNav);}
 if(act==='refresh'){await loadData();render();toast('Attendance refreshed.');}
 if(act==='export')exportCsv();
 if(act==='addStudent')studentModal(null);
 if(act==='editStudent')studentModal(state.students.find(s=>s.id===b.dataset.id));
 if(act==='closeModal')document.querySelector('.modal-backdrop')?.remove();
});
root.addEventListener('input',e=>{
 if(e.target.id==='studentSearch'){
  state.query=e.target.value;
  const sel=e.target.selectionStart;
  render();
  const next=document.getElementById('studentSearch');next?.focus();next?.setSelectionRange(sel,sel);
 }
});
document.addEventListener('submit',e=>{},false);
window.addEventListener('hashchange',()=>{
 const page=location.hash.slice(1);
 if(['overview','kiosk','students','records'].includes(page)&&state.user&&page!==state.page){state.page=page;state.query='';render();}
});
setInterval(()=>{const c=document.getElementById('clock');if(c)c.textContent=stampPH()+' PHT';},15000);
state.page=['overview','kiosk','students','records'].includes(location.hash.slice(1))?location.hash.slice(1):'kiosk';
verifySession().catch(e=>{root.innerHTML=loginHTML();toast('Could not connect to the attendance service: '+e.message,true);});
