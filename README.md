# LSC Attendance Monitoring System

Independent prototype for **Bulacan State University Laboratory High School LSC**. Not an official school system unless approved by the institution.

**Website hosting:** GitHub Pages — `markyyy-lolz/bulsu-lhs-ams-lhsweek`
**Database:** Existing BrewPOS Supabase project `rfxzbuocxersgbshczbj`, using only separately named `lsc_*` tables and functions. No BrewPOS customer data or tables changed.
**Branding:** User-supplied LSC crest and **Powered by Azure<3**.

## Two independent website screens

| Screen | URL |
|---|---|
| Student Time IN / Time OUT | https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/student.html |
| Class Mayor / LSC Official login | https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/login.html |

The root URL redirects to the student terminal.

## Uploaded masterlists (Grades 8–10, October 30, 2026)

The user-supplied 16 image masterlists were transcribed and imported **privately into Supabase only**; no roster or list of names is stored in this public GitHub repository.

- **Grade 8:** 159 students from 5 sections; temporary codes `2025000001`–`2025000159`.
- **Grade 9:** 212 students from 6 sections; temporary codes `2024000001`–`2024000212`.
- **Grade 10:** 169 students from 5 sections; temporary codes `2023000001`–`2023000169`. The previous active Grade 10–Mulawin test record is preserved.
- **Grade 7:** prefix `2026` reserved, but no Grade 7 masterlist was uploaded.

**IMPORTANT:** These numbers are generated **local placeholders**, not verified official university student IDs. The 540 imported students are `active=false`, `id_origin='generated_pending_verification'`; **live Time IN/OUT will reject these IDs** until an authorized LSC Official compares the image transcription against the approved school record, replaces the temporary number with the official ID, checks the verification acknowledgement, and activates the student.

The database constraint `lsc_verified_before_active` prevents activation while `id_origin='generated_pending_verification'`. The class names and adviser fields were copied into private Supabase classes for staff reference. Since the source images are photographs, spellings should be rechecked before approving the roster.

## Access permissions

**Class Mayor:** Can view and **record Time IN/Time OUT only for classmates in the one section assigned by an LSC Official**. Can activate the attendance terminal when signed in on the same browser/device. Cannot manage other classes, edit students, create classes, or assign roles. Both read access and server-side record calls enforce class scope.

**LSC Official:** May see attendance for the whole school, register students, create grade/section classes, and assign or revoke Class Mayor/LSC Official roles using the **Role Assignments** page. The server checks Official privileges for each role-management action. The initial Official must be provisioned by a Supabase project administrator as described below.

**Student terminal:** Public interface is a separate webpage without an administrator login form. A supervising **Class Mayor or LSC Official** must sign in at `login.html` on the **same browser/device** to activate real attendance logging. Class Mayors are limited to their assigned section; Officials may record school-wide. Entries alternate **IN / OUT / IN** per Student ID and Philippine calendar day, with a **45-second duplicate guard** and a database timestamp in **Asia/Manila**. A Student ID alone is not proof of identity; supervise the terminal.

**Demo mode:** Student page demos IDs `2023107337` and `2023999999` without database writes. Login page provides demo previews for both LSC Official and Class Mayor roles, also without writes.

## Showing Deletion and Student Reservation QR

