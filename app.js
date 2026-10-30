import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const SB_URL = 'https://rfxzbuocxersgbshczbj.supabase.co';
const SB_KEY = 'sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb';
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const root = document.getElementById('app');
const state = {
  demo: false, user: null, role: null, page: 'overview', loading: false,
  students: [], logs: [], classes: [], assignments: [], classId: null, lastResult: null, query: '', recordDate: todayPH(),
  busy: false, mobileNav: false, loginMode:'email', otpSent:false, otpEmail:'', showPasswordSetup:false
};
let clearResultTimer = null;
const icons = {overview:'▦',kiosk:'▣',students:'♙',records:'◷',classes:'⌂',officials:'♛',security:'⚿'};
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
function demoStart(asMayor=false){
  state.demo=true; state.user={email:'demo@preview.invalid'}; state.role=asMayor?'class_mayor':'official';
  state.classes=[{id:'demo-class',grade_level:'10',section:'Sample Section'},{id:'demo-class-2',grade_level:'9',section:'Demo Section'}];state.classId=asMayor?'demo-class':null;state.assignments=[];
  state.students=[
    {id:'demo1',student_id:'2023107337',full_name:'Demo Student',grade_level:'10',section:'Sample Section',class_id:'demo-class',active:true},
    {id:'demo2',student_id:'2023999999',full_name:'Sample Learner',grade_level:'9',section:'Demo Section',class_id:'demo-class-2',active:true}
  ]; if(asMayor){state.students=state.students.filter(x=>x.class_id==='demo-class');state.classes=state.classes.filter(x=>x.id==='demo-class');}state.logs=[]; state.page='overview'; state.lastResult=null; location.hash='overview'; render();
  toast('Demo mode: entries are not saved to Supabase.');
}
async function verifySession(){
  const {data:{session},error}=await sb.auth.getSession();
  if(error || !session){state.user=null;state.role=null;render();return;}
  const {data:role,error:roleError}=await sb.from('lsc_staff_roles').select('role,class_id').eq('user_id',session.user.id).maybeSingle();
  if(roleError || !role){await sb.auth.signOut();state.user=null;state.role=null;render();toast('Your account is not authorized for LSC Attendance.',true);return;}
  state.user=session.user;state.role=role.role;state.classId=role.class_id; await loadData();render();
}
async function loadData(){
  if(state.demo)return;
  const [s,l,c,a]=await Promise.all([
    sb.from('lsc_students').select('id,student_id,full_name,grade_level,section,class_id,active,id_origin,created_at').order('full_name',{ascending:true}).limit(2000),
    sb.from('lsc_attendance_events').select('id,student_id,class_id,event_type,event_date,recorded_at,recorded_by,recorded_by_email,recorded_by_role,lsc_students(student_id,full_name,grade_level,section)').eq('event_date',state.recordDate).order('recorded_at',{ascending:false}).limit(1000),
    sb.from('lsc_classes').select('id,grade_level,section').order('grade_level').order('section'),
    state.role==='official'?sb.rpc('lsc_list_roles'):Promise.resolve({data:[],error:null})
  ]);
  if(s.error || l.error || c.error || a.error){toast(s.error?.message || l.error?.message || c.error?.message || a.error?.message || 'Unable to load data.',true);return;}
  state.students=s.data || [];state.logs=l.data || [];state.classes=c.data||[];state.assignments=a.data||[];
}
function brand(){return '<img src="./assets/lsc-logo.webp" class="lsc-logo" alt="LSC official crest"><span><span class="brand-title" style="display:block">Attendance System</span><span class="brand-sub">BULSU LABORATORY HIGH SCHOOL</span></span>';}
function loginHTML(){
  let form='';
  if(state.loginMode==='password'){
    form='<form id="passwordLoginForm" class="stack">'+
      '<label class="field">Email address<input type="email" name="email" required autocomplete="username" placeholder="official@school.edu.ph" value="'+esc(state.otpEmail)+'"></label>'+
      '<label class="field">Backup password<input type="password" name="password" required autocomplete="current-password" placeholder="Your account password"></label>'+
      '<button class="btn" type="submit" style="width:100%;height:50px">Sign in with password</button></form>'+
      '<button type="button" class="btn btn-quiet" style="width:100%;margin-top:14px" data-act="useEmailLogin">← Sign in using email verification instead</button>';
  } else if(state.otpSent) {
    form='<div class="notice" role="status" style="margin-bottom:20px">Verification requested for <strong>'+esc(state.otpEmail)+'</strong>. Enter the 6-digit code from your email, or open the sign-in link in that email. The email template determines which method is sent.</div>'+
      '<form id="verifyEmailForm" class="stack">'+
      '<label class="field">Email verification code<input type="text" name="token" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required placeholder="000000" class="otp-code"></label>'+
      '<button class="btn" type="submit" style="width:100%;height:50px">Verify email & sign in</button></form>'+
      '<div class="form-actions" style="justify-content:space-between"><button type="button" class="btn btn-quiet" data-act="changeEmail">Change email</button><button type="button" class="btn btn-secondary" data-act="resendOtp">Resend email</button></div>';
  } else {
    form='<form id="sendEmailForm" class="stack">'+
      '<label class="field">Approved account email<input type="email" name="email" required autocomplete="username" placeholder="official@school.edu.ph" value="'+esc(state.otpEmail)+'"></label>'+
      '<button class="btn" type="submit" style="width:100%;height:50px">Send verification email →</button></form>'+
      '<button type="button" class="btn btn-quiet" style="width:100%;margin-top:14px" data-act="usePasswordLogin">Have a backup password? Sign in with password</button>';
  }
  return '<div class="login"><section class="login-art"><div style="display:flex;align-items:center;gap:12px">'+brand()+'</div>'+
    '<div><span class="eyebrow" style="color:#a9c7ff">LABORATORY HIGH SCHOOL • LSC</span>'+
    '<h2 class="big">Every arrival.<br>Every departure.<br>Accounted for.</h2>'+
    '<p>Secure, email-verified access for Class Mayors and LSC Officials.</p></div>'+
    '<div class="art-bottom small" style="color:#adc2e6">LSC Attendance Monitor · Powered by Azure&lt;3</div></section>'+
    '<section class="login-side"><div class="login-box"><div class="eyebrow">CLASS MAYOR &amp; LSC OFFICIAL ACCESS</div>'+
    '<h1>'+(state.otpSent && state.loginMode==='email'?'Verify your email':'Welcome back')+'</h1>'+
    '<p>'+(state.loginMode==='password'?'Use a backup password previously set in your account.':
      state.otpSent?'Check your email to complete sign-in.':
      'Enter your approved email address. No password is needed for your primary sign-in method.')+'</p>'+
    form+
    '<div style="display:flex;align-items:center;gap:12px;margin:22px 0;color:#9aa6b9;font-size:12px"><div style="height:1px;background:#e2e8f0;flex:1"></div>OR TRY THE INTERFACE<div style="height:1px;background:#e2e8f0;flex:1"></div></div>'+
    '<button type="button" class="btn btn-secondary" style="width:100%" data-act="demo">Preview LSC Official</button>'+
    '<button type="button" class="btn btn-secondary" style="width:100%;margin-top:9px" data-act="demoMayor">Preview Class Mayor</button>'+
    '<div class="login-footer">Email verification uses Supabase Auth. Only accounts already created and assigned a Class Mayor or LSC Official role can access attendance data. A backup password is an alternative sign-in method, not an additional mandatory factor. Demo Mode never saves attendance.</div>'+
    '</div></section></div>';
}
function sidebar(){
  let menu=[['overview','Dashboard'],['records','Attendance Records'],['security','Account Security']];
  if(state.role==='official'){menu.splice(1,0,['students','Student Directory'],['classes','Classes'],['officials','Role Assignments']);}
  return '<aside class="sidebar'+(state.mobileNav?' open':'')+'"><div class="brand">'+brand()+'</div><div><div class="nav-section">WORKSPACE</div><nav class="nav">'+menu.map(v=>'<button class="nav-btn '+(state.page===v[0]?'active':'')+'" data-nav="'+v[0]+'"><span class="nav-ico">'+icons[v[0]]+'</span>'+v[1]+'</button>').join('')+'<a class="nav-btn" href="./student.html"><span class="nav-ico">▣</span>Student Attendance ↗</a>'+'</nav></div><div class="sidebar-foot"><div class="small">Signed in as</div><div style="font-size:12px;font-weight:800;margin:5px 0;word-break:break-word">'+esc(state.user?.email || 'Demo Administrator')+'</div><div class="small">'+(state.demo?'PREVIEW MODE':state.role==='class_mayor'?'CLASS MAYOR':'LSC OFFICIAL')+'</div><button class="side-signout" data-act="logout">↪ &nbsp;Sign out</button><div class="small" style="margin-top:25px">Powered by Azure&lt;3 · School approval required</div></div></aside>';
}
function titleFor(){return ({overview:'Dashboard',kiosk:'Attendance Kiosk',students:'Student Directory',records:'Attendance Records',classes:'Classes',officials:'Role Assignments',security:'Account Security'})[state.page]||'Dashboard';}
function appHTML(){
  return '<div class="shell">'+sidebar()+'<main class="main"><header class="top"><div class="top-left"><button class="hamb" data-act="menu" aria-label="Open menu">☰</button><div class="top-title">'+titleFor()+'</div></div><span class="top-time mono" id="clock">'+esc(stampPH())+' PHT</span><span class="tag"><span class="dot"></span>'+(state.demo?'DEMO SESSION':state.role==='official'?'LSC OFFICIAL':'CLASS MAYOR')+'</span></header><div class="content">'+(state.page==='overview'?overviewHTML():state.page==='students'?studentsHTML():state.page==='records'?recordsHTML():state.page==='classes'?classesHTML():state.page==='officials'?officialsHTML():state.page==='security'?securityHTML():overviewHTML())+'</div></main></div>';
}
function header(head,sub,extra=''){return '<div class="page-header"><div><div class="eyebrow" style="margin-bottom:8px">LSC ATTENDANCE MONITOR</div><h1>'+head+'</h1><p>'+sub+'</p></div>'+extra+'</div>';}
function metrics(){
  const day=todayPH(), todays=state.logs.filter(x=>x.event_date===day);
  const ins=todays.filter(x=>x.event_type==='IN').length;
  const outs=todays.filter(x=>x.event_type==='OUT').length;
  const latest=new Map(); [...todays].sort((a,b)=>new Date(a.recorded_at)-new Date(b.recorded_at)).forEach(x=>latest.set(x.student_id,x.event_type));
  const inside=[...latest.values()].filter(v=>v==='IN').length;
  return [['Students in Roster',state.students.length,'♙',state.students.filter(s=>!s.active).length+' pending/inactive'],['Time IN Today',ins,'↗','Recorded arrivals'],['Time OUT Today',outs,'↘','Recorded departures'],['Currently Inside',inside,'◉','Latest status is IN']];
}
function overviewHTML(){
  const m=metrics();
  return header(state.role==='class_mayor'?'Class Attendance Dashboard':'Whole-School Attendance',state.role==='class_mayor'?'Your assigned classmates only · '+esc(state.classes.map(c=>c.id===state.classId?c.grade_level+' · '+c.section:'').find(Boolean)||'Class assigned'):'Student attendance at a glance · '+esc(datePH(new Date())))+
  '<section class="stats">'+m.map(x=>'<div class="card stat"><div class="stat-ico">'+x[2]+'</div><div class="stat-label">'+x[0]+'</div><div class="stat-num mono">'+x[1]+'</div><div class="stat-foot">'+x[3]+'</div></div>').join('')+'</section>'+
  '<div class="two-col"><div class="card pad"><div class="section-title"><h3>Recent Activity</h3><button class="btn btn-secondary" data-nav="records">View All</button></div>'+logTable(state.logs.filter(x=>x.event_date===todayPH()).slice(0,8),true)+'</div><div class="stack"><div class="log-ribbon"><div><h3>'+ (state.role==='class_mayor'?'Class monitoring':'Student check-in') +'</h3><p>'+ (state.role==='class_mayor'?'Record your classmates’ Time IN/OUT; every entry is audited to your login.':'Open the separate student attendance terminal.') +'</p></div>'+ '<a class="btn btn-light" href="./student.html">Open</a>' +'</div><div class="card pad"><div class="section-title"><h3>Quick Notes</h3></div><div class="info"><div class="bubble">✓</div><div><strong>Automatic alternation</strong><p>First entry of the Philippine school day is IN, then OUT, then IN.</p></div></div><div class="info"><div class="bubble">◷</div><div><strong>Reliable timestamps</strong><p>Real entries use the Supabase database clock, not the device clock.</p></div></div><div class="notice'+(state.demo?' warn':'')+'">'+(state.demo?'Demo mode only. No records are written to the school database.':'Read access is restricted by role and class assignment.')+'</div></div></div></div>';
}
function kioskHTML(){
  let r=state.lastResult;
  const result=r?'<div class="result '+(r.status==='ERROR'?'err':r.event_type==='OUT'?'out':'')+'" role="status"><div class="eyebrow" style="color:inherit;margin-bottom:6px">'+(r.status==='DUPLICATE'?'DUPLICATE ENTRY • NO NEW RECORD':r.status==='ERROR'?'NOT RECORDED':'ATTENDANCE RECORDED')+'</div><div class="result-title">'+(r.status==='ERROR'?'Unable to record attendance':r.event_type==='IN'?'✓ Time IN':'✓ Time OUT')+'</div><div class="result-meta">'+(r.status==='ERROR'?esc(r.message):'<b>'+esc(r.full_name)+'</b> · '+esc(r.student_id)+'<br>'+esc(r.grade_level||'')+' '+esc(r.section||'')+' · '+esc(timePH(r.recorded_at))+' PHT')+'</div></div>':'';
  return header('Attendance Kiosk','Enter a registered Student ID to log the next attendance event.')+
  '<div class="kiosk-layout"><section class="card kiosk-main"><div class="kiosk-icon">▣</div><h2>Student ID Entry</h2><p>Type or scan your Student ID, then press Enter.</p><form id="scanForm"><label for="studentID" class="hidden">Student ID</label><input id="studentID" class="id-input mono" name="studentID" type="text" inputmode="numeric" pattern="[0-9]{7,12}" maxlength="12" autocomplete="off" placeholder="2023••••••" aria-label="Student ID" required><div class="keypad">'+['1','2','3','4','5','6','7','8','9','Clear','0','⌫'].map(x=>'<button type="button" class="key '+(isNaN(Number(x))?'alt':'')+'" data-key="'+esc(x)+'">'+x+'</button>').join('')+'</div><button class="btn btn-record" id="scanBtn" type="submit"'+(state.busy?' disabled':'')+'>'+(state.busy?'Recording…':'Record Attendance →')+'</button></form>'+result+'<p class="tiny" style="color:#8b98ae;margin-top:25px">The next valid entry alternates between Time IN and Time OUT. A repeat within 45 seconds does not create a new record.</p></section>'+
  '<aside class="card kiosk-side"><h3>How it works</h3><div class="info"><div class="bubble">01</div><div><strong>Enter your Student ID</strong><p>Use the keyboard, touchscreen keypad, or a compatible scanner that types an ID.</p></div></div><div class="info"><div class="bubble">02</div><div><strong>Automatic detection</strong><p>The system finds your previous event for the current Philippine date and determines IN or OUT.</p></div></div><div class="info"><div class="bubble">03</div><div><strong>Instant confirmation</strong><p>Your event and database-recorded time appear here.</p></div></div><div class="notice warn">Attendance is recorded under the signed-in staff account. Keep this device supervised to prevent another student from entering someone else’s ID.</div></aside></div>';
}
function getStudent(log){return log.lsc_students||state.students.find(s=>s.id===log.student_id)||{};}
function recorderLabel(log) {
 const role=log.recorded_by_role==='class_mayor'?'Class Mayor':log.recorded_by_role==='official'?'LSC Official':'Role not captured';
 return {email:log.recorded_by_email||log.recorded_by||'Not available',role};
}
function logTable(rows,compact=false){
 if(!rows.length)return '<div class="empty"><div class="empty-icon">◷</div>No attendance entries for this date.</div>';
 return '<div class="table-wrap"><table class="table"><thead><tr><th>Student ID</th><th>Student Name</th><th>Event</th>'+
 (compact?'':'<th>Grade / Section</th>')+'<th>Time (PHT)</th><th>Recorded By</th></tr></thead><tbody>'+
 rows.map(l=>{
  const student=getStudent(l),actor=recorderLabel(l);
  return '<tr><td class="mono strong">'+esc(student.student_id||'—')+'</td><td>'+esc(student.full_name||'—')+'</td>'+
  '<td><span class="badge '+(l.event_type==='OUT'?'out':'')+'">TIME '+esc(l.event_type)+'</span></td>'+
  (compact?'':'<td>'+esc(student.grade_level||'')+' · '+esc(student.section||'')+'</td>')+
  '<td class="mono">'+esc(timePH(l.recorded_at))+'</td>'+
  '<td><div class="strong" style="font-size:12px">'+esc(actor.email)+'</div><div class="muted tiny">'+esc(actor.role)+'</div></td></tr>';
 }).join('')+'</tbody></table></div>';
}
function recordsHTML(){
 const q=state.query.trim().toLowerCase();
 const rows=state.logs.filter(x=>{let s=getStudent(x);return !q||(s.full_name||'').toLowerCase().includes(q)||(s.student_id||'').includes(q);});
 return header('Attendance Records','Search daily arrivals and departures and export a report.', '<button class="btn btn-secondary" data-act="refresh">↻ Refresh</button>')+
 '<div class="card pad"><form id="filterForm" class="toolbar"><label class="field">School date (PHT)<input type="date" name="date" id="dateField" value="'+esc(state.recordDate)+'" required></label><label class="field search">Search student<input type="search" name="search" id="recordSearch" placeholder="Student ID or name" value="'+esc(state.query)+'"></label><button type="submit" class="btn">Apply</button><button type="button" data-act="export" class="btn btn-secondary">↓ Export CSV</button></form><div class="section-title"><h3>Attendance Log</h3><span class="muted small">'+rows.length+' displayed · up to 1,000 records per date</span></div>'+logTable(rows)+'</div>';
}
function studentsHTML(){
 if(state.role!=='official')return '<div class="notice">LSC Official access required.</div>';
 const q=state.query.toLowerCase().trim();
 const rows=state.students.filter(s=>!q||s.student_id.includes(q)||s.full_name.toLowerCase().includes(q)||(s.section||'').toLowerCase().includes(q));
 const pending=state.students.filter(x=>x.id_origin==='generated_pending_verification').length;
 return header('Student Directory','Review imported masterlists, verify each Student ID, and manage enrollment status.','<button class="btn" data-act="addStudent">+ Add Student</button>')+
 (pending?'<div class="notice warn" style="margin-bottom:16px"><strong>'+pending+' generated attendance IDs require verification.</strong> The imported numbers are not official university Student IDs. Imported students are inactive until an LSC Official verifies an ID and explicitly activates the record. Do not use unverified IDs for real attendance.</div>':'')+
 '<div class="card pad"><div class="toolbar"><label class="field search">Find a student<input type="search" id="studentSearch" placeholder="Search by name, ID or section" value="'+esc(state.query)+'"></label><span class="muted small">'+rows.length+' students</span></div>'+
 '<div class="table-wrap"><table class="table"><thead><tr><th>Attendance ID</th><th>Full Name</th><th>Grade</th><th>Section</th><th>ID Source</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
 rows.map(s=>'<tr><td class="mono strong">'+esc(s.student_id)+'</td><td>'+esc(s.full_name)+'</td><td>'+esc(s.grade_level||'—')+'</td><td>'+esc(s.section||'—')+'</td>'+
 '<td><span class="badge '+(s.id_origin==='generated_pending_verification'?'out':'')+'">'+(s.id_origin==='generated_pending_verification'?'Temporary / Unverified':'Verified')+'</span></td>'+
 '<td><span class="badge '+(s.active?'':'off')+'">'+(s.active?'Active':'Inactive')+'</span></td>'+
 '<td><button class="linkbtn" data-act="editStudent" data-id="'+esc(s.id)+'">Review / Edit</button></td></tr>').join('')+'</tbody></table></div>'+
 (rows.length?'':'<div class="empty">No matching students.</div>')+'</div>';
}
function passwordSetupReminder(){
  return '<div class="notice" style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">'+
    '<span><strong>Email verified.</strong> You can now set a backup password to use when email verification is unavailable. This is optional, not two-factor authentication.</span>'+
    '<div style="display:flex;gap:8px"><button type="button" class="btn btn-secondary" data-act="skipPasswordSetup">Maybe later</button>'+
    '<button type="button" class="btn" data-nav="security">Set backup password</button></div></div>';
}
function securityHTML(){
  return header('Account Security','Email is your primary sign-in method. Set a backup password for future logins.')+
    '<div class="card pad" style="max-width:620px"><div class="section-title"><h3>Backup Password</h3></div>'+
    '<div class="notice" style="margin-bottom:22px">Your email was verified through Supabase Auth. A backup password allows an alternative sign-in method; it does not create an additional authentication factor.</div>'+
    (state.demo?'<div class="notice warn">Password changes are unavailable in Demo Mode.</div>':
    '<form id="backupPasswordForm" class="stack">'+
      '<label class="field">New backup password<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="128" placeholder="At least 12 characters"></label>'+
      '<label class="field">Confirm backup password<input name="confirmation" type="password" autocomplete="new-password" required minlength="12" maxlength="128" placeholder="Repeat the password"></label>'+
      '<button type="submit" class="btn">Set / Change Backup Password</button></form>')+
    '</div>';
}
async function sendEmailOtp(email){
  const clean=String(email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)){toast('Enter a valid email address.',true);return;}
  try{
    const {error}=await sb.auth.signInWithOtp({
      email:clean,
      options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}
    });
    if(error)throw error;
    state.otpEmail=clean;state.otpSent=true;state.loginMode='email';
    render();toast('If this account is registered, check its email for a code or verification link.');
  }catch(e){
    toast('Could not send verification email. Check the approved account and email-service configuration.',true);
  }
}
async function verifyEmailCode(form){
  const token=form.elements.token.value.trim();
  if(!/^[0-9]{6}$/.test(token)){toast('Enter the 6-digit code.',true);return;}
  const btn=form.querySelector('button[type=submit]');btn.disabled=true;
  try{
    const {error}=await sb.auth.verifyOtp({email:state.otpEmail,token,type:'email'});
    if(error)throw error;
    state.otpSent=false;state.showPasswordSetup=true;
    await verifySession();
  }catch(e){toast(e.message||'Code invalid or expired.',true);}
  finally{btn.disabled=false;}
}
async function loginWithBackup(form){
  const btn=form.querySelector('button[type=submit]');btn.disabled=true;
  try{
    const email=form.elements.email.value.trim(),password=form.elements.password.value;
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error)throw error;
    state.otpEmail=email;state.showPasswordSetup=false;
    await verifySession();
  }catch(e){toast(e.message||'Unable to sign in.',true);}
  finally{btn.disabled=false;}
}
async function updateBackupPassword(form){
  if(state.demo)return;
  const password=form.elements.password.value;
  if(password.length<12){toast('Use at least 12 characters.',true);return;}
  if(password!==form.elements.confirmation.value){toast('Passwords do not match.',true);return;}
  const btn=form.querySelector('button[type=submit]');btn.disabled=true;
  try{
    const {error}=await sb.auth.updateUser({password});
    if(error)throw error;
    form.reset();state.showPasswordSetup=false;
    render();toast('Backup password saved. Email verification remains the primary sign-in method.');
  }catch(e){toast(e.message||'Password could not be saved.',true);}
  finally{btn.disabled=false;}
}
function render(){
 if(!state.user){root.innerHTML=loginHTML();return;}
 if((['students','classes','officials'].includes(state.page)&&state.role!=='official')||state.page==='kiosk')state.page='overview';
 root.innerHTML=appHTML();
 document.getElementById('studentID')?.focus();
}
async function logOut(){
 if(!state.demo)await sb.auth.signOut();
 Object.assign(state,{demo:false,user:null,role:null,students:[],logs:[],lastResult:null,query:'',page:'overview',mobileNav:false,classId:null,classes:[],assignments:[],loginMode:'email',otpSent:false,otpEmail:'',showPasswordSetup:false});
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

function classTitle(id){
 const c=state.classes.find(x=>x.id===id);
 return c?c.grade_level+' · '+c.section:'Unassigned';
}
function classesHTML(){
 if(state.role!=='official')return '<div class="notice">LSC Official access required.</div>';
 return header('Classes & Sections','Create classes before registering students or assigning Class Mayors.')+
 '<div class="two-col" style="margin-top:0;grid-template-columns:1.2fr 1fr"><div class="card pad"><div class="section-title"><h3>Registered Classes</h3><span class="muted small">'+state.classes.length+' total</span></div>'+
 (state.classes.length?'<div class="table-wrap"><table class="table"><thead><tr><th>Grade Level</th><th>Section</th><th>Students</th></tr></thead><tbody>'+state.classes.map(c=>'<tr><td>'+esc(c.grade_level)+'</td><td>'+esc(c.section)+'</td><td>'+state.students.filter(s=>s.class_id===c.id).length+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No classes yet. Create your first class.</div>')+
 '</div><div class="card pad"><div class="section-title"><h3>Add Class</h3></div><form id="classForm" class="stack"><label class="field">Grade level<input name="grade_level" placeholder="Grade 10" maxlength="30" required></label>'+
 '<label class="field">Section<input name="section" placeholder="Mt. Makiling" maxlength="80" required></label><button class="btn" type="submit">Add Class</button></form><div class="notice" style="margin-top:20px">Each Class Mayor is assigned to exactly one class. Only LSC Officials may create classes.</div></div></div>';
}
function officialsHTML(){
 if(state.role!=='official')return '<div class="notice">LSC Official access required.</div>';
 const opts=state.classes.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.grade_level+' · '+c.section)+'</option>').join('');
 return header('Role Assignments','Only LSC Officials may assign, change, or revoke roles.')+
 '<div class="two-col" style="margin-top:0"><div class="card pad"><div class="section-title"><h3>Current Assignments</h3><span class="muted small">'+state.assignments.length+' accounts</span></div>'+
 (state.assignments.length?'<div class="table-wrap"><table class="table"><thead><tr><th>User Email</th><th>Role</th><th>Class</th><th>Action</th></tr></thead><tbody>'+
 state.assignments.map(a=>'<tr><td>'+esc(a.email)+'</td><td><span class="badge '+(a.role==='class_mayor'?'out':'')+'">'+(a.role==='official'?'LSC Official':'Class Mayor')+'</span></td><td>'+esc(a.class_id?classTitle(a.class_id):'Whole School')+'</td><td>'+(a.user_id===state.user?.id?'—':'<button type="button" class="linkbtn" data-act="revokeRole" data-id="'+esc(a.user_id)+'">Revoke</button>')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No assignments have been made.</div>')+
 '</div><div class="card pad"><div class="section-title"><h3>Assign a Role</h3></div><form id="roleForm" class="stack">'+
 '<label class="field">Existing account email<input type="email" name="email" placeholder="mayor@school.example" required></label>'+
 '<label class="field">Access role<select name="role" id="roleSelect" required><option value="class_mayor">Class Mayor</option><option value="official">LSC Official</option></select></label>'+
 '<label class="field" id="roleClassWrap">Assigned Class<select name="class_id" id="roleClassSelect" required><option value="">Select class…</option>'+opts+'</select></label>'+
 '<button class="btn" type="submit">Assign / Update Role</button></form><div class="notice warn" style="margin-top:18px">The account must already exist in Supabase Authentication. Invitations and password creation remain under the school administrator’s control.</div></div></div>';
}
function studentModal(student){
 document.querySelector('.modal-backdrop')?.remove();
 if(!state.classes.length){toast('Create a class first under Classes.',true);return;}
 const editing=!!student;
 const options=state.classes.map(c=>'<option value="'+esc(c.id)+'"'+(student?.class_id===c.id?' selected':'')+'>'+esc(c.grade_level+' · '+c.section)+'</option>').join('');
 const provisional=student?.id_origin==='generated_pending_verification';
 const modal=document.createElement('div');modal.className='modal-backdrop';
 modal.innerHTML='<div class="modal" role="dialog" aria-modal="true" aria-label="'+(editing?'Review student':'Add student')+'"><div class="modal-header"><h2>'+(editing?'Review Student':'Add Student')+'</h2><button class="modal-close" data-act="closeModal" aria-label="Close dialog">✕</button></div>'+
 (provisional?'<div class="notice warn" style="margin-bottom:18px">This student has a <strong>system-generated temporary number</strong>. It is NOT the student’s official university ID. Enter the correct ID after checking an authorized school record, then check the verification box to activate.</div>':'')+
 '<form id="studentForm"><input type="hidden" name="rowid" value="'+esc(student?.id||'')+'"><div class="stack">'+
 '<label class="field">Student ID<input name="student_id" type="text" pattern="[0-9]{7,12}" maxlength="12" inputmode="numeric" required value="'+esc(student?.student_id||'')+'"></label>'+
 '<label class="field">Full Name<input name="full_name" required minlength="2" maxlength="160" value="'+esc(student?.full_name||'')+'"></label>'+
 '<label class="field">Class / Section<select name="class_id" required><option value="">Select class…</option>'+options+'</select></label>'+
 '<label class="field">Enrollment status<select name="active"><option value="false"'+(!student||!student.active?' selected':'')+'>Inactive / Pending</option><option value="true"'+(student?.active?' selected':'')+'>Active — enable attendance</option></select></label>'+
 '<label class="field" style="display:flex;align-items:flex-start;gap:10px;font-weight:600"><input type="checkbox" name="verified" style="width:18px;height:18px;margin:0;flex-shrink:0"'+(student?.id_origin==='official_verified'?' checked':'')+'><span>I have checked the student’s official ID against an authorized school record. The ID above is correct.</span></label></div>'+
 '<div class="form-actions"><button type="button" class="btn btn-secondary" data-act="closeModal">Cancel</button><button type="submit" class="btn" id="saveStudentBtn">Save Student</button></div></form></div>';
 root.appendChild(modal);
 modal.querySelector('input[name=student_id]')?.focus();
}
async function saveStudent(form){
 if(state.role!=='official')return toast('LSC Official access required.',true);
 const rowid=form.elements.rowid.value;
 const classId=form.elements.class_id.value;
 const cls=state.classes.find(c=>c.id===classId);
 if(!cls)return toast('Select an existing class.',true);
 const existing=state.students.find(s=>s.id===rowid);
 const checked=form.elements.verified.checked;
 const value={
  student_id:form.elements.student_id.value.trim(),full_name:form.elements.full_name.value.trim(),
  class_id:cls.id,grade_level:cls.grade_level,section:cls.section,
  active:form.elements.active.value==='true',
  id_origin:checked?'official_verified':(existing?.id_origin==='generated_pending_verification'?'generated_pending_verification':'official_verified')
 };
 const btn=document.getElementById('saveStudentBtn');btn.disabled=true;
 try {
  if(!/^[0-9]{7,12}$/.test(value.student_id))throw new Error('Student ID must contain 7–12 digits.');
  if(value.active&&!checked)throw new Error('Confirm the Student ID is verified before activating attendance.');
  if(existing?.id_origin==='generated_pending_verification'&&checked&&existing.student_id===value.student_id){
    throw new Error('Replace the generated temporary ID with the verified official Student ID before confirmation.');
  }
  if(state.demo){
   if(state.students.some(s=>s.student_id===value.student_id&&s.id!==rowid))throw new Error('Student ID is already registered.');
   if(rowid)Object.assign(existing,value);
   else state.students.push({...value,id:'demo'+Date.now()});
  }else{
   const q=rowid?sb.from('lsc_students').update(value).eq('id',rowid):sb.from('lsc_students').insert(value);
   const {error}=await q;if(error)throw error;await loadData();
  }
  document.querySelector('.modal-backdrop')?.remove();render();toast('Student saved successfully.');
 }catch(e){toast(e.message||'Could not save student.',true);}
 finally{btn.disabled=false;}
}
async function createClass(form){
 if(state.role!=='official')return;
 const value={grade_level:form.elements.grade_level.value.trim(),section:form.elements.section.value.trim()};
 try{
  if(!value.grade_level||!value.section)throw new Error('Enter both grade level and section.');
  if(state.demo){
   if(state.classes.some(c=>c.grade_level===value.grade_level&&c.section===value.section))throw new Error('Class already exists.');
   state.classes.push({...value,id:'demo-class-'+Date.now()});
  }else{
   const {error}=await sb.from('lsc_classes').insert(value);if(error)throw error;await loadData();
  }
  render();toast('Class created.');
 }catch(e){toast(e.message||'Unable to create class.',true);}
}
async function assignRole(form){
 if(state.role!=='official')return;
 const email=form.elements.email.value.trim().toLowerCase();
 const role=form.elements.role.value;
 const class_id=role==='class_mayor'?form.elements.class_id.value:null;
 if(role==='class_mayor'&&!class_id)return toast('Select the Class Mayor’s class.',true);
 try{
  if(state.demo){
   const existing=state.assignments.find(a=>a.email===email);
   if(existing)Object.assign(existing,{role,class_id});
   else state.assignments.push({user_id:'demo-user-'+Date.now(),email,role,class_id});
  }else{
   const {error}=await sb.rpc('lsc_assign_role',{p_email:email,p_role:role,p_class_id:class_id||null});
   if(error)throw error;await loadData();
  }
  render();toast('Role assigned successfully.');
 }catch(e){toast(e.message||'Could not assign role.',true);}
}
async function revokeRole(userId){
 if(state.role!=='official'||userId===state.user?.id)return;
 if(!confirm('Revoke this user’s LSC access?'))return;
 try{
  if(state.demo)state.assignments=state.assignments.filter(a=>a.user_id!==userId);
  else{const {error}=await sb.rpc('lsc_revoke_role',{p_user_id:userId});if(error)throw error;await loadData();}
  render();toast('Role revoked.');
 }catch(e){toast(e.message||'Could not revoke access.',true);}
}
function toCsvCell(value){let x=String(value??'');if(/^[=+\-@\t\r]/.test(x))x="'"+x;return '"'+x.replaceAll('"','""')+'"';}
function exportCsv(){
 if(!state.logs.length){toast('No attendance entries to export.');return;}
 const q=state.query.trim().toLowerCase(), rows=state.logs.filter(l=>{const s=getStudent(l);return !q||(s.student_id||'').includes(q)||(s.full_name||'').toLowerCase().includes(q);});
 const body=[['Student ID','Full Name','Grade Level','Section','Date','Event','Time PHT','Recorded By Email','Recorded By Role','Recorder User ID'],...rows.map(l=>{const s=getStudent(l);return [s.student_id,s.full_name,s.grade_level,s.section,l.event_date,l.event_type,timePH(l.recorded_at),l.recorded_by_email||'',l.recorded_by_role||'Legacy (not captured)',l.recorded_by||''];})];
 const csv='\uFEFF'+body.map(row=>row.map(toCsvCell).join(',')).join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='LSC-Attendance-'+state.recordDate+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
root.addEventListener('submit',async e=>{
 if(e.target.id==='sendEmailForm'){e.preventDefault();await sendEmailOtp(e.target.elements.email.value);}
 if(e.target.id==='verifyEmailForm'){e.preventDefault();await verifyEmailCode(e.target);}
 if(e.target.id==='passwordLoginForm'){e.preventDefault();await loginWithBackup(e.target);}
 if(e.target.id==='backupPasswordForm'){e.preventDefault();await updateBackupPassword(e.target);}
 if(e.target.id==='scanForm'){e.preventDefault();await scan();}
 if(e.target.id==='studentForm'){e.preventDefault();await saveStudent(e.target);}
 if(e.target.id==='classForm'){e.preventDefault();await createClass(e.target);}
 if(e.target.id==='roleForm'){e.preventDefault();await assignRole(e.target);}
 if(e.target.id==='filterForm'){e.preventDefault();state.recordDate=e.target.elements.date.value||todayPH();state.query=e.target.elements.search.value.trim();await loadData();render();}
});
document.addEventListener('click',async e=>{
 const nav=e.target.closest('[data-nav]');
 if(nav){state.page=nav.dataset.nav;state.mobileNav=false;state.query='';if(state.page==='overview'&&state.recordDate!==todayPH()){state.recordDate=todayPH();await loadData();}location.hash=state.page;render();return;}
 const key=e.target.closest('[data-key]');
 if(key){const input=document.getElementById('studentID');if(!input)return;const value=key.dataset.key;if(value==='Clear')input.value='';else if(value==='⌫')input.value=input.value.slice(0,-1);else input.value=(input.value+value).slice(0,12);input.focus();return;}
 const b=e.target.closest('[data-act]');if(!b)return;
 const act=b.dataset.act;
 if(act==='usePasswordLogin'){state.loginMode='password';state.otpSent=false;render();}
 if(act==='useEmailLogin'){state.loginMode='email';state.otpSent=false;render();}
 if(act==='changeEmail'){state.otpSent=false;render();}
 if(act==='resendOtp'){await sendEmailOtp(state.otpEmail);}
 if(act==='skipPasswordSetup'){state.showPasswordSetup=false;render();}
 if(act==='demo')demoStart();
 if(act==='demoMayor')demoStart(true);
 if(act==='logout')await logOut();
 if(act==='menu'){state.mobileNav=!state.mobileNav;document.querySelector('.sidebar')?.classList.toggle('open',state.mobileNav);}
 if(act==='refresh'){await loadData();render();toast('Attendance refreshed.');}
 if(act==='export')exportCsv();
 if(act==='addStudent')studentModal(null);
 if(act==='editStudent')studentModal(state.students.find(s=>s.id===b.dataset.id));
 if(act==='revokeRole')await revokeRole(b.dataset.id);
 if(act==='closeModal')document.querySelector('.modal-backdrop')?.remove();
});
root.addEventListener('change',e=>{if(e.target.id==='roleSelect'){const wrap=document.getElementById('roleClassWrap');if(wrap){wrap.hidden=e.target.value==='official';document.getElementById('roleClassSelect').required=e.target.value==='class_mayor';}}});
root.addEventListener('input',e=>{
 if(e.target.id==='studentSearch'){
  state.query=e.target.value;
  const sel=e.target.selectionStart;
  render();
  const next=document.getElementById('studentSearch');next?.focus();next?.setSelectionRange(sel,sel);
 }
});
window.addEventListener('hashchange',()=>{
 const page=location.hash.slice(1);
 if(['overview','students','records','classes','officials','security'].includes(page)&&state.user&&page!==state.page){state.page=page;state.query='';render();}
});
setInterval(()=>{const c=document.getElementById('clock');if(c)c.textContent=stampPH()+' PHT';},15000);
state.page=['overview','students','records','classes','officials','security'].includes(location.hash.slice(1))?location.hash.slice(1):'overview';
verifySession().catch(e=>{root.innerHTML=loginHTML();toast('Could not connect to the attendance service: '+e.message,true);});
