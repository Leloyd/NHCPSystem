# Administrator email OTP setup

The administrator login now requires both the correct password and a one-time
code delivered to the administrator email address.

## Existing Supabase project

1. Open the Supabase project used by the deployed website.
2. Select **SQL Editor** in the left navigation.
3. Select **New query**.
4. Copy the complete contents of
   `database_sql/admin_login_otp_migration.sql` into the editor.
5. Select **Run**. The query should finish successfully and create
   `admin_login_otp_challenges` plus the two protected database functions.

Run the migration before deploying the matching application code. Otherwise a
correct password cannot create its required OTP challenge and the login will
remain closed safely.

## Vercel email settings

The OTP uses the same secure SMTP settings as administrator password recovery.
In **Vercel → Project → Settings → Environment Variables**, confirm these are
present for Production (and Preview if you test there):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_smtp_username
SMTP_PASSWORD=your_smtp_password
MAIL_FROM_ADDRESS=your_verified_sender@example.com
MAIL_FROM_NAME=NHCP Museo ng Libingan
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

Use port `465`, `SMTP_USE_SSL=true`, and `SMTP_USE_TLS=false` only when the mail
provider specifically requires implicit SSL. Never enable TLS and SSL at the
same time, and never commit the SMTP password to Git.

## Verification behavior

- A full administrator session is created only after password and OTP both
  succeed.
- Each code has six digits, expires after 10 minutes, and works only once.
- Five incorrect code attempts invalidate the challenge.
- New-code requests have a 60-second cooldown and database-backed rate limits.
- Only hashes of the OTP, challenge token, IP address, and user agent are stored.
- Changing or disabling the administrator account invalidates pending codes and
  existing administrator sessions.

After saving environment variables, redeploy the website and test using the
administrator email. Also check spam or junk mail if the code is delayed.