**Movie Setup → Delete Showing** is restricted to authenticated LSC Officials and requires typing \`DELETE\`:
- If no sales, reservation records, or volunteer assignments exist, the showing is permanently deleted.
- If it has any historical records or volunteer assignments, it is **archived**, leaving all sales, reservation codes, tickets and audits intact. While a student has a current unexpired reservation, deletion is blocked until the hold expires or is cancelled.
- **Archived Showings → Restore Showing** restores the showing in paused mode with online booking disabled. Showing management is audited through a protected database function.

**Student reservation QR:** [Online Booking](https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/reserve.html) displays a QR containing only the random \`RSV-\` reference; it is printable and can be retrieved on the **Check Reservation** screen using the original reference plus Student ID. The QR contains no Student ID/name and does not constitute a paid ticket.

**Direct-to-cashier QR scanning:** [Movie Booth POS → Ticket Checkout](https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/movie.html) includes **Scan Reservation QR**. A signed-in cashier, Class Mayor, or LSC Official can scan the student's \`RSV-\` booking QR using the laptop/phone camera, or type/scan the code with an external USB/Bluetooth QR reader and press Enter. The cashier then sees the reservation, authorized student details, movie, quantity and amount directly on the checkout screen. No volunteer pre-scan or separate verification page is needed. The lookup does **not** charge the student; cash must be collected and **Confirm Payment & Issue Tickets** pressed by the cashier.

Once paid, the cashier converts the reservation into a sale and generates separate \`FW-\` admission ticket QR(s). Physical QR camera access and 80mm printer compatibility still require real-device testing. The implementation preserves existing student, attendance, sales and ticket records.

## Movie Booth v2.2 — RFID/NFC + PIN Staff Card and Supervisor Void Approval

**Status:** Implemented in website and Supabase. Physical RFID readers, Android NFC tags, real sale-to-void flow, and cash/printing workflow still require on-device tests.

**Staff sign-in:** Existing approved Supabase email OTP remains the actual account authentication. Staff enroll one card and six-digit PIN from Movie Booth POS → Staff Card / NFC. The card quick-unlocks an already-authenticated browser station, after initial entry or five minutes of inactivity. New browsers still require email sign-in. Only approved LSC Officials and specifically assigned Movie Booth volunteers have access. Class Mayors remain blocked.

**Readers:** Windows USB HID keyboard-emulation readers enter the card UID into the focused field. Android Chrome supports Read Android NFC only where Web NFC NDEFReader and tag serial numbers are available. NFC compatibility is device- and tag-dependent. A 125 kHz RFID card cannot be read by an Android phone's built-in 13.56 MHz NFC hardware.

**Protection:** Card fingerprints use SHA-256; six-digit PIN verifiers use bcrypt in protected RLS tables. Failed attempts are logged and rate-limited. Staff can revoke or replace their enrolled card by signing in. Quick-unlock is an additional station UI control, not standalone login or server enforcement for every legacy POS action.

**Void:** A cashier requests to void their own paid sale; an enrolled LSC Official approves by scanning their card and entering PIN. Cashier self-approval is blocked. LSC Officials may authorize their own administrator actions using their card and PIN. The backend verifies roles and PIN, row-locks the sale, applies VOID and audits cashier, supervisor, sale, reason and request ID atomically. The old browser-callable void RPC has been revoked to prevent approval bypass. Cash refunds remain manual.

**Functions:** lsc_movie_staff_card, lsc_movie_void_with_approval (client endpoints), and private lsc_movie_card_check (not client-callable). No service-role key is included in browser code.

## Movie Booth POS role isolation (Class Mayor access disabled)

**Movie Booth POS is restricted to LSC Officials and explicitly approved Movie Booth volunteers only** (Cashier, Ticket Checker, and Event Monitor). The **Class Mayor role does not grant any Movie Booth access**, even for check-in, reservations, sales, shifts, reports, or scans. A user with a Class Mayor role cannot be assigned a separate Movie Booth volunteer role.

The restriction is enforced in the \`lsc_movie_context()\` server-side authorization function, the reservation scan and volunteer-approval functions, and Movie Booth data-table RLS policies; hiding buttons alone is not relied on. The Movie Booth website shows an access-restricted message for unauthorized users. The LSC school dashboard hides its Movie Booth staff shortcut from Class Mayors.

**Unaffected:** Class Mayors can still use the regular Student Attendance terminal, their own classroom attendance permissions, and class-scoped Foundation Week activities/announcements. The Foundation Week Command Center no longer returns Movie Booth show information to Class Mayor accounts. Students can still use the public movie-reservation page; the public booking is not a staff permission.

**RFID/NFC and six-digit PIN staff login are planned, not installed or activated**. The current Movie Booth login remains email OTP for approved users, with existing Supabase session support. Do not assume a RFID card UID alone can authenticate or approve a void.

## Foundation Week v2.1: Operations Upgrade (2026)

**Existing product name is unchanged**. This release adds an *authorized* event management workspace:
- **[Foundation Week Command Center](https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/operations.html)**
- **[Movie Booth POS](https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/movie.html)**

### Features now implemented

1. **Individual Movie Ticket QR codes & validation**: each issued ticket has a unique code. Print QR codes via a version-pinned QR library (text remains printable if the library cannot load). Ticket checker validates first, then taps **Admit & Redeem**. The database locks the ticket row and records single-use admission. Used, void and wrong-day tickets are rejected with audited results.
2. **Capacity & showtime management**: LSC Official sets an optional 1–5,000 seat limit, showing date and optional time. Atomic checkout locks the show and refuses quantities beyond total paid ticket capacity, even on simultaneous cashiers. Voided sales free capacity. Show price remains immutable; sales retain original unit prices.
3. **Cross-device ticket checker**: QR camera scanner lazily loads the pinned \`html5-qrcode@2.3.8\` library and attempts camera decoding. A manual code field and USB/Bluetooth keyboard scanners work as fallback; iOS in-app browsers may block camera permission.
4. **Cashier shifts**: an authorized cashier opens with float, closes with physical cash counted, and receives the server-calculated expected cash and difference plus previous shift history. Assigned volunteer cashiers **must open a shift** to sell.
5. **Print recovery & audit**: reprint previously saved ticket batches, including a VOID watermark for voided sales, without duplicating the sale. Print requests are audited but are not proof of physical successful printing. Supports browser printing on configured 80mm thermal printers.
6. **Advanced analytics & Event Pulse**: private 30-second refresh of movie showings, sales, admission redemptions, hourly ticket sales, stamp totals and attendance-arrival totals, in authorized scope. No individual student names appear in the aggregated Command Center.
7. **Volunteers & least-privilege roles**: an LSC Official assigns an existing authenticated email to Cashier, Ticket Checker, or Event Monitor, with optional showing restriction; may disable access. Volunteers can sign in with email OTP directly in Movie Booth POS. Do not grant unrelated BrewPOS accounts without school authorization.
8. **Announcements**: LSC Officials publish/hide notices. Other authorized roles only see published notices.
9. **Foundation Stamp Rally**: LSC Officials create school-approved rewards with a distinct activity stamp threshold. Claiming is audited, prevents duplicate claims and is not linked to grades or school disciplinary status.
10. **Fraud & Audit Center**: LSC Officials can review recent ticket validation outcomes (including repeat/void attempts), browser print requests and existing sales void history.
11. **Mobile event station**: responsive ticket checking and camera scan where compatible, plus manual barcode code entry on all browsers. The ticket redemption authority remains server-side.
12. **Foundation Week Closing Report**: print an A4 overview or export an aggregated summary CSV. Sales Reports separately offer filtered detailed transactions, role-scoped CSV and A4 print.
13. **Connection recovery**: clearly mark disconnected state and block offline checkout, redemption and staff-changing actions. Never issue unverified offline movie tickets; reuse the in-memory checkout request key when retrying an uncertain sale and inspect Reports to avoid charging twice.

### Operation and launch checklist
- School approval: set the correct movie screening details, 80mm paper size and cash policy.
- Test a full **sale → ticket print → ticket validation → admission → repeated validation** workflow on real laptops/tablets and the physical VOZY G80 printer. Driver pairing and actual cutter behavior have **not** been hardware verified here.
- Verify roles on separate real accounts (LSC Official, Class Mayor, Cashier, Ticket Checker, Event Monitor) before authorizing volunteers.
- Configure announced activity dates, admission rules and rewards with school officials; no additional defaults or student-facing public lists are created.
- A movie ticket is **not a BIR official sales invoice**; recorded cash refunds require separate real-world reconciliation.
- Preserve attendance and sales history: all schema changes are additive; never publish raw student-level CSV reports in GitHub Pages.

## Movie Booth POS — Foundation Week cash ticketing

**Private route:** [Movie Booth POS](https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/movie.html) (also linked from the authorized dashboard sidebar).

### LSC Official first-time setup
1. Sign in through \`login.html\`. Open **Movie Booth POS → Movie Setup**.
2. Create a movie showing with the actual title, showing date (Philippine Time), optional venue and **school-approved PHP ticket price**. No guessed price or default paid show is seeded.
3. Select **Ticket Checkout**. Enter an active student's assigned attendance ID, click **Find Student**, and confirm their identity physically.
4. Enter the quantity (**1–20 tickets per sale**), cash received and verify the calculated total/change. Cash payment is accounted for by staff; **no actual online payment processing** takes place.
5. Select **Confirm Payment & Issue Tickets**. The server atomically creates an audited sale and **one unique ticket code for each ticket**. Print individual admission slips through the browser print dialog (designed for approximately 80mm thermal paper, also printable to PDF or ordinary printer).
6. Use **Sales Reports** to see the server-calculated total cash sales, ticket quantities, void counts and per-transaction cashier history. Filter a Philippine date or show all, download a scoped CSV, or print an A4 report.
7. LSC Officials may **void** a sale with a reason. Ticket history is preserved and printed voided tickets are labeled invalid. Any cash refund must be processed and recorded separately by the operator.

### Roles, permissions and safety
- **LSC Official**: create, pause/resume showings, sell tickets school-wide, view full reports, reprint and void.
- **Class Mayor**: sell tickets for students **within the assigned class only**, view that class's sales, reprint tickets sold to their classmates. No movie setup, price changes or sale voiding.
- **No public checkout:** the site requires a preexisting LSC Auth session. The Supabase RLS policies prevent reading another class's transactions or direct client-side insertion/changes to sales and tickets. Sale issue and void use server-side, role-checked RPCs.
- **Duplicate-sale protection:** a browser-generated checkout UUID is held during retries. The server uses a lock and unique \`request_id\`; an identical retry returns the original receipt, not a second sale.
- **No accidental price changes:** sale rows copy the ticket price at checkout. Existing shows' titles/prices/dates are immutable; LSC Officials can pause/resume sales and create a new show to change offerings.
- **Printed ticket is an event admission pass, not a BIR-registered invoice/official receipt**. Ticket codes are not automatically redeemed or scanned at entry in this release.
- New tables \`lsc_movie_shows\`, \`lsc_movie_sales\`, \`lsc_movie_tickets\` are isolated from the main attendance tables and unrelated BrewPOS data. No automatic student attendance events are created from ticket sales.

## Foundation Week Experience — unique event features

The **existing system name is unchanged**. A new, private **Foundation Passport** workspace has been added for Foundation Week operations; the original Student Time IN/OUT terminal and historical records remain separate and untouched.

### Features

- **Foundation Activity Studio** — LSC Officials create an activity, scheduled event date (Philippine Time) and optional venue, then pause/resume stamping. Class Mayors see those activities but cannot change them.
- **Supervised Digital Event Passport** — an authorized Class Mayor/Official enters a student's *local attendance ID* and station name to award one participation stamp per student per activity; duplicate stamps return the original stamp without creating another row. Stamps can only be written on the configured activity date, from authorized sessions.
- **Event Pulse** — counts of configured events, in-scope active students, stamps received and per-activity participation coverage. This is refreshed on demand and is **not** a public student directory or proof of absence.
- **Private Personal Passport** — authenticated operators can review a student's own stamps and positive milestone badges at 1/3/5 activities, subject to section restrictions.
- **Section-scoped Audit & CSV** — for a selected activity, see stamped students, timestamp, station and recorded-by operator; export permitted records to CSV. Both the table and the export obey Supabase RLS.
- **Foundation Week Dashboard shortcut** — visible to both authorized account roles.

### Event setup and operation

1. An LSC Official signs into \`login.html\` and opens **Foundation Passport** from the sidebar.
2. In **Organizer Studio**, create each Foundation Week activity with its **actual date** and optional venue. No activities or dates are auto-created because the school schedule has not been supplied.
3. At the event, the authorized operator opens that activity, checks that the student is physically present, enters their attendance ID, labels the station and selects **Stamp Event Passport**.
4. On a successful stamp, the system saves the authenticated operator's ID, email, role and station with a server timestamp. It rejects repeats and wrong-class scans.
5. Use **Refresh Pulse** and **Event Stamp Audit** to monitor participation and export a per-activity CSV. Students without a stamp are *not* automatically classified absent.

### Privacy and implementation notes

- Uses additional \`lsc_fw_activities\` and \`lsc_fw_passport_stamps\` tables. No modification to BrewPOS tables or to existing daily \`lsc_attendance_events\` rows.
- Only authenticated Class Mayors and LSC Officials may read activities. Stamp data is scoped by the student's class in RLS; direct browser inserts to stamps are denied. The \`lsc_fw_stamp\` RPC validates role/class/date and creates trusted server-side audit values.
- An LSC Official can create/pause activities; Class Mayors may stamp only assigned classmates. The database, not just the UI, enforces access.
- The demo screen does not write to Supabase. Stamping is an *event participation record*, not a replacement for verified physical identity.
- All student details belong in private Supabase tables and authorized operator views; never put exported rosters, logs or private images in this public GitHub repository.
- Unique stamp constraints + date checks reduce errors, but no software-only system can prove physical presence. Supervise stations.

## Email verification login + optional backup password

The Class Mayor / LSC Official portal uses **Supabase email verification first**:

1. Enter an **existing, approved Supabase Auth email address** at `login.html`.
2. Click **Send verification email**. The site calls `signInWithOtp` with `shouldCreateUser:false` (no public self-registration).
3. Enter the emailed six-digit code at the prompt, **or** open the magic link in the email if the Supabase template is configured to send links. The portal calls `verifyOtp({ email, token, type:'email' })` for code entry. An authorized `lsc_staff_roles` role is still mandatory.
4. After verification, select **Account Security** to set a new **backup password** (12+ characters). This is optional and uses `auth.updateUser({password})` from the already signed-in session.
5. On subsequent visits, use verification emails as normal, or click **Have a backup password?** to use `signInWithPassword`. The backup password is an *alternative login method*, not a second authentication factor.

**One-time Supabase configuration** (project `rfxzbuocxersgbshczbj`):

- Ensure Email auth is enabled in **Authentication → Providers → Email**.
- Add `https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/login.html` under **Authentication → URL Configuration → Redirect URLs**, then verify the correct Site URL.
- In **Authentication → Email Templates → Magic Link**, include `{{ .Token }}` in the template to send a six-digit code. If the template uses `{{ .ConfirmationURL }}` instead, Supabase sends a magic link; clicking it will sign in to the same authorized portal. Configure the appropriate template and sender before requesting emails.
- Existing accounts can sign in with emailed verification even if no password was set, subject to the project's email confirmation and authentication settings.
- New accounts must first be provisioned by the school administrator in Supabase Authentication; the website **does not allow public registration**. An LSC Official then assigns an existing account to an LSC role.
- Email delivery is subject to Supabase's configured email provider and rate limits. For real school deployment configure a school-managed SMTP sender and test delivery; this repository cannot change those settings.
- Do **not** store verification codes, session tokens, or passwords in GitHub or student records.

## First-time setup before real student attendance (required)

1. Obtain explicit school approval and a data-processing policy before adding student names or attendance records, consistent with the Philippines Data Privacy Act.
2. In [Supabase Auth Users](https://supabase.com/dashboard/project/rfxzbuocxersgbshczbj/auth/users), invite or create the first school-approved LSC Official email/password account. Do not reuse unrelated BrewPOS accounts.
3. From the project's SQL Editor, execute the following with that exact authorized email (only after confirming the account is created):

```sql
insert into public.lsc_staff_roles (user_id, role, class_id)
select id, 'official', null
from auth.users
where lower(email) = lower('approved-official@school.example')
on conflict (user_id)
do update set role = 'official', class_id = null;
```

Verify the account has a role:

```sql
select count(*) from public.lsc_staff_roles
where role='official';
```

4. Sign in through email verification at `login.html`. Under **Classes**, create each grade-level/section, then under **Student Directory**, register only authorized real Student IDs and assign each student to a class. No real student records or user accounts are seeded by the software.
5. Under **Role Assignments**, enter an already-created Supabase Auth email, choose **Class Mayor**, select that person's assigned class, and save. You may also grant other trusted LSC Officials access. Role changes are audited in `lsc_role_audit`.
6. On a designated, supervised attendance device, sign in as an LSC Official **or assigned Class Mayor** from `login.html`, then navigate to `student.html` in the same browser. Other browsers or devices without a logged-in, assigned role stay locked. The station displays the logged-in operator.

## Security model

- `lsc_staff_roles`: server-enforced official/mayor access list, with exactly one assigned class per mayor.
- `lsc_classes`: grade-level/section definitions; only Officials may edit.
- `lsc_students`: students scoped by class; Class Mayors only read their own class; Officials may edit.
- `lsc_attendance_events`: append-only attendance data, scoped by class in RLS; no direct browser INSERT grant. Every new event stores `recorded_by` (Supabase Auth user UUID), `recorded_by_email` (snapshot), and `recorded_by_role` (snapshot). The **Recorded By** column appears in both dashboard views and attendance CSV exports. Existing events retain their timestamps and event types; their operator email is backfilled where possible, but historical roles remain blank rather than guessed.
- `lsc_role_audit`: audit log readable only by Officials.
- `lsc_record_attendance`: Official or assigned Class Mayor atomic check-in/out RPC, with server-enforced section restriction for mayors. It uses server timestamps, advisory locks, and 45-second duplicate protection. The signed-in user ID is **never accepted from the browser**; it comes from the validated JWT.
- `lsc_assign_role`, `lsc_revoke_role`, `lsc_list_roles`: separately authorized Official-only actions.
- The public website contains only the **Supabase publishable key**; no service-role secret or student database dump is checked in.

Security notes: privileged RPCs are security-definer functions callable by signed-in users but explicitly reject non-Officials on the server. Review Supabase security advisors periodically and enable leaked-password protection in Auth settings. Existing BrewPOS schema and policies are outside this system.

## Known limitations / safeguards

- Staff and students remain **unprovisioned** until the school approves and onboards them.
- GitHub Pages is public; database access is private and role-scoped.
- No self-service student check-in from arbitrary phones; only Official-activated supervised station for actual records.
- Current UI reads up to 2,000 students and 1,000 attendance events per selected date, with no pagination yet.
- Each new Philippine calendar day starts with a new Time IN; no special overnight/late-session rules.
- CSV exports should be handled securely according to the school's retention policy; use a school-managed device.
- The project does not independently verify the student's identity from Student ID entry alone.
