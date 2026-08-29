import io
import unittest
from unittest.mock import patch

from PIL import Image

from virtual_tour_content import service
from virtual_tour_content.routes import _captured_on, _normalize_yaw, _validated_map_config


class _StorageBucket:
    def __init__(self, data):
        self.data = data

    def download(self, _path):
        return self.data

    def create_signed_urls(self, paths, _expires_in):
        return [{"path": path, "signedURL": f"https://storage.example/{path}?token=test"} for path in paths]


class _Storage:
    def __init__(self, data):
        self.data = data

    def from_(self, _bucket):
        return _StorageBucket(self.data)


class _Client:
    def __init__(self, data):
        self.storage = _Storage(data)


class VirtualTourServiceTests(unittest.TestCase):
    def test_original_import_normalizes_equivalent_yaw_angles(self):
        self.assertEqual(_normalize_yaw(248, label="Yaw"), -112)
        self.assertEqual(_normalize_yaw(-200, label="Target yaw"), 160)
        self.assertEqual(_normalize_yaw(180, label="Yaw"), 180)

    def test_slugify_creates_stable_url_key(self):
        self.assertEqual(service.slugify("  New Museum 360! "), "new-museum-360")

    def test_capture_date_uses_long_readable_format(self):
        self.assertEqual(_captured_on("2026-04-16"), "2026-04-16")
        self.assertEqual(service.format_captured_on("2026-04-16"), "April 16, 2026")
        self.assertEqual(service.format_captured_on("not-a-date"), "")

    @patch.object(service, "is_supabase_configured", return_value=False)
    def test_public_options_always_include_original(self, _configured):
        options = service.load_public_tour_options()
        self.assertEqual(len(options), 1)
        self.assertEqual(options[0]["slug"], "original")
        self.assertTrue(options[0]["is_system_original"])

    def test_revision_config_builds_navigation_and_item_hotspots(self):
        scenes = [
            {"id": 10, "scene_key": "start", "name_en": "Start", "name_tl": "Simula", "captured_on": "2026-04-16", "panorama_path": "/360VirtualTour/FrontGate.jpg", "initial_pitch": 0, "initial_yaw": 1, "initial_hfov": 100, "is_start_scene": True},
            {"id": 11, "scene_key": "next", "name_en": "Next", "name_tl": "Sunod", "captured_on": "2026-05-20", "panorama_path": "/360VirtualTour/Inside-FrontGate.jpg", "initial_pitch": 0, "initial_yaw": 0, "initial_hfov": 100, "is_start_scene": False},
        ]
        hotspots = [
            {"id": 20, "scene_id": 10, "hotspot_type": "navigation", "name_en": "Go inside", "name_tl": "Pumasok", "pitch": -10, "yaw": 2, "target_scene_id": 11, "target_pitch": None, "target_yaw": None, "target_hfov": None, "is_enabled": True},
            {"id": 21, "scene_id": 10, "hotspot_type": "item", "name_en": "Artifact", "name_tl": "Artepakto", "pitch": 2, "yaw": 4, "image_path": "/images/item.jpg", "glb_path": None, "subtitle_en": "English text", "subtitle_tl": "Tekstong Tagalog", "audio_en_path": None, "audio_tl_path": None, "nested_hotspots": [{"id": "detail", "x": 20, "y": 30, "image": "/images/detail.jpg", "title": {"en": "Detail", "tl": "Detalye"}}], "is_enabled": True},
        ]
        with patch.object(service, "list_scenes", return_value=scenes), patch.object(service, "list_hotspots", return_value=hotspots):
            config = service.build_revision_config({"id": 1, "slug": "test", "title_en": "Test", "title_tl": "Subok"}, 5)
        self.assertEqual(config["startScene"], "start")
        self.assertNotIn("capturedOn", config["tour"])
        self.assertEqual(config["scenes"][0]["capturedOn"], "2026-04-16")
        self.assertEqual(config["scenes"][1]["capturedOn"], "2026-05-20")
        self.assertEqual(config["scenes"][0]["hotspots"][0]["targetScene"], "next")
        self.assertEqual(config["scenes"][0]["hotspots"][1]["content"]["image"], "/images/item.jpg")
        self.assertEqual(config["scenes"][0]["hotspots"][1]["content"]["nested"][0]["image"], "/images/detail.jpg")

    def test_panorama_validator_accepts_full_two_to_one_image(self):
        output = io.BytesIO()
        Image.new("RGB", (2048, 1024), "#123b2d").save(output, format="JPEG")
        with patch.object(service, "get_supabase_client", return_value=_Client(output.getvalue())):
            metadata = service.validate_stored_asset(
                "virtual-tours/1/panorama/test.jpg", "panorama", tour_id=1, claimed_width=2048, claimed_height=1024
            )
        self.assertEqual(metadata["width"], 2048)
        self.assertEqual(metadata["height"], 1024)
        self.assertEqual(metadata["mime"], "image/jpeg")

    def test_revision_config_signs_private_tour_assets_in_one_batch(self):
        scenes = [{"id": 10, "scene_key": "start", "name_en": "Start", "name_tl": "", "captured_on": "2026-04-16", "panorama_path": "virtual-tours/1/panorama/start.jpg", "initial_pitch": 0, "initial_yaw": 0, "initial_hfov": 100, "is_start_scene": True}]
        hotspots = [{"id": 20, "scene_id": 10, "hotspot_type": "item", "name_en": "Artifact", "name_tl": "", "pitch": 0, "yaw": 0, "image_path": "virtual-tours/1/image/item.jpg", "glb_path": None, "subtitle_en": "Text", "subtitle_tl": "Teksto", "audio_en_path": None, "audio_tl_path": None, "is_enabled": True}]
        with patch.object(service, "list_scenes", return_value=scenes), patch.object(service, "list_hotspots", return_value=hotspots), patch.object(service, "get_supabase_client", return_value=_Client(b"")):
            config = service.build_revision_config({"id": 1, "slug": "private", "title_en": "Private", "title_tl": ""}, 5)
        self.assertTrue(config["scenes"][0]["panorama"].startswith("https://storage.example/"))
        self.assertTrue(config["scenes"][0]["hotspots"][0]["content"]["image"].startswith("https://storage.example/"))
        self.assertEqual(config["scenes"][0]["hotspots"][0]["content"]["glb"], "")

    def test_panorama_validator_rejects_flat_image(self):
        output = io.BytesIO()
        Image.new("RGB", (2048, 1200), "#123b2d").save(output, format="JPEG")
        with patch.object(service, "get_supabase_client", return_value=_Client(output.getvalue())):
            with self.assertRaisesRegex(ValueError, "2:1"):
                service.validate_stored_asset("virtual-tours/1/panorama/test.jpg", "panorama", tour_id=1)

    def test_asset_validator_rejects_another_tours_path(self):
        with self.assertRaisesRegex(ValueError, "outside"):
            service.validate_stored_asset("virtual-tours/2/image/item.jpg", "image", tour_id=1)

    def test_upload_signing_rejects_oversized_file_before_storage(self):
        with self.assertRaisesRegex(ValueError, "exceeds"):
            service.prepare_upload(
                filename="large.jpg", asset_kind="panorama", tour_id=1,
                file_size=service.MAX_PANORAMA_BYTES + 1,
            )

    def test_map_config_keeps_precise_coordinates_and_scene_links(self):
        result = _validated_map_config({
            "enabled": True, "imagePath": "/static/images/site-map/aerial-map.jpg",
            "width": 3074, "height": 2250, "zoom": 3.4,
            "hiddenSceneIds": ["inside"],
            "markers": [{
                "id": "front-gate", "kind": "scene", "x": 0.30742, "y": 0.75681,
                "label": {"en": "Front Gate", "tl": "Pangunahing Tarangkahan"}, "sceneId": "frontgate",
            }],
        }, [
            {"scene_key": "frontgate"}, {"scene_key": "inside"},
        ], tour_id=1)
        self.assertTrue(result["enabled"])
        self.assertEqual(result["markers"][0]["sceneId"], "frontgate")
        self.assertEqual(result["markers"][0]["x"], 0.30742)
        self.assertEqual(result["hiddenSceneIds"], ["inside"])


if __name__ == "__main__":
    unittest.main()
