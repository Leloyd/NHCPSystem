# Admin notifications setup

1. Open the Supabase project, choose **SQL Editor**, select **New query**, paste
   `admin_notifications_table.sql`, and click **Run** once.
2. Redeploy the application so the new admin notification routes are active.
3. In Vercel, keep the existing SMTP variables used by account and booking
   emails: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`,
   `SMTP_USE_TLS`, `MAIL_FROM_ADDRESS`, and optionally `MAIL_FROM_NAME`.

The email recipient is each active address in `admin_users`; no administrator
email is exposed in the browser. If SMTP is unavailable, the public booking or
submission still succeeds and its in-app notification remains available.
