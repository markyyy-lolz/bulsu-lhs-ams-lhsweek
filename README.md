# LSC Attendance Monitor — BulSU Laboratory High School

Independent website prototype: **GitHub Pages** frontend; **BrewPOS Supabase** project `rfxzbuocxersgbshczbj` as database. Requires school approval for actual student records.

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

4. Sign in at the GitHub Pages website and use **Student Directory → Add Student** to register authorized roster entries. A nonregistered ID cannot log attendance.
5. Open **Attendance Kiosk**. Staff must supervise: knowing a student ID alone does not prove student identity.

## Publishing
Workflow `.github/workflows/pages.yml` tries to enable GitHub Pages on pushes to main. If needed, open the repository's **Settings → Pages**, choose **GitHub Actions** as publishing source, and rerun. Expected website URL:

https://markyyy-lolz.github.io/bulsu-lhs-ams-lhsweek/

If auth redirects require configuration, add the website URL in **Supabase → Authentication → URL Configuration**.

## Isolation and safety
Only `public.lsc_staff_roles`, `public.lsc_students`, `public.lsc_attendance_events`, and an LSC-only attendance RPC were created. The 18 existing `brew_*` tables remain untouched. All LSC tables use Row Level Security; direct log insertion is not granted to browser clients. The function authorizes caller's verified staff role on each entry.

The GitHub repository is public, so never upload student lists, passwords, service-role keys, or Supabase secrets. The publishable key in the frontend is intentionally public; Row Level Security protects records.

Before official school use, implement formal data retention, privacy notices and student verification procedures. Website demo displays no school logo or claims of official endorsement. The current records view loads at most 1,000 events for any selected day. Sessions crossing Philippine midnight start a fresh IN event the next day.
