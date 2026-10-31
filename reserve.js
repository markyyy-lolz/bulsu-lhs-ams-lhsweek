import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://rfxzbuocxersgbshczbj.supabase.co','sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb',{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const root=document.getElementById('reservationRoot');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>'₱'+Number(x||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const timePHT=x=>new Date(x).toLocaleString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
const state={shows:[],selected:'',studentId:'',qty:1,requestId:null,receipt:null,activeView:'book',reference:'',referenceStudent:'',status:null,message:'',busy:false,online:navigator.onLine};
const selected=()=>state.shows.find(s=>s.id===state.selected)||null;
function nav(){return '<header class="reserve-nav"><div class="reserve-brand"><img src="./assets/lsc-glass-logo.png?v=2" alt="LSC crest">'+
 '<div><strong>LSC Movie Booth</strong><small>BULSU LABORATORY HIGH SCHOOL</small></div></div>'+
 '<a href="./student.html">Attendance Portal ↗</a></header>';}
function showOptions(){
 return (state.shows||[]).map(s=>'<option value="'+esc(s.id)+'"'+(s.id===state.selected?' selected':'')+'>'+
 esc(s.title)+' · '+esc(s.show_date)+(s.show_time?' · '+esc(s.show_time.slice(0,5)):'')+
 ' · '+money(s.price_php)+(s.remaining===0?' · FULL':'')+'</option>').join('');
}
function summary(){
 const s=selected();
 return '<aside class="reserve-panel"><h2>Your Movie Booking</h2><p class="sub">Admission tickets are issued after payment at the booth.</p>'+
 '<div class="reserve-highlight"><small>FOUNDATION WEEK · MOVIE BOOTH</small><h3>'+esc(s?.title||'Select your movie')+'</h3>'+
 '<p>'+esc(s?.show_date||'Showing date will appear here')+(s?.show_time?' · '+esc(s.show_time.slice(0,5))+' PHT':'')+'</p>'+
 '<p>'+esc(s?.venue||'Venue to be announced by LSC')+'</p></div>'+
 '<div class="reserve-summary"><div><span>Ticket price</span><strong>'+money(s?.price_php)+'</strong></div>'+
 '<div><span>Ticket quantity</span><strong>'+esc(state.qty)+'</strong></div>'+
 '<div class="grand"><span>Total to pay at booth</span><strong>'+money(Number(s?.price_php||0)*state.qty)+'</strong></div>'+
 '<div><span>Seats currently available</span><strong>'+esc(s?.remaining===null||s?.remaining===undefined?'Ask the booth (uncapped)':
 s.remaining+' remaining')+'</strong></div></div>'+
 '<div class="reserve-note"><strong>Important:</strong> Booking temporarily holds seats for up to 2 hours, or until 15 minutes before the showing. Bring your reservation code and Student ID to the Movie Booth. Pay there to receive valid admission tickets. A reservation is not a paid ticket.</div>'+
 '<p class="reserve-help">Student ID alone does not prove identity. The cashier must verify it at the booth. Repeated or duplicate booking requests may be restricted.</p></aside>';
}
function booking(){
 const s=selected();const cannot=state.busy||!state.online||!s||s.remaining===0;
 return '<section class="reserve-panel"><h2>Reserve Your Movie Tickets</h2><p class="sub">No account required. Use your registered Student ID to request a temporary seat reservation.</p>'+
 (!state.shows.length?'<div class="reserve-empty">There are no upcoming movie screenings accepting online reservations right now. Please check back after the LSC Official sets the showing schedule.</div>':
 '<form id="reserveForm" class="reserve-form">'+
 '<label>Movie & Showtime<select name="show_id" id="reserveShow" required>'+showOptions()+'</select></label>'+
 '<div class="reserve-two"><label>Student ID<input name="student_id" id="reserveStudent" inputmode="numeric" pattern="[0-9]{7,12}" maxlength="12" autocomplete="off" placeholder="Enter registered Student ID" value="'+esc(state.studentId)+'" required></label>'+
 '<label>Number of tickets (max. 4)<input name="quantity" id="reserveQty" type="number" min="1" max="4" step="1" inputmode="numeric" value="'+esc(state.qty)+'" required></label></div>'+
 '<p class="reserve-help">We will not display your name or other student records. Only one active reservation per student per showing is allowed.</p>'+
 '<button type="submit" class="reserve-button reserve-primary full"'+(cannot?' disabled':'')+'>'+(state.busy?'Submitting Reservation…':'Reserve Seats · Pay at Booth')+'</button></form>')+
 '<div class="reserve-tabs"><button type="button" data-view="status" class="reserve-button reserve-secondary">Check / Cancel a Reservation</button></div></section>';
}
function receiptView(){
 const r=state.receipt;return '<section class="reserve-panel"><div class="reserve-confirm">'+
 '<div class="state">✓ TEMPORARY SEAT RESERVATION</div><h2>Reservation Created!</h2>'+
 '<p>Save or screenshot this reference. It is required at the Movie Booth; it is NOT an admission ticket.</p>'+
 '<div class="code" id="reserveCode">'+esc(r.code)+'</div>'+
 '<p><strong>'+esc(r.title)+'</strong><br>'+esc(r.show_date)+(r.show_time?' · '+esc(r.show_time.slice(0,5))+' PHT':'')+
 '<br>'+r.quantity+' ticket(s) · Pay '+money(r.total_due_php)+' at the booth</p>'+
 '<p><strong>Expires:</strong> '+esc(timePHT(r.expires_at))+' (Philippine Time)</p></div>'+
 '<div class="reserve-actions"><button type="button" class="reserve-button reserve-primary" data-act="copy">Copy Reference</button>'+
 '<button type="button" class="reserve-button reserve-secondary" data-act="print">Print / Save PDF</button></div>'+
 '<div class="reserve-tabs"><button type="button" class="reserve-button reserve-secondary" data-act="new">Make Another Reservation</button>'+
 '<button type="button" class="reserve-button reserve-secondary" data-act="check-created">Check Reservation</button></div>'+
 '<p class="reserve-help">Your actual name was not displayed. Confirm identity with the LSC staff when paying. If the hold expires, make a new reservation only if seats remain.</p></section>';
}
function statusPage(){
 const r=state.status;
 return '<section class="reserve-panel"><h2>Check or Cancel Your Booking</h2><p class="sub">Use the reservation reference and the same Student ID used to book.</p>'+
 '<form id="reserveStatusForm" class="reserve-form"><label>Reservation reference<input name="code" id="reserveLookup" required maxlength="20" autocomplete="off" autocapitalize="characters" placeholder="RSV-XXXXXXXXXXXXXXXX" value="'+esc(state.reference)+'"></label>'+
 '<label>Student ID<input name="student_id" id="reserveLookupStudent" required pattern="[0-9]{7,12}" inputmode="numeric" maxlength="12" autocomplete="off" value="'+esc(state.referenceStudent)+'" placeholder="Registered Student ID"></label>'+
 '<button class="reserve-button reserve-primary" type="submit"'+(state.busy?' disabled':'')+'>Check Reservation</button></form>'+
 (r?'<div class="reserve-status '+esc(r.status)+'" role="status"><strong>'+esc(r.status==='RESERVED'?'✓ Reserved · Not Yet Paid':r.status==='CONVERTED'?'✓ Paid at Booth':r.status==='EXPIRED'?'⌛ Hold Expired':'Booking Cancelled')+'</strong>'+
 '<div>'+esc(r.title)+' · '+esc(r.show_date)+' · '+esc(r.quantity)+' ticket(s)</div>'+
 '<div>Amount: '+money(r.total_due_php)+' · '+(r.status==='RESERVED'?'Hold valid until '+esc(timePHT(r.expires_at)):'Reservation is no longer active')+'</div>'+
 (r.status==='RESERVED'?'<button type="button" class="reserve-button reserve-secondary" data-act="cancel" style="margin-top:12px">Cancel My Reservation</button>':'')+
 '</div>':'')+
 '<div class="reserve-tabs"><button type="button" class="reserve-button reserve-secondary" data-view="book">Back to Booking</button></div></section>';
}
function render(){
 root.innerHTML=nav()+'<main class="reserve-page"><div class="reserve-hero"><div><span class="reserve-eyebrow">BULSU LHS · FOUNDATION WEEK</span>'+
 '<h1>Reserve your <span>movie seats.</span></h1><p>Pick a showing, enter your Student ID and get your booking reference. No online payment required.</p></div>'+
 '<div class="reserve-chip">🎬 Pay at the Booth</div></div>'+
 (!state.online?'<div class="reserve-alert">Internet connection required. No offline reservations will be issued.</div>':'')+
 (state.message?'<div class="reserve-alert '+(state.message.startsWith('✓')?'success':'')+'" role="status">'+esc(state.message)+'</div>':'')+
 '<div class="reserve-layout">'+(state.activeView==='receipt'&&state.receipt?receiptView():state.activeView==='status'?statusPage():booking())+
 summary()+'</div>'+
 '<footer class="reserve-footer">LSC Movie Booth · Powered by Azure&lt;3 · School approval required<br>'+
 'Reservation requests are held temporarily. Student names and roster data are never published on this page.</footer></main>';
}
async function loadShows(){
 if(!navigator.onLine){state.online=false;state.message='You are offline. Reconnect before booking.';render();return;}
 const {data,error}=await sb.rpc('lsc_movie_public_shows');
 if(error){state.message='Could not load screenings: '+error.message;render();return;}
 state.shows=Array.isArray(data)?data:[];
 if(!state.shows.some(x=>x.id===state.selected))state.selected=state.shows[0]?.id||'';
 render();
}
async function book(form){
 if(state.busy||!navigator.onLine)return;
 const sh=selected();const student=String(form.elements.student_id.value||'').trim();
 const qty=Number(form.elements.quantity.value);
 if(!sh||!/^[0-9]{7,12}$/.test(student)||!Number.isInteger(qty)||qty<1||qty>4){
 state.message='Check the showing, registered Student ID, and quantity (1–4).';render();return;}
 state.studentId=student;state.qty=qty;
 state.requestId=state.requestId||crypto.randomUUID();
 state.busy=true;state.message='';render();
 try{
 const {data,error}=await sb.rpc('lsc_movie_reserve',{
  p_show_id:sh.id,p_student_number:student,p_quantity:qty,p_request_id:state.requestId});
 if(error)throw error;
 if(data.status!=='RESERVED')throw new Error('Reservation is no longer active. Check your reference.');
 state.receipt=data;state.reference=data.code;state.referenceStudent=student;
 state.studentId='';state.requestId=null;state.activeView='receipt';state.message='✓ Seats held! Save your reservation code and pay at the Movie Booth.';
 await refreshSilent();
 }catch(e){state.message='Reservation could not be confirmed: '+(e.message||'Unknown error')+
 '. If your network dropped after submitting, check at the booth before trying again.';}
 finally{state.busy=false;render();}
}
async function refreshSilent(){
 try{const {data,error}=await sb.rpc('lsc_movie_public_shows');if(!error&&Array.isArray(data))state.shows=data;}catch(e){/* Keep last known show list; no sensitive data involved. */}
}
async function lookup(form){
 const code=String(form.elements.code.value||'').trim().toUpperCase();
 const student=String(form.elements.student_id.value||'').trim();
 state.reference=code;state.referenceStudent=student;state.status=null;
 if(!/^RSV-[0-9A-F]{16}$/.test(code)||!/^[0-9]{7,12}$/.test(student)){state.message='Enter the full reservation reference and Student ID.';render();return;}
 state.busy=true;state.message='';render();
 try{const {data,error}=await sb.rpc('lsc_movie_reservation_status',{p_code:code,p_student_number:student});
 if(error)throw error;state.status=data;}
 catch(e){state.message='Unable to find reservation: '+(e.message||'Please check your details.');}
 finally{state.busy=false;render();}
}
async function cancelReservation(){
 if(!state.reference||!state.referenceStudent)return;
 if(!window.confirm('Cancel this seat reservation? Your temporary seats will be released.'))return;
 state.busy=true;
 try{
 const {data,error}=await sb.rpc('lsc_movie_reservation_cancel',{p_code:state.reference,p_student_number:state.referenceStudent});
 if(error)throw error;state.message='✓ Reservation '+data.status.toLowerCase()+'.';
 state.status={...state.status,status:data.status};await refreshSilent();
 }catch(e){state.message='Cancellation was not completed: '+e.message;}
 finally{state.busy=false;render();}
}
document.addEventListener('change',e=>{
 if(e.target.id==='reserveShow'){state.selected=e.target.value;state.requestId=null;state.message='';render();}
});
document.addEventListener('input',e=>{
 if(e.target.id==='reserveStudent'){state.studentId=e.target.value.replace(/\D/g,'').slice(0,12);state.requestId=null;}
 if(e.target.id==='reserveQty'){const n=Number(e.target.value);state.qty=Number.isInteger(n)?n:0;state.requestId=null;
  // Only the order summary needs updating; preserve form focus.
  const box=document.querySelector('.reserve-summary');
  if(box){const sh=selected();box.innerHTML='<div><span>Ticket price</span><strong>'+money(sh?.price_php)+'</strong></div>'+
  '<div><span>Ticket quantity</span><strong>'+esc(state.qty)+'</strong></div>'+
  '<div class="grand"><span>Total to pay at booth</span><strong>'+money(Number(sh?.price_php||0)*state.qty)+'</strong></div>'+
  '<div><span>Seats currently available</span><strong>'+esc(sh?.remaining==null?'Ask the booth (uncapped)':sh.remaining+' remaining')+'</strong></div>';}
 }
 if(e.target.id==='reserveLookup')state.reference=e.target.value.toUpperCase();
 if(e.target.id==='reserveLookupStudent')state.referenceStudent=e.target.value;
});
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-view],[data-act]');if(!t)return;
 if(t.dataset.view){state.activeView=t.dataset.view;state.message='';state.status=null;render();return;}
 const action=t.dataset.act;
 if(action==='new'){state.activeView='book';state.receipt=null;state.status=null;state.message='';render();}
 if(action==='check-created'){state.activeView='status';state.status=null;state.message='';render();}
 if(action==='copy'&&state.receipt){
  const code=state.receipt.code;
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(code).then(()=>{state.message='✓ Reservation reference copied.';render()})
  .catch(()=>{state.message='Copy this code: '+code;render()});}
  else{state.message='Copy this code: '+code;render();}
 }
 if(action==='print')window.print();
 if(action==='cancel')cancelReservation();
});
document.addEventListener('submit',e=>{
 if(e.target.id==='reserveForm'){e.preventDefault();book(e.target)}
 if(e.target.id==='reserveStatusForm'){e.preventDefault();lookup(e.target)}
});
window.addEventListener('online',()=>{state.online=true;state.message='';loadShows()});
window.addEventListener('offline',()=>{state.online=false;state.message='No internet. Booking is paused.';render()});
render();loadShows();
