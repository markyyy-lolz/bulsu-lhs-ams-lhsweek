import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const db=createClient('https://rfxzbuocxersgbshczbj.supabase.co','sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const root=document.getElementById('scannerRoot');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const php=n=>'₱'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const ph=n=>new Date(n).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});
const state={user:null,authorized:false,role:'',code:'',result:null,notice:'',loading:true,busy:false,offline:!navigator.onLine,camera:false,scanner:null};
function showResult(){
 const r=state.result;
 if(!r)return '<div class="reserve-empty scanner-empty"><strong>Ready to verify reservations</strong><p>Scan a student reservation QR or enter its reference code.</p></div>';
 const labels={RESERVED:'✓ RESERVED · NOT YET PAID',CONVERTED:'✓ PAID AT BOOTH',EXPIRED:'⌛ RESERVATION EXPIRED',CANCELLED:'✕ BOOKING CANCELLED',NOT_FOUND:'✕ NOT FOUND'};
 const rows=r.status==='NOT_FOUND'?'<p>Reservation reference not found.</p>':
  '<div class="scanner-result-body"><strong>'+esc(r.title)+'</strong>'+
  '<span>Date: '+esc(r.show_date)+(r.show_time?' · '+esc(String(r.show_time).slice(0,5))+' PHT':'')+'</span>'+
  '<span>Venue: '+esc(r.venue||'Ask at the booth')+'</span>'+
  '<span>Student ID: '+esc(r.student_id_masked||'Masked')+'</span>'+
  '<span>Reserved tickets: '+esc(r.quantity)+'</span>'+
  '<span>Amount: '+php(r.total_due_php)+'</span>'+
  '<span>Hold expires: '+esc(ph(r.expires_at))+' PHT</span>'+
  '<span class="scanner-code">'+esc(r.code)+'</span></div>';
 const hint=r.status==='RESERVED'?'Not yet paid. Direct the student to the cashier with the reference and Student ID.':
  r.status==='CONVERTED'?'Already paid. Ask for the separate PAID admission ticket QR. Do not charge again.':
  'No valid reserved admission. Ask an LSC Official to check the booking.';
 return '<div class="scanner-result '+esc(r.status)+'"><div class="scanner-status">'+esc(labels[r.status]||r.status)+'</div>'+rows+'</div>'+
 '<div class="reserve-note"><strong>Next step:</strong> '+esc(hint)+' This QR is not an admission ticket.</div>';
}
function render(){
 let main='';
 if(state.loading){
  main='<section class="reserve-panel"><p>Checking staff authorization…</p></section>';
 }else if(!state.authorized){
  main='<section class="reserve-panel"><h2>Authorized Volunteers Only</h2>'+
  '<p class="sub">Sign in using your LSC Official, Class Mayor, authorized attendance volunteer, or Movie Booth volunteer account. This is not a public student lookup.</p>'+
  '<div class="scanner-links"><a class="reserve-button reserve-primary" href="./login.html">LSC Staff Login</a>'+
  '<a class="reserve-button reserve-secondary" href="./movie.html">Movie Volunteer Login</a></div>'+
  (state.notice?'<div class="reserve-alert" role="alert">'+esc(state.notice)+'</div>':'')+'</section>';
 }else{
  const notice=(state.notice?'<div class="reserve-alert" role="status">'+esc(state.notice)+'</div>':'');
  main='<div class="scanner-layout"><section class="reserve-panel">'+
   '<div class="scanner-operator"><small>AUTHORIZED STATION</small><strong>'+esc(state.role.replaceAll('_',' '))+'</strong><span>'+esc(state.user?.email||'Approved LSC Volunteer')+'</span></div>'+
   '<h2>Scan Student Reservation</h2><p class="sub">Scan the student’s reservation QR with the camera or type the RSV code. Read-only verification; payment happens at the cashier.</p>'+
   (state.offline?'<div class="reserve-alert">Offline: verification paused until reconnect.</div>':'')+notice+
   '<div class="scanner-camera-controls"><button type="button" class="reserve-button reserve-primary" data-scan="start"'+(state.camera||state.offline?' disabled':'')+'>Start QR Camera</button>'+
   '<button type="button" class="reserve-button reserve-secondary" data-scan="stop"'+(!state.camera?' disabled':'')+'>Stop Camera</button></div>'+
   '<div id="scannerCamera" class="scanner-camera"'+(!state.camera?' hidden':'')+'><div id="qrScannerReader"></div></div>'+
   '<form class="reserve-form" id="scannerLookupForm"><label>Reservation reference<input id="scannerCode" name="code" maxlength="20" autocomplete="off" spellcheck="false" required value="'+esc(state.code)+'" placeholder="RSV-XXXXXXXXXXXXXXXX"></label>'+
   '<button type="submit" class="reserve-button reserve-primary full"'+(state.busy||state.offline?' disabled':'')+'>'+(state.busy?'Checking…':'Find Reservation')+'</button></form>'+
   '<p class="reserve-help">USB/Bluetooth keyboard scanners also work. On iPhone Messenger, camera access might be unavailable; use manual code entry.</p>'+
   '<button type="button" class="scanner-reset" data-scan="clear">Scan Next Student</button></section>'+
   '<aside class="reserve-panel"><h2>Booking Status</h2><p class="sub">Student ID is masked; individual student names and roster are never displayed.</p>'+showResult()+'</aside></div>';
 }
 root.innerHTML='<header class="reserve-nav"><div class="reserve-brand"><img src="./assets/lsc-glass-logo.png?v=2" alt="LSC crest">'+
 '<div><strong>Reservation Scanner</strong><small>BULSU LABORATORY HIGH SCHOOL · LSC</small></div></div>'+
 '<a href="./student.html">Attendance Portal ↗</a></header>'+
 '<main class="reserve-page scanner-page"><div class="reserve-hero"><div><span class="reserve-eyebrow">FOUNDATION WEEK · VOLUNTEER STATION</span>'+
 '<h1>Scan a <span>movie reservation.</span></h1>'+
 '<p>Instantly check booking status and quantity. A reservation is not a paid admission ticket.</p></div></div>'+
 main+'<footer class="reserve-footer">Staff-only · Approval and section restrictions enforced in Supabase<br>Powered by Azure&lt;3 · School approval required</footer></main>';
}
let libraryPromise=null;
async function loadScannerLibrary(){
 if(window.Html5Qrcode)return;
 if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
  script.async=true;
  script.onload=()=>window.Html5Qrcode?resolve():reject(Error('QR camera library unavailable'));
  script.onerror=()=>reject(Error('Camera scanner library could not load'));
  document.head.appendChild(script);
 }).catch(e=>{libraryPromise=null;throw e});
 await libraryPromise;
}
async function stopCamera(){
 const scanner=state.scanner;
 state.scanner=null;state.camera=false;
 if(scanner){try{await scanner.stop();await scanner.clear()}catch(e){try{await scanner.clear()}catch(_){}}}
}
async function startCamera(){
 if(!state.authorized||state.camera||state.busy||state.offline)return;
 if(!navigator.mediaDevices?.getUserMedia){state.notice='Camera not supported by this browser. Type the RSV code manually.';render();return;}
 try{
  await loadScannerLibrary();state.camera=true;state.notice='';render();
  const scanner=new window.Html5Qrcode('qrScannerReader',{formatsToSupport:[window.Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
  state.scanner=scanner;
  await scanner.start({facingMode:'environment'},{fps:8,qrbox:{width:220,height:220}},async raw=>{
   const code=String(raw||'').trim().toUpperCase();
   if(!/^RSV-[0-9A-F]{16}$/.test(code)||state.busy)return;
   state.code=code;await stopCamera();await lookup();
  },()=>{});
 }catch(e){await stopCamera();state.notice='Camera scanner unavailable: '+e.message+'. Manual code entry still works.';render()}
}
async function lookup(){
 if(!state.authorized||state.busy||state.offline)return;
 const code=(document.getElementById('scannerCode')?.value||state.code||'').trim().toUpperCase();
 state.code=code;state.result=null;
 if(!/^RSV-[0-9A-F]{16}$/.test(code)){state.notice='Enter a valid RSV-XXXXXXXXXXXXXXXX reference.';render();return;}
 if(state.camera)await stopCamera();
 state.busy=true;state.notice='';render();
 try{
  const {data,error}=await db.rpc('lsc_movie_scan_reservation',{p_code:code});
  if(error)throw error;
  state.result=data;
 }catch(e){
  state.notice='Unable to verify reservation: '+e.message;
  if(e.code==='42501')state.authorized=false;
 }finally{state.busy=false;render()}
}
async function verify(){
 state.loading=true;render();
 try{
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user){state.notice='Sign in to the approved volunteer account in this browser.';return;}
  const [att,mov]=await Promise.all([db.rpc('lsc_attendance_access'),db.rpc('lsc_movie_context')]);
  const a=!att.error?att.data?.role:null,m=!mov.error?mov.data?.role:null;
  if(['official','class_mayor','attendance_volunteer'].includes(a)){state.authorized=true;state.role=a;}
  else if(['official','class_mayor','cashier','ticket_checker','event_monitor'].includes(m)){state.authorized=true;state.role=m;}
  else {state.notice='This account is not authorized for reservation scans.';return;}
  state.user=user;
 }catch(e){state.notice='Cannot verify account: '+e.message}
 finally{state.loading=false;render()}
}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-scan]');if(!el)return;
 if(el.dataset.scan==='start')await startCamera();
 if(el.dataset.scan==='stop'){await stopCamera();state.notice='Camera stopped.';render()}
 if(el.dataset.scan==='clear'){await stopCamera();state.code='';state.result=null;state.notice='';render();document.getElementById('scannerCode')?.focus()}
});
document.addEventListener('input',e=>{if(e.target.id==='scannerCode'){state.code=e.target.value.toUpperCase();state.result=null;}});
document.addEventListener('submit',e=>{if(e.target.id==='scannerLookupForm'){e.preventDefault();lookup()}});
window.addEventListener('offline',()=>{state.offline=true;stopCamera();state.notice='Offline. Verification paused.';render()});
window.addEventListener('online',()=>{state.offline=false;state.notice='Back online. Scan the code to verify current status.';render()});
window.addEventListener('pagehide',()=>{stopCamera()});
verify();
