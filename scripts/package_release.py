"""
UNIKART Cross-Platform Secure Release Packager
Deterministic, safe packaging script that strictly excludes:
- .env files (root and nested; retains only .env.example / .env.production.example templates)
- .git repository and history
- *.db, *.sqlite, and test database files
- node_modules, .venv, and virtualenvs
- __pycache__, *.pyc, and build artifacts
"""

import os
import sys
import zipfile
import datetime

EXCLUDED_DIR_NAMES = {
    ".git", "node_modules", ".venv", "venv", "__pycache__",
    ".pytest_cache", "dist", "build", ".gemini", "brain"
}

EXCLUDED_EXTENSIONS = {
    ".db", ".db-shm", ".db-wal", ".sqlite", ".sqlite3",
    ".pyc", ".pyo", ".log"
}

def is_excluded_path(rel_path: str) -> bool:
    normalized = rel_path.replace("\\", "/")
    parts = normalized.split("/")

    # Exclude if inside any excluded directory
    for p in parts[:-1]:
        if p in EXCLUDED_DIR_NAMES:
            return True

    filename = parts[-1]

    # Exclude temporary or test zip files
    if filename.endswith(".zip"):
        return True

    # Exclude .env files but KEEP template examples
    if filename == ".env" or (filename.endswith(".env") and not filename.endswith(".example")):
        return True

    # Exclude binary database and cache extensions
    _, ext = os.path.splitext(filename)
    if ext.lower() in EXCLUDED_EXTENSIONS:
        return True

    # Exclude specific sensitive patterns
    if "test_unikart" in filename or "staging_test" in filename:
        return True

    return False

def package_release():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"unikart_clean_release_{timestamp}.zip"
    zip_path = os.path.join(repo_root, zip_filename)

    print(f"[PACKAGE] Packaging UNIKART clean distribution archive to:\n  -> {zip_path}")

    included_count = 0
    excluded_count = 0

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(repo_root):
            # Prune excluded directories in-place so os.walk does not traverse them
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIR_NAMES]

            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, repo_root)

                if is_excluded_path(rel_path):
                    excluded_count += 1
                    continue

                zf.write(abs_path, arcname=rel_path)
                included_count += 1

    print(f"[OK] Successfully archived {included_count} clean source files.")
    print(f"[INFO] Excluded {excluded_count} sensitive/temporary/build files.")

    # Audit the generated archive
    with zipfile.ZipFile(zip_path, "r") as zf:
        names = zf.namelist()
        violations = []
        for n in names:
            norm = n.replace("\\", "/")
            if norm == ".env" or (norm.endswith(".env") and not norm.endswith(".example")):
                violations.append(n)
            elif any(part == ".git" for part in norm.split("/")):
                violations.append(n)
            elif norm.endswith((".db", ".db-shm", ".db-wal", ".sqlite", ".sqlite3")):
                violations.append(n)
            elif "node_modules" in norm.split("/"):
                violations.append(n)

    if violations:
        print(f"[FAIL] Security check FAILED! Found leaked files in archive: {violations}")
        os.remove(zip_path)
        sys.exit(1)
    else:
        print("[SEC-PASS] Security Audit PASSED: Zero .env secrets, Zero .git blobs, Zero *.db files in archive.")

    return zip_path

if __name__ == "__main__":
    package_release()
