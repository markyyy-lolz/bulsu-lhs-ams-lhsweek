import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const SB_URL = 'https://rfxzbuocxersgbshczbj.supabase.co';
const SB_KEY = 'sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb';
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const root = document.getElementById('app');
const state = {
  demo: false, user: null, role: null, page: 'overview', loading: false,
  students: [], logs: [], classes: [], assignments: [], classId: null, lastResult: null, query: '', recordDate: todayPH(),
  busy: false, mobileNav: false, loginMode:'email', otpSent:false, otpEmail:'', showPasswordSetup:false,
  live:{data:null,error:null,at:null,busy:false},corr:{data:[],error:null,busy:false},tgLink:null,settings:{data:null,error:null,busy:false},
  schoolYears:[],activeSchoolYearId:null,activeSchoolYearLabel:'',recordSchoolYearId:null,yearPreview:null,yearRoster:null,
};
let clearResultTimer = null;
let lastAnimatedPage = null;
const iconPaths=Object.freeze({"idcards":"<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2.5\"/><circle cx=\"9\" cy=\"11\" r=\"2.2\"/><path d=\"M5.5 17c.6-2 2-3 3.5-3s2.9 1 3.5 3M15 9.5h3.5M15 13h3.5\"/>","overview":"<rect x=\"3\" y=\"3\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1.5\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\" rx=\"1.5\"/>","students":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75\"/>","classes":"<path d=\"M4 22V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16\"/><path d=\"M2 22h20M9 22v-6h6v6M8 9h.01M16 9h.01M8 13h.01M16 13h.01\"/>","officials":"<circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2\"/><path d=\"m16 8 2 2 4-4\"/>","records":"<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M8 2v4M16 2v4M3 10h18m-13 6 2 2 5-5\"/>","security":"<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/><circle cx=\"12\" cy=\"16\" r=\"1\"/><path d=\"M12 17v2\"/>","kiosk":"<path d=\"M7 3H5a2 2 0 0 0-2 2v2m14-4h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M3 17v2a2 2 0 0 0 2 2h2M4 12h16\"/>","logout":"<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><path d=\"m16 17 5-5-5-5M21 12H9\"/>","external":"<path d=\"M13 5h6v6M19 5l-9 9\"/><path d=\"M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6\"/>","movie":"<rect x=\"2\" y=\"3\" width=\"20\" height=\"18\" rx=\"2\"/><path d=\"M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5\"/>","corrections":"<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z\"/>","close":"<path d=\"M18 6 6 18M6 6l12 12\"/>","menu":"<path d=\"M4 6h16M4 12h16M4 18h16\"/>"});
function navIcon(name){return '<svg class="outline-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(iconPaths[name]||iconPaths.overview)+'</svg>';}
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
  ]; if(asMayor){state.students=state.students.filter(x=>x.class_id==='demo-class');state.classes=state.classes.filter(x=>x.id==='demo-class');}state.logs=[];state.page='overview'; state.lastResult=null; location.hash='overview'; render();
  toast('Demo mode: entries are not saved to Supabase.');
}
async function verifySession(){
  const {data:{session},error}=await sb.auth.getSession();
  if(error || !session){state.user=null;state.role=null;render();return;}
  const {data:role,error:roleError}=await sb.from('lsc_staff_roles').select('role,class_id').eq('user_id',session.user.id).maybeSingle();
  if(roleError || !role){
    // Volunteer is permitted to operate the supervised Student Attendance terminal,
    // but never receives Class Mayor/LSC dashboard permissions.
    const {data:volunteer,error:volunteerError}=await sb.rpc('lsc_attendance_access');
    if(!volunteerError&&volunteer?.role==='attendance_volunteer'){
      location.replace('./student.html');
      return;
    }
    await sb.auth.signOut();state.user=null;state.role=null;render();
    toast('Your account is not authorized for LSC Attendance. Ask an LSC Official for approval.',true);
    return;
  }
  state.user=session.user;state.role=role.role;state.classId=role.class_id; await loadData();render();
}
async function loadData(){
 if(state.demo)return;
 const meta=await sb.rpc('lsc_active_school_year');
 if(meta.error){toast(meta.error.message||'Unable to load the active school year.',true);return;}
 state.activeSchoolYearId=meta.data?.id||null;
 state.activeSchoolYearLabel=meta.data?.label||'No active school year';
 if(!state.recordSchoolYearId)state.recordSchoolYearId=state.activeSchoolYearId;
 if(state.role==='official'){
  const years=await sb.rpc('lsc_school_year_list');
  if(years.error){toast(years.error.message||'Unable to load school year history.',true);return;}
  state.schoolYears=years.data?.years||[];
  state.activeSchoolYearId=years.data?.active_year_id||state.activeSchoolYearId;
 }
 const noYear='00000000-0000-0000-0000-000000000000';
 const studentQuery=sb.from('lsc_students').select('id,student_id,full_name,grade_level,section,class_id,school_year_id,active,id_origin,created_at,sex').order('full_name',{ascending:true}).limit(2000);
 if(state.role==='official')studentQuery.eq('school_year_id',state.activeSchoolYearId||noYear);
 else if(state.classId)studentQuery.eq('class_id',state.classId);
 else studentQuery.eq('id',noYear);
 const logQuery=sb.from('lsc_attendance_events').select('id,student_id,class_id,school_year_id,student_number_snapshot,student_name_snapshot,grade_level_snapshot,section_snapshot,event_type,event_date,recorded_at,recorded_by,recorded_by_email,recorded_by_role,lsc_students(student_id,full_name,grade_level,section)').eq('event_date',state.recordDate).eq('school_year_id',state.recordSchoolYearId||state.activeSchoolYearId||noYear).order('recorded_at',{ascending:false}).limit(1000);
 const classQuery=sb.from('lsc_classes').select('id,grade_level,section,school_year_id').order('grade_level').order('section');
 if(state.role==='official')classQuery.eq('school_year_id',state.activeSchoolYearId||noYear);
 else if(state.classId)classQuery.eq('id',state.classId);
 else classQuery.eq('id',noYear);
 const [s,l,c,a]=await Promise.all([studentQuery,logQuery,classQuery,state.role==='official'?sb.rpc('lsc_list_roles'):Promise.resolve({data:[],error:null})]);
 if(s.error||l.error||c.error||a.error){toast(s.error?.message||l.error?.message||c.error?.message||a.error?.message||'Unable to load data.',true);return;}
 state.students=s.data||[];state.logs=l.data||[];state.classes=c.data||[];state.assignments=a.data||[];
}
function brand(){return '<img src="./assets/lsc-glass-logo.png?v=2" class="lsc-logo" alt="LSC official crest"><span><span class="brand-title" style="display:block">Attendance System</span><span class="brand-sub">BULSU LABORATORY HIGH SCHOOL</span></span>';}
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
    '<p>Secure, email-verified access for Class Mayors, LSC Officials and authorized attendance volunteers.</p></div>'+
    '<div class="art-bottom small" style="color:#adc2e6">LSC Attendance Monitor · Powered by Azure&lt;3</div></section>'+
    '<section class="login-side"><div class="login-box"><div class="eyebrow">LSC OFFICIAL, CLASS MAYOR &amp; VOLUNTEER ACCESS</div>'+
    '<h1>'+(state.otpSent && state.loginMode==='email'?'Verify your email':'Welcome back')+'</h1>'+
    '<p>'+(state.loginMode==='password'?'Use a backup password previously set in your account.':
      state.otpSent?'Check your email to complete sign-in.':
      'Enter your approved email address. No password is needed for your primary sign-in method.')+'</p>'+
    form+
    '<div style="display:flex;align-items:center;gap:12px;margin:22px 0;color:#9aa6b9;font-size:12px"><div style="height:1px;background:#e2e8f0;flex:1"></div>OR TRY THE INTERFACE<div style="height:1px;background:#e2e8f0;flex:1"></div></div>'+
    '<button type="button" class="btn btn-secondary" style="width:100%" data-act="demo">Preview LSC Official</button>'+
    '<button type="button" class="btn btn-secondary" style="width:100%;margin-top:9px" data-act="demoMayor">Preview Class Mayor</button>'+
    '<div class="login-footer">Email verification uses Supabase Auth. Approved volunteers can access only the supervised Student Attendance terminal; administrative dashboards remain for Class Mayors and LSC Officials. A backup password is an alternative sign-in method, not an additional mandatory factor. Demo Mode never saves attendance.</div>'+
    '</div></section></div>';
}
function sidebar(){
  let menu=[['overview','Dashboard'],['records','Attendance Records'],['security','Account Security']];
  if(state.role==='class_mayor'){menu.splice(1,0,['masterlist','Class Masterlist'],['corrections','Corrections']);}
  if(state.role==='official'){menu.splice(1,0,['live','Live Dashboard'],['students','Student Directory'],['classes','Classes'],['schoolyears','School Year Management'],['officials','Role Assignments'],['idcards','ID Cards'],['corrections','Correction Requests'],['settings','Admin Settings']);}
  return '<aside id="lsc-sidebar" class="sidebar'+(state.mobileNav?' open':'')+'" aria-label="Workspace navigation"><button type="button" class="lsc-mobile-close" data-act="closeMenu" aria-label="Close navigation menu">'+navIcon('close')+'</button><div class="brand">'+brand()+'</div><div><div class="nav-section">WORKSPACE</div><nav class="nav">'+menu.map(v=>'<button class="nav-btn '+(state.page===v[0]?'active':'')+'" data-nav="'+v[0]+'"><span class="nav-ico">'+navIcon(v[0])+'</span>'+v[1]+'</button>').join('')+'<a class="nav-btn" href="./student.html"><span class="nav-ico">'+navIcon('kiosk')+'</span>Student Attendance<span class="nav-external">'+navIcon('external')+'</span></a>'+(state.role==='official'?'<a class="nav-btn" href="./movie.html"><span class="nav-ico">'+navIcon('movie')+'</span>Movie Booth POS<span class="nav-external">'+navIcon('external')+'</span></a>':'')+'<a class="nav-btn" href="./reserve.html"><span class="nav-ico">'+navIcon('movie')+'</span>Online Movie Booking<span class="nav-external">'+navIcon('external')+'</span></a>'+'</nav></div><div class="sidebar-foot"><div class="small">Signed in as</div><div style="font-size:12px;font-weight:800;margin:5px 0;word-break:break-word">'+esc(state.user?.email || 'Demo Administrator')+'</div><div class="small">'+(state.demo?'PREVIEW MODE':state.role==='class_mayor'?'CLASS MAYOR':'LSC OFFICIAL')+'</div><button class="side-signout" data-act="logout">'+navIcon('logout')+'<span>Sign out</span></button><div class="small" style="margin-top:25px">Powered by Azure&lt;3 · School approval required</div></div></aside>';
}
function titleFor(){return ({overview:'Dashboard',kiosk:'Attendance Kiosk',students:'Student Directory',live:'Live Dashboard',settings:'Admin Settings',masterlist:'Class Masterlist',records:'Attendance Records',classes:'Classes',schoolyears:'School Year Management',officials:'Role Assignments',security:'Account Security',corrections:'Corrections',idcards:'ID Cards',classlists:'Class Lists'})[state.page]||'Dashboard';}
function appHTML(){
  return '<div class="shell"><div class="lsc-nav-backdrop" data-act="closeMenu" aria-hidden="true"></div>'+sidebar()+'<main class="main"><header class="top"><div class="top-left"><button class="hamb" data-act="menu" aria-label="Open navigation menu" aria-controls="lsc-sidebar" aria-expanded="'+(state.mobileNav?'true':'false')+'">'+navIcon('menu')+'</button><div class="top-title">'+titleFor()+'</div></div><span class="top-time mono" id="clock">'+esc(stampPH())+' PHT</span><span class="tag"><span class="dot"></span>'+(state.demo?'DEMO SESSION':state.role==='official'?'LSC OFFICIAL':'CLASS MAYOR')+'</span></header><div class="content">'+(state.page==='overview'?overviewHTML():state.page==='students'?studentsHTML():state.page==='live'?liveHTML():state.page==='settings'?settingsHTML():state.page==='masterlist'?masterlistHTML():state.page==='corrections'?correctionsHTML():state.page==='records'?recordsHTML():state.page==='classes'?classesHTML():state.page==='schoolyears'?schoolYearsHTML():state.page==='officials'?officialsHTML():state.page==='idcards'?idCardsHTML():state.page==='classlists'?classListsHTML():state.page==='security'?securityHTML():overviewHTML())+'</div></main></div>';
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
  '<section class="stats">'+m.map(x=>'<div class="card stat"><div class="stat-ico">'+x[2]+'</div><div class="stat-label">'+x[0]+'</div><div class="stat-num mono">'+x[1]+'</div><div class="stat-foot">'+x[3]+'</div></div>' ).join('')+'</section>'+
  '<div class="ops-dash-callout" style="margin-top:14px"><div class="ops-dash-copy"><div class="eyebrow">NEW · FOUNDATION WEEK OPERATIONS</div><h3>Event Command Center</h3><p>Ticket validation, seat capacity, volunteer tools, attendance pulse, announcements and closing reports.</p></div><a class="btn btn-light" href="./operations.html">Open Operations →</a></div>'+ 
 '<div class="two-col"><div class="card pad"><div class="section-title"><h3>Recent Activity</h3><button class="btn btn-secondary" data-nav="records">View All</button></div>'+logTable(state.logs.filter(x=>x.event_date===todayPH()).slice(0,8),true)+'</div><div class="stack"><div class="log-ribbon"><div><h3>'+ (state.role==='class_mayor'?'Class monitoring':'Student check-in') +'</h3><p>'+ (state.role==='class_mayor'?'Record your classmates’ Time IN/OUT; every entry is audited to your login.':'Open the separate student attendance terminal.') +'</p></div>'+ '<a class="btn btn-light" href="./student.html">Open</a>' +'</div><div class="card pad"><div class="section-title"><h3>Quick Notes</h3></div><div class="info"><div class="bubble">✓</div><div><strong>Automatic alternation</strong><p>First entry of the Philippine school day is IN, then OUT, then IN.</p></div></div><div class="info"><div class="bubble">◷</div><div><strong>Reliable timestamps</strong><p>Real entries use the Supabase database clock, not the device clock.</p></div></div><div class="notice'+(state.demo?' warn':'')+'">'+(state.demo?'Demo mode only. No records are written to the school database.':'Read access is restricted by role and class assignment.')+'</div></div></div></div>';
}
function kioskHTML(){
  let r=state.lastResult;
  const result=r?'<div class="result '+(r.status==='ERROR'?'err':r.event_type==='OUT'?'out':'')+'" role="status"><div class="eyebrow" style="color:inherit;margin-bottom:6px">'+(r.status==='DUPLICATE'?'DUPLICATE ENTRY • NO NEW RECORD':r.status==='ERROR'?'NOT RECORDED':'ATTENDANCE RECORDED')+'</div><div class="result-title">'+(r.status==='ERROR'?'Unable to record attendance':r.event_type==='IN'?'✓ Time IN':'✓ Time OUT')+'</div><div class="result-meta">'+(r.status==='ERROR'?esc(r.message):'<b>'+esc(r.full_name)+'</b> · '+esc(r.student_id)+'<br>'+esc(r.grade_level||'')+' '+esc(r.section||'')+' · '+esc(timePH(r.recorded_at))+' PHT')+'</div></div>':'';
  return header('Attendance Kiosk','Enter a registered Student ID to log the next attendance event.')+
  '<div class="kiosk-layout"><section class="card kiosk-main"><div class="kiosk-icon">▣</div><h2>Student ID Entry</h2><p>Type or scan your Student ID, then press Enter.</p><form id="scanForm"><label for="studentID" class="hidden">Student ID</label><input id="studentID" class="id-input mono" name="studentID" type="text" inputmode="numeric" pattern="[0-9]{7,12}" maxlength="12" autocomplete="off" placeholder="2023••••••" aria-label="Student ID" required><div class="keypad">'+['1','2','3','4','5','6','7','8','9','Clear','0','⌫'].map(x=>'<button type="button" class="key '+(isNaN(Number(x))?'alt':'')+'" data-key="'+esc(x)+'">'+x+'</button>').join('')+'</div><button class="btn btn-record" id="scanBtn" type="submit"'+(state.busy?' disabled':'')+'>'+(state.busy?'Recording…':'Record Attendance →')+'</button></form>'+result+'<p class="tiny" style="color:#8b98ae;margin-top:25px">The next valid entry alternates between Time IN and Time OUT. A repeat within 45 seconds does not create a new record.</p></section>'+
  '<aside class="card kiosk-side"><h3>How it works</h3><div class="info"><div class="bubble">01</div><div><strong>Enter your Student ID</strong><p>Use the keyboard, touchscreen keypad, or a compatible scanner that types an ID.</p></div></div><div class="info"><div class="bubble">02</div><div><strong>Automatic detection</strong><p>The system finds your previous event for the current Philippine date and determines IN or OUT.</p></div></div><div class="info"><div class="bubble">03</div><div><strong>Instant confirmation</strong><p>Your event and database-recorded time appear here.</p></div></div><div class="notice warn">Attendance is recorded under the signed-in staff account. Keep this device supervised to prevent another student from entering someone else’s ID.</div></aside></div>';
}
function getStudent(log){
 const linked=log.lsc_students||state.students.find(s=>s.id===log.student_id)||{};
 return {...linked,student_id:log.student_number_snapshot||linked.student_id||'',
  full_name:log.student_name_snapshot||linked.full_name||'',
  grade_level:log.grade_level_snapshot||linked.grade_level||'',
  section:log.section_snapshot||linked.section||''};
}
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
 const yearField=state.role==='official'?'<label class="field">School year<select name="school_year_id">'+state.schoolYears.map(y=>'<option value="'+esc(y.id)+'"'+(y.id===state.recordSchoolYearId?' selected':'')+'>'+esc(y.label)+' · '+esc(y.status)+'</option>').join('')+'</select></label>':'';
 return header('Attendance Records','Review daily attendance by date and school year. Historical records use saved student and class details.', '<button class="btn btn-secondary" data-act="refresh">↻ Refresh</button>')+
 '<div class="card pad"><form id="filterForm" class="toolbar">'+yearField+'<label class="field">School date (PHT)<input type="date" name="date" id="dateField" value="'+esc(state.recordDate)+'" required></label><label class="field search">Search student<input type="search" name="search" id="recordSearch" placeholder="Student ID or name" value="'+esc(state.query)+'"></label><button type="submit" class="btn">Apply</button><button type="button" data-act="export" class="btn btn-secondary">↓ Export CSV</button></form><div class="section-title"><h3>Attendance Log</h3><span class="muted small">'+rows.length+' displayed · up to 1,000 records per date</span></div>'+logTable(rows)+'</div>';
}
function masterlistHTML(){
 if(state.role!=='class_mayor')return '<div class="notice">This page is for Class Mayors. LSC Officials can use the Student Directory.</div>';
 if(!state.classId)return header('Class Masterlist','Your Class Mayor account needs a class assignment for the active school year.')+'<div class="notice warn">Your previous year assignment has been cleared. Ask an LSC Official to assign your account to your new class before using the masterlist or attendance terminal.</div>';
 const cls=state.classes.find(c=>c.id===state.classId)||state.classes[0]||{};
 const title=cls.grade_level?(/^grade/i.test(cls.grade_level)?cls.grade_level:'Grade '+cls.grade_level)+' · '+cls.section:'Your class';
 const q=state.query.toLowerCase().trim();
 const all=state.students.filter(s=>s.active&&(!state.classId||s.class_id===state.classId)).sort((a,b)=>a.full_name.localeCompare(b.full_name));
 const rows=all.filter(s=>!q||s.student_id.includes(q)||s.full_name.toLowerCase().includes(q));
 return header('Class Masterlist','Official list of your classmates · '+esc(title)+(cls.adviser_name?' · Adviser: '+esc(cls.adviser_name):''),'<button class="btn" data-act="printMasterlist">Print list</button>')+
 '<div class="card pad" id="masterlistCard"><div class="toolbar"><label class="field search">Find a classmate<input type="search" id="studentSearch" placeholder="Search by name or ID" value="'+esc(state.query)+'"></label><span class="muted small">'+rows.length+' of '+all.length+' students</span></div>'+
 '<div class="table-wrap"><table class="table"><thead><tr><th>No.</th><th>Attendance ID</th><th>Full Name</th></tr></thead><tbody>'+
 (rows.length?rows.map((s,i)=>'<tr><td>'+(i+1)+'</td><td class="mono strong">'+esc(s.student_id)+'</td><td>'+esc(s.full_name)+'</td></tr>').join(''):'<tr><td colspan="3"><div class="empty">No students found.</div></td></tr>')+
 '</tbody></table></div><div class="notice" style="margin-top:16px">Read-only. You can see only your assigned class. Ask an LSC Official to correct any name or ID.</div></div>';
}
const LIVE_LAG_POINTS=10;
function demoLiveData(){
 const secs=[['Grade 7','Ipil',46,41],['Grade 7','Lanete',46,30],['Grade 8','Apitong',37,35],['Grade 8','Mahogany',38,36],['Grade 9','Acacia',40,38],['Grade 9','Dao',40,25],['Grade 10','Narra',36,34],['Grade 10','Yakal',37,35]];
 return {date:todayPH(),lag_points:10,late:24,late_cutoff:'07:30',inside:Math.round(secs.reduce((a,x)=>a+x[3],0)*.9),
  sections:secs.map((x,i)=>({class_id:'d'+i,grade_level:x[0],section:x[1],total:x[2],present:x[3]})),
  hours:[{hour:6,arrivals:40},{hour:7,arrivals:140},{hour:8,arrivals:60},{hour:9,arrivals:18}]};
}
async function loadLive(){
 if(state.live.busy)return;
 if(state.demo){state.live={data:demoLiveData(),error:null,at:new Date(),busy:false};return;}
 state.live.busy=true;
 const r=await sb.rpc('lsc_live_stats');
 state.live={data:r.error?state.live.data:r.data,error:r.error?r.error.message:null,at:r.error?state.live.at:new Date(),busy:false};
}
const pct=(a,b)=>b>0?Math.round(a*1000/b)/10:0;
const gradeNum=g=>parseInt(String(g).replace(/\D/g,''),10)||0;
function liveHTML(){
 if(state.role!=='official')return '<div class="notice">LSC Official access required.</div>';
 const L=state.live,d=L.data;
 if(!d)return header('Live Dashboard','Whole-school attendance, refreshed automatically')+(L.error?'<div class="notice warn">'+esc(L.error)+'</div>':'<div class="card pad"><div class="empty">Loading live attendance…</div></div>');
 const secs=d.sections.map(x=>({...x,pct:pct(x.present,x.total)}));
 const total=secs.reduce((a,x)=>a+x.total,0),present=secs.reduce((a,x)=>a+x.present,0),school=pct(present,total);
 const lagPts=d.lag_points??LIVE_LAG_POINTS;
 const lagging=x=>present>0&&x.total>0&&x.pct<school-lagPts;
 const lagCount=secs.filter(lagging).length;
 const grades=[...new Set(secs.map(x=>x.grade_level))].sort((a,b)=>gradeNum(a)-gradeNum(b)).map(g=>{const r=secs.filter(x=>x.grade_level===g);const t=r.reduce((a,x)=>a+x.total,0),p=r.reduce((a,x)=>a+x.present,0);return {g,t,p,pct:pct(p,t)};});
 const byHour=new Map(d.hours.map(h=>[h.hour,h.arrivals]));
 const hrs=[];for(let h=5;h<=18;h++)hrs.push(h);
 let cum=0;const hourRows=hrs.map(h=>{const n=byHour.get(h)||0;cum+=n;return {h,n,cum,pct:pct(cum,total)};});
 const maxN=Math.max(1,...hourRows.map(r=>r.n));
 const fmtH=h=>((h+11)%12+1)+(h<12?' AM':' PM');
 const bar=(v,cls='')=>'<div class="lv-track"><div class="lv-fill '+cls+'" style="width:'+Math.min(100,v)+'%"></div></div>';
 const tile=(l,n,f)=>'<div class="card stat"><div class="stat-label">'+l+'</div><div class="stat-num mono">'+n+'</div><div class="stat-foot">'+f+'</div></div>';
 const rows=[...secs].sort((a,b)=>a.pct-b.pct||gradeNum(a.grade_level)-gradeNum(b.grade_level)||a.section.localeCompare(b.section));
 return header('Live Dashboard','Whole-school attendance for '+esc(d.date)+' · refreshes every 30 seconds','<button class="btn btn-secondary" data-act="refreshLive">'+(L.busy?'Refreshing…':'Refresh now')+'</button>')+
 (L.error?'<div class="notice warn" style="margin-bottom:14px">Could not refresh: '+esc(L.error)+'. Showing the last data received.</div>':'')+
 '<section class="stats">'+tile('Present Today',present+' / '+total,(d.late!=null?d.late+' late (after '+esc(d.late_cutoff||'')+')':'Students with a Time IN'))+tile('School Attendance',school.toFixed(1)+'%','Present ÷ active students')+tile('Currently Inside',d.inside,'Latest scan is IN')+tile('Sections Lagging',lagCount,present?'More than '+lagPts+' points below the school rate':'Waiting for the first check-in')+'</section>'+
 '<div class="two-col" style="margin-top:16px"><div class="card pad"><div class="section-title"><h3>By Grade</h3></div>'+
 grades.map(x=>'<div class="lv-row"><span class="lv-name">'+esc(x.g)+'</span>'+bar(x.pct)+'<span class="lv-val mono">'+x.pct.toFixed(1)+'% <small>'+x.p+'/'+x.t+'</small></span></div>').join('')+'</div>'+
 '<div class="card pad"><div class="section-title"><h3>By Hour (first arrivals)</h3></div>'+
 hourRows.map(r=>'<div class="lv-row"><span class="lv-name">'+fmtH(r.h)+'</span>'+bar(r.n*100/maxN,'alt')+'<span class="lv-val mono">+'+r.n+' <small>'+r.pct.toFixed(1)+'% in</small></span></div>').join('')+'</div></div>'+
 '<div class="card pad" style="margin-top:16px"><div class="section-title"><h3>By Section</h3><span class="muted small">Lowest attendance first · highlighted rows are lagging</span></div>'+
 '<div class="table-wrap"><table class="table"><thead><tr><th>Grade</th><th>Section</th><th>Present</th><th>Attendance</th><th></th><th>Status</th></tr></thead><tbody>'+
 rows.map(x=>'<tr class="'+(lagging(x)?'lv-lag':'')+'"><td>'+esc(x.grade_level)+'</td><td>'+esc(x.section)+'</td><td class="mono">'+x.present+' / '+x.total+'</td><td class="mono strong">'+x.pct.toFixed(1)+'%</td><td style="min-width:140px">'+bar(x.pct,lagging(x)?'warn':'')+'</td><td>'+(x.total===0?'<span class="badge off">No students</span>':lagging(x)?'<span class="badge out">Lagging</span>':'<span class="badge">On track</span>')+'</td></tr>').join('')+'</tbody></table></div>'+
 '<p class="muted small" style="margin-top:12px">Last updated '+esc(L.at?timePH(L.at):'—')+' PHT. “Present” means the student has at least one Time IN today; “lagging” means a section is more than '+lagPts+' percentage points below the school-wide rate.</p></div>';
}
const DEMO_SETTINGS={lag_points:10,late_cutoff:'07:30',summary_time:'09:00',eod_time:'16:00',lag_start_hour:8,lag_end_hour:11,lag_interval:30,telegram_enabled:true,student_notifications:true,student_links:0,mayor_notifications:true,mayor_reminder_time:'08:30',parent_absent_alerts:false,public_stats:false,parent_alert_time:'08:00',correction_alerts:true,official_links:0,mayor_links:0,join_code:'DEMO1234',subscribers:[{chat_id:1,label:'Demo Developer',role:'developer',active:true,joined_at:new Date().toISOString()}]};
async function loadSettings(){
 if(state.role!=='official')return;
 if(state.demo){if(!state.settings.data)state.settings={data:JSON.parse(JSON.stringify(DEMO_SETTINGS)),error:null,busy:false};return;}
 const r=await sb.rpc('lsc_get_settings');
 state.settings={data:r.error?state.settings.data:r.data,error:r.error?r.error.message:null,busy:false};
}
function settingsHTML(){
 if(state.role!=='official')return '<div class="notice">LSC Official access required.</div>';
 const S=state.settings,d=S.data;
 if(!d)return header('Admin Settings','Thresholds, cutoffs and Telegram reports')+(S.error?'<div class="notice warn">'+esc(S.error)+'</div>':'<div class="card pad"><div class="empty">Loading settings…</div></div>');
 const hourOpts=(sel,from,to)=>{let o='';for(let h=from;h<=to;h++){const l=((h+11)%12+1)+(h%24<12||h===24?' AM':' PM');o+='<option value="'+h+'"'+(h===sel?' selected':'')+'>'+(h===24?'12 AM (end of day)':l)+'</option>';}return o;};
 const intervalOpts=[5,10,15,20,30,60].map(v=>'<option value="'+v+'"'+(v===d.lag_interval?' selected':'')+'>Every '+(v===60?'hour':v+' minutes')+'</option>').join('');
 const subs=d.subscribers||[];
 return header('Admin Settings','Change thresholds, the late cutoff, Telegram report times and the join code')+
 '<form id="settingsForm" class="stack"><div class="two-col" style="margin-top:0">'+
 '<div class="card pad"><div class="section-title"><h3>Attendance Rules</h3></div><div class="stack">'+
 '<label class="field">Lagging threshold (percentage points)<input type="number" name="lag_points" min="1" max="50" step="1" value="'+esc(d.lag_points)+'" required></label>'+
 '<p class="muted small" style="margin:-6px 0 0">A section is “lagging” when its attendance is this many points below the school-wide rate.</p>'+
 '<label class="field">Late cutoff time (PHT)<input type="time" name="late_cutoff" value="'+esc(d.late_cutoff)+'" required></label>'+
 '<p class="muted small" style="margin:-6px 0 0">A student whose first Time IN is after this time counts as late on the Live Dashboard and in the Telegram reports.</p></div></div>'+
 '<div class="card pad"><div class="section-title"><h3>Telegram Reports</h3><span class="muted small">Philippine time</span></div><div class="stack">'+
 '<label class="field check-field"><input type="checkbox" name="telegram_enabled"'+(d.telegram_enabled?' checked':'')+'> <span>Send Telegram reports and alerts</span></label>'+
 '<label class="field check-field"><input type="checkbox" name="student_notifications"'+(d.student_notifications?' checked':'')+'> <span>Notify students/parents on Time IN/OUT ('+(d.student_links||0)+' linked chats)</span></label>'+
 '<label class="field check-field"><input type="checkbox" name="correction_alerts"'+(d.correction_alerts?' checked':'')+'> <span>Send correction requests to linked officials ('+(d.official_links||0)+' linked)</span></label>'+
 '<label class="field check-field"><input type="checkbox" name="mayor_notifications"'+(d.mayor_notifications?' checked':'')+'> <span>Send class mayors a “who has not scanned in” reminder ('+(d.mayor_links||0)+' linked)</span></label>'+
 '<label class="field">Mayor reminder time<input type="time" name="mayor_reminder_time" value="'+esc(d.mayor_reminder_time||'08:30')+'" required></label>'+
 '<label class="field check-field"><input type="checkbox" name="public_stats"'+(d.public_stats?' checked':'')+'> <span>Show the public stats screen (<a href="./stats.html" target="_blank" rel="noopener">stats.html</a>) — counts per grade only, no names. Anyone with the link can see it while this is on.</span></label>'+
 '<label class="field check-field"><input type="checkbox" name="parent_absent_alerts"'+(d.parent_absent_alerts?' checked':'')+'> <span>Tell linked parents when no Time IN is recorded yet ('+(d.student_links||0)+' linked chats)</span></label>'+
 '<label class="field">Parent alert time (PHT)<input type="time" name="parent_alert_time" value="'+esc(d.parent_alert_time||'08:00')+'" required></label>'+
 '<p class="muted small" style="margin:-6px 0 0">Off by default. Each parent gets one message a day, and a section where nobody has scanned in yet is skipped. Get the school’s approval of the wording first.</p>'+
 '<div class="set-grid"><label class="field">Morning summary<input type="time" name="summary_time" value="'+esc(d.summary_time)+'" required></label>'+
 '<label class="field">End-of-day report<input type="time" name="eod_time" value="'+esc(d.eod_time)+'" required></label>'+
 '<label class="field">Lag alerts start<select name="lag_start_hour">'+hourOpts(d.lag_start_hour,0,23)+'</select></label>'+
 '<label class="field">Lag alerts stop<select name="lag_end_hour">'+hourOpts(d.lag_end_hour,1,24)+'</select></label></div>'+
 '<label class="field">Check for lagging sections<select name="lag_interval">'+intervalOpts+'</select></label></div></div></div>'+
 '<div><button class="btn" type="submit">'+(S.busy?'Saving…':'Save Settings')+'</button> <span class="muted small">Saving also updates the Telegram schedule.</span></div></form>'+
 '<div style="margin-top:16px">'+tgLinkCard()+'</div>'+
 '<div class="two-col" style="margin-top:16px"><div class="card pad"><div class="section-title"><h3>Telegram Join Code</h3></div>'+
 '<p class="muted small">Officials send <span class="mono strong">/join CODE</span> to the bot to subscribe.</p>'+
 '<div class="join-code mono strong">'+esc(d.join_code||'—')+'</div>'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button type="button" class="btn btn-secondary" data-act="copyJoin">Copy code</button><button type="button" class="btn btn-secondary" data-act="regenJoin">Generate new code</button></div>'+
 '<p class="muted small" style="margin-top:12px">A new code stops anyone else from joining with the old one. People already subscribed stay subscribed until you remove them.</p></div>'+
 '<div class="card pad"><div class="section-title"><h3>Telegram Subscribers</h3><span class="muted small">'+subs.filter(x=>x.active).length+' active</span></div>'+
 (subs.length?'<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
 subs.map(x=>'<tr><td>'+esc(x.label||'(no name)')+'</td><td><span class="badge '+(x.active?'':'off')+'">'+(x.active?'Subscribed':'Removed')+'</span></td><td><button type="button" class="linkbtn" data-act="tgActive" data-id="'+esc(x.chat_id)+'" data-active="'+(x.active?'0':'1')+'">'+(x.active?'Remove':'Restore')+'</button></td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Nobody has joined yet.</div>')+
 '</div></div>';
}
async function saveSettings(form){
 const f=form.elements,g=n=>f[n].value;
 const p={lag_points:parseInt(g('lag_points'),10),late_cutoff:g('late_cutoff'),summary_time:g('summary_time'),eod_time:g('eod_time'),lag_start_hour:parseInt(g('lag_start_hour'),10),lag_end_hour:parseInt(g('lag_end_hour'),10),lag_interval:parseInt(g('lag_interval'),10),telegram_enabled:f.telegram_enabled.checked,student_notifications:f.student_notifications.checked,correction_alerts:f.correction_alerts.checked,mayor_notifications:f.mayor_notifications.checked,mayor_reminder_time:g('mayor_reminder_time'),parent_absent_alerts:f.parent_absent_alerts.checked,parent_alert_time:g('parent_alert_time'),public_stats:f.public_stats.checked};
 if(!(p.lag_points>=1&&p.lag_points<=50))return toast('Lagging threshold must be between 1 and 50.',true);
 if(p.lag_start_hour>=p.lag_end_hour)return toast('Lag alerts must stop after they start.',true);
 state.settings.busy=true;render();
 try{
  if(state.demo){Object.assign(state.settings.data,p);}
  else{const r=await sb.rpc('lsc_update_settings',{p});if(r.error)throw r.error;state.settings.data=r.data;}
  toast('Settings saved. Telegram schedule updated.');
 }catch(err){toast('Could not save: '+(err.message||err),true);}
 state.settings.busy=false;render();
}


// ===== Personal Telegram link (officials and class mayors) =====
const TG_BOT='lhslscbot';
function tgLinkCard(){
 const L=state.tgLink,isOff=state.role==='official';
 const what=isOff?'Get correction requests here with Approve / Reject buttons.':'Get a reminder of who has not scanned in yet, and updates on your correction requests.';
 return '<div class="card pad"><div class="section-title"><h3>Telegram for your account</h3></div><p class="muted small">'+esc(what)+' Link your own Telegram once; it is tied to your login, so only you receive it.</p>'+
 (L&&L.url?'<p><a class="btn" href="'+esc(L.url)+'" target="_blank" rel="noopener">Open Telegram and press START</a></p><p class="muted small">'+(L.linked?esc(L.linked)+' chat(s) already linked. ':'')+'Do not share this link: it connects whoever opens it to your account. Send <span class="mono">/stop</span> to the bot to unlink.</p>':
  '<button type="button" class="btn btn-secondary" data-act="tgLink">Link my Telegram</button>')+'</div>';
}
async function makeTgLink(){
 try{
  if(state.demo){state.tgLink={url:'https://t.me/'+TG_BOT,linked:0};return;}
  const r=await sb.rpc('lsc_my_telegram_link');if(r.error)throw r.error;
  state.tgLink={url:'https://t.me/'+TG_BOT+'?start=U_'+r.data.token,linked:r.data.linked};
 }catch(err){toast('Could not create link: '+(err.message||err),true);}
}

// ===== Correction requests =====
const CORR_KIND={ADD_IN:'Add missed Time IN',ADD_OUT:'Add missed Time OUT',REMOVE:'Remove wrong/duplicate scan'};
async function loadCorrections(){
 if(state.demo){return;}
 state.corr.busy=true;
 const r=await sb.rpc('lsc_list_corrections');
 state.corr={data:r.error?state.corr.data:(r.data||[]),error:r.error?r.error.message:null,busy:false};
}
function corrDesc(c){
 if(c.kind==='REMOVE')return 'Remove '+esc(c.event_type||'')+' scan'+(c.event_recorded_at?' at '+esc(timePH(c.event_recorded_at)):'')+' · '+esc(c.event_date);
 return (c.kind==='ADD_IN'?'Add Time IN':'Add Time OUT')+' at '+esc(c.event_time)+' · '+esc(c.event_date);
}

// ===== ID card generator (8.5 x 13 in, portrait, one-sided, 9 per sheet) =====
function idCardsHTML(){
 if(state.role!=='official')return '<div class="notice">Only LSC Officials can print ID cards.</div>';
 const act=state.students.filter(x=>x.active);
 const grades=[...new Set(act.map(x=>x.grade_level))].sort((a,b)=>parseInt(a.replace(/\D/g,''))-parseInt(b.replace(/\D/g,''))||a.localeCompare(b));
 const classes=[...new Set(act.map(x=>x.grade_level+'|'+x.section))].sort((a,b)=>parseInt(a.replace(/\D/g,''))-parseInt(b.replace(/\D/g,''))||a.localeCompare(b));
 const opts='<option value="all">All students ('+act.length+')</option>'+grades.map(g=>'<option value="g:'+esc(g)+'">All '+esc(g)+' ('+act.filter(x=>x.grade_level===g).length+')</option>').join('')+
  classes.map(c=>{const [g,sec]=c.split('|');return '<option value="c:'+esc(c)+'">'+esc(g)+' · '+esc(sec)+' ('+act.filter(x=>x.grade_level===g&&x.section===sec).length+')</option>';}).join('');
 return header('ID Cards','Print Student ID cards on 8.5 × 13 in paper: portrait, one-sided, 9 cards per sheet, with the attendance QR and the Telegram QR on the front.')+
 '<div class="card pad"><div class="section-title"><h3>Choose who to print</h3></div>'+
 '<div class="two-col" style="margin-top:0"><label class="field">Class<select id="idcScope">'+opts+'</select></label>'+
 '<label class="field">Or reprint one student (lost / damaged ID)<input id="idcOne" list="idcList" placeholder="Type Student ID or name" autocomplete="off"><datalist id="idcList">'+act.slice(0,1500).map(x=>'<option value="'+esc(x.student_id)+'">'+esc(x.full_name)+'</option>').join('')+'</datalist></label></div>'+
 '<label class="field check-field" style="margin-top:14px"><input type="checkbox" id="idcReset"> <span><b>Reset Telegram codes</b> for this selection before generating. The Telegram QR on any previously printed card stops working, and only the new cards work.</span></label>'+
 '<label class="field check-field"><input type="checkbox" id="idcUnlink"> <span>Also disconnect parents/students already linked (they must scan the new card to get alerts again). Leave off to keep current links.</span></label>'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center"><button type="button" class="btn" data-act="idcGenerate"'+(state.idc?.busy?' disabled':'')+'>'+(state.idc?.busy?'Preparing…':'Generate ID sheets')+'</button>'+(state.idc?.error?'<span style="color:#b3261e;font-weight:700">'+esc(state.idc.error)+'</span>':'')+'</div>'+
 '<p class="muted small" style="margin-top:12px">A new tab opens with the sheets. Press <b>Print</b> and set <b>Paper size: Legal/Custom 8.5 × 13 in</b>, <b>Margins: None</b>, <b>Scale: 100%</b>, and turn <b>Background graphics</b> on. Choose “Save as PDF” to get a file. Cut along the dotted lines. Each card’s Telegram QR is private to that student, so keep printed sheets with the LSC.</p></div>';
}
function qrSvg(text,mod){
 const q=qrcode(0,'M');q.addData(String(text));q.make();const n=q.getModuleCount(),b=1;let d='';
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+='M'+(c+b)+' '+(r+b)+'h1v1h-1z';
 return '<svg viewBox="0 0 '+(n+2*b)+' '+(n+2*b)+'" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';
}
async function generateIdCards(){
 const sel=document.getElementById('idcScope')?.value||'all',one=(document.getElementById('idcOne')?.value||'').trim();
 const w=window.open('about:blank','_blank');
 if(!w){state.idc={busy:false,error:'Pop-up blocked. Allow pop-ups for this site, then try again.'};render();return;}
 w.document.write('<title>Preparing ID cards…</title><body style="font-family:system-ui;padding:40px">Preparing ID cards…</body>');
 state.idc={busy:true,error:null};render();
 try{
  let rows;
  if(state.demo){rows=state.students.filter(x=>x.active).slice(0,9).map(x=>({student_id:x.student_id,full_name:x.full_name,grade_level:x.grade_level,section:x.section,token:'demo00000000'}));}
  else{
   const args={p_grade:null,p_section:null,p_ids:null};
   const doReset=!!document.getElementById('idcReset')?.checked,doUnlink=!!document.getElementById('idcUnlink')?.checked;
   if(one){const m=state.students.find(x=>x.student_id===one)||state.students.find(x=>x.full_name.toLowerCase()===one.toLowerCase());if(!m)throw new Error('No student found for “'+one+'”.');args.p_ids=[m.student_id];}
   else if(sel.startsWith('g:'))args.p_grade=sel.slice(2);
   else if(sel.startsWith('c:')){const [g,sec]=sel.slice(2).split('|');args.p_grade=g;args.p_section=sec;}
   if(doReset){
    const cnt=args.p_ids?1:state.students.filter(x=>x.active&&(!args.p_grade||x.grade_level===args.p_grade)&&(!args.p_section||x.section===args.p_section)).length;
    if(!confirm('Reset the Telegram codes of '+cnt+' student'+(cnt===1?'':'s')+'?\n\nTheir old printed Telegram QR codes will stop working.'+(doUnlink?'\nEveryone already linked to them will ALSO be disconnected.':''))){try{w.close()}catch(_){}state.idc={busy:false,error:null};render();return;}
    const rr=await sb.rpc('lsc_reset_telegram_codes',{...args,p_unlink:doUnlink});if(rr.error)throw rr.error;
   }
   const r=await sb.rpc('lsc_id_card_data',args);if(r.error)throw r.error;rows=r.data||[];
  }
  if(!rows.length)throw new Error('No students match that choice.');
  if(!window.qrcode){const m=await import('https://esm.sh/qrcode-generator@1.4.4');window.qrcode=m.default||m;}
  const crest=await fetch('./assets/lsc-crest-transparent.png').then(r=>r.blob()).then(b=>new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=()=>ok('');f.readAsDataURL(b)})).catch(()=>'');
  const cards=rows.map(r=>{
   const name=String(r.full_name||''),i=name.indexOf(','),last=(i<0?name:name.slice(0,i)).trim().toUpperCase(),first=i<0?'':name.slice(i+1).trim();
   return '<div class="card"><div class="hd"><div class="cr"><img src="'+crest+'" alt=""></div><div class="ht"><b>BULSU LABORATORY<br>HIGH SCHOOL</b><span>LHS WEEK | ATTENDANCE PASS</span></div></div><div class="gold"></div>'+
    '<div class="nm"><div class="ln">'+esc(last)+'</div><div class="fn">'+esc(first)+'</div><div class="meta">'+esc(r.grade_level)+' - '+esc(r.section)+' &nbsp;|&nbsp; '+esc(r.student_id)+'</div></div>'+
    '<div class="qa">'+qrSvg(r.student_id)+'</div><div class="sc">SCAN TO CHECK IN</div><div class="dv"></div>'+
    '<div class="tg"><div class="qt">'+(r.token?qrSvg('https://t.me/lhslscbot?start=L_'+r.token):'')+'</div><div class="tt"><b>TELEGRAM ALERTS</b>(optional) Parent/student:<br>scan, press START.<br>The bot replies with the<br>name above. Wrong name?<br>Stop. @lhslscbot</div></div>'+
    '<div class="ft">If found, return to the LSC Office, BulSU Laboratory High School.</div></div>';
  });
  const sheets=[];for(let k=0;k<cards.length;k+=9)sheets.push('<section class="sheet">'+cards.slice(k,k+9).join('')+'</section>');
  const css='@page{size:8.5in 13in;margin:0}*{box-sizing:border-box}body{margin:0;background:#dfe5ef;font-family:Poppins,system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
   '.bar{position:sticky;top:0;z-index:9;display:flex;gap:12px;align-items:center;justify-content:center;padding:12px;background:#0d1b33;color:#fff;font-size:14px}.bar button{background:#e3a21a;border:0;border-radius:10px;padding:10px 20px;font:700 14px Poppins,sans-serif;cursor:pointer}'+
   '.sheet{width:8.5in;height:13in;margin:16px auto;background:#fff;display:grid;grid-template-columns:repeat(3,54mm);grid-template-rows:repeat(3,85.6mm);justify-content:space-evenly;align-content:space-evenly;page-break-after:always;break-after:page;overflow:hidden}'+
   '@media print{body{background:#fff}.bar{display:none}.sheet{margin:0}.sheet:last-child{page-break-after:auto;break-after:auto}}'+
   '.card{position:relative;width:54mm;height:85.6mm;border:.3mm dashed #9aa7bf;border-radius:3mm;overflow:hidden;background:#fff;text-align:center}'+
   '.hd{background:#1f3a6b;height:14mm;display:flex;align-items:center;gap:2mm;padding:0 2.6mm;text-align:left;color:#fff}.cr{width:7.4mm;height:10.2mm;background:#fff;border-radius:1.5mm;display:grid;place-items:center;flex:none}.cr img{width:5.4mm;height:8.4mm;object-fit:contain}'+
   '.ht b{display:block;font-size:6.6pt;line-height:1.35;font-weight:700}.ht span{display:block;font-size:4.5pt;color:#dce6f7;margin-top:.6mm}.gold{height:1mm;background:#e3a21a}'+
   '.nm{position:absolute;left:3mm;right:3mm;top:16mm}.ln{font-weight:700;font-size:12pt;line-height:5mm;color:#000;white-space:nowrap;overflow:hidden}.fn{font-size:8.2pt;line-height:4mm;color:#000;white-space:nowrap;overflow:hidden}.meta{font-weight:700;font-size:7pt;line-height:4mm;color:#1f3a6b}'+
   '.qa{position:absolute;left:13.5mm;top:32mm;width:27mm;height:27mm}.qa svg,.qt svg{width:100%;height:100%;display:block}.sc{position:absolute;left:0;right:0;top:59.6mm;height:3mm;line-height:3mm;font-weight:700;font-size:5.4pt;color:#555}'+
   '.dv{position:absolute;left:3mm;right:3mm;top:63.2mm;border-top:.3mm dotted #c9d3e6}.tg{position:absolute;left:3mm;right:3mm;top:64.4mm;height:17mm;display:flex;gap:2mm;text-align:left}.qt{width:17mm;height:17mm;flex:none}.tt{font-size:4.3pt;line-height:2.5mm;color:#444;overflow:hidden}.tt b{display:block;font-size:4.9pt;color:#1f3a6b}'+
   '.ft{position:absolute;left:0;right:0;bottom:0;background:#eef3fb;height:4.2mm;display:flex;align-items:center;justify-content:center;font-size:3.9pt;color:#555}';
  const html='<!doctype html><html><head><meta charset="utf-8"><title>LHS ID Cards ('+rows.length+')</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet"><style>'+css+'</style></head><body><div class="bar"><span>'+rows.length+' card'+(rows.length===1?'':'s')+' · '+sheets.length+' sheet'+(sheets.length===1?'':'s')+' · 8.5 × 13 in, margins None, scale 100%, background graphics ON</span><button id="pb">Print / Save as PDF</button></div>'+sheets.join('')+'<script>document.getElementById("pb").onclick=function(){window.print()};<\/script></body></html>';
  w.document.open();w.document.write(html);w.document.close();
  state.idc={busy:false,error:null};render();
 }catch(e){try{w.close()}catch(_){}state.idc={busy:false,error:e.message||'Could not prepare the ID cards.'};render();}
}

