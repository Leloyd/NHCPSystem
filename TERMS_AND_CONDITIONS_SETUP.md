# Terms and Conditions setup

The public Terms and Conditions use version `2026-09-07`. New email/password
and Google registrations must accept that version through the Terms page opened
from the Sign Up modal. Existing verified accounts are required to accept the
same version after their next successful credential check and before an
authenticated session is created.

## Deploy an existing Supabase project

1. Open the Supabase project used by the application.
2. Select **SQL Editor** in the left navigation.
3. Select **New query**.
4. Copy the complete contents of
   `database_sql/public_terms_acceptance_migration.sql` into the editor.
5. Select **Run**. This first migration only expands the schema and is safe to
   run before deploying the matching Python and template changes.
6. Deploy the application.
7. Return to **SQL Editor**, open another **New query**, copy the complete
   contents of `database_sql/remove_public_user_legacy_profile_columns.sql`,
   and select **Run**. This removes the unused `phone_number` and
   `organization` columns only after the compatible release is active. It does
   not use `CASCADE`, so an unexpected database dependency stops and rolls back
   the cleanup instead of being deleted.
8. Test both email/password sign-up and Google
   sign-up. Select **Sign In**, switch to **Sign Up**, open the Terms page, and
   select **Agree and Continue to Sign Up**. Both registration methods remain
   unavailable until that server-recorded step is complete.

The first migration adds nullable account columns, validation constraints, and
a private append-only `public_terms_acceptances` history table. It also enables
RLS on `public_users` and removes browser roles from that sensitive table;
Flask retains access through the server-only service-role key. The second
migration removes the unused `phone_number` and `organization` columns from
`public_users`.
Booking contact numbers and institution names are stored separately on booking
records and are not removed. No acceptance is fabricated for an existing user:
their Terms fields remain `NULL` until they select **Agree and Continue**.
Selecting **I Do Not Agree** leaves the user signed out. Public browsing remains
available.

## Future terms revisions

When the approved wording materially changes:

1. Update the content in `templates/TermsConditions.html`.
2. Change `PUBLIC_TERMS_VERSION` and `PUBLIC_TERMS_EFFECTIVE_DATE` in
   `legal_content.py`.
3. Deploy the new application version. The version mismatch automatically
   requires every existing account to accept the revised Terms after its next
   successful credential check or when an older authenticated session makes
   its next request.

The terms are application text, not legal advice. The museum or its authorized
legal/data-privacy officer should approve the final wording, official entity
name, contact details, retention rules, and any required privacy notice before
production use.
