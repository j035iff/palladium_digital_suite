#!/usr/bin/env python3
"""
Extract Morphus table text from one or more PDFs and merge into traits-index.json.

- Per book: extracted/<bookKey>.txt
- Authoritative book (default Dark Designs): extracted-authoritative.txt
- Merged traits-index with multi-book sources[] and description authority key
- description-compare.json when trait prose differs between books

Requires: pip install pymupdf

Usage:
  python scripts/lib/morphus-extract-table.py <manifest.json>
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import fitz  # pymupdf
except ImportError:
    print("ERR pymupdf not installed. Run: pip install pymupdf", file=sys.stderr)
    sys.exit(2)


# Trait lines start at line beginning; name ends with `:`, `!`, or `.` (books vary).
TRAIT_RE = re.compile(
    r"(?:^|\n)(\d{2})-(\d{2})\s*%\s+(.{1,120}?)[!:.]\s+",
    re.MULTILINE,
)
ROLL_OTHER_RE = re.compile(r"other:\s*roll", re.IGNORECASE)

STEP_ONE_ROUTER_NAMES = frozenset(
    {
        "head",
        "torso",
        "arms & hands",
        "arms and hands",
        "legs & feet",
        "legs and feet",
    }
)

NON_PLAYABLE_NAME_RES = [
    re.compile(r"^other\b", re.I),
    re.compile(r"^roll twice\b", re.I),
    re.compile(r"^step one\b", re.I),
    re.compile(r"^step two\b", re.I),
    re.compile(r"^disproportionate\s", re.I),
    re.compile(r"^roll (?:on|again|twice|percentile)\b", re.I),
    re.compile(r"^combination of two\b", re.I),
]

CROSS_TABLE_ROUTER_BODY_RES = [
    re.compile(
        r"\broll\s+(?:for\s+or\s+)?select(?:\s+a)?\s+feature\s+from\s+"
        r"(?:one\s+of\s+)?(?:the\s+)?[\w\s,&/'-]+\s+tables?\b",
        re.I,
    ),
    re.compile(
        r"\broll\s+or\s+select\s+(?:a\s+)?feature\s+from\s+"
        r"(?:one\s+of\s+)?(?:the\s+)?[\w\s,&/'-]+\s+tables?\b",
        re.I,
    ),
    re.compile(r"\b(?:random\s+)?roll\s+or\s+select\s+from\s+another\s+table\b", re.I),
    re.compile(r"\broll\s+on\s+(?:the\s+)?[\w\s,&/'-]+\s+table\b", re.I),
]
# Footer order / watermark lines (ignore when detecting printed page).
_ORDER_LINE_RE = re.compile(r"order\s*#\s*\d", re.IGNORECASE)


def clean_trait_name(name: str) -> str:
    cleaned = re.sub(r"^[!.:]+\s*", "", name.strip())
    cleaned = re.sub(r"[!.:]+\s*$", "", cleaned)
    # PDFs sometimes use "Cone head" — only normalize all-lowercase names.
    if re.fullmatch(r"[a-z]+(?:[ ,'-][a-z]+)*", cleaned):
        return cleaned.title()
    return cleaned


def is_valid_trait_name(name: str) -> bool:
    if not name or len(name) < 2:
        return False
    if name.lstrip().startswith(":"):
        return False
    if "%" in name or re.search(r"\d{2}-\d{2}\s*%", name):
        return False
    return True


def norm_trait_alias(name: str) -> str:
    """Fold common PDF spelling variants for merge/structure matching."""
    key = norm_trait_name(name)
    aliases = {
        "chain saw arms": "chainsaw arms",
        "metal head camera eyes": "metal head & camera eyes",
        "searchlight(s)": "searchlight/headlights",
    }
    return aliases.get(key, key)


_WATERMARK_RE = re.compile(r"Joe Sifferman \(Order #\d+\)", re.I)
_GEAR_HEAD_MID_TABLE_RE = re.compile(
    r"(?:,\s*)?Gear-Head Table\s*"
    r"For around 100 years,.*?epitomize\s*"
    r"(?:Joe Sifferman \(Order #\d+\)\s*)?\d*\s*",
    re.DOTALL | re.I,
)


# Trait title split across a PDF page break before the colon (e.g. Superbeing "Bold and the\nBeautiful:").
_BROKEN_TRAIT_HEADER_RE = re.compile(
    r"(^|\n)(\d{2}-\d{2}\s*%\s+)([^\n:!]{3,200}?)\n([A-Za-z][^\n]{1,80}?):\s+",
    re.MULTILINE,
)


def join_broken_trait_headers(text: str) -> str:
    def repl(m: re.Match[str]) -> str:
        prefix, pct, part1, part2 = m.groups()
        return f"{prefix}{pct}{part1.strip()} {part2.strip()}: "

    return _BROKEN_TRAIT_HEADER_RE.sub(repl, text)


def sanitize_trait_body(text: str) -> str:
    """Strip PDF watermarks and mid-table page headers from trait prose."""
    text = _GEAR_HEAD_MID_TABLE_RE.sub(", and ", text)
    text = re.sub(r"-?\s*Joe Sifferman \(Order #\d+\)\s*\n?\s*\d+\s*", "", text, flags=re.I)
    # Rejoin words split across PDF page-break watermarks (e.g. "cam- ouflage", "ap- ple").
    text = re.sub(r"([a-z]{2,})-\s+([a-z])", r"\1\2", text, flags=re.I)
    return re.sub(r"\s{2,}", " ", text).strip()


def sanitize_table_text(table_text: str) -> str:
    """Clean raw PDF table extract before writing extracted/*.txt."""
    text = _GEAR_HEAD_MID_TABLE_RE.sub(", and ", table_text)
    text = re.sub(r"-?\s*Joe Sifferman \(Order #\d+\)\s*\n?\s*\d+\s*", "", text, flags=re.I)
    text = re.sub(r"([a-z]{2,})-\s+([a-z])", r"\1\2", text, flags=re.I)
    text = join_broken_trait_headers(text)
    return text


def printed_page(page: fitz.Page) -> int | None:
    """Printed folio from the bottom margin (avoids percentile digits in table body)."""
    rect = page.rect
    footer_y_min = rect.y0 + rect.height * 0.88
    nums: list[tuple[float, int]] = []
    for block in page.get_text("dict").get("blocks", []):
        for line in block.get("lines", []):
            line_text = "".join(
                span.get("text", "") for span in line.get("spans", [])
            )
            if _ORDER_LINE_RE.search(line_text):
                continue
            for span in line.get("spans", []):
                t = span.get("text", "").strip()
                if not re.fullmatch(r"\d{1,3}", t):
                    continue
                n = int(t)
                if n < 1 or n > 999:
                    continue
                y = span["bbox"][1]
                if y >= footer_y_min:
                    nums.append((y, n))
    if not nums:
        return None
    # Lowest on page (folio) then highest number (e.g. 103 beats stray 3).
    return max(nums, key=lambda pair: (pair[0], pair[1]))[1]


def norm_trait_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.lower().replace("'", "'")).strip()


def _has_own_trait_mechanics(body: str) -> bool:
    return bool(re.search(r"Bonuses?:\s*[+-]|\bPenalties?:\s*[+-]", body, re.I))


def is_cross_table_router_trait(name: str, body_start: str, full_body: str = "") -> bool:
    body = (full_body or body_start or "").strip()
    if not body or _has_own_trait_mechanics(body):
        return False
    return any(pat.search(body) for pat in CROSS_TABLE_ROUTER_BODY_RES)


def is_other_trait(name: str, body_start: str) -> bool:
    if ROLL_OTHER_RE.search(body_start[:200]):
        return True
    if name.strip().lower() in ("other", "other, but related"):
        return True
    return False


def classify_trait(name: str, body_start: str, full_body: str = "") -> tuple[bool, str | None]:
    """Return (playable, skip_reason)."""
    if is_other_trait(name, body_start):
        return False, "other_roll_row" if ROLL_OTHER_RE.search(body_start[:200]) else "other"

    n = norm_trait_name(name)
    for pat in NON_PLAYABLE_NAME_RES:
        if pat.search(name):
            return False, "non_playable_name"

    body = full_body.strip()
    if n in STEP_ONE_ROUTER_NAMES:
        has_mechanics = bool(re.search(r"Bonuses?:|Penalties?:|[+-]\d", body, re.I))
        if len(body) < 80 or not has_mechanics:
            return False, "step_one_router"

    if re.match(r"^roll (?:on|see|refer to|use the)\s", body, re.I) and not re.search(
        r"Bonuses?:", body, re.I
    ):
        return False, "instruction_only"

    if is_cross_table_router_trait(name, body_start, body):
        return False, "cross_table_router"

    return True, None


def is_non_playable_trait(name: str, body_start: str, full_body: str = "") -> bool:
    playable, _ = classify_trait(name, body_start, full_body)
    return not playable


def _is_gear_head_extract(heading: str) -> bool:
    return bool(re.search(r"gear[- ]?head|engine block", heading, re.I))


def slice_table_body(full_text: str, start: int, heading: str, *, trim_at_other: bool) -> str:
    rest = full_text[start + len(heading) :]
    if trim_at_other:
        other_m = re.search(r"\n\d{2}-\d{2}% Other:", rest)
        if other_m:
            rest = rest[: other_m.start()]
    if _is_gear_head_extract(heading):
        boundary_patterns = [r"\nHobbyist Table\b"]
    else:
        boundary_patterns = [
            r"\n(?:"
            r"[A-Z][A-Za-z0-9/'’\-\s]+ Table"
            r"|Biomechanical:\s*[A-Za-z0-9/'’\-\s]+ Table"
            r"|Aquatic Animal Form Tables"
            r"|Mythical Creature"
            r"|Video Games \(powers\)"
            r")\b",
            r"\nGear-Head Table\b",
            r"\njust such a bond in a new, physical way",
        ]
    end = len(rest)
    for pat in boundary_patterns:
        hit = re.search(pat, rest)
        if hit and hit.start() < end:
            end = hit.start()
    chunk = rest[:end]
    return heading + chunk


def find_table_start(full_text: str, heading: str) -> int:
    candidates: list[int] = []
    cursor = 0
    while True:
        i = full_text.find(heading, cursor)
        if i < 0:
            break
        candidates.append(i)
        cursor = i + len(heading)
    if not candidates:
        raise SystemExit(f"ERR table heading not found in PDF: {heading!r}")
    best_i = candidates[0]
    best_count = -1
    for i in candidates:
        chunk = slice_table_body(full_text, i, heading, trim_at_other=False)
        count = len(TRAIT_RE.findall(chunk))
        if count > best_count:
            best_count = count
            best_i = i
    if best_count <= 0:
        raise SystemExit(
            f"ERR no percentile traits found after heading {heading!r} "
            f"({len(candidates)} occurrence(s))",
        )
    return best_i


def extract_table(full_text: str, heading: str, *, trim_at_other: bool) -> str:
    start = find_table_start(full_text, heading)
    return slice_table_body(full_text, start, heading, trim_at_other=trim_at_other)


def load_pdf_text(pdf_path: Path) -> tuple[str, list[int]]:
    doc = fitz.open(pdf_path)
    full_parts: list[str] = []
    page_by_char: list[int] = []
    for pno in range(doc.page_count):
        text = doc[pno].get_text()
        printed = printed_page(doc[pno])
        page_num = printed if printed is not None else pno + 1
        full_parts.append(text)
        page_by_char.extend([page_num] * len(text))
    return "".join(full_parts), page_by_char


def page_at(page_by_char: list[int], index: int) -> int:
    if index < 0 or index >= len(page_by_char):
        return page_by_char[-1] if page_by_char else 1
    return page_by_char[index]


def trait_bodies(table_text: str, table_start: int) -> dict[str, str]:
    matches = list(TRAIT_RE.finditer(table_text))
    bodies: dict[str, str] = {}
    for i, m in enumerate(matches):
        name = clean_trait_name(m.group(3))
        if not is_valid_trait_name(name):
            continue
        end = matches[i + 1].start() if i + 1 < len(matches) else len(table_text)
        raw_body = table_text[m.end() : end].strip()
        bodies[norm_trait_alias(name)] = sanitize_trait_body(raw_body)
    return bodies


def normalize_manifest(raw: dict) -> dict:
    if raw.get("books"):
        books = []
        auth_key = raw.get("authoritativeBookKey")
        for b in raw["books"]:
            key = b.get("key") or "book"
            books.append(
                {
                    "key": key,
                    "pdf": b["pdf"],
                    "reference": b.get("reference") or b["pdf"],
                    "tableHeading": b.get("tableHeading") or raw.get("tableHeading"),
                    "authoritative": bool(b.get("authoritative")),
                    "required": b.get("required", True),
                }
            )
        if not auth_key:
            auth = next((b for b in books if b["authoritative"]), None)
            auth_key = auth["key"] if auth else books[0]["key"]
        for b in books:
            b["authoritative"] = b["key"] == auth_key
        raw = {**raw, "books": books, "authoritativeBookKey": auth_key}
        return raw

    if raw.get("bookPdf"):
        pdf = raw["bookPdf"]
        key = "dark_designs" if re.search(r"dark.?designs", pdf, re.I) else "primary"
        return normalize_manifest(
            {
                **raw,
                "books": [
                    {
                        "key": key,
                        "pdf": pdf,
                        "reference": raw.get("sourceReference") or pdf,
                        "tableHeading": raw.get("tableHeading"),
                        "authoritative": True,
                    }
                ],
                "authoritativeBookKey": key,
            }
        )
    raise SystemExit("ERR manifest must define books[] or bookPdf")


def extract_book(
    repo_root: Path,
    book: dict,
    *,
    exclude_non_playable: bool,
) -> tuple[str, list[dict], dict[str, str]] | None:
    pdf_path = Path(book["pdf"])
    if not pdf_path.is_absolute():
        pdf_path = repo_root / pdf_path
    if not pdf_path.exists():
        raise SystemExit(f"ERR PDF not found: {pdf_path}")

    full_text, page_by_char = load_pdf_text(pdf_path)
    heading = book["tableHeading"]
    try:
        table_text = extract_table(
            full_text,
            heading,
            trim_at_other=exclude_non_playable,
        )
    except SystemExit as err:
        if book.get("required", True):
            raise
        print(f"WARN skip {book['key']}: {err}", file=sys.stderr)
        return None
    table_text = sanitize_table_text(table_text)
    table_start = full_text.find(table_text[: min(80, len(table_text))])
    bodies = trait_bodies(table_text, table_start)

    traits: list[dict] = []
    matches = list(TRAIT_RE.finditer(table_text))
    for i, m in enumerate(matches):
        name = clean_trait_name(m.group(3))
        if not is_valid_trait_name(name):
            continue
        end = matches[i + 1].start() if i + 1 < len(matches) else len(table_text)
        body_start = table_text[m.end() : m.end() + 240]
        full_body = table_text[m.end() : end].strip()
        playable, skip_reason = classify_trait(name, body_start, full_body)
        skip = exclude_non_playable and not playable
        global_index = table_start + m.start() if table_start >= 0 else m.start()
        traits.append(
            {
                "percent": f"{m.group(1)}-{m.group(2)}%",
                "name": name,
                "pageNumber": page_at(page_by_char, global_index),
                "skip": skip,
                "skipReason": skip_reason,
                "bookKey": book["key"],
                "reference": book["reference"],
            }
        )
    return table_text, traits, bodies


def merge_traits(
    book_results: list[tuple[dict, list[dict], dict[str, str]]],
    *,
    authoritative_book_key: str,
) -> tuple[list[dict], list[dict]]:
    merged: dict[str, dict] = {}
    comparisons: list[dict] = []

    for book, traits, bodies in book_results:
        for t in traits:
            key = norm_trait_alias(t["name"])
            if key not in merged:
                merged[key] = {
                    "name": t["name"],
                    "percent": t["percent"],
                    "skip": t["skip"],
                    "sources": [],
                    "descriptionAuthority": authoritative_book_key,
                    "bodiesByBook": {},
                }
            row = merged[key]
            row["sources"].append(
                {
                    "bookKey": t["bookKey"],
                    "reference": t["reference"],
                    "pageNumber": t["pageNumber"],
                    "percent": t["percent"],
                    "authoritative": t["bookKey"] == authoritative_book_key,
                }
            )
            row["bodiesByBook"][t["bookKey"]] = bodies.get(key, "")
            if t["bookKey"] == authoritative_book_key:
                row["name"] = t["name"]
                row["percent"] = t["percent"]
                row["skip"] = t["skip"]
            elif t["skip"]:
                row["skip"] = True

    out_traits = []
    for row in merged.values():
        row["sources"].sort(
            key=lambda s: (0 if s.get("authoritative") else 1, s["reference"]),
        )
        only_in = [
            s["bookKey"]
            for s in row["sources"]
            if s["bookKey"] != authoritative_book_key
        ]
        row["alsoPublishedIn"] = only_in
        auth_body = row["bodiesByBook"].get(authoritative_book_key, "")
        for book_key, body in row["bodiesByBook"].items():
            if book_key == authoritative_book_key or not body or not auth_body:
                continue
            if _bodies_differ(auth_body, body):
                comparisons.append(
                    {
                        "trait": row["name"],
                        "authoritativeBookKey": authoritative_book_key,
                        "otherBookKey": book_key,
                        "note": "Use authoritative book for description and mechanics; "
                        "see extracted/<bookKey>.txt for alternate wording.",
                    }
                )
        del row["bodiesByBook"]
        if not row["skip"]:
            out_traits.append(row)

    out_traits.sort(key=lambda t: t["name"].lower())
    return out_traits, comparisons


def _bodies_differ(a: str, b: str) -> bool:
    def norm(s: str) -> str:
        return re.sub(r"\s+", " ", s.lower())[:500]

    return norm(a) != norm(b)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: morphus-extract-table.py <manifest.json>", file=sys.stderr)
        sys.exit(1)

    manifest_path = Path(sys.argv[1]).resolve()
    manifest = normalize_manifest(
        json.loads(manifest_path.read_text(encoding="utf-8")),
    )
    repo_root = manifest_path.parent
    for _ in range(10):
        if (repo_root / "package.json").exists():
            break
        repo_root = repo_root.parent
    else:
        raise SystemExit("ERR could not find repo root (package.json)")

    work = manifest_path.parent / manifest["id"]
    extracted_dir = work / "extracted"
    extracted_dir.mkdir(parents=True, exist_ok=True)

    exclude_non_playable = manifest.get(
        "excludeNonPlayable",
        manifest.get("excludeOther", True),
    )
    auth_key = manifest["authoritativeBookKey"]
    book_results: list[tuple[dict, list[dict], dict[str, str]]] = []

    for book in manifest["books"]:
        result = extract_book(
            repo_root,
            book,
            exclude_non_playable=exclude_non_playable,
        )
        if result is None:
            continue
        table_text, traits, bodies = result
        out_txt = extracted_dir / f"{book['key']}.txt"
        out_txt.write_text(table_text, encoding="utf-8")
        print(f"OK  {book['key']}: {len(traits)} traits -> {out_txt}")
        book_results.append((book, traits, bodies))

    if not book_results:
        raise SystemExit("ERR no books produced table text (check headings or required flags)")

    auth_book = next(b for b in manifest["books"] if b["key"] == auth_key)
    auth_txt = extracted_dir / f"{auth_key}.txt"
    (work / "extracted-authoritative.txt").write_text(
        auth_txt.read_text(encoding="utf-8"),
        encoding="utf-8",
    )

    merged_traits, comparisons = merge_traits(
        book_results,
        authoritative_book_key=auth_key,
    )

    index_doc = {
        "tableId": manifest["id"],
        "tableHeading": manifest.get("tableHeading") or auth_book["tableHeading"],
        "authoritativeBookKey": auth_key,
        "authoritativeReference": auth_book["reference"],
        "books": [
            {
                "key": b["key"],
                "pdf": b["pdf"],
                "reference": b["reference"],
                "authoritative": b["key"] == auth_key,
            }
            for b in manifest["books"]
        ],
        "traitCount": len(merged_traits),
        "traits": merged_traits,
    }
    (work / "traits-index.json").write_text(
        json.dumps(index_doc, indent=2) + "\n",
        encoding="utf-8",
    )
    if comparisons:
        (work / "description-compare.json").write_text(
            json.dumps({"differences": comparisons}, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"WARN {len(comparisons)} trait(s) with differing prose — see description-compare.json")

    print(
        f"OK  merged {len(merged_traits)} traits across {len(manifest['books'])} book(s); "
        f"authority={auth_key}",
    )
    print(f"    {work / 'traits-index.json'}")
    print(f"    {work / 'extracted-authoritative.txt'}")


if __name__ == "__main__":
    main()
