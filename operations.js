import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const db=createClient('https://rfxzbuocxersgbshczbj.supabase.co','sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const root=document.getElementById('opsRoot');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const php=n=>'₱'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const ph=n=>new Date(n).toLocaleString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const state={user:null,role:null,scope:null,hub:null,notices:[],rewards:[],volunteers:[],print:[],scans:[],tab:'pulse',busy:false,notice:'',lastRefresh:null,online:navigator.onLine};
const tabs=[['pulse','Event Pulse'],['announcements','Announcements'],['rally','Stamp Rally'],['team','Volunteer Team'],['audit','Audit Center'],['recap','Closing Report']];
const allowed=()=>['official','class_mayor','event_monitor','cashier','ticket_checker'].includes(state.role);
function top(){
 return '<header class="movie-header"><div class="movie-brand"><img src="./assets/lsc-glass-logo.png?v=2" alt="LSC crest">'+
 '<div><strong>Foundation Week Command Center</strong><small>BulSU Laboratory High School · LSC</small></div></div>'+
 '<div class="movie-head-right"><span class="movie-role">'+esc(state.role?.replaceAll('_',' ').toUpperCase())+'</span><a class="movie-return" href="./movie.html">Movie Booth POS</a> · <a class="movie-return" href="./login.html">LSC Login</a></div></header>';
}
function tiles(){
 const h=state.hub||{},shows=h.shows||[];
 const sold=shows.reduce((a,b)=>a+Number(b.sold||0),0),income=shows.reduce((a,b)=>a+Number(b.revenue||0),0),used=shows.reduce((a,b)=>a+Number(b.redeemed||0),0);
 return '<div class="ops-tiles">'+[['Attendance arrivals',h.today_checkins??'Role-limited'],['Passport stamps',h.passport_stamps??'Role-limited'],
 ['Movie tickets sold',sold],['Revenue in scope',php(income)],['Tickets redeemed',used],['Active screenings',shows.filter(x=>x.active).length]]
 .map(([title,val])=>'<div class="ops-tile"><small>'+esc(title)+'</small><strong>'+esc(val)+'</strong></div>').join('')+'</div>';
}
function showRows(){
 return (state.hub?.shows||[]).map(sh=>{
  const remaining=sh.capacity===null?'Uncapped':Math.max(0,Number(sh.capacity)-Number(sh.sold))+' left (check full-school capacity)';
  const percent=sh.capacity?Math.min(100,Math.round(Number(sh.sold)/Number(sh.capacity)*100)):0;
  return '<article class="ops-show"><div><strong>'+esc(sh.title)+'</strong><p>'+esc(sh.show_date)+' · '+
  esc(sh.show_time||'Time not specified')+' · '+(sh.active?'On sale':'Paused')+'</p></div>'+
  '<div class="ops-progress"><div style="width:'+percent+'%"></div></div><p>'+esc(sh.sold)+' sold · '+esc(sh.redeemed)+' admitted · '+remaining+
  ' · '+php(sh.revenue)+'</p></article>';
 }).join('')||'<p class="movie-helper">No movie showings configured yet. Use Movie Setup to create one.</p>';
}
function announcementRows(){
 return (state.notices||[]).map(x=>'<div class="ops-row"><div><strong>'+esc(x.title)+'</strong><p>'+esc(x.message)+'</p><small>'+esc(ph(x.created_at))+' · '+(x.active?'Published':'Hidden')+'</small></div>'+
 (state.role==='official'?'<button class="movie-mini" data-toggle-notice="'+esc(x.id)+'">'+(x.active?'Hide':'Publish')+'</button>':'')+'</div>').join('')||
 '<p class="movie-helper">No official announcements yet.</p>';
}
function rewardRows(){
 return (state.rewards||[]).map(x=>'<div class="ops-row"><div><strong>'+esc(x.title)+'</strong><p>'+esc(x.required_stamps)+' activity stamp(s) required · '+(x.active?'Available':'Paused')+'</p></div>'+
 (state.role==='official'?'<button class="movie-mini" data-toggle-reward="'+esc(x.id)+'">'+(x.active?'Pause':'Resume')+'</button>':'')+'</div>').join('')||'<p class="movie-helper">No school-approved rewards set up yet. The Digital Passport badges still work independently.</p>';
}
function volunteerRows(){
 return (state.volunteers||[]).map(v=>'<div class="ops-row"><div><strong>'+esc(v.email||v.user_id)+'</strong><p>'+esc(v.role)+' · '+(v.enabled?'Enabled':'Disabled')+' · '+esc(v.show_id||'All showings')+'</p></div></div>').join('')||'<p class="movie-helper">No Movie Booth volunteers assigned yet.</p>';
}
function pulse(){
 return '<section class="movie-panel"><div class="movie-panel-head"><h2>Event Pulse</h2><span>Auto-refresh every 30 seconds while online · Private aggregate data</span></div>'+
 tiles()+'<h3>Movie screenings & capacity</h3>'+showRows()+
 '<div class="ops-inline-note">Attendance counts track IN records, not confirmed absences. Event totals are displayed only within your authorized scope; individual student details are never public.</div>'+
 '<h3>Latest official announcements</h3>'+announcementRows()+'</section>';
}
function announcements(){
 return '<section class="movie-panel"><h2>School Event Announcements</h2>'+
 (state.role==='official'?'<form class="ops-form" id="noticeForm"><label>Announcement title<input name="title" required minlength="3" maxlength="120" placeholder="Example: Movie screening update"></label>'+
 '<label>Message<textarea name="message" required minlength="3" maxlength="700" rows="3" placeholder="Write a clear official notice"></textarea></label>'+
 '<button class="movie-btn movie-primary" type="submit">Publish Announcement</button></form>':'')+
 announcementRows()+'</section>';
}
function rally(){
 return '<section class="movie-panel"><h2>Foundation Week Stamp Rally</h2><p class="movie-helper">Rewards use distinct verified activity stamps from the separate Digital Passport database. No public leaderboard or academic grading.</p>'+
 (state.role==='official'?'<div class="ops-two"><form id="rewardForm" class="ops-form"><h3>Add Reward</h3><label>Reward title<input name="title" required minlength="3" maxlength="90" placeholder="Example: Foundation Week Souvenir"></label>'+
 '<label>Stamps required<input name="required_stamps" type="number" min="1" max="40" required value="3"></label><button class="movie-btn movie-primary">Add Reward</button></form>'+
 '<form id="claimForm" class="ops-form"><h3>Verify & Claim Prize</h3><label>Student attendance ID<input name="student_id" required pattern="[0-9]{7,12}" maxlength="12" inputmode="numeric"></label>'+
 '<label>Reward<select name="reward_id" required>'+state.rewards.filter(x=>x.active).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+' ('+x.required_stamps+' stamps)</option>').join('')+'</select></label>'+
 '<button type="submit" class="movie-btn movie-primary">Verify & Record Claim</button></form></div>':'')+
 '<h3>Approved rewards</h3>'+rewardRows()+'</section>';
}
function team(){
 if(state.role!=='official')return '<section class="movie-panel"><h2>Volunteer Team</h2><p>Only LSC Officials can assign volunteer access.</p></section>';
 return '<div class="ops-two"><section class="movie-panel"><h2>Assign Existing Account</h2><p class="movie-helper">Volunteers must already have an account in Supabase Auth. Access is limited to their selected operational role.</p>'+
 '<form class="ops-form" id="teamForm"><label>Existing approved email<input name="email" type="email" required placeholder="volunteer@school.edu.ph"></label>'+
 '<label>Assignment<select name="role"><option value="cashier">Cashier</option><option value="ticket_checker">Ticket Checker</option><option value="event_monitor">Event Monitor</option></select></label>'+
 '<label>Showing assignment<select name="show_id"><option value="">All showings</option>'+
 (state.hub?.shows||[]).map(x=>'<option value="'+esc(x.show_id)+'">'+esc(x.title)+' · '+esc(x.show_date)+'</option>').join('')+'</select></label>'+
 '<label class="ops-check"><input type="checkbox" name="enabled" checked> Access enabled</label>'+
 '<button type="submit" class="movie-btn movie-primary">Save Volunteer Role</button></form></section>'+
 '<section class="movie-panel"><h2>Current Volunteer Accounts</h2>'+volunteerRows()+'</section></div>';
}
function audit(){
 if(state.role!=='official')return '<section class="movie-panel"><h2>Audit Center</h2><p>LSC Official permission required.</p></section>';
 return '<div class="ops-two"><section class="movie-panel"><h2>Recent Ticket Checks</h2>'+
 (state.scans.map(x=>'<div class="ops-row"><div><strong>'+esc(x.result)+' · '+esc(x.code_attempt)+'</strong><p>'+esc(ph(x.scanned_at))+' · operator '+esc(x.performed_by)+'</p></div></div>').join('')||'<p>No ticket scans yet.</p>')+'</section>'+
 '<section class="movie-panel"><h2>Browser Print Requests</h2><p class="movie-helper">These are recorded print-dialog requests, not proof that paper actually printed.</p>'+
 (state.print.map(x=>'<div class="ops-row"><div><strong>Sale '+esc(x.sale_id)+'</strong><p>'+esc(ph(x.requested_at))+' · '+esc(x.note)+'</p></div></div>').join('')||'<p>No print requests recorded yet.</p>')+'</section></div>';
}
function recap(){
 const shows=state.hub?.shows||[],h=state.hub||{};
 return '<section class="movie-panel" id="opsPrintable"><h2>Foundation Week Closing Report</h2>'+
 '<p class="movie-helper">Current authorized scope · Generated '+esc(state.lastRefresh?ph(state.lastRefresh):'—')+'</p>'+
 '<div class="ops-tiles">'+[['Students in scope',h.roster??'N/A'],['Distinct check-ins today',h.today_checkins??'N/A'],['Passport stamps',h.passport_stamps??'N/A'],
 ['Sold movie tickets',shows.reduce((n,s)=>n+Number(s.sold),0)],['Movie revenue',php(shows.reduce((n,s)=>n+Number(s.revenue),0))]]
 .map(([label,val])=>'<div class="ops-tile"><small>'+esc(label)+'</small><strong>'+esc(val)+'</strong></div>').join('')+'</div>'+
 '<h3>Movie activity summary</h3>'+showRows()+
 '<p class="movie-helper">Financial totals exclude voided sales; refunds and physical cash counts must be reconciled separately. This report is a snapshot, not a BIR official tax document.</p>'+
 '<div class="ops-actions"><button class="movie-btn movie-primary" data-act="recap-print">Print A4 / Save PDF</button>'+
 '<button class="movie-btn movie-secondary" data-act="recap-csv">Download Summary CSV</button></div></section>';
}
function render(){
 if(!state.user){root.innerHTML='<div class="movie-signin"><h1>LSC Command Center</h1><p>Authorized account required.</p><a href="./login.html" class="movie-btn movie-primary">Sign in</a></div>';return;}
 const visibleTabs=tabs.filter(x=>(x[0]!=='team'&&x[0]!=='audit')||state.role==='official');
 root.innerHTML=top()+'<main class="movie-main"><div class="movie-title"><div><span>LSC FOUNDATION WEEK · OPERATIONS</span>'+
 '<h1>Event Command <em>Center</em></h1><p>Safe, scoped operational monitoring and volunteer controls</p></div>'+
 '<span class="ops-connection '+(state.online?'online':'offline')+'">'+(state.online?'Online':'OFFLINE — DO NOT RECORD SALES')+'</span></div>'+
 '<nav class="movie-tabs">'+visibleTabs.map(([k,label])=>'<button data-tab="'+k+'" class="'+(state.tab===k?'selected':'')+'">'+label+'</button>').join('')+'</nav>'+
 '<div class="ops-actions"><button data-act="refresh" class="movie-btn movie-secondary">Refresh Data</button><span class="movie-helper">Last sync: '+(state.lastRefresh?ph(state.lastRefresh):'not yet loaded')+'</span></div>'+
 (state.notice?'<div role="status" class="movie-alert">'+esc(state.notice)+'</div>':'')+
 (state.tab==='pulse'?pulse():state.tab==='announcements'?announcements():state.tab==='rally'?rally():state.tab==='team'?team():state.tab==='audit'?audit():recap())+
 '<footer class="movie-footer">Powered by Azure&lt;3 · School approval required · Private staff access</footer></main>';
}
async function load(){
 if(!state.user)return;
 const [h,n,r]=await Promise.all([
 db.rpc('lsc_fw_operations'),
 db.from('lsc_fw_announcements').select('id,title,message,active,created_at').order('created_at',{ascending:false}).limit(60),
 db.from('lsc_fw_rewards').select('id,title,required_stamps,active').order('required_stamps').limit(60)
 ]);
 if(h.error)throw h.error;
 state.hub=h.data;state.notices=n.data||[];state.rewards=r.data||[];
 if(state.role==='official'){
 const [v,s,p]=await Promise.all([
  db.rpc('lsc_movie_list_volunteers'),
  db.from('lsc_movie_ticket_scans').select('result,code_attempt,performed_by,scanned_at').order('scanned_at',{ascending:false}).limit(75),
  db.from('lsc_movie_print_log').select('sale_id,note,requested_at').order('requested_at',{ascending:false}).limit(75)
 ]);
 state.volunteers=v.data||[];state.scans=s.data||[];state.print=p.data||[];
 }
 state.lastRefresh=new Date().toISOString();state.online=navigator.onLine;state.notice='';
}
async function refresh(){
 if(!navigator.onLine){state.online=false;state.notice='No internet. Data is read-only until you reconnect; no offline sales or ticket redemptions will be invented.';render();return;}
 try{await load();render()}catch(e){state.notice='Could not load operations: '+e.message;render()}
}
function csv(rows,name){
 const cell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
 const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
async function runRpc(fn,args){
 if(!navigator.onLine){state.notice='Offline: changes blocked. Reconnect and verify state before retrying.';render();return}
 if(state.busy)return;state.busy=true;
 try{
 const {data,error}=await db.rpc(fn,args);if(error)throw error;
 await load();state.notice='Saved successfully'+(data?.status?' · '+data.status:'')+(data?.difference!==undefined?' · cash difference: '+php(data.difference):'');render();
 }catch(e){state.notice='Unable to save: '+e.message;render()}
 finally{state.busy=false}
}
document.addEventListener('click',async e=>{
 const t=e.target.closest('[data-tab],[data-act],[data-toggle-notice],[data-toggle-reward]');if(!t)return;
 if(t.dataset.tab){state.tab=t.dataset.tab;render();return}
 if(t.dataset.toggleNotice){await runRpc('lsc_fw_manage_notice',{p_action:'toggle',p_id:t.dataset.toggleNotice});return}
 if(t.dataset.toggleReward){await runRpc('lsc_fw_manage_reward',{p_action:'toggle',p_id:t.dataset.toggleReward});return}
 const act=t.dataset.act;
 if(act==='refresh')await refresh();
 if(act==='recap-print')window.print();
 if(act==='recap-csv'){
  const h=state.hub||{},shows=h.shows||[];
  csv([['Metric','Value'],['Roster',h.roster],['Check-ins today',h.today_checkins],['Passport stamps',h.passport_stamps],
   ...shows.flatMap(s=>[[s.title+' tickets sold',s.sold],[s.title+' revenue PHP',s.revenue],[s.title+' redeemed',s.redeemed]])],
  'LSC-Foundation-Week-Closing-Report.csv');
 }
});
document.addEventListener('submit',async e=>{
 if(!['noticeForm','rewardForm','claimForm','teamForm'].includes(e.target.id))return;
 e.preventDefault();const f=e.target;
 if(f.id==='noticeForm')await runRpc('lsc_fw_manage_notice',{p_action:'create',p_title:f.elements.title.value,p_message:f.elements.message.value});
 if(f.id==='rewardForm')await runRpc('lsc_fw_manage_reward',{p_action:'create',p_title:f.elements.title.value,p_stamps:Number(f.elements.required_stamps.value)});
 if(f.id==='claimForm')await runRpc('lsc_fw_manage_reward',{p_action:'claim',p_id:f.elements.reward_id.value,p_student_number:f.elements.student_id.value});
 if(f.id==='teamForm')await runRpc('lsc_movie_assign_volunteer',{p_email:f.elements.email.value,p_role:f.elements.role.value,p_show_id:f.elements.show_id.value||null,p_enabled:f.elements.enabled.checked});
});
async function start(){
 try{
 const {data:{user},error}=await db.auth.getUser();if(error||!user){render();return}
 const {data:ctx,error:bad}=await db.rpc('lsc_movie_context');
 if(bad||!ctx){render();return}
 state.user=user;state.role=ctx.role;state.scope=ctx.scope_id;await refresh();
 }catch(e){state.notice=e.message;render()}
}
window.addEventListener('online',()=>{state.online=true;refresh()});
window.addEventListener('offline',()=>{state.online=false;state.notice='Offline: checkout and redemption must remain paused.';render()});
setInterval(()=>{if(document.visibilityState==='visible'&&state.user&&navigator.onLine)refresh()},30000);
start();
