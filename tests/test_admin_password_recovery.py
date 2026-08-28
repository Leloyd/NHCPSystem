import os
import unittest
from unittest.mock import patch

from admin_password_recovery_content.security import secret_digest, token_digest, trusted_base_url


class AdminPasswordRecoverySecurityTests(unittest.TestCase):
    def test_secret_digests_are_purpose_separated(self):
        email_digest = secret_digest("server-secret", "email", "admin@example.com")
        ip_digest = secret_digest("server-secret", "ip", "admin@example.com")
        self.assertEqual(len(email_digest), 64)
        self.assertNotEqual(email_digest, ip_digest)

    def test_token_digest_never_returns_raw_token(self):
        raw_token = "private-token-value"
        digest = token_digest(raw_token)
        self.assertEqual(len(digest), 64)
        self.assertNotIn(raw_token, digest)

    def test_production_requires_https_origin(self):
        with patch.dict(os.environ, {"ADMIN_PASSWORD_RESET_BASE_URL": "http://example.com"}):
            with self.assertRaises(ValueError):
                trusted_base_url(is_production=True)

    def test_origin_rejects_credentials_paths_and_queries(self):
        invalid_values = (
            "https://user:pass@example.com",
            "https://example.com/admin",
            "https://example.com?redirect=evil",
        )
        for value in invalid_values:
            with self.subTest(value=value), patch.dict(
                os.environ, {"ADMIN_PASSWORD_RESET_BASE_URL": value}
            ):
                with self.assertRaises(ValueError):
                    trusted_base_url(is_production=True)

    def test_local_http_is_allowed_only_outside_production(self):
        with patch.dict(os.environ, {"ADMIN_PASSWORD_RESET_BASE_URL": "http://localhost:5000/"}):
            self.assertEqual(
                trusted_base_url(is_production=False),
                "http://localhost:5000",
            )


if __name__ == "__main__":
    unittest.main()
