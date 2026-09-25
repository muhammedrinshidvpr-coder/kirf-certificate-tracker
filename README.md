# KIRF Certificate Tracker

**A role-based portal where students upload activity certificates, faculty advisors review them, and admins track approvals across the department.**

---

## The problem

Colleges require students to collect activity points and certificates for graduation. Tracking them usually means paper files or shared spreadsheets, and advisors lose track of what has been submitted and verified.

## The solution

- **Students** upload certificates (stored in Supabase Storage) and see each one's status
- **Advisors / senior advisors** see the students in their department and approve or reject submissions
- **Admins** get a department-wide view and can update any certificate's status
- Each user's role (student, advisor, senior advisor, admin) sends them to the right dashboard after sign-in

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (Auth, Postgres, Storage, RLS)

## Run locally

```bash
npm install
# .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Requires Supabase tables `profiles` (with `role`, `department`) and `certificates`, and a `certificates` storage bucket.

## Author

Built by [Muhammed Rinshid V P](https://github.com/muhammedrinshidvpr-coder)

## License

[MIT](./LICENSE)
