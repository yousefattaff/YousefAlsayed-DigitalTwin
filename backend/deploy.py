import shutil
import subprocess
import zipfile
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent
CONTENT_DIR = BACKEND_DIR.parent / "content"
PACKAGE_DIR = BACKEND_DIR / "lambda-package"
ARCHIVE_PATH = BACKEND_DIR / "lambda-deployment.zip"
APP_FILES = ("server.py", "lambda_handler.py")


def main():
    required = [BACKEND_DIR / name for name in (*APP_FILES, "pyproject.toml", "uv.lock")]
    if any(not path.is_file() for path in required):
        raise FileNotFoundError("Lambda packaging requires the runtime modules, pyproject.toml, and uv.lock.")
    documents = sorted(CONTENT_DIR.rglob("*.md"))
    if not any(path.name.lower() != "readme.md" for path in documents):
        raise FileNotFoundError("Lambda packaging requires the canonical content/ Markdown documents.")

    temporary_archive = ARCHIVE_PATH.with_suffix(".zip.tmp")
    local_dir = BACKEND_DIR / ".local"
    requirements_path = local_dir / "lambda-requirements.txt"
    for artifact in (PACKAGE_DIR, ARCHIVE_PATH, temporary_archive, local_dir):
        if artifact.resolve() != BACKEND_DIR / artifact.name:
            raise ValueError("Packaging artifacts must remain inside the backend directory.")
    if requirements_path.resolve() != local_dir / requirements_path.name:
        raise ValueError("Dependency exports must remain inside the backend .local directory.")
    local_dir.mkdir(exist_ok=True)
    subprocess.run([
        "uv", "--cache-dir", str(local_dir / "uv-cache"),
        "export", "--frozen", "--no-dev", "--no-emit-project", "--format", "requirements.txt",
        "--output-file", str(requirements_path), "--quiet",
    ], check=True, cwd=BACKEND_DIR)
    if PACKAGE_DIR.exists():
        shutil.rmtree(PACKAGE_DIR)
    PACKAGE_DIR.mkdir()

    print("Installing locked Linux x86_64 dependencies for AWS Lambda Python 3.12...")
    subprocess.run([
        "uv", "--cache-dir", str(local_dir / "uv-cache"), "pip", "install",
        "--python-platform", "x86_64-manylinux_2_34", "--python-version", "3.12",
        "--target", str(PACKAGE_DIR), "--only-binary", ":all:", "--require-hashes",
        "-r", str(requirements_path),
    ], check=True, cwd=BACKEND_DIR)

    for name in APP_FILES:
        shutil.copy2(BACKEND_DIR / name, PACKAGE_DIR / name)
    for document in documents:
        destination = PACKAGE_DIR / "content" / document.relative_to(CONTENT_DIR)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(document, destination)

    paths = sorted(path for path in PACKAGE_DIR.rglob("*") if path.is_file())
    if any(path.name.startswith(".env") for path in paths):
        raise ValueError("Environment files must not be included in a Lambda package.")
    try:
        with zipfile.ZipFile(temporary_archive, "w", zipfile.ZIP_DEFLATED) as archive:
            for path in paths:
                archive.write(path, path.relative_to(PACKAGE_DIR))
        if temporary_archive.stat().st_size > 50 * 1024 * 1024:
            raise ValueError("The package exceeds Lambda's direct-upload limit; configure S3 delivery before deploying.")
        temporary_archive.replace(ARCHIVE_PATH)
    finally:
        temporary_archive.unlink(missing_ok=True)
    size_mb = ARCHIVE_PATH.stat().st_size / (1024 * 1024)
    print(f"Created {ARCHIVE_PATH.name} ({size_mb:.2f} MB) for the existing AWS Lambda backend.")


if __name__ == "__main__":
    main()
