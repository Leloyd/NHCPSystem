import unittest
from unittest.mock import patch

from visitor_feedback_content.routes import _validate_visitor_feedback_payload
from visitor_feedback_content.service import build_public_visitor_feedback, prepare_visitor_feedback_item


class VisitorFeedbackPublicationTests(unittest.TestCase):
    def test_public_name_never_exposes_full_name(self):
        prepared = prepare_visitor_feedback_item({
            "visitor_name": "Maria Clara Santos",
            "public_name_preference": "first_name",
            "rating": 2,
        })
        self.assertEqual(prepared["public_display_name"], "Maria S.")

    def test_negative_rating_counts_while_pending_comment_stays_private(self):
        records = [{
            "id": 7,
            "visit_type": "website",
            "rating": 1,
            "visitor_name": "Sample Visitor",
            "comments": "The page was difficult to use.",
            "public_display_consent": True,
            "public_name_preference": "anonymous",
            "rating_status": "counted",
            "comment_status": "pending",
            "created_at": "2026-09-06T10:00:00+00:00",
        }]
        with patch("visitor_feedback_content.service.is_supabase_configured", return_value=True), patch(
            "visitor_feedback_content.service.list_public_visitor_feedback", return_value=records
        ):
            result = build_public_visitor_feedback()
        self.assertEqual(result["channels"]["website"]["average"], 1.0)
        self.assertEqual(result["channels"]["website"]["count"], 1)
        self.assertEqual(result["comments"], [])
        self.assertEqual(result["pending_comment_count"], 1)

    def test_submission_without_public_consent_is_internal(self):
        payload = _validate_visitor_feedback_payload({
            "visit_type": "on-site",
            "rating": "5",
            "comments": "Wonderful visit",
            "public_name_preference": "anonymous",
        })
        self.assertFalse(payload["public_display_consent"])
        self.assertEqual(payload["comment_status"], "withheld")


if __name__ == "__main__":
    unittest.main()