// ===== Class lists (PDF): boys on the LEFT, girls on the RIGHT =====
const gnum=g=>parseInt(String(g).replace(/\D/g,''),10)||0;
function classListScopeOptions(act){
 const grades=[...new Set(act.map(x=>x.grade_level))].sort((a,b)=>gnum(a)-gnum(b)||a.localeCompare(b));
 const classes=[...new Set(act.map(x=>x.grade_level+'|'+x.section))].sort((a,b)=>gnum(a)-gnum(b)||a.localeCompare(b));
 return '<option value="all">All classes ('+classes.length+')</option>'+grades.map(g=>'<option value="g:'+esc(g)+'">All '+esc(g)+'</option>').join('')+
  classes.map(c=>{const [g,sec]=c.split('|');return '<option value="c:'+esc(c)+'">'+esc(g)+' · '+esc(sec)+'</option>';}).join('');
}
function classListsHTML(){
 if(state.role!=='official')return '<div class="notice">Only LSC Officials can export class lists.</div>';
 const act=state.students.filter(x=>x.active),m=act.filter(x=>x.sex==='M').length,f=act.filter(x=>x.sex==='F').length,u=act.length-m-f;
 return header('Class Lists','Export each class as a PDF page with the boys on the left and the girls on the right.')+
 '<div class="card pad"><div class="section-title"><h3>Export class lists</h3></div>'+
 '<div class="two-col" style="margin-top:0"><label class="field">Which classes<select id="clScope">'+classListScopeOptions(act)+'</select></label></div>'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center"><button type="button" class="btn" data-act="clGenerate">Generate class list PDF</button></div>'+
 '<p class="muted small" style="margin-top:12px">A new tab opens. Press <b>Print / Save as PDF</b> (paper 8.5 × 13 in, margins None, background graphics on).</p></div>'+
 '<div class="card pad" style="margin-top:18px"><div class="section-title"><h3>Boys / girls data</h3><span class="muted small">'+m+' boys · '+f+' girls · <b style="color:'+(u?'#b3261e':'#159c79')+'">'+u+' not set</b></span></div>'+
 '<p class="muted small" style="margin-top:0">The system never guesses sex from a name. Students with no sex set are listed separately at the bottom of their class page. To fill it in quickly: download the template, fill the <b>sex</b> column with <b>M</b> or <b>F</b> (Boy/Girl also work), save as CSV, then upload it. You can also set it one by one under Student Directory → Review / Edit.</p>'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px"><button type="button" class="btn btn-secondary" data-act="clTemplate">Download template (CSV)</button>'+
 '<label class="btn btn-secondary" style="cursor:pointer">Upload filled CSV<input type="file" id="clFile" accept=".csv,text/csv" hidden></label><span id="clMsg" class="muted small"></span></div></div>';
}
function csvEsc(v){v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function downloadSexTemplate(){
 const rows=state.students.filter(x=>x.active).sort((a,b)=>gnum(a.grade_level)-gnum(b.grade_level)||a.section.localeCompare(b.section)||a.full_name.localeCompare(b.full_name));
 const csv='student_id,full_name,grade,section,sex\r\n'+rows.map(x=>[x.student_id,x.full_name,x.grade_level,x.section,x.sex||''].map(csvEsc).join(',')).join('\r\n')+'\r\n';
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv'}));a.download='LSC-student-sex-template.csv';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
function parseCsv(t){
 const out=[];let row=[],cur='',q=false;t=t.replace(/^﻿/,'');
 for(let i=0;i<t.length;i++){const c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}
  else if(c==='"')q=true;else if(c===','){row.push(cur);cur='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(x=>x.trim()))out.push(row);row=[];}
  else cur+=c;}
 row.push(cur);if(row.some(x=>x.trim()))out.push(row);return out;
}
async function importSexCsv(file){
 const msg=document.getElementById('clMsg'),say=t=>{if(msg)msg.textContent=t;};
 try{
  const rows=parseCsv(await file.text());if(rows.length<2)throw new Error('The file has no rows.');
  const head=rows[0].map(h=>h.trim().toLowerCase().replace(/\s+/g,'_')),ci=head.indexOf('student_id'),si=head.findIndex(h=>h==='sex'||h==='gender');
  if(ci<0||si<0)throw new Error('The file needs “student_id” and “sex” columns (use the template).');
  const payload=rows.slice(1).map(r=>({student_id:(r[ci]||'').trim(),sex:(r[si]||'').trim()})).filter(x=>x.student_id&&x.sex);
  if(!payload.length)throw new Error('No rows with a sex value were found.');
  if(state.demo){say('Demo mode: nothing was saved.');return;}
  let upd=0,skip=0;
  for(let i=0;i<payload.length;i+=300){say('Saving '+Math.min(i+300,payload.length)+' of '+payload.length+'…');const r=await sb.rpc('lsc_set_student_sex',{p_rows:payload.slice(i,i+300)});if(r.error)throw r.error;upd+=r.data.updated;skip+=r.data.skipped;}
  await loadData();render();
  const m2=document.getElementById('clMsg');if(m2)m2.textContent='Saved '+upd+' students'+(skip?' · '+skip+' rows skipped (unknown ID or sex value)':'')+'.';
 }catch(e){say(e.message||'Could not read that file.');}
}
function generateClassLists(){
 const sel=document.getElementById('clScope')?.value||'all';
 const w=window.open('about:blank','_blank');
 if(!w){toast('Pop-up blocked. Allow pop-ups for this site, then try again.',true);return;}
 const act=state.students.filter(x=>x.active);
 let keys=[...new Set(act.map(x=>x.grade_level+'|'+x.section))].sort((a,b)=>gnum(a)-gnum(b)||a.localeCompare(b));
 if(sel.startsWith('g:'))keys=keys.filter(k=>k.split('|')[0]===sel.slice(2));else if(sel.startsWith('c:'))keys=keys.filter(k=>k===sel.slice(2));
 if(!keys.length){try{w.close()}catch(_){}return toast('No students in that selection.',true);}
 const nm=x=>{const n=String(x.full_name||''),i=n.indexOf(',');return i<0?'<b>'+esc(n.toUpperCase())+'</b>':'<b>'+esc(n.slice(0,i).trim().toUpperCase())+'</b>, '+esc(n.slice(i+1).trim());};
 const li=(x,i)=>'<li><span class="n">'+(i+1)+'.</span><span class="nm">'+nm(x)+'</span><span class="id">'+esc(x.student_id)+'</span></li>';
 const PER=40,pages=[],today=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'long'}).format(new Date());
 let anyUnset=0;
 keys.forEach(k=>{
  const [g,sec]=k.split('|'),cls=state.classes.find(c=>c.grade_level===g&&c.section===sec),all=act.filter(x=>x.grade_level===g&&x.section===sec).sort((a,b)=>a.full_name.toUpperCase().localeCompare(b.full_name.toUpperCase()));
  const boys=all.filter(x=>x.sex==='M'),girls=all.filter(x=>x.sex==='F'),unk=all.filter(x=>x.sex!=='M'&&x.sex!=='F');anyUnset+=unk.length;
  const n=Math.max(1,Math.ceil(Math.max(boys.length,girls.length)/PER)),head='<div class="hd"><div><div class="sch">BULACAN STATE UNIVERSITY · LABORATORY HIGH SCHOOL</div><div class="ttl">CLASS LIST</div></div><div class="cl"><b>'+esc(g)+' · '+esc(sec)+'</b><span>'+esc(state.activeSchoolYearLabel||'')+(cls?.adviser_name?' · Adviser: '+esc(cls.adviser_name):'')+'</span></div></div>';
  for(let p=0;p<n;p++){
   const bs=boys.slice(p*PER,(p+1)*PER),gs=girls.slice(p*PER,(p+1)*PER),last=p===n-1;
   pages.push('<section class="pg">'+head+'<div class="cols"><div class="col"><h3 class="b">BOYS <small>('+boys.length+')</small></h3><ol>'+bs.map((x,i)=>li(x,p*PER+i)).join('')+'</ol></div><div class="col"><h3 class="g">GIRLS <small>('+girls.length+')</small></h3><ol>'+gs.map((x,i)=>li(x,p*PER+i)).join('')+'</ol></div></div>'+
    (last&&unk.length?'<div class="unk"><h3>NO SEX RECORDED <small>('+unk.length+') — set it under Class Lists / Student Directory</small></h3><ul>'+unk.map(x=>'<li><span class="nm">'+nm(x)+'</span><span class="id">'+esc(x.student_id)+'</span></li>').join('')+'</ul></div>':'')+
    '<div class="ft"><span>Boys '+boys.length+' · Girls '+girls.length+(unk.length?' · Not set '+unk.length:'')+' · <b>Total '+all.length+'</b></span><span>Printed '+esc(today)+(n>1?' · page '+(p+1)+' of '+n:'')+'</span></div></section>');
  }
 });
 const css='@page{size:8.5in 13in;margin:0}*{box-sizing:border-box}body{margin:0;background:#dfe5ef;font-family:Poppins,system-ui,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
  '.bar{position:sticky;top:0;z-index:9;display:flex;gap:12px;align-items:center;justify-content:center;padding:12px;background:#0d1b33;color:#fff;font-size:14px}.bar button{background:#e3a21a;border:0;border-radius:10px;padding:10px 20px;font:700 14px Poppins,sans-serif;cursor:pointer}'+
  '.pg{position:relative;width:8.5in;height:13in;margin:16px auto;background:#fff;padding:14mm 13mm 16mm;page-break-after:always;break-after:page;overflow:hidden}'+
  '@media print{body{background:#fff}.bar{display:none}.pg{margin:0}.pg:last-child{page-break-after:auto;break-after:auto}}'+
  '.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.8mm solid #1f3a6b;padding-bottom:3mm;margin-bottom:4mm}.sch{font-size:7.5pt;font-weight:600;letter-spacing:.6px;color:#1f3a6b}.ttl{font-size:17pt;font-weight:800;letter-spacing:1px}.cl{text-align:right}.cl b{display:block;font-size:15pt;color:#1f3a6b}.cl span{font-size:8pt;color:#555}'+
  '.cols{display:grid;grid-template-columns:1fr 1fr;gap:6mm}h3{margin:0 0 2mm;font-size:10pt;letter-spacing:1.5px;padding:1.6mm 2.4mm;border-radius:1.2mm;color:#fff}h3 small{font-weight:500;letter-spacing:0}.b{background:#2f5fbf}.g{background:#c0407b}'+
  'ol,ul{list-style:none;margin:0;padding:0}li{display:flex;align-items:baseline;gap:1.6mm;height:6.05mm;border-bottom:.2mm solid #e3e8f1;font-size:8.6pt;white-space:nowrap}li .n{width:6mm;text-align:right;color:#777;flex:none}li .nm{flex:1;overflow:hidden;text-overflow:ellipsis}li .id{font-size:6.6pt;color:#8a94a8;flex:none}'+
  '.unk{margin-top:5mm;padding:2.5mm;border:.4mm dashed #b3261e;border-radius:1.5mm}.unk h3{background:none;color:#b3261e;padding:0 0 1.5mm;font-size:8.5pt}.unk ul{columns:2;column-gap:6mm}.unk li{height:5.2mm;font-size:8pt}'+
  '.ft{position:absolute;left:13mm;right:13mm;bottom:7mm;display:flex;justify-content:space-between;font-size:7.5pt;color:#555;border-top:.3mm solid #c9d3e6;padding-top:2mm}';
 const html='<!doctype html><html><head><meta charset="utf-8"><title>LHS Class Lists</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"><style>'+css+'</style></head><body><div class="bar"><span>'+keys.length+' class'+(keys.length===1?'':'es')+' · '+pages.length+' page'+(pages.length===1?'':'s')+' · 8.5 × 13 in, margins None'+(anyUnset?' · <b style="color:#ffb4ae">'+anyUnset+' student(s) have no sex recorded</b>':'')+'</span><button id="pb">Print / Save as PDF</button></div>'+pages.join('')+'<script>document.getElementById("pb").onclick=function(){window.print()};<\/script></body></html>';
 w.document.open();w.document.write(html);w.document.close();
}
function correctionsHTML(){
 const isOff=state.role==='official',C=state.corr,list=[...(C.data||[])].sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1));
 const pending=list.filter(x=>x.status==='pending').length;
 const mine=state.students.filter(x=>x.active&&(isOff||!state.classId||x.class_id===state.classId)).sort((a,b)=>a.full_name.localeCompare(b.full_name));
 const today=todayPH();
 const form='<div class="card pad"><div class="section-title"><h3>Request a correction</h3></div>'+
 '<form id="corrForm" class="stack"><div class="two-col" style="margin-top:0">'+
 '<label class="field">Student<input name="student" list="corrStudents" placeholder="Type name or ID" autocomplete="off" required><datalist id="corrStudents">'+mine.map(x=>'<option value="'+esc(x.student_id)+'">'+esc(x.full_name)+'</option>').join('')+'</datalist></label>'+
 '<label class="field">What needs fixing?<select name="kind" id="corrKind"><option value="ADD_IN">'+CORR_KIND.ADD_IN+'</option><option value="ADD_OUT">'+CORR_KIND.ADD_OUT+'</option><option value="REMOVE">'+CORR_KIND.REMOVE+'</option></select></label>'+
 '<label class="field">Date<input type="date" name="date" value="'+today+'" max="'+today+'" required></label>'+
 '<label class="field" id="corrTimeWrap">Time (PHT)<input type="time" name="time" required></label>'+
 '<label class="field" id="corrEventWrap" hidden>Scan to remove<select name="event_id" id="corrEvent"><option value="">Press “Load scans” first</option></select></label>'+
 '</div><label class="field">Reason<input name="reason" maxlength="300" placeholder="e.g. Scanner was offline, student arrived at 6:50" required></label>'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn btn-secondary" id="corrLoadBtn" data-act="corrLoadEvents" hidden>Load scans</button><button class="btn" type="submit"'+(C.busy?' disabled':'')+'>'+(isOff?'Add correction':'Submit for approval')+'</button></div></form>'+
 '<p class="muted small" style="margin-top:12px">'+(isOff?'As an official your request is saved as pending until you approve it below.':'An LSC Official will review your request. You can see its status here.')+'</p></div>';
 const rows=list.length?'<div class="table-wrap"><table class="table"><thead><tr><th>Student</th><th>Request</th><th>Reason</th><th>Status</th>'+(isOff?'<th>Action</th>':'')+'</tr></thead><tbody>'+
 list.map(c=>'<tr><td><strong>'+esc(c.full_name)+'</strong><br><span class="muted small mono">'+esc(c.student_id)+' · '+esc(c.grade_level)+' '+esc(c.section)+'</span></td><td>'+corrDesc(c)+'<br><span class="muted small">by '+esc(c.requested_by_email||'')+' · '+esc(datePH(c.requested_at))+'</span></td><td>'+esc(c.reason)+(c.decision_note?'<br><span class="muted small">Note: '+esc(c.decision_note)+'</span>':'')+'</td><td><span class="badge '+(c.status==='approved'?'':'off')+'">'+(c.status==='pending'?'Pending':c.status==='approved'?'Approved':'Rejected')+'</span>'+(c.decided_by_email?'<br><span class="muted small">'+esc(c.decided_by_email)+'</span>':'')+'</td>'+
  (isOff?'<td>'+(c.status==='pending'?'<button type="button" class="btn" data-act="corrApprove" data-id="'+esc(c.id)+'">Approve</button> <button type="button" class="linkbtn" data-act="corrReject" data-id="'+esc(c.id)+'">Reject</button>':'')+'</td>':'')+'</tr>').join('')+'</tbody></table></div>':'<div class="empty">No correction requests yet.</div>';
 return header(isOff?'Correction Requests':'Corrections',isOff?'Review requests from class mayors. Approved fixes are applied to attendance and kept in the audit trail.':'Missed or wrong scan? Request a fix and an LSC Official will approve it.')+
 (C.error?'<div class="notice warn">'+esc(C.error)+'</div>':'')+
 '<div class="stack">'+tgLinkCard()+form+'<div class="card pad"><div class="section-title"><h3>'+(isOff?'Requests':'Your section’s requests')+'</h3><span class="muted small">'+(pending?pending+' pending':'none pending')+'</span></div>'+rows+'</div></div>';
}
async function submitCorrection(form){
 const f=form.elements,kind=f.kind.value;
 const body={p_student_id:f.student.value.trim(),p_kind:kind,p_date:f.date.value,p_time:kind==='REMOVE'?null:f.time.value,p_event_id:kind==='REMOVE'?(Number(f.event_id.value)||null):null,p_reason:f.reason.value.trim()};
 if(kind==='REMOVE'&&!body.p_event_id)return toast('Press “Load scans” and choose the scan to remove.',true);
 try{
  if(state.demo){
   const st=state.students.find(x=>x.student_id===body.p_student_id);if(!st)throw new Error('Student not found in your section');
   state.corr.data.unshift({id:Date.now(),kind,status:'pending',event_date:body.p_date,event_time:body.p_time,reason:body.p_reason,requested_by_email:state.user.email,requested_at:new Date().toISOString(),student_id:st.student_id,full_name:st.full_name,grade_level:st.grade_level,section:st.section});
  }else{const r=await sb.rpc('lsc_request_correction',body);if(r.error)throw r.error;await loadCorrections();}
  toast(state.role==='official'?'Correction saved as pending.':'Request sent to the LSC Officials.');
  form.reset();render();
 }catch(err){toast('Could not send: '+(err.message||err),true);}
}
async function corrLoadEvents(){
 const form=document.getElementById('corrForm');if(!form)return;
 const sid=form.elements.student.value.trim(),date=form.elements.date.value,sel=document.getElementById('corrEvent');
 if(!sid||!date)return toast('Enter the student and date first.',true);
 try{
  let rows;
  if(state.demo){const st=state.students.find(x=>x.student_id===sid);rows=state.logs.filter(l=>st&&l.student_id===st.id&&l.event_date===date).map(l=>({id:l.id,event_type:l.event_type,recorded_at:l.recorded_at}));}
  else{const r=await sb.rpc('lsc_student_day_events',{p_student_id:sid,p_date:date});if(r.error)throw r.error;rows=r.data||[];}
  sel.innerHTML=rows.length?rows.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.event_type)+' · '+esc(timePH(x.recorded_at))+'</option>').join(''):'<option value="">No scans on that day</option>';
 }catch(err){toast('Could not load scans: '+(err.message||err),true);}
}
async function decideCorrection(id,approve){
 let note='';
 if(!approve){note=prompt('Reason for rejecting (optional):')??null;if(note===null)return;}
 else if(!confirm('Approve and apply this correction to the attendance record?'))return;
 try{
  if(state.demo){const c=state.corr.data.find(x=>String(x.id)===String(id));if(c){c.status=approve?'approved':'rejected';c.decision_note=note;c.decided_by_email=state.user.email;}}
  else{const r=await sb.rpc('lsc_decide_correction',{p_id:Number(id),p_approve:approve,p_note:note});if(r.error)throw r.error;await loadCorrections();await loadData();}
  toast(approve?'Correction applied.':'Request rejected.');
 }catch(err){toast('Could not save: '+(err.message||err),true);}
 render();
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
function schoolYearsHTML(){
 if(state.role!=='official')return '<div class="notice">LSC Official access required.</div>';
 if(state.demo)return header('School Year Management','Manage academic years and preserved attendance history.')+'<div class="notice warn">School Year Management is available to signed-in LSC Officials only. Demo Mode does not save school-year changes.</div>';
 const active=state.schoolYears.find(y=>y.status==='active'),preview=state.yearPreview;
 const dateRange=y=>(y.starts_on||y.ends_on)?esc(y.starts_on||'—')+' → '+esc(y.ends_on||'—'):'Dates not set';
 const badge=y=>'<span class="badge '+(y.status==='active'?'':y.status==='draft'?'out':'off')+'">'+esc(y.status.toUpperCase())+'</span>';
 const yearRows=state.schoolYears.map(y=>'<tr><td><strong>'+esc(y.label)+'</strong></td><td>'+dateRange(y)+'</td><td>'+badge(y)+'</td><td>'+Number(y.active_students||0)+' / '+Number(y.student_count||0)+'</td><td>'+Number(y.class_count||0)+'</td><td>'+Number(y.attendance_events||0)+'</td><td>'+'<button class="linkbtn" data-act="viewSchoolYearRoster" data-id="'+esc(y.id)+'">View roster</button> '+(y.status==='draft'?'<button class="linkbtn" data-act="previewSchoolYear" data-id="'+esc(y.id)+'">Preview rollover</button>':'')+'</td></tr>').join('');
 return header('School Year Management','Create the next academic year, review promotions, and keep each year’s roster and attendance history.', '<button class="btn btn-secondary" data-act="refreshSchoolYears">↻ Refresh</button>')+
 '<div class="card pad" style="margin-bottom:18px"><div class="eyebrow">CURRENT SCHOOL YEAR</div><div class="section-title" style="margin-top:8px"><h2>'+esc(active?.label||'No active school year')+'</h2>'+badge(active||{status:'closed'})+'</div><p class="muted small">'+(active?dateRange(active):'Create a school year draft and activate it after checking the transition preview.')+'</p><div class="toolbar" style="margin-top:18px"><span class="tag">'+Number(active?.active_students||0)+' active students</span><span class="tag">'+Number(active?.class_count||0)+' classes</span><span class="tag">'+Number(active?.attendance_events||0)+' saved attendance events</span></div>'+(active?'<form id="activeYearDatesForm" class="toolbar" style="margin-top:18px"><input type="hidden" name="year_id" value="'+esc(active.id)+'"><label class="field">School year start<input type="date" name="starts_on" value="'+esc(active.starts_on||'')+'" required></label><label class="field">School year end<input type="date" name="ends_on" value="'+esc(active.ends_on||'')+'" required></label><button class="btn btn-secondary" type="submit">Save Current Year Dates</button></form>':'')+'</div>'+
 '<div class="two-col" style="margin-top:0;grid-template-columns:1fr 1.35fr;align-items:start"><div class="card pad"><div class="section-title"><h3>Create School Year</h3></div><form id="schoolYearForm" class="stack"><label class="field">School year label<input name="label" required maxlength="30" placeholder="2027-2028" pattern="[0-9]{4}-[0-9]{4}"></label><div class="field-row"><label class="field">Start date<input type="date" name="starts_on" required></label><label class="field">End date<input type="date" name="ends_on" required></label></div><button class="btn" type="submit">+ Create Draft Year</button></form><div class="notice" style="margin-top:18px">Creating a draft does not change attendance or student enrollment. You can preview the rollover before activating it.</div></div>'+
 '<div class="card pad"><div class="section-title"><h3>School Year History</h3><span class="muted small">'+state.schoolYears.length+' year(s)</span></div><div class="table-wrap"><table class="table"><thead><tr><th>School Year</th><th>Dates</th><th>Status</th><th>Active / Total</th><th>Classes</th><th>Events</th><th>Action</th></tr></thead><tbody>'+yearRows+'</tbody></table></div>'+(state.schoolYears.length?'':'<div class="empty">No school years registered.</div>')+'</div></div>'+
 (preview?'<div class="card pad" style="margin-top:18px"><div class="section-title"><div><div class="eyebrow">ROLLOVER PREVIEW</div><h2 style="margin-top:5px">'+esc(preview.target_year?.label||'Selected year')+'</h2></div><span class="badge out">DRAFT · NOT ACTIVE</span></div><p class="muted small">Current: '+esc(preview.current_year?.label||'—')+' → Next: '+esc(preview.target_year?.label||'—')+'</p><div class="stats" style="margin-top:18px">'+[['Students in current roster',preview.student_count],['Active students',preview.active_students],['Students advancing grades',preview.students_to_promote],['Grade 10 completers',preview.grade_10_completers],['Classes to create',preview.classes_to_create],['Incoming Grade 7 section templates',preview.incoming_grade_7_sections],['Class Mayor assignments to reset',preview.class_mayor_assignments_to_reset],['Attendance volunteer permissions to disable',preview.attendance_volunteers_to_disable]].map(x=>'<div class="stat"><div class="stat-label">'+esc(x[0])+'</div><div class="stat-num">'+Number(x[1]||0)+'</div></div>').join('')+'</div>'+(preview.unmapped_students?'<div class="notice warn" style="margin-top:18px">'+Number(preview.unmapped_students)+' student(s) are not assigned to a class in the current year. Fix the roster before activation.</div>':'<div class="notice" style="margin-top:18px">No unassigned students detected. Grade 7–9 students advance one grade; Grade 10 completers are archived as inactive; new Grade 7 sections are created from the current Grade 7 section names. Class Mayor assignments are cleared for reassignment, and temporary attendance volunteer access is disabled.</div>')+'<div class="notice warn" style="margin-top:12px">Starting the year closes the current year, updates student enrollments, and cannot be undone from this screen. Existing attendance events and archived year rosters are retained.</div><div class="form-actions" style="margin-top:18px"><button type="button" class="btn btn-secondary" data-act="clearYearPreview">Close Preview</button><button type="button" class="btn" data-act="startSchoolYear" data-id="'+esc(preview.target_year?.id||'')+'" '+(preview.unmapped_students?'disabled':'')+'>Activate '+esc(preview.target_year?.label||'Next Year')+'</button></div></div>':'')+
 (state.yearRoster?'<div class="card pad" style="margin-top:18px"><div class="section-title"><div><div class="eyebrow">ARCHIVED YEAR ROSTER</div><h2 style="margin-top:5px">'+esc(state.yearRoster.school_year?.label||'Selected Year')+'</h2><p class="muted small">'+state.yearRoster.roster.length+' saved enrollment record(s) · read only</p></div><div class="form-actions"><button type="button" class="btn btn-secondary" data-act="closeYearRoster">Close</button><button type="button" class="btn btn-secondary" data-act="exportYearRoster">↓ Export CSV</button></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Student ID</th><th>Full Name</th><th>Grade</th><th>Section</th><th>Status</th></tr></thead><tbody>'+state.yearRoster.roster.map(e=>'<tr><td class="mono strong">'+esc(e.student_number)+'</td><td>'+esc(e.full_name)+'</td><td>'+esc(e.grade_level)+'</td><td>'+esc(e.section)+'</td><td><span class="badge '+(e.active?'':'off')+'">'+(e.active?'Active at year close':'Inactive')+'</span></td></tr>').join('')+'</tbody></table></div></div>':'')+
 '<div class="notice" style="margin-top:18px"><strong>Rollover rules:</strong> Student IDs and portraits are retained. Attendance events keep the student name, grade, section, and school year recorded at the time. Existing classes are copied into the new year with their portrait folder settings; Grade 7–9 students advance, Grade 10 completers are deactivated, and Grade 7 section templates are recreated without student assignments.</div>';
}
async function updateActiveYearDates(form){
 if(state.role!=='official'||state.demo)return toast('LSC Official access required.',true);
 const yearId=form.elements.year_id.value,starts_on=form.elements.starts_on.value,ends_on=form.elements.ends_on.value;
 const btn=form.querySelector('button[type=submit]');btn.disabled=true;
 try{
  if(!starts_on||!ends_on||ends_on<starts_on)throw new Error('Enter a valid start and end date.');
  const {error}=await sb.rpc('lsc_school_year_update_dates',{p_year_id:yearId,p_starts_on:starts_on,p_ends_on:ends_on});
  if(error)throw error;
  await loadData();render();toast('Current school year dates saved.');
 }catch(e){toast(e.message||'Unable to update school year dates.',true);}
 finally{btn.disabled=false;}
}
async function createSchoolYear(form){
 if(state.role!=='official'||state.demo)return toast('Use a signed-in LSC Official account to manage school years.',true);
 const label=form.elements.label.value.trim(),starts_on=form.elements.starts_on.value,ends_on=form.elements.ends_on.value;
 const btn=form.querySelector('button[type=submit]');btn.disabled=true;
 try{
  if(!/^\d{4}-\d{4}$/.test(label))throw new Error('Use a label like 2027-2028.');
  if(!starts_on||!ends_on||ends_on<starts_on)throw new Error('Enter a valid start and end date.');
  const {data,error}=await sb.rpc('lsc_school_year_create',{p_label:label,p_starts_on:starts_on,p_ends_on:ends_on});
  if(error)throw error;
  state.yearPreview=null;await loadData();render();toast('Draft school year '+label+' created.');
 }catch(e){toast(e.message||'Unable to create school year.',true);}
 finally{btn.disabled=false;}
}
async function loadSchoolYearRoster(id){
 try{
  const {data,error}=await sb.rpc('lsc_school_year_roster',{p_year_id:id});
  if(error)throw error;
  state.yearRoster=data;render();
 }catch(e){toast(e.message||'Unable to load the saved year roster.',true);}
}
function exportSchoolYearRoster(){
 if(!state.yearRoster?.roster?.length)return toast('No roster entries to export.',true);
 const rows=[['School Year','Student ID','Full Name','Grade Level','Section','Active at Year Close'],
  ...state.yearRoster.roster.map(r=>[state.yearRoster.school_year?.label||'',r.student_number,r.full_name,r.grade_level,r.section,r.active?'Yes':'No'])];
 const csv='\\uFEFF'+rows.map(row=>row.map(toCsvCell).join(',')).join('\\r\\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 a.download='LSC-Roster-'+(state.yearRoster.school_year?.label||'School-Year')+'.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function previewSchoolYear(id){
 try{const {data,error}=await sb.rpc('lsc_school_year_preview',{p_year_id:id});if(error)throw error;state.yearPreview=data;render();}
 catch(e){toast(e.message||'Unable to preview this school year.',true);}
}
async function startSchoolYear(id){
 if(state.role!=='official'||state.demo)return toast('LSC Official access required.',true);
 const year=state.schoolYears.find(y=>y.id===id);
 if(!year||year.status!=='draft')return toast('Select a draft school year.',true);
 if(!state.yearPreview||state.yearPreview.target_year?.id!==id)return toast('Preview the selected year first.',true);
 if(state.yearPreview.unmapped_students>0)return toast('Resolve unassigned students before activation.',true);
 const warning='Activate school year '+year.label+'?\n\nThis closes '+(state.yearPreview.current_year?.label||'the current year')+', promotes continuing students, archives Grade 10 completers, clears Class Mayor assignments and disables attendance volunteer permissions. Existing attendance is preserved.\n\nThis action cannot be undone from the dashboard.';
 if(!confirm(warning))return;
 const btn=document.querySelector('[data-act="startSchoolYear"]');if(btn)btn.disabled=true;
 try{
  const {data,error}=await sb.rpc('lsc_school_year_start',{p_year_id:id});if(error)throw error;
  state.yearPreview=null;state.recordSchoolYearId=null;await loadData();render();
  toast('School year '+data.active_year+' is now active. '+data.promoted_students+' student profiles advanced.');
 }catch(e){toast(e.message||'Unable to activate the school year.',true);if(btn)btn.disabled=false;}
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

function labelTables(){
 document.querySelectorAll('table.table').forEach(t=>{
  const h=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim());
  t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(h[i]&&!td.hasAttribute('colspan'))td.setAttribute('data-label',h[i]);}));
 });
}
function render(){
 document.body.classList.toggle('lsc-menu-open',Boolean(state.user&&state.mobileNav));
 if(!state.user){state.mobileNav=false;lastAnimatedPage=null;root.innerHTML=loginHTML();return;}
 if((['students','classes','officials','live','settings'].includes(state.page)&&state.role!=='official')||state.page==='kiosk')state.page='overview';
 const newPage=lastAnimatedPage!==state.page;
 root.innerHTML=appHTML();
 labelTables();
 if(newPage){
   root.querySelector('.content')?.classList.add('page-enter');
   lastAnimatedPage=state.page;
 }
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
 state.assignments.map(a=>'<tr><td>'+esc(a.email)+'</td><td><span class="badge '+(a.role==='class_mayor'?'out':'')+'">'+esc(a.display_title||(a.role==='official'?'LSC Official':'Class Mayor'))+'</span></td><td>'+esc(a.class_id?classTitle(a.class_id):'Whole School')+'</td><td>'+(a.user_id===state.user?.id?'—':'<button type="button" class="linkbtn" data-act="revokeRole" data-id="'+esc(a.user_id)+'">Revoke</button>')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No assignments have been made.</div>')+
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
 '<label class="field">Sex (for boys / girls class lists)<select name="sex"><option value="">Not set</option><option value="M"'+(student?.sex==='M'?' selected':'')+'>Boy</option><option value="F"'+(student?.sex==='F'?' selected':'')+'>Girl</option></select></label>'+
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
  class_id:cls.id,grade_level:cls.grade_level,section:cls.section,school_year_id:existing?.school_year_id||state.activeSchoolYearId,
  active:form.elements.active.value==='true',sex:form.elements.sex.value||null,
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
 const value={grade_level:form.elements.grade_level.value.trim(),section:form.elements.section.value.trim(),school_year_id:state.activeSchoolYearId};
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
 const body=[['School Year','Student ID','Full Name','Grade Level','Section','Date','Event','Time PHT','Recorded By Email','Recorded By Role','Recorder User ID'],...rows.map(l=>{const s=getStudent(l),year=state.schoolYears.find(y=>y.id===l.school_year_id);return [year?.label||state.activeSchoolYearLabel,s.student_id,s.full_name,s.grade_level,s.section,l.event_date,l.event_type,timePH(l.recorded_at),l.recorded_by_email||'',l.recorded_by_role||'Legacy (not captured)',l.recorded_by||''];})];
 const csv='\uFEFF'+body.map(row=>row.map(toCsvCell).join(',')).join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='LSC-Attendance-'+(state.schoolYears.find(y=>y.id===state.recordSchoolYearId)?.label||state.recordDate)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
root.addEventListener('submit',async e=>{
 if(e.target.id==='sendEmailForm'){e.preventDefault();await sendEmailOtp(e.target.elements.email.value);}
 if(e.target.id==='verifyEmailForm'){e.preventDefault();await verifyEmailCode(e.target);}
 if(e.target.id==='passwordLoginForm'){e.preventDefault();await loginWithBackup(e.target);}
 if(e.target.id==='backupPasswordForm'){e.preventDefault();await updateBackupPassword(e.target);}
 if(e.target.id==='scanForm'){e.preventDefault();await scan();}
 if(e.target.id==='studentForm'){e.preventDefault();await saveStudent(e.target);}
 if(e.target.id==='classForm'){e.preventDefault();await createClass(e.target);}
 if(e.target.id==='schoolYearForm'){e.preventDefault();await createSchoolYear(e.target);}
 if(e.target.id==='activeYearDatesForm'){e.preventDefault();await updateActiveYearDates(e.target);}
 if(e.target.id==='roleForm'){e.preventDefault();await assignRole(e.target);}
 if(e.target.id==='settingsForm'){e.preventDefault();await saveSettings(e.target);}
 if(e.target.id==='corrForm'){e.preventDefault();await submitCorrection(e.target);}
 if(e.target.id==='filterForm'){e.preventDefault();state.recordDate=e.target.elements.date.value||todayPH();state.query=e.target.elements.search.value.trim();state.recordSchoolYearId=e.target.elements.school_year_id?.value||state.activeSchoolYearId;await loadData();render();}
});
document.addEventListener('click',async e=>{
 const nav=e.target.closest('[data-nav]');
 if(nav){state.page=nav.dataset.nav;state.mobileNav=false;state.query='';if(state.page==='live')await loadLive();if(state.page==='settings')await loadSettings();if(state.page==='corrections')await loadCorrections();if(state.page==='schoolyears')await loadData();if(state.page==='overview'&&state.recordDate!==todayPH()){state.recordDate=todayPH();await loadData();}location.hash=state.page;render();return;}
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
 if(act==='copyJoin'){try{await navigator.clipboard.writeText(state.settings.data.join_code);toast('Join code copied.');}catch{toast('Select the code and copy it manually.',true);}}
 if(act==='regenJoin'&&confirm('Generate a new join code? The old code will stop working for new subscribers.')){
  try{if(state.demo)state.settings.data.join_code='DEMO'+Math.floor(1000+Math.random()*9000);else{const r=await sb.rpc('lsc_regenerate_join_code');if(r.error)throw r.error;state.settings.data.join_code=r.data;}toast('New join code generated.');}catch(err){toast('Could not generate: '+(err.message||err),true);}
  render();}
 if(act==='tgActive'){
  const chat=b.dataset.id,on=b.dataset.active==='1';
  try{if(!state.demo){const r=await sb.rpc('lsc_telegram_set_active',{p_chat_id:Number(chat),p_active:on});if(r.error)throw r.error;}
   const sub=state.settings.data.subscribers.find(x=>String(x.chat_id)===chat);if(sub)sub.active=on;toast(on?'Subscriber restored.':'Subscriber removed.');}catch(err){toast('Could not update: '+(err.message||err),true);}
  render();}
 if(act==='idcGenerate'){await generateIdCards();return;}
 if(act==='clGenerate'){generateClassLists();return;}
 if(act==='clTemplate'){downloadSexTemplate();return;}
 if(act==='refreshLive'){await loadLive();render();}
 if(act==='tgLink'){await makeTgLink();render();}
 if(act==='corrLoadEvents')await corrLoadEvents();
 if(act==='corrApprove')await decideCorrection(b.dataset.id,true);
 if(act==='corrReject')await decideCorrection(b.dataset.id,false);
 if(act==='printMasterlist')window.print();
 if(act==='logout')await logOut();
 if(act==='menu'){
  state.mobileNav=!state.mobileNav;
  document.querySelector('.sidebar')?.classList.toggle('open',state.mobileNav);
  document.body.classList.toggle('lsc-menu-open',state.mobileNav);
  const button=document.querySelector('.hamb');
  if(button)button.setAttribute('aria-expanded',String(state.mobileNav));
 }
 if(act==='closeMenu'){
  state.mobileNav=false;
  document.querySelector('.sidebar')?.classList.remove('open');
  document.body.classList.remove('lsc-menu-open');
  document.querySelector('.hamb')?.setAttribute('aria-expanded','false');
 }
 if(act==='refresh'){await loadData();render();toast('Attendance refreshed.');}
 if(act==='refreshSchoolYears'){await loadData();render();toast('School years refreshed.');}
 if(act==='previewSchoolYear')await previewSchoolYear(b.dataset.id);
 if(act==='viewSchoolYearRoster')await loadSchoolYearRoster(b.dataset.id);
 if(act==='closeYearRoster'){state.yearRoster=null;render();}
 if(act==='exportYearRoster')exportSchoolYearRoster();
 if(act==='startSchoolYear')await startSchoolYear(b.dataset.id);
 if(act==='clearYearPreview'){state.yearPreview=null;render();}
 if(act==='export')exportCsv();
 if(act==='addStudent')studentModal(null);
 if(act==='editStudent')studentModal(state.students.find(s=>s.id===b.dataset.id));
 if(act==='revokeRole')await revokeRole(b.dataset.id);
 if(act==='closeModal')document.querySelector('.modal-backdrop')?.remove();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&state.mobileNav){
  state.mobileNav=false;
  document.querySelector('.sidebar')?.classList.remove('open');
  document.body.classList.remove('lsc-menu-open');
  document.querySelector('.hamb')?.setAttribute('aria-expanded','false');
  document.querySelector('.hamb')?.focus();
 }
});
root.addEventListener('change',e=>{if(e.target.id==='clFile'&&e.target.files?.[0]){const f=e.target.files[0];e.target.value='';void importSexCsv(f);return;}if(e.target.id==='corrKind'){const rm=e.target.value==='REMOVE';document.getElementById('corrTimeWrap').hidden=rm;document.getElementById('corrEventWrap').hidden=!rm;document.getElementById('corrLoadBtn').hidden=!rm;const t=document.querySelector('#corrForm [name=time]');if(t)t.required=!rm;}if(e.target.id==='roleSelect'){const wrap=document.getElementById('roleClassWrap');if(wrap){wrap.hidden=e.target.value==='official';document.getElementById('roleClassSelect').required=e.target.value==='class_mayor';}}});
root.addEventListener('input',e=>{
 if(e.target.id==='studentSearch'){
  state.query=e.target.value;
  const sel=e.target.selectionStart;
  render();
  const next=document.getElementById('studentSearch');next?.focus();next?.setSelectionRange(sel,sel);
 }
});
window.addEventListener('hashchange',async()=>{
 const page=location.hash.slice(1);
 if(['overview','students','live','settings','corrections','masterlist','records','classes','schoolyears','officials','idcards','classlists','security'].includes(page)&&state.user&&page!==state.page){state.page=page;state.query='';if(page==='live')await loadLive();if(page==='settings')await loadSettings();if(page==='corrections')await loadCorrections();render();}
});
setInterval(async()=>{if(state.page==='live'&&state.user&&!document.hidden){await loadLive();if(state.page==='live')render();}},30000);
setInterval(()=>{const c=document.getElementById('clock');if(c)c.textContent=stampPH()+' PHT';},15000);
state.page=['overview','students','live','settings','masterlist','records','classes','schoolyears','officials','security'].includes(location.hash.slice(1))?location.hash.slice(1):'overview';
verifySession().catch(e=>{root.innerHTML=loginHTML();toast('Could not connect to the attendance service: '+e.message,true);});
