import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const db=createClient('https://rfxzbuocxersgbshczbj.supabase.co','sb_publishable_CR-CJKna_rcjQi7gg1CZGQ__DnXI6Lb',{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const root=document.getElementById('movieRoot');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>'₱'+Number(value||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const p=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;};
const pht=value=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const id=()=>crypto.randomUUID();
const state={
 user:null,role:null,classId:null,accessDenied:false,page:'checkout',shows:[],selectedShow:'',editingShowId:null,
 student:null,studentSearch:'',quantity:1,cash:'',requestId:null,busy:false,notice:'',reservation:null,reservationCode:'',reservationScanActive:false,reservationLookupBusy:false,reservations:[],reservationFilter:'ALL',reservationsBusy:false,reservationsLoadedAt:null,
 receipt:null,sales:[],summary:null,reportDate:today(),reportLimited:false,cardEnrolled:false,cardLocked:false,cardSince:Date.now(),cardWorking:false,cardNotice:'',voidSaleId:null,voidRequestId:null,voidWorking:false,voidReason:'',
 ticketCode:'',ticketResult:null,shift:null,shiftHistory:[],printLog:[],cameraStream:null,cameraTimer:null,html5Scanner:null,scanBusy:false,online:navigator.onLine,otpEmail:'',otpSent:false
};
function movie(){
 return state.shows.find(x=>x.id===state.selectedShow)||null;
}
function canSell(){
 const sh=movie();
 return state.online&&!state.reservationScanActive&&!state.reservationLookupBusy&&sh&&!sh.archived_at&&sh.active&&sh.show_date>=today()&&state.student&&state.quantity>=1&&state.quantity<=20;
}
function total(){
 const sh=movie();
 return Math.round(Number(sh?.price_php||0)*state.quantity*100)/100;
}
function header(){
 return '<header class="movie-header"><div class="movie-brand"><img src="./assets/lsc-glass-logo.png?v=2" alt="LSC crest">'+
 '<div><strong>Movie Booth POS</strong><small>BulSU Laboratory High School · Foundation Week</small></div></div>'+
 '<div class="movie-head-right"><span class="movie-role">'+esc(state.role.replaceAll('_',' ').toUpperCase())+'</span>'+
 '<button class="movie-mini" type="button" data-act="lock-station">Lock Station</button> · <a href="./reserve.html" class="movie-return">Student Reservations</a> · <a href="./operations.html" class="movie-return">Event Command Center</a> · <a href="./login.html#overview" class="movie-return">LSC Dashboard</a> · <button type="button" class="movie-mini" data-act="signout">Sign Out</button></div></header>';
}
function tabs(){
 const items=[];
 if(['official','cashier'].includes(state.role)){items.push(['checkout','Ticket Checkout']);items.push(['reservations','Reservations']);}
 if(['official','ticket_checker'].includes(state.role))items.push(['validator','Ticket Check-In']);
 if(['official','cashier'].includes(state.role))items.push(['shifts','Cashier Shifts']);
 if(['official','cashier','event_monitor'].includes(state.role))items.push(['reports','Sales Reports']);
 if(['official','cashier'].includes(state.role))items.push(['recovery','Print Recovery']);
 if(state.role==='official')items.push(['setup','Movie Setup']);
 items.push(['staffcard','Staff Card / NFC']);
 return '<nav class="movie-tabs" aria-label="Movie POS navigation">'+items.map(x=>
 '<button type="button" data-page="'+x[0]+'" class="'+(state.page===x[0]?'selected':'')+'">'+esc(x[1])+'</button>').join('')+'</nav>';
}
function ticketPreview(){
 const r=state.receipt;
 if(!r)return '';
 const tickets=Array.isArray(r.tickets)?r.tickets:[];
 return '<section class="movie-receipt" aria-label="Ticket sale receipt"><div class="movie-success">✓ Sale saved successfully</div>'+
 '<div class="movie-receipt-meta"><strong>'+esc(r.show_title||'Movie Booth')+'</strong>'+
 '<span>'+esc(r.show_date||'')+' · '+esc(r.student_number||'')+'</span></div>'+
 '<div class="movie-receipt-totals"><span>'+tickets.length+' tickets · '+money(r.unit_price)+' each</span><strong>'+money(r.total)+'</strong>'+
 '<span>Cash '+money(r.cash_received)+' · Change '+money(r.change)+'</span></div>'+
 '<div class="movie-codes">'+tickets.map(t=>'<span>'+esc(t.code)+'</span>').join('')+'</div>'+
 '<button type="button" class="movie-btn movie-primary" data-act="print-last">Print '+tickets.length+' Ticket'+(tickets.length===1?'':'s')+'</button>'+
 '<p class="movie-small">Use the browser print dialog. The ticket is not a BIR official sales invoice.</p></section>';
}
function reservationsView(){
 const statuses=['ALL','RESERVED','CONVERTED','EXPIRED','CANCELLED'];
 const rows=state.reservations||[];
 const n={};for(const r of rows)n[r.status]=(n[r.status]||0)+1;
 return '<section class="movie-panel movie-reservations-panel">'+
 '<div class="movie-panel-head"><div><h2>Student Reservations</h2>'+
 '<p class="movie-helper">Authorized cashier view · Most recent 100 bookings · Student IDs masked in the list</p></div>'+
 '<span>'+rows.length+' shown</span></div>'+
 '<div class="movie-booking-filter"><label>Booking status<select id="movieReservationFilter">'+
 statuses.map(x=>'<option value="'+x+'"'+(x===state.reservationFilter?' selected':'')+'>'+
 (x==='ALL'?'All bookings':x==='CONVERTED'?'Paid / Converted':x==='RESERVED'?'Reserved / Pending':x[0]+x.slice(1).toLowerCase())+
 '</option>').join('')+'</select></label>'+
 '<button type="button" class="movie-btn movie-secondary" data-act="refresh-reservations"'+(state.reservationsBusy?' disabled':'')+'>'+
 (state.reservationsBusy?'Refreshing…':'Refresh Reservations')+'</button></div>'+
 (state.reservationsLoadedAt?'<p class="movie-helper">Last updated '+esc(pht(state.reservationsLoadedAt))+' PHT. Status is checked again before payment.</p>':'')+
 (!state.online?'<div class="movie-alert">Connect to the internet to load the latest reservations. Offline results cannot verify bookings.</div>':'')+
 (state.reservationsBusy?'<p class="movie-helper">Loading private reservations…</p>':
 rows.length?'<div class="movie-table-scroll"><table class="movie-table movie-booking-table"><thead><tr>'+
 '<th>Reservation</th><th>Student ID</th><th>Showing</th><th>Tickets</th><th>Amount</th><th>Status</th><th>Reserved (PHT)</th><th>Expiry (PHT)</th><th>Action</th>'+
 '</tr></thead><tbody>'+
 rows.map(r=>'<tr><td><code>'+esc(r.code)+'</code></td>'+
 '<td>'+esc(r.student_id_masked)+'</td>'+
 '<td><strong>'+esc(r.title)+'</strong><small>'+esc(r.show_date)+(r.show_time?' · '+esc(String(r.show_time).slice(0,5)):'')+'</small></td>'+
 '<td>'+esc(r.quantity)+'</td><td>'+money(r.amount_php)+'</td>'+
 '<td><span class="movie-booking-status '+esc(r.status)+'">'+
 esc(r.status==='CONVERTED'?'PAID':r.status)+'</span></td>'+
 '<td>'+esc(pht(r.created_at))+'</td><td>'+esc(pht(r.expires_at))+'</td>'+
 '<td>'+(r.status==='RESERVED'?'<button class="movie-mini" type="button" data-reservation-open="'+esc(r.code)+'">Open Checkout</button>':'<span class="movie-helper">View only</span>')+
 '</td></tr>').join('')+'</tbody></table></div>':
 '<div class="movie-booking-empty">No reservations match this filter. New student bookings will appear here after refresh.</div>')+
 '<p class="movie-helper">Only active RESERVED bookings can be opened for payment. Scanning or loading a reservation never charges a student automatically.</p>'+
 '</section>';
}
async function loadReservations(){
 if(!['official','cashier'].includes(state.role)||state.reservationsBusy)return;
 if(!navigator.onLine){state.notice='You are offline. Reconnect before refreshing reservations.';render();return;}
 state.reservationsBusy=true;render();
 try{
  const {data,error}=await db.rpc('lsc_movie_list_reservations',{
   p_show_id:null,p_status:state.reservationFilter==='ALL'?null:state.reservationFilter,p_limit:100
  });
  if(error)throw error;
  state.reservations=Array.isArray(data)?data:[];
  state.reservationsLoadedAt=new Date().toISOString();state.notice='';
 }catch(e){state.reservations=[];state.notice='Could not load reservations: '+(e.message||'Unknown error');}
 finally{state.reservationsBusy=false;render();}
}
function checkout(){
 const options=state.shows.filter(x=>x.active&&x.show_date>=today());
 const selected=movie();
 const selectedReady=selected&&selected.active&&selected.show_date>=today();
 const cash=Number(state.cash||0),t=total();
 return '<div class="movie-layout"><section class="movie-panel"><div class="movie-panel-head"><h2>Ticket Checkout</h2><span>1 Student ID · Multiple tickets</span></div>'+
 (!options.length?'<div class="movie-alert">No active upcoming movie showings yet. An LSC Official must set a title, show date and ticket price in Movie Setup before selling.</div>':'')+
 (selected&&selected.seat_capacity!==null?'<div class="movie-alert">Capacity: '+selected.seat_capacity+' seats. Availability is checked by the server at checkout to prevent overselling.</div>':'')+
 '<div class="movie-fields"><label>Movie showing<select id="movieShow"'+(!options.length?' disabled':'')+'>'+
 (options.length?options.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===state.selectedShow?' selected':'')+'>'+esc(x.title)+' · '+esc(x.show_date)+' · '+money(x.price_php)+'</option>').join(''):'<option value="">No show available</option>')+
 '</select></label>'+
 '<div class="movie-reservation-checkout"><div class="movie-reservation-title"><strong>Online Reservation — Scan & Pay</strong>'+
 '<span>Scan the student QR here. Booking loads directly into this cashier checkout.</span></div>'+
 '<div class="movie-reservation-actions"><button class="movie-btn movie-primary" type="button" data-act="scan-reservation"'+(state.reservationScanActive||state.busy||state.reservationLookupBusy||!state.online?' disabled':'')+'>Scan Reservation QR</button>'+
 (state.reservationScanActive?'<button class="movie-btn movie-secondary" type="button" data-act="stop-reservation-scan">Stop Camera</button>':'')+'</div>'+
 (state.reservationScanActive?'<div class="movie-reservation-camera" id="movieReservationCamera"><div id="movieReservationQrReader"></div></div>':'')+
 '<div class="movie-student-row"><label>Or enter / scan reservation code<input id="movieReservationCode" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="RSV-XXXXXXXXXXXXXXXX" value="'+esc(state.reservationCode)+'"></label>'+
 (state.reservation?'<button type="button" class="movie-btn movie-secondary" data-act="clear-reservation">New / Clear Booking</button>':
 '<button type="button" class="movie-btn movie-secondary" data-act="find-reservation"'+(state.reservationLookupBusy?' disabled':'')+'>'+
 (state.reservationLookupBusy?'Finding…':'Find Reservation')+'</button>')+'</div>'+
 '<p class="movie-helper">Camera on this cashier device, a paired USB/Bluetooth QR scanner, or manual code entry. Press Enter after scanning. No volunteer scan is required.</p></div>'+
 (state.reservation?'<div class="movie-student"><span>ONLINE BOOKING · PAY AT BOOTH</span><strong>'+esc(state.reservation.code)+'</strong>'+
 '<small>'+esc(state.reservation.title)+' · '+state.reservation.quantity+' tickets · Expires '+esc(pht(state.reservation.expires_at))+' PHT</small></div>':'')+
 '<div class="movie-student-row"><label>Student attendance ID<input id="movieStudentId" inputmode="numeric" autocomplete="off" pattern="[0-9]{7,12}" maxlength="12" placeholder="Example: 2023000001" value="'+esc(state.studentSearch)+'"'+(state.reservation?' disabled':'')+'></label>'+
 '<button class="movie-btn movie-secondary" type="button" data-act="lookup"'+(state.reservation?' disabled':'')+'>Find Student</button></div>'+
 (state.student?'<div class="movie-student"><span>Registered student</span><strong>'+esc(state.student.full_name)+'</strong>'+
 '<small>'+esc(state.student.student_id)+' · '+esc(state.student.grade_level)+' · '+esc(state.student.section)+'</small></div>':
 '<p class="movie-helper">Only registered, active students in your authorized scope can purchase.</p>')+
 '<div class="movie-two"><label>Number of tickets<input type="number" id="movieQty" inputmode="numeric" min="1" max="20" step="1" value="'+esc(state.quantity)+'"'+(state.reservation?' disabled':'')+' required></label>'+
 '<label>Cash received (PHP)<input type="number" id="movieCash" min="0" max="1000000" step="0.01" inputmode="decimal" placeholder="Enter cash amount" value="'+esc(state.cash)+'"></label></div>'+
 '</div></section>'+
 '<aside class="movie-panel movie-summary"><h2>Order Summary</h2>'+
 '<div class="movie-poster"><span>FOUNDATION WEEK</span><strong>'+esc(selected?.title||'Movie Booth')+'</strong>'+
 '<small>'+esc(selected?.show_date||'Choose a movie showing')+'</small></div>'+
 '<div class="movie-order-lines"><div><span>Unit ticket price</span><strong id="movieUnit">'+money(selected?.price_php)+'</strong></div>'+
 '<div><span>Quantity</span><strong id="movieQtyView">'+esc(state.quantity)+'</strong></div>'+
 '<div class="movie-grand"><span>Grand Total</span><strong id="movieTotal">'+money(t)+'</strong></div>'+
 '<div><span>Change</span><strong id="movieChange">'+money(Math.max(0,cash-t))+'</strong></div></div>'+
 '<div class="movie-pay-note">Cash payment tracking only · No online payment gateway. Confirm cash before saving.</div>'+
 '<button type="button" id="moviePay" class="movie-btn movie-primary" data-act="sell"'+(!canSell()||state.busy||cash<t?' disabled':'')+'>'+
 (state.busy?'Saving…':'Confirm Payment & Issue Tickets')+'</button>'+
 ticketPreview()+'</aside></div>';
}
function reports(){
 const sum=state.summary||{paid_sales:0,paid_tickets:0,gross_php:0,void_sales:0,voided_php:0};
 const rows=state.sales||[];
 return '<section class="movie-panel"><div class="movie-panel-head"><h2>Movie Booth Sales Reports</h2><span>Server-calculated · '+(state.role==='official'?'Whole school':state.role==='cashier'?'Your own sales':'Aggregate only')+'</span></div>'+
 '<div class="movie-toolbar"><label>Sales date (Philippine Time)<input type="date" id="movieReportDate" value="'+esc(state.reportDate||'')+'"></label>'+
 '<button type="button" class="movie-btn movie-secondary" data-act="report-refresh">Refresh</button>'+
 '<button type="button" class="movie-btn movie-secondary" data-act="report-all">All dates</button>'+
 '<button type="button" class="movie-btn movie-secondary" data-act="report-export">Export CSV</button>'+ 
 '<button type="button" class="movie-btn movie-secondary" data-act="report-print">Print Report</button></div>'+
 '<div class="movie-stats">'+
 [['Paid sales',sum.paid_sales],['Tickets sold',sum.paid_tickets],['Gross sales',money(sum.gross_php)],['Voided sales',sum.void_sales]].map(x=>
 '<div class="movie-stat"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join('')+'</div>'+
 '<p class="movie-helper">Gross sales exclude voided sales. Cash refunds are not automatically processed; track them separately. Audit history is preserved.</p>'+
 (state.reportLimited?'<div class="movie-alert">Showing the latest 250 transactions only. The financial totals above include all matching sales. Use Export CSV for the complete scoped report.</div>':'')+
 '<div class="movie-table-scroll"><table class="movie-table"><thead><tr><th>Date / time</th><th>Student</th><th>Movie</th><th>Qty</th><th>Total</th><th>Status</th><th>Cashier</th><th>Actions</th></tr></thead><tbody>'+
 (rows.length?rows.map(x=>'<tr><td>'+esc(pht(x.sold_at))+'</td>'+
 '<td><strong>'+esc(x.lsc_students?.student_id||'—')+'</strong><small>'+esc(x.lsc_students?.section||'')+'</small></td>'+
 '<td>'+esc(x.lsc_movie_shows?.title||'—')+'</td><td>'+esc(x.quantity)+'</td>'+
 '<td><strong>'+money(x.total_php)+'</strong></td>'+
 '<td><span class="movie-status '+(x.status==='PAID'?'paid':'void')+'">'+esc(x.status)+'</span></td>'+
 '<td>'+esc(x.sold_by_email||'—')+'</td>'+
 '<td><button type="button" class="movie-mini" data-print="'+esc(x.id)+'">Reprint</button>'+
 (['official','cashier'].includes(state.role)&&x.status==='PAID'?'<button type="button" class="movie-mini danger" data-void="'+esc(x.id)+'">Request Void</button>':'')+
 '</td></tr>').join(''):'<tr><td colspan="8" class="movie-empty">No sales for this period.</td></tr>')+
 '</tbody></table></div></section>';
}
function bookingEligibility(sh){
 if(!sh?.active)return 'Resume ticket sales before opening online reservations.';
 if(!sh.seat_capacity)return 'Enter a seat capacity between 1 and 5,000.';
 if(!sh.show_time)return 'Enter an exact future showtime (PHT).';
 const stamp=sh.show_date+'T'+String(sh.show_time).slice(0,5)+':00+08:00';
 const when=Date.parse(stamp);
 if(!Number.isFinite(when)||when<=Date.now()+15*60000)
  return 'Use a future showing at least 15 minutes from now (Philippine Time).';
 return '';
}
function scheduleEditor(sh){
 if(!sh)return '';
 return '<div class="movie-schedule-editor"><div class="movie-panel-head"><h3>Edit Date, Time & Seats</h3><span>PHILIPPINE TIME</span></div>'+
 '<p class="movie-helper"><strong>'+esc(sh.title)+'</strong> · Choose the correct event schedule below. The system protects already-issued tickets: a date with sales cannot be changed. If the showtime was never set, it can be added without deleting existing sales.</p>'+
 '<form id="movieEditScheduleForm" class="movie-fields"><input type="hidden" name="show_id" value="'+esc(sh.id)+'">'+
 '<label>Showing date (PHT)<input name="show_date" type="date" required min="'+today()+'" value="'+esc(sh.show_date)+'"></label>'+
 '<div class="movie-two"><label>Showtime (PHT)<input name="show_time" type="time" required value="'+esc(String(sh.show_time||'').slice(0,5))+'"></label>'+
 '<label>Total seats (1–5000)<input name="seat_capacity" type="number" step="1" min="1" max="5000" required value="'+esc(sh.seat_capacity??'')+'" placeholder="e.g. 100"></label></div>'+
 '<div class="movie-schedule-actions"><button type="submit" class="movie-btn movie-primary">Save Schedule</button>'+
 '<button type="button" class="movie-btn movie-secondary" data-act="cancel-schedule">Cancel</button></div></form>'+
 '<p class="movie-helper">Once saved, click <strong>Enable Online Booking</strong> for that showing. This never deletes previous sales or tickets.</p></div>';
}
function setup(){
 if(state.role!=='official')return '<div class="movie-alert">Only LSC Officials can configure movie showings.</div>';
 const editing=state.shows.find(x=>x.id===state.editingShowId)||null;
 const currentShows=state.shows.filter(x=>!x.archived_at);
 const archivedShows=state.shows.filter(x=>Boolean(x.archived_at));
 const listings=currentShows.length?currentShows.map(x=>
  '<div class="movie-show-item"><span><strong>'+esc(x.title)+'</strong>'+
  '<small>'+esc(x.show_date)+(x.show_time?' · '+esc(String(x.show_time).slice(0,5))+' PHT':' · SHOWTIME MISSING')+
  ' · '+money(x.price_php)+' · '+esc(x.venue||'Movie Booth')+'</small>'+
  '<small>'+esc(x.reservations_enabled?'Online reservations enabled':bookingEligibility(x)||'Ready to enable online reservations')+'</small></span>'+
  '<div class="movie-show-actions"><button type="button" class="movie-mini" data-edit-schedule="'+esc(x.id)+'">Edit Date / Time / Seats</button>'+
  '<button type="button" class="movie-mini" data-capacity="'+esc(x.id)+'">Capacity '+(x.seat_capacity??'Uncapped')+'</button>'+
  '<button type="button" class="movie-mini" data-reserve-toggle="'+esc(x.id)+'">'+(x.reservations_enabled?'Disable Online Booking':'Enable Online Booking')+'</button>'+
  '<button type="button" class="movie-mini" data-toggle="'+esc(x.id)+'">'+(x.active?'Pause Sales':'Resume Sales')+'</button>'+
    '<button type="button" class="movie-mini movie-delete-show" data-delete-show="'+esc(x.id)+'" aria-label="Delete showing '+esc(x.title)+'">Delete Showing</button></div></div>'
 ).join(''):'<p class="movie-helper">No showings configured yet. Create a screening before accepting sales.</p>';
 return '<div class="movie-layout"><section class="movie-panel"><h2>Add Movie Showing</h2>'+
 '<p class="movie-helper">Configure the actual Foundation Week title, date, time and ticket price. Online reservations are OFF by default and require a future showtime plus seat capacity before you can enable them. You can leave capacity or time blank for walk-in-only operations.</p>'+
 '<form id="movieSetupForm" class="movie-fields">'+
 '<label>Movie title<input name="title" required minlength="3" maxlength="120" placeholder="Enter the movie booth title"></label>'+
 '<label>Showing date<input name="show_date" required type="date" min="'+today()+'" value="'+today()+'"></label>'+
 '<label>Ticket price (PHP)<input name="price_php" required type="number" step="0.01" min="0.01" max="10000" placeholder="Enter the approved price"></label>'+
 '<label>Venue (optional)<input name="venue" maxlength="120" placeholder="e.g., LHS Movie Booth"></label>'+
 '<label>Showtime (PHT)<input name="show_time" type="time"></label>'+
 '<label>Seat capacity (optional for walk-ins)<input name="seat_capacity" type="number" min="1" max="5000" placeholder="Set for online reservations"></label>'+
 '<button type="submit" class="movie-btn movie-primary">Create Movie Showing</button></form></section>'+
 '<section class="movie-panel"><h2>Configured Showings</h2>'+
 (editing?scheduleEditor(editing):'')+listings+
 '<div class="movie-archive-heading"><h3>Archived Showings</h3><p class="movie-helper">Showings with sales or reservation history are retained here for audit. They will not appear in ticket checkout or public booking. Restoring leaves sales paused.</p></div>'+
 (archivedShows.length?archivedShows.map(x=>'<div class="movie-show-item movie-archived-show"><span><strong>'+esc(x.title)+'</strong>'+
 '<small>'+esc(x.show_date)+' · Archived '+esc(x.archived_at?pht(x.archived_at):'')+'</small></span>'+
 '<button class="movie-mini" type="button" data-restore-show="'+esc(x.id)+'">Restore Showing</button></div>').join(''):
 '<p class="movie-helper">No archived showings.</p>')+'</section></div>';
}

const normCard=s=>String(s||'').trim().replace(/[:\s-]/g,'').toUpperCase();
function staffCardPage(){
 return '<div class="movie-layout"><section class="movie-panel"><h2>Staff RFID / NFC</h2>'+
 '<p class="movie-helper">Your existing approved email login establishes account identity. Enrolling a card adds secure card + PIN quick-unlock at this station. No standalone UID-only login.</p>'+
 '<div class="movie-staff-status">'+(state.cardEnrolled?'Card enrolled · Quick-unlock enabled':'No staff card enrolled · Email sign-in active')+'</div>'+
 (state.cardNotice?'<p class="movie-alert">'+esc(state.cardNotice)+'</p>':'')+
 '<form class="movie-fields" id="movieCardEnrollForm">'+
 '<label>Card ID (Windows USB RFID keyboard reader or Android NFC)<input id="movieCardInput" name="card" maxlength="90" autocomplete="off" spellcheck="false" placeholder="Tap card or type UID" required></label>'+
 '<button type="button" class="movie-btn movie-secondary" data-act="nfc-card" data-target="movieCardInput">Read Android NFC</button>'+
 '<label>Choose a six-digit staff PIN<input name="pin" inputmode="numeric" type="password" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required></label>'+
 '<label>Repeat PIN<input name="confirm" inputmode="numeric" type="password" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required></label>'+
 '<button type="submit" class="movie-btn movie-primary"'+(state.cardWorking?' disabled':'')+'>Enroll / Replace My Card</button></form>'+
 (state.cardEnrolled?'<button type="button" data-act="revoke-card" class="movie-btn movie-secondary">Revoke My Card</button>':'')+
 '</section><aside class="movie-panel"><h2>Reader Instructions</h2>'+
 '<p class="movie-helper">Windows: plug in a USB HID RFID reader, focus the Card ID field and tap the card. Android Chrome: choose Read Android NFC and tap a compatible NFC tag. If browser NFC is unsupported, use a keyboard-mode external reader.</p>'+
 '<p class="movie-helper">Cards are linked to one approved staff account. Card IDs are stored as fingerprints; six-digit PINs are bcrypt-hashed, rate-limited and verified server-side.</p>'+
 '<div class="movie-alert">A card + PIN unlocks your already authenticated browser station; a fresh device still requires email login. Physical reader and tag compatibility must be tested.</div>'+
 '</aside></div>';
}
function stationLockView(){
 return '<section class="movie-signin movie-station-lock"><img src="./assets/lsc-glass-logo.png?v=2" alt="LSC crest">'+
 '<h1>Station Locked</h1><p>'+esc(state.user?.email||'Authorized Movie Booth staff')+
 ' · Enter the enrolled card and staff PIN to resume your approved account session.</p>'+
 (state.cardNotice?'<p class="movie-alert">'+esc(state.cardNotice)+'</p>':'')+
 '<form id="movieCardUnlockForm" class="movie-fields">'+
 '<label>Staff RFID / NFC card<input id="movieUnlockCard" name="card" autocomplete="off" maxlength="90" placeholder="Tap your card" required></label>'+
 '<button class="movie-btn movie-secondary" type="button" data-act="nfc-card" data-target="movieUnlockCard">Read Android NFC</button>'+
 '<label>Six-digit PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label>'+
 '<button class="movie-btn movie-primary" type="submit"'+(state.cardWorking?' disabled':'')+'>Unlock Station</button></form>'+
 '<button class="movie-mini" type="button" data-act="signout">Sign Out / Another Staff Account</button>'+
 '<p class="movie-helper">If your card was lost, sign out and ask an LSC Official to re-verify your account and enroll a replacement.</p></section>';
}
function voidApprovalView(){
 const sale=state.sales.find(x=>x.id===state.voidSaleId);
 if(!state.voidSaleId)return '';
 return '<div class="movie-approval-shade"><div class="movie-approval-dialog" role="dialog" aria-modal="true" aria-label="Supervisor void approval">'+
 '<div class="movie-panel-head"><h2>Supervisor Approval Required</h2><span>RFID + PIN</span></div>'+
 '<p class="movie-helper">Sale: <strong>'+esc(state.voidSaleId.slice(0,8))+'</strong>'+
 (sale?' · '+money(sale.total_php):'')+'. LSC Official card + PIN required. Cashier volunteers need a different Official; Officials may authorize their own administrative void.</p>'+
 (state.cardNotice?'<p class="movie-alert">'+esc(state.cardNotice)+'</p>':'')+
 '<form id="movieVoidApproveForm" class="movie-fields">'+
 '<label>Void reason (8–300 characters)<textarea name="reason" minlength="8" maxlength="300" rows="3" required placeholder="Explain why this transaction must be voided">'+esc(state.voidReason)+'</textarea></label>'+
 '<label>LSC Official RFID/NFC card<input name="card" id="movieSupervisorCard" autocomplete="off" spellcheck="false" maxlength="90" placeholder="Supervisor taps their own card" required></label>'+
 '<button type="button" class="movie-btn movie-secondary" data-act="nfc-card" data-target="movieSupervisorCard">Read Supervisor NFC</button>'+
 '<label>Supervisor six-digit PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label>'+
 '<div class="movie-approval-actions"><button type="button" class="movie-btn movie-secondary" data-act="close-void">Cancel</button>'+
 '<button type="submit" class="movie-btn movie-primary"'+(state.voidWorking?' disabled':'')+'>'+
 (state.voidWorking?'Verifying Approval…':'Approve & Void Sale')+'</button></div></form>'+
 '<p class="movie-helper">Requires an enrolled LSC Official. Cashiers cannot self-approve; an Official may approve their own action. Cash refunds are handled separately.</p>'+
 '</div></div>';
}
async function refreshStaffCard(){
 try{
  const {data,error}=await db.rpc('lsc_movie_staff_card',{p_action:'status',p_card:null,p_pin:null});
  if(error)throw error;
  state.cardEnrolled=Boolean(data?.enrolled);
  state.cardLocked=state.cardEnrolled;state.cardSince=Date.now();state.cardNotice='';
 }catch(e){state.cardEnrolled=false;state.cardLocked=false;state.cardNotice='Card status unavailable: '+e.message;}
}
async function runCardAction(action,card,pin){
 if(state.cardWorking||!state.online)return;
 state.cardWorking=true;state.cardNotice='';render();
 try{
  const {data,error}=await db.rpc('lsc_movie_staff_card',{p_action:action,p_card:card||null,p_pin:pin||null});
  if(error)throw error;
  if(action==='enroll'&&data.enrolled){state.cardEnrolled=true;state.cardLocked=false;state.cardSince=Date.now();state.cardNotice='Card enrolled successfully. Use Lock Station to test your card.';}
  else if(action==='revoke'){state.cardEnrolled=false;state.cardLocked=false;state.cardNotice='Staff card revoked. Account remains protected by email sign-in.';}
  else if(action==='verify'&&data.verified){state.cardLocked=false;state.cardSince=Date.now();state.cardNotice='';state.notice='Staff card verified. Station unlocked.';}
  else{state.cardNotice=data?.message||'Card verification failed.';}
 }catch(e){state.cardNotice=e.message||'Card operation failed';}
 finally{state.cardWorking=false;render();}
}
async function readNfc(targetId){
 const input=document.getElementById(targetId);
 if(!input)return;
 if(!window.NDEFReader){
  state.cardNotice='Web NFC is unavailable on this browser/device. Use a USB HID card reader or enter the card identifier.';render();return;
 }
 try{
  const reader=new window.NDEFReader();const ctrl=new AbortController();
  await reader.scan({signal:ctrl.signal});
  state.cardNotice='Hold a compatible NFC tag against your Android device.';render();
  reader.onreading=event=>{
   ctrl.abort();
   const card=normCard(event.serialNumber);
   if(!card){state.cardNotice='This tag does not expose a compatible card ID. Try another NFC tag/reader.';render();return;}
   const current=document.getElementById(targetId);
   if(current){current.value=card;current.focus();}
   state.cardNotice='';
  };
  reader.onreadingerror=()=>{state.cardNotice='NFC reading failed. Try USB reader/manual entry.';render()};
 }catch(e){state.cardNotice='NFC unavailable: '+(e.message||'Permission denied');render();}
}
async function approveVoid(form){
 if(state.voidWorking||!state.voidSaleId||!state.online)return;
 state.voidWorking=true;
 const saleId=state.voidSaleId;
 const reason=form.elements.reason.value.trim(),card=normCard(form.elements.card.value),pin=form.elements.pin.value;
 state.voidReason=reason;
 const requestId=state.voidRequestId||(state.voidRequestId=id());
 state.cardNotice='';render();
 try{
  const {data,error}=await db.rpc('lsc_movie_void_with_approval',{
   p_sale_id:saleId,p_reason:reason,p_supervisor_card:card,p_supervisor_pin:pin,p_request_id:requestId
  });
  if(error)throw error;
  if(data?.status!=='VOID'||!data?.approved){state.cardNotice=data?.message||'Approval denied';return;}
  state.voidSaleId=null;state.voidRequestId=null;state.voidReason='';
  state.notice='Sale voided with LSC Official approval. Refund any paid cash manually.';
  await loadReport();
 }catch(e){state.cardNotice='Approval failed: '+e.message;}
 finally{state.voidWorking=false;render();}
}
function render(){
 if(state.accessDenied){
  root.innerHTML='<section class="movie-signin"><img src="./assets/lsc-glass-logo.png?v=2" alt="LSC crest">'+
   '<h1>Movie Booth Access Restricted</h1>'+
   '<p>Class Mayors cannot use Movie Booth POS. Only LSC Officials and separately approved Movie Booth volunteers may access ticket checkout, check-in, and reports.</p>'+
   '<p>Your Class Mayor account remains available for the regular LSC Attendance System.</p>'+
   '<a class="movie-btn movie-secondary" href="./login.html">Return to LSC Attendance</a>'+
   '<button class="movie-btn movie-primary" type="button" data-act="switch-movie-account">Sign In With Another Account</button></section>';
  return;
 }
 if(!state.user){root.innerHTML='<section class="movie-signin"><img src="./assets/lsc-glass-logo.png?v=2" alt="LSC crest"><h1>Movie Booth POS</h1>'+
 '<p>Private checkout, ticket scanning and volunteer stations. Sign in as an LSC Official or specifically approved Movie Booth volunteer. Class Mayor accounts are not permitted.</p>'+
 (state.otpSent?'<form id="movieOtpVerify" class="movie-fields"><label>Six-digit email code<input name="token" inputmode="numeric" pattern="[0-9]{6}" required maxlength="6" autocomplete="one-time-code" placeholder="000000"></label>'+
 '<button class="movie-btn movie-primary" type="submit">Verify Email & Open POS</button></form><p class="movie-helper">Check your email for the verification code or magic link.</p>'+
 '<button class="movie-btn movie-secondary" data-act="otp-back">Use another email</button>':
 '<form id="movieOtpEmail" class="movie-fields"><label>Approved email address<input name="email" type="email" required autocomplete="email" placeholder="volunteer@school.edu.ph"></label>'+
 '<button class="movie-btn movie-primary" type="submit">Send Sign-In Email</button></form>')+
 (state.notice?'<p role="alert" class="movie-alert">'+esc(state.notice)+'</p>':'')+
 '<p><a href="./login.html">LSC Attendance Login</a></p></section>';return;}
 if(state.cardLocked){root.innerHTML=stationLockView();return;}
 root.innerHTML=header()+'<main class="movie-main">'+
 '<div class="movie-title"><div><span>FOUNDATION WEEK · SALES & TICKETING</span><h1>Movie Booth <em>Point of Sale</em></h1>'+
 '<p>Student ID checkout · Printable movie tickets · Audited sales</p></div><span class="movie-operator">Operator: '+esc(state.user.email||'Authorized LSC account')+'</span></div>'+
 tabs()+(state.notice?'<div class="movie-alert" role="status">'+esc(state.notice)+'</div>':'')+
 (state.page==='staffcard'?staffCardPage():state.page==='checkout'?checkout():state.page==='reservations'?reservationsView():state.page==='reports'?reports():state.page==='validator'?validator():state.page==='shifts'?shiftView():state.page==='recovery'?recovery():setup())+
 '<footer class="movie-footer">Powered by Azure&lt;3 · Private event system · Tickets are not official tax invoices</footer></main>'+voidApprovalView();
}
async function loadShows(){
 const {data,error}=await db.from('lsc_movie_shows').select('id,title,show_date,show_time,seat_capacity,reservations_enabled,price_php,venue,active,archived_at,created_at')
 .order('show_date',{ascending:false}).order('created_at',{ascending:false}).limit(200);
 if(error)throw error;
 state.shows=data||[];
 if(!state.shows.some(x=>x.id===state.selectedShow&&!x.archived_at&&x.active&&x.show_date>=today()))
 state.selectedShow=state.shows.find(x=>!x.archived_at&&x.active&&x.show_date>=today())?.id||'';
}
async function lookupStudent(){
 const val=document.getElementById('movieStudentId')?.value.trim()||'';
 state.studentSearch=val;
 state.student=null;state.receipt=null;state.requestId=null;
 if(!/^[0-9]{7,12}$/.test(val)){state.notice='Enter a numeric Student ID (7–12 digits).';render();return;}
 const {data,error}=await db.rpc('lsc_movie_lookup_student',{p_student_number:val});
 if(error){state.notice='Student lookup failed: '+error.message;render();return;}
 if(!data?.found){state.notice='Student not found in your assigned authorization scope.';render();return;}
 state.student=data;state.notice='';render();
}
async function findReservation(scannedCode=null){
 if(state.busy||state.reservationLookupBusy)return;
 const code=String(scannedCode??document.getElementById('movieReservationCode')?.value??state.reservationCode??'').trim().toUpperCase();
 if(state.reservationScanActive)stopCamera();
 state.reservationCode=code;
 if(!/^RSV-[0-9A-F]{16}$/.test(code)){
  state.notice='Scan the reservation QR or enter an RSV-XXXXXXXXXXXXXXXX reference.';render();return;
 }
 if(!navigator.onLine){state.notice='Internet is required to verify the latest reservation status.';render();return;}
 // A scan only looks up a booking. No payment or ticket is issued automatically.
 state.reservationLookupBusy=true;state.reservation=null;state.student=null;
 state.receipt=null;state.requestId=null;state.notice='Checking the student reservation…';
 render();
 try{
  const {data,error}=await db.rpc('lsc_movie_staff_reservation',{p_code:code});
  if(error)throw error;
  if(data.status!=='RESERVED'){
   state.notice='Reservation is '+data.status+'. No payment was recorded. Check with the student before starting another booking.';
   return;
  }
  const sh=state.shows.find(x=>x.id===data.show_id);
  if(!sh||!sh.active||sh.archived_at){
   state.notice='The reserved showing is not available for checkout. Contact the LSC Official.';
   return;
  }
  state.reservation=data;state.selectedShow=data.show_id;
  state.studentSearch=data.student_number;
  state.student={student_id:data.student_number,full_name:data.student_name,grade_level:'',section:data.section};
  state.quantity=data.quantity;state.cash='';
  state.notice='✓ Reservation scanned! Verify the student ID, collect cash and tap Confirm Payment & Issue Tickets.';
 }catch(error){
  state.notice='Could not load reservation: '+(error.message||'Unknown error')+'. No sale was recorded.';
 }finally{state.reservationLookupBusy=false;render();}
}
async function scanReservationQR(){
 if(!state.user||!['official','cashier'].includes(state.role)||state.busy||state.reservationLookupBusy||state.reservationScanActive)return;
 if(!navigator.onLine){state.notice='Internet connection required for reservation scanning.';render();return;}
 if(!navigator.mediaDevices?.getUserMedia){
  state.notice='Camera not supported by this browser. Use an external QR scanner or enter the reservation code.';render();return;
 }
 try{
  await ensureScannerLibrary();
  if(state.page!=='checkout')return;
  stopCamera();
  state.reservationScanActive=true;state.notice='';
  render();
  const node=document.getElementById('movieReservationQrReader');
  if(!node){state.reservationScanActive=false;render();return;}
  const scanner=new window.Html5Qrcode('movieReservationQrReader',{
   formatsToSupport:[window.Html5QrcodeSupportedFormats.QR_CODE],verbose:false
  });
  state.html5Scanner=scanner;
  await scanner.start({facingMode:'environment'},{fps:8,qrbox:{width:210,height:210}},async raw=>{
   const code=String(raw||'').trim().toUpperCase();
   if(!/^RSV-[0-9A-F]{16}$/.test(code)||!state.reservationScanActive||state.reservationLookupBusy)return;
   stopCamera();
   state.reservationCode=code;
   await findReservation(code);
  },()=>{});
 }catch(error){
  stopCamera();
  state.notice='Camera unavailable: '+(error.message||'Permission denied')+'. Use manual entry or an external scanner.';
  render();
 }
}
async function makeSale(){
 if(state.busy||state.reservationLookupBusy||state.reservationScanActive)return;
 if(!navigator.onLine){state.notice='Offline. No sale can be issued until your connection is restored.';render();return;}
 const sh=movie();
 if(!sh||!canSell())return;
 state.busy=true;state.notice='';
 const request=state.requestId||(state.requestId=id());
 render();
 try{
  const payload=state.reservation?
   {p_code:state.reservation.code,p_cash_received:Number(state.cash),p_request_id:request}:
   {p_show_id:sh.id,p_student_number:state.student.student_id,p_quantity:state.quantity,
    p_cash_received:Number(state.cash),p_request_id:request};
  const {data,error}=await db.rpc(state.reservation?'lsc_movie_checkout_reservation':'lsc_movie_sell',payload);
  if(error)throw error;
  state.receipt=data;state.reservation=null;state.reservationCode='';state.student=null;state.studentSearch='';state.cash='';
  state.quantity=1;state.requestId=null;state.notice='Payment recorded; individual tickets issued. Print them below.';
 }catch(e){state.notice='Sale was not confirmed: '+(e.message||'Unknown error')+
  '. If the connection failed, retry using the same checkout without changing the student or amount.';}
 finally{state.busy=false;render();}
}
async function saveShowingSchedule(form){
 if(state.role!=='official')return;
 if(!navigator.onLine){state.notice='Connect to the internet before changing a movie schedule.';render();return;}
 if(state.busy)return;
 const showId=form.elements.show_id.value;
 const date=form.elements.show_date.value;
 const time=form.elements.show_time.value;
 const capacity=Number(form.elements.seat_capacity.value);
 if(!date||!time||!Number.isInteger(capacity)||capacity<1||capacity>5000){
  state.notice='Select a valid showing date, Philippine showtime and seat capacity of 1–5000.';render();return;
 }
 const stamp=Date.parse(date+'T'+time+':00+08:00');
 if(!Number.isFinite(stamp)||stamp<=Date.now()+15*60000){
  state.notice='The showing must start at least 15 minutes in the future (Philippine Time).';render();return;
 }
 state.busy=true;
 try{
  const {data,error}=await db.rpc('lsc_movie_update_showing_schedule',{
   p_show_id:showId,p_show_date:date,p_show_time:time,p_seat_capacity:capacity});
  if(error)throw error;
  state.editingShowId=null;await loadShows();
  state.notice='Schedule saved ('+date+' · '+time+' PHT · '+capacity+' seats). Click Enable Online Booking when ready.';
 }catch(e){state.notice='Could not save showing: '+e.message}
 finally{state.busy=false;render();}
}
async function createShow(form){
 if(state.role!=='official')return;
 const title=form.elements.title.value.trim(),show_date=form.elements.show_date.value;
 const price=Number(form.elements.price_php.value),venue=form.elements.venue.value.trim();
 const cap=form.elements.seat_capacity.value?Number(form.elements.seat_capacity.value):null;
 const showTime=form.elements.show_time.value||null;
 if(title.length<3||!show_date||show_date<today()||!Number.isFinite(price)||price<.01||price>10000||(cap!==null&&(!Number.isInteger(cap)||cap<1||cap>5000))){
  state.notice='Check the movie title, future/today date, and approved ticket price.';render();return;
 }
 const {error}=await db.from('lsc_movie_shows').insert({title,show_date,show_time:showTime,seat_capacity:cap,price_php:price,venue:venue||null,created_by:state.user.id});
 if(error){state.notice=error.message;render();return;}
 await loadShows();state.notice='Movie showing created. Ticket sales can now begin.';state.page='checkout';render();
}
function scopedSalesQuery(start,end){
 let q=db.from('lsc_movie_sales').select('id,status,quantity,total_php,sold_at,sold_by_email,void_reason,show_id,lsc_students(student_id,full_name,grade_level,section),lsc_movie_shows(title,show_date,venue),lsc_movie_tickets(ticket_number,code)')
 .order('sold_at',{ascending:false});
 if(start&&end)q=q.gte('sold_at',start).lt('sold_at',end);
 return q;
}
function phtRange(day){
 if(!day)return [null,null];
 const midnight=new Date(day+'T00:00:00+08:00');
 if(Number.isNaN(midnight.getTime()))return [null,null];
 const next=new Date(midnight.getTime()+86400000);
 return [midnight.toISOString(),next.toISOString()];
}
async function loadReport(){
 const [start,end]=phtRange(state.reportDate);
 const [summary,detail]=await Promise.all([
  db.rpc('lsc_movie_summary',{p_day:state.reportDate||null}),
  state.role==='event_monitor'?Promise.resolve({data:[],error:null}):scopedSalesQuery(start,end).range(0,249)
 ]);
 if(summary.error)throw summary.error;
 if(detail.error)throw detail.error;
 state.summary=summary.data;state.sales=detail.data||[];
 state.reportLimited=state.sales.length===250;
}
async function getSaleReceipt(saleId){
 const {data,error}=await db.from('lsc_movie_sales')
 .select('id,status,quantity,price_php,total_php,cash_received_php,change_php,sold_at,sold_by_email,lsc_students(student_id,full_name,section),lsc_movie_shows(title,show_date,venue),lsc_movie_tickets(ticket_number,code)')
 .eq('id',saleId).maybeSingle();
 if(error)throw error;
 if(!data)throw new Error('Sale not available for this operator.');
 return {sale_id:data.id,status:data.status,show_title:data.lsc_movie_shows?.title,show_date:data.lsc_movie_shows?.show_date,
  venue:data.lsc_movie_shows?.venue,student_number:data.lsc_students?.student_id,
  student_name:data.lsc_students?.full_name,section:data.lsc_students?.section,quantity:data.quantity,
  unit_price:data.price_php,total:data.total_php,cash_received:data.cash_received_php,change:data.change_php,
  sold_at:data.sold_at,sold_by:data.sold_by_email,
  tickets:(data.lsc_movie_tickets||[]).map(x=>({number:x.ticket_number,code:x.code})).sort((a,b)=>a.number-b.number)};
}
function printTickets(receipt,readyWindow=null){
 const tickets=receipt?.tickets||[];
 if(!tickets.length){state.notice='No tickets available to print.';render();return;}
 const win=readyWindow||window.open('','_blank','width=460,height=700');
 if(!win){state.notice='Enable pop-ups for this site to print tickets, or use your browser print settings.';render();return;}
 win.opener=null;
 const body=tickets.map(x=>'<section class="ticket">'+
 '<div class="ticket-head">BULSU LHS · FOUNDATION WEEK</div>'+
 '<h2>MOVIE BOOTH</h2><h3>'+esc(receipt.show_title||'Movie Admission')+'</h3>'+
 '<div class="rule"></div><p><b>SHOW DATE</b><br>'+esc(receipt.show_date||'')+'</p>'+
 '<p><b>VENUE</b><br>'+esc(receipt.venue||'LSC Movie Booth')+'</p>'+
 '<p><b>STUDENT ID</b><br>'+esc(receipt.student_number||'')+'</p>'+
 '<p><b>ADMIT ONE</b><br>Ticket '+esc(x.number)+' of '+esc(receipt.quantity||tickets.length)+'</p>'+
 '<div class="ticketqr" data-code="'+esc(x.code)+'"></div><div class="code">'+esc(x.code)+'</div>'+
 '<div class="rule"></div><div class="end">Keep this ticket for admission<br>Powered by Azure&lt;3</div>'+
 (receipt.status==='VOID'?'<div class="void">VOID — NOT VALID</div>':'')+'</section>').join('');
 const html='<!doctype html><html><head><meta charset="utf-8"><title>Movie Booth Tickets</title>'+
 '<style>@page{size:80mm auto;margin:2mm}*{box-sizing:border-box}body{font:13px Arial,sans-serif;color:#111;margin:0}.ticket{width:76mm;margin:0 auto 10mm;padding:5mm 3mm 7mm;border-bottom:2px dashed #000;break-after:page;page-break-after:always;text-align:center}.ticket-head{font-size:10px;font-weight:bold;letter-spacing:1px}h2{font-size:23px;margin:11px 0 4px}h3{font-size:17px;margin:5px 0 13px}.rule{border-top:1px dashed #444;margin:12px 0}p{font-size:13px;line-height:1.45;margin:12px 0}p b{font-size:10px;letter-spacing:1px}.ticketqr{min-height:98px;margin:8px auto;display:flex;align-items:center;justify-content:center}.ticketqr img,.ticketqr canvas{width:92px!important;height:92px!important;image-rendering:pixelated}.code{font-size:18px;letter-spacing:1px;font-weight:bold;border:2px solid #000;padding:11px 3px;overflow-wrap:anywhere}.end{font-size:10px;line-height:1.6}.void{font-weight:bold;font-size:20px;margin-top:12px}@media screen{body{background:#e5e7eb;padding:20px}.ticket{background:white;box-shadow:0 4px 17px #aaa;padding:15px;margin-bottom:15px}}@media print{body{background:#fff}.ticket:last-child{break-after:auto;page-break-after:auto}}</style></head><body>'+body+'</body></html>';
 win.document.open();win.document.write(html);win.document.close();win.focus();
 // QR library is pinned. In offline/CDN failure cases, the readable code remains printable.
 let didPrint=false;
 const print=()=>{if(didPrint)return;didPrint=true;try{win.focus();win.print()}catch(e){console.warn('Browser print unavailable:',e)}};
 const script=win.document.createElement('script');
 script.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
 script.onload=()=>{
  try{win.document.querySelectorAll('.ticketqr').forEach(node=>new win.QRCode(node,{
    text:node.dataset.code,width:92,height:92,correctLevel:win.QRCode.CorrectLevel.M
  }));}
  catch(e){console.warn('Could not draw ticket QR; printed codes remain valid',e)}
  setTimeout(print,350);
 };
 script.onerror=()=>setTimeout(print,100);
 win.document.head.appendChild(script);
 setTimeout(print,2800);
 if(receipt.sale_id){db.rpc('lsc_movie_note_print',{p_sale_id:receipt.sale_id}).then(x=>{
  if(x.error)console.warn('Print request audit failed:',x.error.message);
 }).catch(e=>console.warn('Print request audit unavailable:',e));}
}
function toCell(value){
 let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;
 return '"'+s.replaceAll('"','""')+'"';
}
async function exportReport(){
 const [start,end]=phtRange(state.reportDate);
 let all=[];
 try{
  for(let offset=0;offset<10000;offset+=500){
   const {data,error}=await scopedSalesQuery(start,end).range(offset,offset+499);
   if(error)throw error;
   all.push(...(data||[]));
   if((data||[]).length<500)break;
  }
  if(all.length>=10000){state.notice='Report exceeds 10,000 transactions; contact the administrator for an archived export.';render();return;}
  const rows=[['Sold At (PHT)','Student ID','Student','Section','Movie','Showing Date','Quantity','Total PHP','Status','Recorded By','Void Reason','Ticket Codes'],
   ...all.map(s=>[pht(s.sold_at),s.lsc_students?.student_id,s.lsc_students?.full_name,s.lsc_students?.section,
    s.lsc_movie_shows?.title,s.lsc_movie_shows?.show_date,s.quantity,s.total_php,s.status,s.sold_by_email,s.void_reason||'',
    (s.lsc_movie_tickets||[]).map(t=>t.code).join(' ')])];
  const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(toCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='LSC-Movie-Booth-Sales-'+(state.reportDate||'all-dates')+'.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
 }catch(e){state.notice='Could not export sales: '+e.message;render();}
}

/* Foundation Week v2.1: admissions are server-validated; scanner never trusts a local code. */
function validator(){
 const v=state.ticketResult;
 return '<section class="movie-panel"><div class="movie-panel-head"><h2>Ticket Check-In</h2><span>One-time redemption · Staff-only station</span></div>'+
 '<div class="movie-alert">Enter or scan the unique FW ticket code. Checking does not consume a ticket; tap Admit &amp; Redeem to use it exactly once. Internet connection required.</div>'+
 '<div class="movie-student-row"><label>Ticket code<input id="movieTicketCode" autocomplete="off" autocapitalize="characters" value="'+esc(state.ticketCode)+'" placeholder="FW-XXXXXXXXXXXX"></label>'+
 '<button type="button" class="movie-btn movie-secondary" data-act="check-ticket">Check Ticket</button></div>'+
 '<div class="ops-actions"><button class="movie-btn movie-secondary" type="button" data-act="camera-start">Scan with Camera (supported browsers)</button>'+
 '<button class="movie-btn movie-secondary" type="button" data-act="camera-stop">Stop Camera</button></div>'+
 '<p class="movie-helper">USB/Bluetooth scanner keyboards work by typing into the ticket code field. Camera scanning requires browser support and HTTPS. On iPhone/Messenger, camera permission may be blocked; manual code or a paired scanner remains available.</p>'+
 '<div id="movieCameraHolder" class="movie-camera-holder" hidden><video id="movieCamera" autoplay muted playsinline></video></div>'+
 (v?'<div class="movie-validator '+esc(v.result)+'"><strong>'+esc(v.result==='VALID'?'✓ VALID — Ready to admit':v.result==='REDEEMED'?'✓ ADMISSION RECORDED':v.result==='ALREADY_USED'?'✕ ALREADY USED':v.result==='VOID'?'✕ VOIDED':'✕ '+v.result)+'</strong>'+
 '<span>'+esc(v.movie||'Unknown movie')+' · '+esc(v.date||'')+' · '+esc(v.code||'')+'</span>'+
 (v.result==='VALID'?'<button type="button" class="movie-btn movie-primary" data-act="redeem-ticket"'+(!state.online?' disabled':'')+'>Admit &amp; Redeem Ticket</button>':'')+'</div>':'')+'</section>';
}
async function checkTicket(redeem=false){
 if(state.scanBusy)return;
 if(!navigator.onLine){state.notice='Offline. Ticket checks and redemption require the server.';render();return;}
 state.ticketCode=(document.getElementById('movieTicketCode')?.value||state.ticketCode).trim().toUpperCase();
 if(!/^FW-[0-9A-F]{12}$/.test(state.ticketCode)){state.notice='Enter a valid FW-XXXXXXXXXXXX ticket code.';state.ticketResult=null;render();return;}
 state.scanBusy=true;
 try{
 const {data,error}=await db.rpc('lsc_movie_validate',{p_code:state.ticketCode,p_redeem:redeem});
 if(error)throw error;
 state.ticketResult=data;state.notice=data.result==='REDEEMED'?'Admission recorded by the server.':'Ticket status: '+data.result;
 }catch(e){state.ticketResult=null;state.notice='Ticket check failed: '+e.message}
 finally{state.scanBusy=false;render();}
}
function stopCamera(){
 state.reservationScanActive=false;
 if(state.cameraTimer){clearInterval(state.cameraTimer);state.cameraTimer=null}
 if(state.cameraStream){state.cameraStream.getTracks().forEach(t=>t.stop());state.cameraStream=null}
 if(state.html5Scanner){
  const scanner=state.html5Scanner;state.html5Scanner=null;
  scanner.stop().then(()=>scanner.clear()).catch(()=>{try{scanner.clear()}catch(e){}});
 }
}
async function ensureScannerLibrary(){
 if(window.Html5Qrcode)return;
 if(!window.__lscQRLoad){
  window.__lscQRLoad=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
   script.async=true;script.onload=()=>resolve();script.onerror=()=>reject(Error('QR scanner library could not load'));
   document.head.appendChild(script);
  }).catch(e=>{window.__lscQRLoad=null;throw e});
 }
 await window.__lscQRLoad;
 if(!window.Html5Qrcode)throw Error('QR scanner library unavailable');
}
async function startCamera(){
 stopCamera();
 if(!navigator.mediaDevices?.getUserMedia){state.notice='This browser cannot access the camera. Type the code or use an external scanner.';render();return}
 try{
  await ensureScannerLibrary();
  const holder=document.getElementById('movieCameraHolder');
  if(!holder)return;
  holder.hidden=false;
  holder.innerHTML='<div id="movieQrReader"></div>';
  const scanner=new window.Html5Qrcode('movieQrReader',{formatsToSupport:[window.Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
  state.html5Scanner=scanner;
  await scanner.start({facingMode:'environment'},{fps:8,qrbox:{width:210,height:210}},
   async raw=>{
    const code=String(raw||'').trim().toUpperCase();
    if(!/^FW-[0-9A-F]{12}$/.test(code)||state.scanBusy)return;
    state.ticketCode=code;stopCamera();await checkTicket(false);
   },()=>{});
 }catch(e){stopCamera();state.notice='Camera scanner unavailable: '+e.message+'. Manual entry still works.';render()}
}
async function fetchShift(){
 if(!['official','cashier'].includes(state.role))return;
 const {data,error}=await db.from('lsc_movie_cash_shifts')
 .select('id,opened_at,opening_php,closed_at,closing_php,expected_php,variance_php')
 .eq('cashier_id',state.user.id).is('closed_at',null).maybeSingle();
 if(!error)state.shift=data;
 const recent=await db.from('lsc_movie_cash_shifts')
 .select('opened_at,closed_at,opening_php,closing_php,expected_php,variance_php')
 .eq('cashier_id',state.user.id).not('closed_at','is',null).order('closed_at',{ascending:false}).limit(12);
 if(!recent.error)state.shiftHistory=recent.data||[];
}
function shiftView(){
 const sh=state.shift;
 return '<section class="movie-panel"><h2>Cashier Shift Management</h2>'+
 '<p class="movie-helper">Count cash carefully before opening and after closing. The server calculates the expected drawer balance from your paid sales. Voided sales are excluded; process refunds manually.</p>'+
 (sh?'<div class="movie-student"><span>OPEN CASHIER SHIFT</span><strong>Opening float: '+money(sh.opening_php)+'</strong><small>Opened '+esc(pht(sh.opened_at))+'</small></div>':
 '<div class="movie-alert">No shift is currently open. Assigned volunteer cashiers must open a shift before accepting cash.</div>')+
 '<form id="movieShiftForm" class="movie-fields">'+
 '<label>'+(sh?'Physical cash counted at close':'Opening cash float (PHP)')+
 '<input name="amount" type="number" min="0" max="1000000" step=".01" required placeholder="0.00"></label>'+
 '<label>Shift notes<input name="note" maxlength="400" placeholder="Cash drawer / operator notes (optional)"></label>'+
 '<button type="submit" class="movie-btn movie-primary"'+(!state.online?' disabled':'')+'>'+(sh?'Close Shift & Reconcile':'Open Cashier Shift')+'</button></form>'+
 '<h3 style="margin-top:26px">Recent Cashier Reconciliations</h3><div class="movie-table-scroll"><table class="movie-table"><thead><tr><th>Closed (PHT)</th><th>Opening</th><th>Expected</th><th>Counted</th><th>Difference</th></tr></thead><tbody>'+
 (state.shiftHistory||[]).map(x=>'<tr><td>'+esc(pht(x.closed_at))+'</td><td>'+money(x.opening_php)+'</td><td>'+money(x.expected_php)+'</td><td>'+money(x.closing_php)+'</td><td>'+money(x.variance_php)+'</td></tr>').join('')+
 '</tbody></table></div></section>';
}
async function saveShift(form){
 if(!navigator.onLine){state.notice='Offline. Cash shifts cannot be changed without the server.';render();return}
 const action=state.shift?'close':'open';
 const {data,error}=await db.rpc('lsc_movie_shift',{p_action:action,p_amount:Number(form.elements.amount.value),p_note:form.elements.note.value||null});
 if(error){state.notice=error.message;render();return}
 await fetchShift();
 state.notice=action==='close'?'Shift closed. Expected '+money(data.expected_cash)+' · Counted '+money(data.counted_cash)+' · Difference '+money(data.difference):
 'Shift opened and logged.';
 render();
}
function recovery(){
 return '<section class="movie-panel"><h2>Print Recovery Center</h2>'+
 '<p class="movie-helper">Print requests do not confirm successful physical printing. Recover a prior saved sale without charging the student again. If payment result was unclear, check Sales Reports before reattempting checkout.</p>'+
 '<button type="button" class="movie-btn movie-secondary" data-act="recovery-refresh">Refresh Saved Sales</button>'+
 '<div class="movie-table-scroll"><table class="movie-table"><thead><tr><th>Sold (PHT)</th><th>Student ID</th><th>Movie</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
 (state.sales||[]).map(x=>'<tr><td>'+esc(pht(x.sold_at))+'</td><td>'+esc(x.lsc_students?.student_id||'—')+'</td><td>'+esc(x.lsc_movie_shows?.title||'—')+'</td>'+
 '<td>'+x.quantity+'</td><td>'+esc(x.status)+'</td><td><button class="movie-mini" data-print="'+esc(x.id)+'">Reprint Tickets</button></td></tr>').join('')+
 '</tbody></table></div></section>';
}

async function volunteerOtpEmail(form){
 const email=String(form.elements.email.value||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return;
 const {error}=await db.auth.signInWithOtp({email,options:{shouldCreateUser:false,
  emailRedirectTo:location.origin+location.pathname}});
 if(error){state.notice='Could not send the sign-in email. Check your registered account and school email configuration.';}
 else{state.otpEmail=email;state.otpSent=true;state.notice=''}
 render();
}
async function volunteerOtpVerify(form){
 const code=String(form.elements.token.value||'').trim();
 if(!/^\d{6}$/.test(code))return;
 const {error}=await db.auth.verifyOtp({email:state.otpEmail,token:code,type:'email'});
 if(error){state.notice='Verification failed: '+error.message;render();return;}
 state.otpSent=false;state.notice='';await start();
}
async function start(){
 try{
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user){render();return;}
  const {data:ctx,error:roleError}=await db.rpc('lsc_movie_context');
  if(roleError||!ctx){state.accessDenied=true;state.user=null;render();return;}
  state.accessDenied=false;
  state.user=user;state.role=ctx.role;state.classId=ctx.scope_id;
  if(!['official','cashier','ticket_checker','event_monitor'].includes(state.role)){state.accessDenied=true;state.user=null;render();return;}
  if(['ticket_checker','event_monitor'].includes(state.role))state.page=state.role==='ticket_checker'?'validator':'reports';
  await loadShows();
  if(state.page==='shifts'||state.role==='cashier')await fetchShift();
  await refreshStaffCard();
  if(state.role==='event_monitor'){try{const x=await db.rpc('lsc_movie_summary',{p_day:state.reportDate});state.summary=x.data}catch(e){}}
  render();
 }catch(e){root.innerHTML='<div class="movie-signin"><h1>Movie Booth unavailable</h1><p>'+esc(e.message)+'</p><a href="./login.html">Return to LSC Login</a></div>';}
}
document.addEventListener('click',async e=>{
 const target=e.target.closest('[data-act],[data-page],[data-print],[data-void],[data-toggle],[data-capacity],[data-reserve-toggle],[data-edit-schedule],[data-delete-show],[data-restore-show],[data-reservation-open]');
 if(!target)return;
 if(state.cardLocked&& !['signout','nfc-card'].includes(target.dataset.act||''))return;
 if(target.dataset.page){
  state.page=target.dataset.page;state.notice='';
  stopCamera();
  if(state.page==='recovery')state.reportDate='';
  if(state.page==='reports'||state.page==='recovery'){try{await loadReport()}catch(e){state.notice='Report error: '+e.message}}
  if(state.page==='shifts')await fetchShift();
  if(state.page==='reservations')await loadReservations();
  render();return;
 }
 if(target.dataset.reservationOpen){
  if(state.busy||state.reservationLookupBusy)return;
  stopCamera();state.page='checkout';
  await findReservation(target.dataset.reservationOpen);return;
 }
 if(target.dataset.deleteShow||target.dataset.restoreShow){
  if(state.role!=='official'||state.busy)return;
  const restoring=Boolean(target.dataset.restoreShow);
  const showId=target.dataset.deleteShow||target.dataset.restoreShow;
  const sh=state.shows.find(x=>x.id===showId);
  if(!sh)return;
  if(restoring){
   if(!window.confirm('Restore "'+sh.title+'"? It will remain PAUSED and online reservations will stay disabled until you approve them again.'))return;
  }else{
   const answer=window.prompt('Delete "'+sh.title+'"?\\n\\nUNUSED showings will be permanently deleted. Showings with paid sales or reservation history will be archived instead.\\n\\nActive unexpired student reservations must be cancelled or expire first.\\n\\nType DELETE to proceed:');
   if(answer===null)return;
   if(answer.trim()!=='DELETE'){state.notice='Deletion cancelled. Type exactly DELETE to confirm.';render();return;}
  }
  state.busy=true;
  try{
    const {data,error}=await db.rpc('lsc_movie_manage_showing',{
      p_show_id:sh.id,p_action:restoring?'restore':'delete'
    });
    if(error)throw error;
    if(state.editingShowId===sh.id)state.editingShowId=null;
    if(state.selectedShow===sh.id){
      state.student=null;state.reservation=null;state.reservationCode='';
      state.receipt=null;state.requestId=null;
    }
    await loadShows();
    state.notice=data.status==='DELETED'?'Showing permanently deleted. No sales or reservations existed.':
      data.status==='ARCHIVED'?'Showing archived safely. Existing sales and reservation history are preserved.':
      'Showing restored in PAUSED mode. Resume sales or enable online booking only when ready.';
  }catch(error){
    state.notice='Unable to '+(restoring?'restore':'delete')+' showing: '+error.message;
  }finally{state.busy=false;render();}
  return;
 }
 if(target.dataset.editSchedule){
  if(state.role!=='official')return;
  state.editingShowId=target.dataset.editSchedule;state.page='setup';state.notice='';
  render();return;
 }
 if(target.dataset.reserveToggle){
  if(state.role!=='official')return;
  const sh=state.shows.find(x=>x.id===target.dataset.reserveToggle);if(!sh)return;
  if(!sh.reservations_enabled){
   const missing=bookingEligibility(sh);
   if(missing){
    state.editingShowId=sh.id;state.page='setup';
    state.notice='Before enabling online booking: '+missing+' Fill out Edit Date / Time / Seats, then save.';
    render();return;
   }
   if(!window.confirm('Enable public Student ID movie reservations for '+sh.title+'? Verify the approved schedule, ticket price and capacity first.'))return;
  }
  const {data,error}=await db.rpc('lsc_movie_reservation_switch',{p_show_id:sh.id,p_enabled:!sh.reservations_enabled});
  if(error){state.notice='Cannot change online booking: '+error.message;render();return}
  await loadShows();state.notice=data.enabled?'Online reservations enabled for this showing. Students may temporarily hold seats.':'Online reservations closed for new bookings; prior holds remain valid until expiry or conversion.';
  render();return;
 }
 if(target.dataset.capacity){
  if(state.role!=='official')return;
  const raw=window.prompt('Maximum seats (1-5000). Leave empty for uncapped:',state.shows.find(x=>x.id===target.dataset.capacity)?.seat_capacity??'');
  if(raw===null)return;
  const cap=raw.trim()===''?null:Number(raw);
  if(cap!==null&&(!Number.isInteger(cap)||cap<1||cap>5000)){state.notice='Enter 1–5000 seats or leave blank.';render();return}
  const {error}=await db.rpc('lsc_movie_set_capacity',{p_show_id:target.dataset.capacity,p_capacity:cap});
  if(error){state.notice=error.message;render();return}
  await loadShows();state.notice='Capacity updated. Existing ticket sales remain untouched.';render();return;
 }
 if(target.dataset.print){
  const printWindow=window.open('','_blank','width=460,height=700');
  if(!printWindow){state.notice='Allow pop-ups to reprint.';render();return;}
  try{const receipt=await getSaleReceipt(target.dataset.print);printTickets(receipt,printWindow)}
  catch(e){printWindow.close();state.notice=e.message;render()}return;
 }
 if(target.dataset.void){
  if(!['official','cashier'].includes(state.role)||state.cardLocked)return;
  state.voidSaleId=target.dataset.void;state.voidRequestId=null;state.voidReason='';state.cardNotice='';render();return;
 }
 if(target.dataset.toggle){
  if(state.role!=='official')return;
  const sh=state.shows.find(x=>x.id===target.dataset.toggle);if(!sh)return;
  const {error}=await db.from('lsc_movie_shows').update({active:!sh.active}).eq('id',sh.id);
  if(error){state.notice=error.message;render();return;}
  await loadShows();render();return;
 }
 const act=target.dataset.act;
 if(act==='switch-movie-account'){
  await db.auth.signOut();state.accessDenied=false;state.user=null;state.role=null;state.notice='';render();return;
 }
 if(act==='lock-station'){
  stopCamera();state.cardLocked=state.cardEnrolled;
  state.cardNotice=state.cardEnrolled?'':'Please enroll a card in Staff Card / NFC first.';
  render();return;
 }
 if(act==='revoke-card'){
  if(window.confirm('Revoke this staff card? You can enroll a replacement after email login.'))await runCardAction('revoke',null,null);
  return;
 }
 if(act==='nfc-card'){await readNfc(target.dataset.target);return;}
 if(act==='close-void'){state.voidSaleId=null;state.voidRequestId=null;state.voidReason='';state.cardNotice='';render();return;}
 if(act==='signout'){
   stopCamera();await db.auth.signOut();
   state.user=null;state.role=null;state.receipt=null;state.sales=[];state.student=null;state.notice='';
   state.otpSent=false;state.cardEnrolled=false;state.cardLocked=false;state.voidSaleId=null;state.page='checkout';render();return;
 }
 if(act==='otp-back'){state.otpSent=false;state.otpEmail='';state.notice='';render()}
 if(act==='cancel-schedule'){state.editingShowId=null;state.notice='Schedule editing cancelled.';render()}
 if(act==='lookup')await lookupStudent();
 if(act==='find-reservation')await findReservation();
 if(act==='refresh-reservations')await loadReservations();
 if(act==='scan-reservation')await scanReservationQR();
 if(act==='stop-reservation-scan'){stopCamera();state.notice='Cashier QR camera stopped.';render()}
 if(act==='clear-reservation'){stopCamera();state.reservation=null;state.reservationCode='';state.student=null;state.studentSearch='';state.quantity=1;state.cash='';state.requestId=null;state.notice='Reservation cleared. Walk-in checkout is ready.';render()}
 if(act==='check-ticket')await checkTicket(false);
 if(act==='redeem-ticket')await checkTicket(true);
 if(act==='camera-start')await startCamera();
 if(act==='camera-stop'){stopCamera();state.notice='Camera stopped.';render()}
 if(act==='recovery-refresh'){try{await loadReport();render()}catch(e){state.notice=e.message;render()}}
 if(act==='sell')await makeSale();
 if(act==='print-last')printTickets(state.receipt);
 if(act==='report-refresh'){state.reportDate=document.getElementById('movieReportDate')?.value||'';try{await loadReport()}catch(e){state.notice=e.message}render()}
 if(act==='report-all'){state.reportDate='';try{await loadReport()}catch(e){state.notice=e.message}render()}
 if(act==='report-export'){state.reportDate=document.getElementById('movieReportDate')?.value||'';await exportReport()}
 if(act==='report-print')window.print();
});
document.addEventListener('keydown',e=>{
 if(e.target?.id==='movieReservationCode'&&e.key==='Enter'){
  e.preventDefault();if(!e.repeat)void findReservation();
 }
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='movieCardEnrollForm'){
  e.preventDefault();
  const c=normCard(e.target.elements.card.value),pin=e.target.elements.pin.value;
  if(pin!==e.target.elements.confirm.value){state.cardNotice='PIN confirmation does not match';render();return;}
  await runCardAction('enroll',c,pin);return;
 }
 if(e.target.id==='movieCardUnlockForm'){
  e.preventDefault();
  await runCardAction('verify',normCard(e.target.elements.card.value),e.target.elements.pin.value);return;
 }
 if(e.target.id==='movieVoidApproveForm'){e.preventDefault();await approveVoid(e.target);return;}
 if(e.target.id==='movieSetupForm'){e.preventDefault();await createShow(e.target);}
 if(e.target.id==='movieEditScheduleForm'){e.preventDefault();await saveShowingSchedule(e.target);}
 if(e.target.id==='movieShiftForm'){e.preventDefault();await saveShift(e.target);}
 if(e.target.id==='movieOtpEmail'){e.preventDefault();await volunteerOtpEmail(e.target);}
 if(e.target.id==='movieOtpVerify'){e.preventDefault();await volunteerOtpVerify(e.target);}
});
document.addEventListener('change',async e=>{
 if(e.target.id==='movieReservationFilter'){
  state.reservationFilter=e.target.value;await loadReservations();return;
 }
 if(e.target.id==='movieShow'){
  state.selectedShow=e.target.value;state.student=null;state.reservation=null;state.reservationCode='';state.requestId=null;state.receipt=null;state.studentSearch='';state.cash='';render();
 }
});
document.addEventListener('input',e=>{
 if(e.target.id==='movieTicketCode'){state.ticketCode=e.target.value.toUpperCase();state.ticketResult=null;}
 if(e.target.id==='movieReservationCode'){state.reservationCode=e.target.value.toUpperCase();state.requestId=null;}
 if(e.target.id==='movieStudentId'){state.studentSearch=e.target.value;state.student=null;state.requestId=null;const b=document.getElementById('moviePay');if(b)b.disabled=true;}
 if(e.target.id==='movieQty'||e.target.id==='movieCash'){
  if(e.target.id==='movieQty'){
   const x=Number(e.target.value);state.quantity=Number.isInteger(x)?x:0;state.requestId=null;
  }else{state.cash=e.target.value;state.requestId=null;}
  const t=total(),cash=Number(state.cash||0);
  const qty=document.getElementById('movieQtyView'),tot=document.getElementById('movieTotal'),chg=document.getElementById('movieChange'),btn=document.getElementById('moviePay');
  if(qty)qty.textContent=String(state.quantity);
  if(tot)tot.textContent=money(t);
  if(chg)chg.textContent=money(Math.max(0,cash-t));
  if(btn)btn.disabled=!canSell()||!Number.isFinite(cash)||cash<t||cash>1000000;
 }
});
window.addEventListener('offline',()=>{
 stopCamera();state.online=false;state.notice='Network disconnected. Checkout and ticket redemption are paused until Supabase can confirm them.';render();
});
window.addEventListener('online',()=>{state.online=true;state.notice='Network restored. Verify pending sales before retrying any payment.';render()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});

const STATION_IDLE_MS=5*60*1000;
function rememberStationActivity(){
 if(state.user&&!state.cardLocked)state.cardSince=Date.now();
}
document.addEventListener('pointerdown',rememberStationActivity,{passive:true});
document.addEventListener('keydown',rememberStationActivity,{passive:true});
window.addEventListener('pageshow',()=>{
 if(state.user&&state.cardEnrolled){state.cardLocked=true;stopCamera();render();}
});
window.setInterval(()=>{
 if(state.user&&state.cardEnrolled&&!state.cardLocked
  &&Date.now()-state.cardSince>=STATION_IDLE_MS){
   stopCamera();state.voidSaleId=null;state.voidRequestId=null;state.voidReason='';
   state.cardLocked=true;state.cardNotice='Station auto-locked after 5 minutes of inactivity.';
   render();
 }
},15000);
start();
