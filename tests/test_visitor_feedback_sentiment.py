import os
import unittest
from unittest.mock import patch

from visitor_feedback_sentiment import analyze_feedback_locally, analyze_feedback_sentiment


class VisitorFeedbackSentimentTests(unittest.TestCase):
    def test_positive_english_comment(self):
        result = analyze_feedback_locally("The tour was beautiful, informative, and easy to use.", 5)
        self.assertEqual(result["sentiment_label"], "positive")

    def test_positive_filipino_comment(self):
        result = analyze_feedback_locally("Maganda at malinaw ang virtual tour. Salamat!", 5)
        self.assertEqual(result["sentiment_label"], "positive")

    def test_filipino_negation_reverses_positive_word(self):
        result = analyze_feedback_locally("Hindi maganda at sobrang mabagal.", 1)
        self.assertEqual(result["sentiment_label"], "negative")

    def test_neutral_comment(self):
        result = analyze_feedback_locally("It was okay.", 3)
        self.assertEqual(result["sentiment_label"], "neutral")

    def test_hosted_provider_is_opt_in(self):
        with patch.dict(os.environ, {}, clear=True):
            result = analyze_feedback_sentiment("Great experience.", 5)
        self.assertEqual(result["sentiment_provider"], "local")


if __name__ == "__main__":
    unittest.main()
