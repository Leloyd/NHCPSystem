import unittest
from unittest.mock import patch

from media_upload_content import service


class _Bucket:
    def __init__(self, *, size=1024):
        self.size = size
        self.removed = []

    def create_signed_upload_url(self, path):
        return {"token": "signed-test-token", "path": path}

    def list(self, _folder, options):
        return [{"name": options["search"], "metadata": {"size": self.size}}]

    def remove(self, paths):
        self.removed.extend(paths)


class _Storage:
    def __init__(self, bucket):
        self.bucket = bucket

    def from_(self, _name):
        return self.bucket


class _Client:
    def __init__(self, bucket):
        self.storage = _Storage(bucket)


class MediaUploadServiceTests(unittest.TestCase):
    def test_all_non_tour_uploads_use_25_mib_limit(self):
        self.assertEqual(service.MEDIA_UPLOAD_MAX_BYTES, 25 * 1024 * 1024)

    def test_signing_rejects_file_above_25_mib(self):
        with self.assertRaisesRegex(ValueError, "25 MB"):
            service.prepare_direct_upload(
                filename="resource.pdf",
                purpose="participation_teacher_file",
                file_size=service.MEDIA_UPLOAD_MAX_BYTES + 1,
                audience="public",
                owner_id=7,
            )

    def test_public_upload_path_is_scoped_to_signed_in_user(self):
        bucket = _Bucket()
        with patch.object(service, "get_supabase_client", return_value=_Client(bucket)):
            signed = service.prepare_direct_upload(
                filename="lesson.pdf",
                purpose="participation_teacher_file",
                file_size=2048,
                audience="public",
                owner_id=42,
            )
        self.assertTrue(
            signed["path"].startswith(
                "participation-submissions/user-42/participation_teacher_file/"
            )
        )

    def test_final_reference_checks_actual_supabase_size(self):
        bucket = _Bucket(size=4096)
        path = "online-gallery/online_gallery_model/object.glb"
        with patch.object(service, "get_supabase_client", return_value=_Client(bucket)):
            result = service.validate_direct_upload_reference(
                path, "online_gallery_model", audience="admin"
            )
        self.assertEqual(result["size"], 4096)
        self.assertEqual(result["extension"], ".glb")

    def test_public_user_cannot_claim_another_users_upload(self):
        with self.assertRaisesRegex(ValueError, "protected storage area"):
            service.validate_direct_upload_reference(
                "avatars/user-8/account_avatar/photo.jpg",
                "account_avatar",
                audience="public",
                owner_id=9,
            )

    def test_discard_only_removes_paths_inside_allowed_purpose(self):
        bucket = _Bucket()
        uploads = [
            {
                "purpose": "account_avatar",
                "path": "avatars/user-5/account_avatar/new.jpg",
            },
            {
                "purpose": "account_avatar",
                "path": "avatars/user-6/account_avatar/not-mine.jpg",
            },
        ]
        with patch.object(service, "get_supabase_client", return_value=_Client(bucket)):
            removed = service.discard_direct_uploads(
                uploads, audience="public", owner_id=5
            )
        self.assertEqual(removed, 1)
        self.assertEqual(bucket.removed, ["avatars/user-5/account_avatar/new.jpg"])


if __name__ == "__main__":
    unittest.main()
