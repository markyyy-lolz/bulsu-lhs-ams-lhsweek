# LSC Attendance Monitor — BulSU Laboratory High School

Independent website prototype: **GitHub Pages** frontend; **BrewPOS Supabase** project `rfxzbuocxersgbshczbj` as database. Requires school approval for actual student records.


## Separate websites (same GitHub Pages project)

The student-facing Time IN/Time OUT and staff administration areas now have **separate pages and URLs**:

- **Student attendance:** https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/student.html
- **Staff login / admin dashboard:** https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/login.html
- The main address `/` redirects to `student.html`.

**Security model:** Student attendance page does not show a login form or any student directory/reporting UI. Actual attendance recording is **locked** unless a school-authorized staff user has logged in using `login.html` on the **same browser/device** and activated the session. Staff should then click **Student Attendance** in the administration sidebar to open the dedicated kiosk. This ensures that arbitrary visitors cannot create real records just by knowing a Student ID. The staff session should remain supervised and the device should be restricted/kiosk-mode for school use.

If a student visits the public URL from their own phone with no school-approved station session, they can view the page and try **Demo Mode**, but cannot submit live records. Student self-check-in from arbitrary devices is **not yet enabled**, as it would need an approved verification/security model first.

The real Time IN / OUT handler and student database are unchanged, and all BrewPOS features remain isolated.

## Functions
- Student ID numeric 7–12 digits. Type, use touchscreen keypad, or compatible keyboard-wedge scanner.
- The first valid entry each Philippine calendar day is **Time IN**, then **Time OUT**, then IN, etc.
- Server-generated timestamp, database transaction/advisory lock, and 45-second duplicate-entry guard.
- Staff sign-in (Supabase Auth), dashboard, attendance history, CSV export, and admin-managed student roster.
- Demo Mode uses fake data in memory only. Demo IDs: `2023107337` and `2023999999`. No demo data writes to Supabase.
- No real students or approved staff are preloaded.

## First-time staff setup
1. Obtain written school authorization before importing or processing real student data.
2. In Supabase project `rfxzbuocxersgbshczbj`, go to **Authentication → Users**, then create/invite a school-authorized administrator email/password user.
3. In the Supabase SQL editor, execute the following, replacing the placeholder with the account's **actual** email:

```sql
insert into public.lsc_staff_roles(user_id, role)
select id, 'admin' from auth.users where email = 'approved-admin@school.example'
on conflict (user_id) do update set role=excluded.role;
```

For a regular supervised kiosk operator, use `'staff'` instead of `'admin'`. Never give students staff accounts.

4. Sign in at **login.html** and use **Student Directory → Add Student** to register authorized roster entries. A nonregistered ID cannot log attendance.
5. Open the dedicated **Student Attendance** page using the admin sidebar link in that same browser. Staff must supervise: knowing a student ID alone does not prove student identity.

## Publishing
Workflow `.github/workflows/pages.yml` tries to enable GitHub Pages on pushes to main. If needed, open the repository's **Settings → Pages**, choose **GitHub Actions** as publishing source, and rerun. Expected website URL:

https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/

If auth redirects require configuration, add the website URL in **Supabase → Authentication → URL Configuration**.

## Isolation and safety
Only `public.lsc_staff_roles`, `public.lsc_students`, `public.lsc_attendance_events`, and an LSC-only attendance RPC were created. The 18 existing `brew_*` tables remain untouched. All LSC tables use Row Level Security; direct log insertion is not granted to browser clients. The function authorizes caller's verified staff role on each entry.

The GitHub repository is public, so never upload student lists, passwords, service-role keys, or Supabase secrets. The publishable key in the frontend is intentionally public; Row Level Security protects records.

Before official school use, implement formal data retention, privacy notices and student verification procedures. Website demo displays no school logo or claims of official endorsement. The current records view loads at most 1,000 events for any selected day. Sessions crossing Philippine midnight start a fresh IN event the next day.
