from pypdf import PdfReader
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"

# Read LinkedIn / Profile PDF
linkedin = ""
pdf_candidates = [
    DATA_DIR / "linkedin.pdf",
    DATA_DIR / "Profile (2).pdf",
    DATA_DIR / "resume.pdf",
]

for pdf_path in pdf_candidates:
    if pdf_path.exists():
        try:
            reader = PdfReader(str(pdf_path))
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    linkedin += text
            if linkedin.strip():
                break
        except Exception:
            pass

if not linkedin.strip():
    linkedin = "LinkedIn profile not available"

# Read other data files
with open(DATA_DIR / "summary.txt", "r", encoding="utf-8-sig") as f:
    summary = f.read()

with open(DATA_DIR / "style.txt", "r", encoding="utf-8-sig") as f:
    style = f.read()

with open(DATA_DIR / "facts.json", "r", encoding="utf-8-sig") as f:
    facts = json.load(f)