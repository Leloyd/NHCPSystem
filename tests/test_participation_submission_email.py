import os
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

EMAILER_PATH = Path(__file__).resolve().parents[1] / "participation_submissions_content" / "emailer.py"
SPEC = importlib.util.spec_from_file_location("participation_submission_emailer", EMAILER_PATH)
emailer = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(emailer)
EmailDeliveryError = emailer.EmailDeliveryError
send_participation_decision_email = emailer.send_participation_decision_email


SMTP_ENV = {
    "SMTP_HOST": "smtp.example.com",
    "SMTP_PORT": "587",
    "SMTP_USERNAME": "mailer",
    "SMTP_PASSWORD": "secret",
    "MAIL_FROM_ADDRESS": "museum@example.com",
    "MAIL_FROM_NAME": "NHCP Museum",
    "SMTP_USE_TLS": "true",
}


class ParticipationDecisionEmailTests(unittest.TestCase):
    @patch.object(emailer.smtplib, "SMTP")
    def test_rejection_email_includes_feedback_and_escapes_html(self, smtp_factory):
        with patch.dict(os.environ, SMTP_ENV, clear=False):
            send_participation_decision_email(
                to_email="visitor@example.com",
                recipient_name="Museum Visitor",
                submission_title="My <Story>",
                decision="rejected",
                feedback="Please add a source.\n<script>alert(1)</script>",
                account_url="https://museum.example.com/account#participationPanel",
            )

        smtp = smtp_factory.return_value.__enter__.return_value
        message = smtp.send_message.call_args.args[0]
        self.assertEqual(message["To"], "visitor@example.com")
        self.assertIn("needs changes", message["Subject"])
        self.assertIn("Please add a source.", message.get_body(preferencelist=("plain",)).get_content())
        html_body = message.get_body(preferencelist=("html",)).get_content()
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", html_body)
        self.assertNotIn("<script>", html_body)

    def test_decision_email_requires_smtp_configuration(self):
        empty_env = {key: "" for key in SMTP_ENV}
        with patch.dict(os.environ, empty_env, clear=False):
            with self.assertRaises(EmailDeliveryError):
                send_participation_decision_email(
                    to_email="visitor@example.com",
                    recipient_name="Visitor",
                    submission_title="Story",
                    decision="approved",
                    feedback="Thank you for this contribution.",
                    account_url="https://museum.example.com/account",
                )


if __name__ == "__main__":
    unittest.main()
