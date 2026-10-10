"""Create reviewable source and unpacked-extension archives without local secrets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
import hashlib

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
OUTPUT = ROOT / "release"
OUTPUT.mkdir(exist_ok=True)

if not (ROOT / "dist" / "manifest.json").exists():
    raise SystemExit("Run npm run build first.")

files = [ROOT / name for name in ["README.md", "SUBMISSION.md", "package.json", "package-lock.json", "index.html", "tsconfig.json", "vite.config.ts", "biome.json", ".editorconfig", ".gitattributes", ".gitignore"]]
for folder in ["src", "public", "dist", "docs", "scripts", "backend"]:
    files.extend(path for path in (ROOT / folder).rglob("*") if path.is_file()
                 and not {"generated", "__pycache__"}.intersection(path.relative_to(ROOT).parts)
                 and path.suffix != ".pyc")

archives = {
    OUTPUT / f"Relay-{VERSION}-submission.zip": [(path, f"Relay-{VERSION}/{path.relative_to(ROOT).as_posix()}") for path in files],
    OUTPUT / f"Relay-{VERSION}-extension.zip": [(path, path.relative_to(ROOT / "dist").as_posix()) for path in (ROOT / "dist").rglob("*") if path.is_file()],
}
for target, entries in archives.items():
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for source, name in sorted(entries, key=lambda item: item[1]):
            archive.write(source, name)
    with ZipFile(target) as archive:
        assert archive.testzip() is None
        assert not any(".." in Path(name).parts or name.startswith("/") for name in archive.namelist())
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    target.with_suffix(".zip.sha256").write_text(f"{digest}  {target.name}\n", encoding="utf-8")
    print(f"Created {target} ({target.stat().st_size:,} bytes)")
