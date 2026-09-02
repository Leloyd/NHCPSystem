import unittest

from user_accounts_content.validation import is_valid_email_address, normalize_email_address


class PublicSignupEmailValidationTests(unittest.TestCase):
    def test_normalizes_valid_email(self):
        self.assertEqual(normalize_email_address("  Visitor.Name+tour@Gmail.COM  "), "visitor.name+tour@gmail.com")

    def test_rejects_trailing_punctuation_after_domain(self):
        invalid_values = (
            "a@a.com!",
            "visitor@example.com.",
            "visitor@example.com,",
            "visitor@example.com extra",
        )
        for value in invalid_values:
            with self.subTest(value=value):
                self.assertFalse(is_valid_email_address(value))
                with self.assertRaises(ValueError):
                    normalize_email_address(value)

    def test_rejects_invalid_domain_and_local_part_shapes(self):
        invalid_values = (
            "visitor@example",
            "visitor@@example.com",
            ".visitor@example.com",
            "visitor..name@example.com",
            "visitor@-example.com",
            "visitor@example-.com",
            "visitor@example.1",
        )
        for value in invalid_values:
            with self.subTest(value=value):
                self.assertFalse(is_valid_email_address(value))

    def test_accepts_common_real_world_address_shapes(self):
        valid_values = (
            "visitor@example.com",
            "visitor.name+museum@gmail.com",
            "museum-office@nhcp.gov.ph",
            "heritage_visitor@example.org",
        )
        for value in valid_values:
            with self.subTest(value=value):
                self.assertTrue(is_valid_email_address(value))


if __name__ == "__main__":
    unittest.main()
