# Terms and Conditions setup

The public Terms and Conditions use version `2026-09-07`. New email/password
and Google registrations must accept that version through the Terms page opened
from the Sign Up modal. Existing verified accounts are not blocked or changed.

## Deploy an existing Supabase project

1. Open the Supabase project used by the application.
2. Select **SQL Editor** in the left navigation.
3. Select **New query**.
4. Copy the complete contents of
   `database_sql/public_terms_acceptance_migration.sql` into the editor.
5. Select **Run**. Run this migration before deploying the matching Python and
   template changes.
6. Deploy the application, then test both email/password sign-up and Google
   sign-up. Select **Sign In**, switch to **Sign Up**, open the Terms page, and
   select **Agree and Continue to Sign Up**. Both registration methods remain
   unavailable until that server-recorded step is complete.

The migration adds nullable account columns, validation constraints, and a
private append-only `public_terms_acceptances` history table. It does not
delete users or force existing accounts to accept the new document. Public
browsing remains available when a visitor selects **Not Now**.

## Future terms revisions

When the approved wording materially changes:

1. Update the content in `templates/TermsConditions.html`.
2. Change `PUBLIC_TERMS_VERSION` and `PUBLIC_TERMS_EFFECTIVE_DATE` in
   `legal_content.py`.
3. Decide with the museum whether existing users must accept the new version.
   The current implementation records the new version for new registrations
   but does not interrupt existing accounts.

The terms are application text, not legal advice. The museum or its authorized
legal/data-privacy officer should approve the final wording, official entity
name, contact details, retention rules, and any required privacy notice before
production use.
