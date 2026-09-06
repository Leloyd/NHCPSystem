import unittest
from datetime import datetime, timedelta, timezone

from legal_content import (
    PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY,
    PUBLIC_TERMS_LOGIN_SESSION_KEY,
    PUBLIC_TERMS_REVIEW_SESSION_KEY,
    PUBLIC_TERMS_VERSION,
    accept_current_public_terms,
    clear_public_terms_login,
    clear_public_terms_signup_state,
    current_public_terms_acceptance,
    current_public_terms_login,
    stage_public_terms_login,
    user_has_current_public_terms,
)


class PublicTermsSessionTests(unittest.TestCase):
    def test_acceptance_is_versioned_and_reused(self):
        session_store = {}

        first = accept_current_public_terms(session_store)
        second = accept_current_public_terms(session_store)

        self.assertEqual(first, second)
        self.assertEqual(first["version"], PUBLIC_TERMS_VERSION)
        self.assertTrue(first["accepted_at"])
        self.assertEqual(current_public_terms_acceptance(session_store), first)

    def test_old_or_incomplete_acceptance_is_rejected(self):
        self.assertIsNone(
            current_public_terms_acceptance(
                {PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY: {"version": "old", "accepted_at": "2020-01-01"}}
            )
        )
        self.assertIsNone(
            current_public_terms_acceptance(
                {PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY: {"version": PUBLIC_TERMS_VERSION}}
            )
        )

    def test_clear_removes_only_signup_legal_state(self):
        session_store = {
            PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY: {"version": PUBLIC_TERMS_VERSION, "accepted_at": "now"},
            PUBLIC_TERMS_REVIEW_SESSION_KEY: {"return_to": "/"},
            "unrelated": "keep",
        }

        clear_public_terms_signup_state(session_store)

        self.assertNotIn(PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY, session_store)
        self.assertNotIn(PUBLIC_TERMS_REVIEW_SESSION_KEY, session_store)
        self.assertEqual(session_store["unrelated"], "keep")

    def test_user_must_have_current_version_and_timestamp(self):
        self.assertTrue(
            user_has_current_public_terms(
                {"terms_version": PUBLIC_TERMS_VERSION, "terms_accepted_at": "2026-09-07T00:00:00+00:00"}
            )
        )
        self.assertFalse(user_has_current_public_terms({"terms_version": PUBLIC_TERMS_VERSION}))
        self.assertFalse(user_has_current_public_terms({"terms_version": "older", "terms_accepted_at": "now"}))

    def test_pending_login_is_short_lived_and_clearable(self):
        session_store = {}
        stage_public_terms_login(
            session_store,
            {"id": 8, "updated_at": "2026-09-07T00:00:00+00:00"},
            "/account",
        )
        pending = current_public_terms_login(session_store)
        self.assertEqual(pending["user_id"], 8)
        self.assertEqual(pending["next"], "/account")

        clear_public_terms_login(session_store)
        self.assertNotIn(PUBLIC_TERMS_LOGIN_SESSION_KEY, session_store)

    def test_expired_pending_login_is_removed(self):
        session_store = {
            PUBLIC_TERMS_LOGIN_SESSION_KEY: {
                "user_id": 4,
                "account_version": "version",
                "next": "/account",
                "expires_at": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(),
            }
        }
        self.assertIsNone(current_public_terms_login(session_store))
        self.assertNotIn(PUBLIC_TERMS_LOGIN_SESSION_KEY, session_store)


if __name__ == "__main__":
    unittest.main()
