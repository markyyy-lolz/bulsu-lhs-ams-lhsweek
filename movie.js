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
 user:null,role:null,classId:null,page:'checkout',shows:[],selectedShow:'',
 student:null,studentSearch:'',quantity:1,cash:'',requestId:null,busy:false,notice:'',reservation:null,reservationCode:'',
 receipt:null,sales:[],summary:null,reportDate:today(),reportLimited:false,
 ticketCode:'',ticketResult:null,shift:null,shiftHistory:[],printLog:[],cameraStream:null,cameraTimer:null,html5Scanner:null,scanBusy:false,online:navigator.onLine,otpEmail:'',otpSent:false
};
function movie(){
 return state.shows.find(x=>x.id===state.selectedShow)||null;
}
function canSell(){
 const sh=movie();
 return state.online&&sh&&sh.active&&sh.show_date>=today()&&state.student&&state.quantity>=1&&state.quantity<=20;
}
function total(){
 const sh=movie();
 return Math.round(Number(sh?.price_php||0)*state.quantity*100)/100;
}
function header(){
 return '<header class="movie-header"><div class="movie-brand"><img src="./assets/lsc-glass-logo.png?v=2" alt="LSC crest">'+
 '<div><strong>Movie Booth POS</strong><small>BulSU Laboratory High School · Foundation Week</small></div></div>'+
 '<div class="movie-head-right"><span class="movie-role">'+esc(state.role.replaceAll('_',' ').toUpperCase())+'</span>'+
 '<a href="./reserve.html" class="movie-return">Student Reservations</a> · <a href="./operations.html" class="movie-return">Event Command Center</a> · <a href="./login.html#overview" class="movie-return">LSC Dashboard</a> · <button type="button" class="movie-mini" data-act="signout">Sign Out</button></div></header>';
}
function tabs(){
 const items=[];
 if(['official','class_mayor','cashier'].includes(state.role))items.push(['checkout','Ticket Checkout']);
 if(['official','class_mayor','ticket_checker'].includes(state.role))items.push(['validator','Ticket Check-In']);
 if(['official','class_mayor','cashier'].includes(state.role))items.push(['shifts','Cashier Shifts']);
 if(['official','class_mayor','cashier','event_monitor'].includes(state.role))items.push(['reports','Sales Reports']);
 if(['official','class_mayor','cashier'].includes(state.role))items.push(['recovery','Print Recovery']);
 if(state.role==='official')items.push(['setup','Movie Setup']);
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
 '<div class="movie-student-row"><label>Existing reservation reference (optional)<input id="movieReservationCode" autocomplete="off" autocapitalize="characters" maxlength="20" placeholder="RSV-XXXXXXXXXXXXXXXX" value="'+esc(state.reservationCode)+'"></label>'+
 (state.reservation?'<button type="button" class="movie-btn movie-secondary" data-act="clear-reservation">Clear Reservation</button>':
 '<button type="button" class="movie-btn movie-secondary" data-act="find-reservation">Find Reservation</button>')+'</div>'+
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
 return '<section class="movie-panel"><div class="movie-panel-head"><h2>Movie Booth Sales Reports</h2><span>Server-calculated · '+(state.role==='official'?'Whole school':state.role==='class_mayor'?'Assigned class':state.role==='cashier'?'Your own sales':'Aggregate only')+'</span></div>'+
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
 (state.role==='official'&&x.status==='PAID'?'<button type="button" class="movie-mini danger" data-void="'+esc(x.id)+'">Void</button>':'')+
 '</td></tr>').join(''):'<tr><td colspan="8" class="movie-empty">No sales for this period.</td></tr>')+
 '</tbody></table></div></section>';
}
function setup(){
 if(state.role!=='official')return '<div class="movie-alert">Only LSC Officials can configure movie showings.</div>';
 return '<div class="movie-layout"><section class="movie-panel"><h2>Add Movie Showing</h2>'+
 '<p class="movie-helper">Configure the actual Foundation Week movie title, date and price before selling. Price is locked for existing showings to preserve transaction consistency.</p>'+
 '<form id="movieSetupForm" class="movie-fields">'+
 '<label>Movie title<input name="title" required minlength="3" maxlength="120" placeholder="Enter the movie booth title"></label>'+
 '<label>Showing date<input name="show_date" required type="date" min="'+today()+'" value="'+today()+'"></label>'+
 '<label>Ticket price (PHP)<input name="price_php" required type="number" step="0.01" min="0.01" max="10000" placeholder="Enter the approved price"></label>'+
 '<label>Venue (optional)<input name="venue" maxlength="120" placeholder="e.g., LHS Movie Booth"></label>'+ 
 '<label>Showtime (PHT)<input name="show_time" type="time"></label>'+ 
 '<label>Seat capacity (optional)<input name="seat_capacity" type="number" min="1" max="5000" placeholder="Leave blank for uncapped"></label>'+
 '<button type="submit" class="movie-btn movie-primary">Create Movie Showing</button></form></section>'+
 '<section class="movie-panel"><h2>Configured Showings</h2>'+
 (state.shows.length?state.shows.map(x=>'<div class="movie-show-item"><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.show_date)+' · '+money(x.price_php)+' · '+esc(x.venue||'Movie Booth')+'</small></span>'+
 '<div><button type="button" class="movie-mini" data-capacity="'+esc(x.id)+'">Capacity '+(x.seat_capacity??'Uncapped')+'</button><button type="button" class="movie-mini" data-toggle="'+esc(x.id)+'">'+(x.active?'Pause Sales':'Resume Sales')+'</button></div></div>').join(''):
 '<p class="movie-helper">No shows configured. New sales are disabled until setup is complete.</p>')+'</section></div>';
}
function render(){
 if(!state.user){root.innerHTML='<section class="movie-signin"><img src="./assets/lsc-glass-logo.png?v=2" alt="LSC crest"><h1>Movie Booth POS</h1>'+
 '<p>Private checkout, ticket scanning and volunteer stations. Sign in with your approved existing LSC email or use the main LSC portal.</p>'+
 (state.otpSent?'<form id="movieOtpVerify" class="movie-fields"><label>Six-digit email code<input name="token" inputmode="numeric" pattern="[0-9]{6}" required maxlength="6" autocomplete="one-time-code" placeholder="000000"></label>'+
 '<button class="movie-btn movie-primary" type="submit">Verify Email & Open POS</button></form><p class="movie-helper">Check your email for the verification code or magic link.</p>'+
 '<button class="movie-btn movie-secondary" data-act="otp-back">Use another email</button>':
 '<form id="movieOtpEmail" class="movie-fields"><label>Approved email address<input name="email" type="email" required autocomplete="email" placeholder="volunteer@school.edu.ph"></label>'+
 '<button class="movie-btn movie-primary" type="submit">Send Sign-In Email</button></form>')+
 (state.notice?'<p role="alert" class="movie-alert">'+esc(state.notice)+'</p>':'')+
 '<p><a href="./login.html">LSC Official / Class Mayor Login</a></p></section>';return;}
 root.innerHTML=header()+'<main class="movie-main">'+
 '<div class="movie-title"><div><span>FOUNDATION WEEK · SALES & TICKETING</span><h1>Movie Booth <em>Point of Sale</em></h1>'+
 '<p>Student ID checkout · Printable movie tickets · Audited sales</p></div><span class="movie-operator">Operator: '+esc(state.user.email||'Authorized LSC account')+'</span></div>'+
 tabs()+(state.notice?'<div class="movie-alert" role="status">'+esc(state.notice)+'</div>':'')+
 (state.page==='checkout'?checkout():state.page==='reports'?reports():state.page==='validator'?validator():state.page==='shifts'?shiftView():state.page==='recovery'?recovery():setup())+
 '<footer class="movie-footer">Powered by Azure&lt;3 · Private event system · Tickets are not official tax invoices</footer></main>';
}
async function loadShows(){
 const {data,error}=await db.from('lsc_movie_shows').select('id,title,show_date,show_time,seat_capacity,price_php,venue,active,created_at')
 .order('show_date',{ascending:false}).order('created_at',{ascending:false}).limit(200);
 if(error)throw error;
 state.shows=data||[];
 if(!state.shows.some(x=>x.id===state.selectedShow&&x.active&&x.show_date>=today()))
 state.selectedShow=state.shows.find(x=>x.active&&x.show_date>=today())?.id||'';
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
async function findReservation(){
 const code=(document.getElementById('movieReservationCode')?.value||state.reservationCode||'').trim().toUpperCase();
 state.reservationCode=code;state.reservation=null;state.student=null;state.requestId=null;state.receipt=null;
 if(!/^RSV-[0-9A-F]{16}$/.test(code)){state.notice='Enter the full RSV reservation reference.';render();return;}
 if(!navigator.onLine){state.notice='Reservation lookup requires internet.';render();return;}
 const {data,error}=await db.rpc('lsc_movie_staff_reservation',{p_code:code});
 if(error){state.notice='Booking lookup failed: '+error.message;render();return;}
 if(data.status!=='RESERVED'){state.notice='Reservation is '+data.status+'. Ask the student to book again if seats remain.';render();return;}
 if(!state.shows.some(x=>x.id===data.show_id)){state.notice='The reservation showing is not available at this cashier station.';render();return;}
 state.reservation=data;state.selectedShow=data.show_id;state.studentSearch=data.student_number;
 state.student={student_id:data.student_number,full_name:data.student_name,grade_level:'',section:data.section};
 state.quantity=data.quantity;state.cash='';
 state.notice='Reservation found. Verify the student ID, collect cash, and issue the paid tickets.';
 render();
}
async function makeSale(){
 if(state.busy)return;
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
 if(!['official','class_mayor','cashier'].includes(state.role))return;
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
  if(roleError||!ctx){render();return;}
  state.user=user;state.role=ctx.role;state.classId=ctx.scope_id;
  if(state.role==='class_mayor'&&!state.classId){state.user=null;render();return;}
  if(['ticket_checker','event_monitor'].includes(state.role))state.page=state.role==='ticket_checker'?'validator':'reports';
  await loadShows();
  if(state.page==='shifts'||state.role==='cashier')await fetchShift();
  if(state.role==='event_monitor'){try{const x=await db.rpc('lsc_movie_summary',{p_day:state.reportDate});state.summary=x.data}catch(e){}}
  render();
 }catch(e){root.innerHTML='<div class="movie-signin"><h1>Movie Booth unavailable</h1><p>'+esc(e.message)+'</p><a href="./login.html">Return to LSC Login</a></div>';}
}
document.addEventListener('click',async e=>{
 const target=e.target.closest('[data-act],[data-page],[data-print],[data-void],[data-toggle],[data-capacity]');
 if(!target)return;
 if(target.dataset.page){
  state.page=target.dataset.page;state.notice='';
  stopCamera();
  if(state.page==='recovery')state.reportDate='';
  if(state.page==='reports'||state.page==='recovery'){try{await loadReport()}catch(e){state.notice='Report error: '+e.message}}
  if(state.page==='shifts')await fetchShift();
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
  if(state.role!=='official')return;
  const reason=window.prompt('Reason for voiding this paid sale (8–300 characters):');
  if(reason===null)return;
  const {error}=await db.rpc('lsc_movie_void',{p_sale_id:target.dataset.void,p_reason:reason});
  if(error){state.notice=error.message;render();return;}
  state.notice='Sale voided. If the buyer paid cash, process any applicable refund manually.';
  await loadReport();render();return;
 }
 if(target.dataset.toggle){
  if(state.role!=='official')return;
  const sh=state.shows.find(x=>x.id===target.dataset.toggle);if(!sh)return;
  const {error}=await db.from('lsc_movie_shows').update({active:!sh.active}).eq('id',sh.id);
  if(error){state.notice=error.message;render();return;}
  await loadShows();render();return;
 }
 const act=target.dataset.act;
 if(act==='signout'){
   stopCamera();await db.auth.signOut();
   state.user=null;state.role=null;state.receipt=null;state.sales=[];state.student=null;state.notice='';
   state.otpSent=false;state.page='checkout';render();return;
 }
 if(act==='otp-back'){state.otpSent=false;state.otpEmail='';state.notice='';render()}
 if(act==='lookup')await lookupStudent();
 if(act==='find-reservation')await findReservation();
 if(act==='clear-reservation'){state.reservation=null;state.reservationCode='';state.student=null;state.studentSearch='';state.quantity=1;state.cash='';state.requestId=null;state.notice='Reservation cleared. Walk-in checkout is ready.';render()}
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
document.addEventListener('submit',async e=>{
 if(e.target.id==='movieSetupForm'){e.preventDefault();await createShow(e.target);}
 if(e.target.id==='movieShiftForm'){e.preventDefault();await saveShift(e.target);}
 if(e.target.id==='movieOtpEmail'){e.preventDefault();await volunteerOtpEmail(e.target);}
 if(e.target.id==='movieOtpVerify'){e.preventDefault();await volunteerOtpVerify(e.target);}
});
document.addEventListener('change',e=>{
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
start();
