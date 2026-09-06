import unittest

from legal_content import (
    PUBLIC_TERMS_ACCEPTANCE_SESSION_KEY,
    PUBLIC_TERMS_REVIEW_SESSION_KEY,
    PUBLIC_TERMS_VERSION,
    accept_current_public_terms,
    clear_public_terms_signup_state,
    current_public_terms_acceptance,
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


if __name__ == "__main__":
    unittest.main()
