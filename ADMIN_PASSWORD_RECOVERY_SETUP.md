# Administrator password recovery setup

The administrator portal uses the custom `public.admin_users` table rather
than Supabase Auth. Complete every step below before relying on **Forgot
password?** in production.

## 1. Install the secure reset tables and functions

1. Sign in to the Supabase dashboard and open the project used by this site.
2. In the left sidebar, select **SQL Editor**.
3. Select **New query**.
4. Open `admin_password_reset_tables.sql` in this project and copy the entire
   file.
5. Paste it into the Supabase query editor.
6. Select **Run**.
7. Open **Table Editor** and confirm these tables now exist:
   - `admin_password_reset_requests`
   - `admin_password_reset_tokens`

The SQL enables Row Level Security without adding browser policies. Only the
server-side Supabase service-role client can issue or consume reset tokens.

## 2. Configure the trusted reset-link origin

1. Open the project in Vercel.
2. Select **Settings** → **Environment Variables**.
3. Add:

   ```env
   ADMIN_PASSWORD_RESET_BASE_URL=https://your-production-domain.example
   ```

4. Confirm the existing `FLASK_SECRET_KEY` is a long, randomly generated,
   stable production secret. Do not rotate it during an active recovery; it
   signs the temporary recovery session and keys the private audit digests.

Use only the origin: `https://` plus the domain. Do not add `/_admin`, another
path, query parameters, or a trailing secret. Production recovery deliberately
rejects HTTP links and does not build links from the incoming browser Host
header.

## 3. Confirm encrypted SMTP delivery

Keep the same SMTP values already used for administrator notifications:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-app-password
SMTP_USE_TLS=true
SMTP_USE_SSL=false
MAIL_FROM_ADDRESS=notifications@example.com
MAIL_FROM_NAME=NHCP Museo ng Libingan
```

Use `SMTP_USE_TLS=true` for STARTTLS, normally on port 587. If the provider
requires implicit SSL, normally on port 465, set `SMTP_USE_TLS=false` and
`SMTP_USE_SSL=true`. Recovery emails are refused when neither encrypted mode is
enabled.

After saving the environment variables, redeploy the application.

Protect the administrator mailbox with multi-factor authentication. Anyone who
can read that mailbox during the 30-minute window can use its recovery link.

## 4. Test before an emergency

1. Open `https://your-domain/_admin/login` in a private browser window.
2. Select **Forgot password?**.
3. Enter the active email stored in `public.admin_users`.
4. Confirm the page always shows the generic success response.
5. Open the email and use the link within 30 minutes.
6. Enter a new password of at least 15 characters.
7. Confirm that the link cannot be reused and that old signed-in administrator
   sessions are sent back to the login screen.
8. In Supabase, confirm the corresponding token has a `used_at` value.

For privacy, unknown addresses receive the same browser response. Supabase
stores only keyed digests of submitted emails and IP addresses, and only a
SHA-256 digest of each reset token. The raw token is not stored in the database
or reset form and is removed from the browser address immediately after the
emailed link is validated.

## Emergency Supabase-owner recovery

Use this only if email recovery is unavailable and an authorized project owner
still controls Supabase. Never add a public recovery endpoint or put an admin
password in Vercel environment variables.

1. From a trusted computer with the project dependencies installed, run:

   ```bash
   python -c 'from getpass import getpass; from werkzeug.security import generate_password_hash; print(generate_password_hash(getpass("New admin password: ")))'
   ```

2. Copy the generated hash. The password itself is not printed or saved in
   shell history.
3. In Supabase **SQL Editor**, run the following after replacing both values:

   ```sql
   update public.admin_users
   set password_hash = 'PASTE_GENERATED_HASH_HERE',
       updated_at = timezone('utc', now())
   where email = 'authorized-admin@example.com';
   ```

4. Confirm exactly one row was updated.
5. Sign in with the new password and rotate any potentially exposed SMTP,
   Supabase, or Vercel credentials.

Changing `updated_at` invalidates all existing administrator sessions.
