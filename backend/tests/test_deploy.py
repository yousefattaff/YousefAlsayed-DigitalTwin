"""Verify application packaging without Docker, installs, or cloud requests."""

import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("lambda_packaging", Path(__file__).resolve().parents[1] / "deploy.py")
packaging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packaging)


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix=".deploy-tests-", dir=Path(__file__).resolve().parent)
        self.base = Path(self.temporary.name).resolve()
        assert self.base.is_relative_to(Path(__file__).resolve().parent)
        self.backend = self.base / "backend"
        self.backend.mkdir()
        self.content = self.base / "content"
        self.content.mkdir()
        self.package = self.backend / "lambda-package"
        self.archive = self.backend / "lambda-deployment.zip"
        for name in (*packaging.APP_FILES, "pyproject.toml", "uv.lock"):
            (self.backend / name).write_text("fixture\n", encoding="utf-8")

    def tearDown(self):
        self.temporary.cleanup()

    def package_configuration(self):
        return patch.multiple(packaging, BACKEND_DIR=self.backend, CONTENT_DIR=self.content,
                              PACKAGE_DIR=self.package, ARCHIVE_PATH=self.archive)

    def test_packaging_bundles_only_runtime_modules_and_markdown_from_absolute_sources(self):
        (self.content / "profile.md").write_text("# Profile\nVerified facts.\n", encoding="utf-8")
        (self.content / "projects").mkdir()
        (self.content / "projects" / "robot.md").write_text("# Robot\nROS1.\n", encoding="utf-8")
        (self.content / ".env").write_text("PRIVATE_CONFIG=dummy\n", encoding="utf-8")
        (self.backend / "data").mkdir()
        (self.backend / "data" / "old-resume.pdf").write_bytes(b"legacy data")
        (self.backend / ".env").write_text("PRIVATE_CONFIG=dummy\n", encoding="utf-8")
        (self.backend / "context.py").write_text("obsolete\n", encoding="utf-8")
        with self.package_configuration(), patch.object(packaging.subprocess, "run") as install, patch("builtins.print"):
            packaging.main()
        self.assertEqual(install.call_count, 2)
        export, dependencies = install.call_args_list
        for call in (export, dependencies):
            self.assertEqual(call.kwargs["cwd"], self.backend)
            self.assertIs(call.kwargs["check"], True)
        requirements = str(self.backend / ".local" / "lambda-requirements.txt")
        self.assertIn("--frozen", export.args[0])
        self.assertIn("--no-dev", export.args[0])
        self.assertIn(requirements, export.args[0])
        self.assertIn("--require-hashes", dependencies.args[0])
        self.assertIn("x86_64-manylinux_2_34", dependencies.args[0])
        self.assertIn("3.12", dependencies.args[0])
        self.assertIn(str(self.package), dependencies.args[0])
        self.assertIn(requirements, dependencies.args[0])
        with zipfile.ZipFile(self.archive) as archive:
            self.assertEqual(set(archive.namelist()), {
                "server.py", "lambda_handler.py", "content/profile.md", "content/projects/robot.md",
            })
            self.assertEqual(archive.read("content/projects/robot.md"), (self.content / "projects" / "robot.md").read_bytes())
        self.assertFalse(self.archive.with_suffix(".zip.tmp").exists())

    def test_missing_knowledge_preserves_existing_artifacts_and_never_installs_dependencies(self):
        self.package.mkdir()
        marker = self.package / "previous-build.txt"
        marker.write_text("previous build\n", encoding="utf-8")
        self.archive.write_bytes(b"previous archive")
        with self.package_configuration(), patch.object(packaging.subprocess, "run") as install:
            with self.assertRaisesRegex(FileNotFoundError, "canonical content"):
                packaging.main()
        install.assert_not_called()
        self.assertEqual(marker.read_text(encoding="utf-8"), "previous build\n")
        self.assertEqual(self.archive.read_bytes(), b"previous archive")


if __name__ == "__main__":
    unittest.main()
