#!/usr/bin/env python3
"""Fail-fast production-safety checks for the committed PocketBase schema."""

import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "pb_data" / "data.db"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if not DB.is_file():
        print("SKIP: pb_data/data.db is runtime state and is intentionally not versioned")
        return

    # immutable avoids creating -wal/-shm sidecars in CI or a read-only checkout.
    connection = sqlite3.connect(f"file:{DB}?mode=ro&immutable=1", uri=True)
    connection.row_factory = sqlite3.Row
    collections = {
        row["name"]: row
        for row in connection.execute(
            "SELECT name, fields, createRule, updateRule, deleteRule FROM _collections WHERE system = 0"
        )
    }

    required = {"users", "businesses", "branches", "appointment", "appointment_services"}
    missing = sorted(required - collections.keys())
    if missing:
        fail("missing core collections: " + ", ".join(missing))

    for name, row in collections.items():
        for operation in ("createRule", "updateRule", "deleteRule"):
            if row[operation] == "":
                fail(f"{name}.{operation} is public (empty string); use NULL to lock it")

        fields = json.loads(row["fields"])
        names = [field["name"] for field in fields]
        if len(names) != len(set(names)):
            fail(f"{name} contains duplicate field names")

    appointment_fields = {
        field["name"]: field for field in json.loads(collections["appointment"]["fields"])
    }
    for money_field in ("total_price", "discount_amount", "final_price"):
        if appointment_fields[money_field]["type"] != "number":
            fail(f"appointment.{money_field} must be a number")

    integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        fail("SQLite integrity_check failed: " + integrity)

    print(f"OK: audited {len(collections)} application collections; SQLite integrity is valid")


if __name__ == "__main__":
    main()
