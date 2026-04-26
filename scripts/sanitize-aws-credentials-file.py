#!/usr/bin/env python3
"""Rewrite ~/.aws/credentials: strip \\r, trim keys/values, strip outer quotes on values."""
import os
import re
import shutil
from pathlib import Path

CREDS = Path.home() / ".aws" / "credentials"


def strip_val(v: str) -> str:
    v = v.replace("\r", "").strip()
    if len(v) >= 2 and ((v[0] == v[-1] == '"') or (v[0] == v[-1] == "'")):
        v = v[1:-1].strip()
    return v


def main() -> None:
    if not CREDS.is_file():
        print(f"No file at {CREDS}")
        return
    text = CREDS.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    for line in lines:
        raw = line.replace("\r", "")
        if not raw.strip() or raw.lstrip().startswith("#"):
            out.append(raw if raw.endswith("\n") else raw + "\n")
            continue
        m = re.match(r"^(\s*)([^=\s]+)\s*=\s*(.*)$", raw.rstrip("\n"))
        if not m:
            out.append(raw if raw.endswith("\n") else raw + "\n")
            continue
        indent, key, val = m.group(1), m.group(2), m.group(3)
        val = strip_val(val)
        out.append(f"{indent}{key.strip()} = {val}\n")
    new_body = "".join(out)
    if new_body == text.replace("\r", ""):
        print("No changes needed (already clean).")
        return
    bak = CREDS.with_suffix(".credentials.bak")
    shutil.copy2(CREDS, bak)
    CREDS.write_text(new_body, encoding="utf-8", newline="\n")
    print(f"Wrote sanitized {CREDS}; backup: {bak}")


if __name__ == "__main__":
    main()
