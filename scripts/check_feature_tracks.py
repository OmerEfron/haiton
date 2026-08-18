#!/usr/bin/env python3
"""Fail if feature tracks have overlapping owns prefixes. Usage:
  python3 scripts/check_feature_tracks.py docs/features/<id>/status.json
"""
from __future__ import annotations

import json
import sys


def norm(p: str) -> str:
    p = p.replace("\\", "/").strip().rstrip("/")
    return p


def conflicts(a: str, b: str) -> bool:
    a, b = norm(a), norm(b)
    if not a or not b:
        return False
    return a == b or a.startswith(b + "/") or b.startswith(a + "/")


def _self_check() -> int:
    assert conflicts("src/api/billing", "src/api/billing/webhooks")
    assert conflicts("src/a.ts", "src/a.ts")
    assert not conflicts("src/api/billing", "src/api/saved")
    assert not conflicts("src/a.ts", "src/ab.ts")
    print("OK")
    return 0


def main() -> int:
    if len(sys.argv) == 2 and sys.argv[1] == "--self-check":
        return _self_check()
    if len(sys.argv) != 2:
        print("usage: check_feature_tracks.py docs/features/<id>/status.json", file=sys.stderr)
        return 2
    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    tracks = data.get("tracks") or []
    problems: list[str] = []
    in_flight_waves = {
        w["id"]
        for w in (data.get("waves") or [])
        if w.get("kind") == "parallel" and w.get("status") in ("pending", "in_progress")
    }

    for i, t in enumerate(tracks):
        tid = t.get("id") or f"track[{i}]"
        owns = t.get("owns") or []
        if not owns and t.get("wave") in in_flight_waves:
            problems.append(f"{tid}: parallel track missing owns")
        must_not = [norm(x) for x in (t.get("must_not") or [])]
        for o in owns:
            no = norm(o)
            for m in must_not:
                if conflicts(no, m):
                    problems.append(f"{tid}: owns {o!r} overlaps must_not {m!r}")

    parallel_by_wave: dict[str, list[dict]] = {}
    for t in tracks:
        wave = t.get("wave")
        if wave in in_flight_waves:
            parallel_by_wave.setdefault(wave, []).append(t)

    for wave, group in parallel_by_wave.items():
        for i, a in enumerate(group):
            for b in group[i + 1 :]:
                for oa in a.get("owns") or []:
                    for ob in b.get("owns") or []:
                        if conflicts(oa, ob):
                            problems.append(
                                f"{wave}: {a.get('id')} owns {oa!r} overlaps {b.get('id')} owns {ob!r}"
                            )

    if problems:
        print("FAIL")
        for p in problems:
            print(p)
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
