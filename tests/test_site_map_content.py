import unittest

from site_map_content import service
from site_map_content.service import packaged_original_config, site_map_publish_issues


class SiteMapPublishCheckTests(unittest.TestCase):
    def test_map_upload_rejects_a_file_over_30_mb(self):
        with self.assertRaisesRegex(ValueError, "30 MB"):
            service.prepare_upload(
                filename="oversized-map.jpg", kind="aerial", site_map_id=1,
                file_size=(30 * 1024 * 1024) + 1,
            )

    def test_packaged_original_passes_publish_check(self):
        self.assertEqual(site_map_publish_issues(packaged_original_config()), [])

    def test_publish_check_lists_media_hotspot_and_coordinate_issues(self):
        config = {
            "aerialMap": {"path": ""},
            "panoramaMap": {"path": "map.jpg", "width": 1600, "height": 1000},
            "introAudio": {"en": "", "tl": ""},
            "hotspots": [{
                "id": "sample", "enabled": True, "title": {"en": "Sample"},
                "category": "", "showAerial": True, "aerial": {"x": None, "y": 2},
                "show360": True, "panorama": {"pitch": 100, "yaw": None},
                "imagePath": "photo.jpg", "imageAlt": "",
                "action": {"label": {"en": "Open"}, "url": ""},
            }],
        }
        issues = site_map_publish_issues(config)
        combined = " ".join(issues)
        self.assertIn("aerial map image", combined)
        self.assertIn("2:1", combined)
        self.assertIn("English starting audio", combined)
        self.assertIn("category", combined)
        self.assertIn("Coordinates", combined)
        self.assertIn("alternative text", combined)
        self.assertIn("URL", combined)


if __name__ == "__main__":
    unittest.main()
