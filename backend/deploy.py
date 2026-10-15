import os
import shutil
import zipfile
import subprocess
import sys


def is_docker_running():
    try:
        res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0
    except Exception:
        return False


def main():
    print("=" * 60)
    print("AI Digital Twin - AWS Lambda Packaging Script")
    print("=" * 60)

    # 1. Clean up old builds
    if os.path.exists("lambda-package"):
        print("Cleaning up old lambda-package/...")
        shutil.rmtree("lambda-package")
    if os.path.exists("lambda-deployment.zip"):
        print("Removing old lambda-deployment.zip...")
        os.remove("lambda-deployment.zip")

    os.makedirs("lambda-package", exist_ok=True)

    # 2. Install Linux x86_64 dependencies
    if is_docker_running():
        print("\n[1/4] Docker is running. Installing dependencies via official AWS Lambda container...")
        cwd = os.getcwd()
        docker_cmd = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{cwd}:/var/task",
            "--platform",
            "linux/amd64",
            "--entrypoint",
            "",
            "public.ecr.aws/lambda/python:3.12",
            "/bin/sh",
            "-c",
            "pip install --target /var/task/lambda-package -r /var/task/requirements.txt --platform manylinux2014_x86_64 --only-binary=:all: --upgrade",
        ]
        subprocess.run(docker_cmd, check=True)
    else:
        print("\n[1/4] Docker daemon not active. Using uv cross-platform Linux x86_64 packaging...")
        uv_cmd = [
            "uv",
            "pip",
            "install",
            "--python-platform",
            "x86_64-unknown-linux-gnu",
            "--python-version",
            "3.12",
            "--target",
            "lambda-package",
            "-r",
            "requirements.txt",
        ]
        subprocess.run(uv_cmd, check=True)

    # 3. Copy application files
    print("\n[2/4] Copying backend application files...")
    app_files = ["server.py", "lambda_handler.py", "context.py", "resources.py"]
    for file in app_files:
        if os.path.exists(file):
            shutil.copy2(file, "lambda-package/")
            print(f"  + Copied {file}")

    # 4. Copy data directory
    if os.path.exists("data"):
        print("\n[3/4] Copying data/ directory (facts, style, resume)...")
        shutil.copytree("data", "lambda-package/data")
        print("  + Copied data/ directory")

    # 5. Create ZIP archive
    print("\n[4/4] Creating lambda-deployment.zip...")
    with zipfile.ZipFile("lambda-deployment.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("lambda-package"):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, "lambda-package")
                zipf.write(file_path, arcname)

    size_mb = os.path.getsize("lambda-deployment.zip") / (1024 * 1024)
    print("=" * 60)
    print(f" SUCCESS! Created lambda-deployment.zip ({size_mb:.2f} MB)")
    print("Ready to upload to AWS Lambda (twin-api) or via S3.")
    print("=" * 60)


if __name__ == "__main__":
    main()
