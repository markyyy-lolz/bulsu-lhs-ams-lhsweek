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

**Class Mayor:** Can see only the student roster and attendance history for the one class assigned by an LSC Official. Read-only; cannot create classes, edit students, assign roles, or activate a real attendance terminal. All restrictions enforced by PostgreSQL Row Level Security (RLS), not only by UI.

**LSC Official:** May see attendance for the whole school, register students, create grade/section classes, and assign or revoke Class Mayor/LSC Official roles using the **Role Assignments** page. The server checks Official privileges for each role-management action. The initial Official must be provisioned by a Supabase project administrator as described below.

**Student terminal:** Public interface is a separate webpage without an administrator login form. A supervising **LSC Official** must log in at `login.html` on the **same browser/device** to activate real attendance logging. Entries will then alternate **IN / OUT / IN** for each registered Student ID and Philippine calendar day, with a **45-second duplicate guard** and a database timestamp in **Asia/Manila**. Class Mayors cannot activate the terminal. A student ID is a lookup identifier, not strong proof of identity; supervise the terminal.

**Demo mode:** Student page demos IDs `2023107337` and `2023999999` without database writes. Login page provides demo previews for both LSC Official and Class Mayor roles, also without writes.

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

4. Sign in at `login.html`. Under **Classes**, create each grade-level/section, then under **Student Directory**, register only authorized real Student IDs and assign each student to a class. No real student records or user accounts are seeded by the software.
5. Under **Role Assignments**, enter an already-created Supabase Auth email, choose **Class Mayor**, select that person's assigned class, and save. You may also grant other trusted LSC Officials access. Role changes are audited in `lsc_role_audit`.
6. On a designated, supervised attendance device, sign in as an LSC Official from `login.html`, then navigate to `student.html`. On a different browser/device without an Official session, the live terminal stays locked.

## Security model

- `lsc_staff_roles`: server-enforced official/mayor access list, with exactly one assigned class per mayor.
- `lsc_classes`: grade-level/section definitions; only Officials may edit.
- `lsc_students`: students scoped by class; Class Mayors only read their own class; Officials may edit.
- `lsc_attendance_events`: append-only attendance data, scoped by class in RLS; no direct browser INSERT grant.
- `lsc_role_audit`: audit log readable only by Officials.
- `lsc_record_attendance`: Official-only atomic check-in/out RPC using server timestamps, advisory lock, and 45-second duplicate protection.
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
