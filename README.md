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

## Access permissions

**Class Mayor:** Can view and **record Time IN/Time OUT only for classmates in the one section assigned by an LSC Official**. Can activate the attendance terminal when signed in on the same browser/device. Cannot manage other classes, edit students, create classes, or assign roles. Both read access and server-side record calls enforce class scope.

**LSC Official:** May see attendance for the whole school, register students, create grade/section classes, and assign or revoke Class Mayor/LSC Official roles using the **Role Assignments** page. The server checks Official privileges for each role-management action. The initial Official must be provisioned by a Supabase project administrator as described below.

**Student terminal:** Public interface is a separate webpage without an administrator login form. A supervising **Class Mayor or LSC Official** must sign in at `login.html` on the **same browser/device** to activate real attendance logging. Class Mayors are limited to their assigned section; Officials may record school-wide. Entries alternate **IN / OUT / IN** per Student ID and Philippine calendar day, with a **45-second duplicate guard** and a database timestamp in **Asia/Manila**. A Student ID alone is not proof of identity; supervise the terminal.

**Demo mode:** Student page demos IDs `2023107337` and `2023999999` without database writes. Login page provides demo previews for both LSC Official and Class Mayor roles, also without writes.

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
