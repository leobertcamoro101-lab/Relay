#!/usr/bin/env python3
"""
Flags fixed pixel widths (w-56, w-[240px], width: 240px, etc.) on layout
containers that have no responsive breakpoint variant — UNLESS the width
is part of a recognized off-canvas drawer pattern, where the width itself
is intentionally constant and the responsive behavior instead comes from
sliding the panel off-screen with `translate-x` and switching `fixed` to
`static`/`relative` at a breakpoint (see Sidebar.tsx).

Line-based grep can't tell these apart reliably once a className spans
multiple lines (e.g. after Prettier reformats a long template literal), so
this reads each className={...}/className="..." block as a whole instead
of line by line.

Usage: check_responsive_classes.py <file> [<file> ...]
Exits non-zero if any un-exempted violation is found.
"""

import re
import sys

# className={`...`} or className={"..."} or className="..."
CLASSNAME_BLOCK_RE = re.compile(
    r'className=(?:\{`(?P<template>.*?)`\}|\{"(?P<dq_expr>[^"]*)"\}|"(?P<dq>[^"]*)")',
    re.DOTALL,
)

FIXED_WIDTH_RE = re.compile(
    r'\b(?:w|min-w|max-w)-(?:\[\d+px\]|\d+)\b|width:\s*\d+px'
)
RESPONSIVE_PREFIX_RE = re.compile(r'\b(?:sm|md|lg|xl|2xl):')

# The off-canvas drawer signature: an element that goes from fixed to
# static/relative at some breakpoint AND slides via translate-x. If both
# are present in the same className block, a bare width utility there is
# the panel's constant width, not a responsive-layout violation.
DRAWER_POSITION_RE = re.compile(r'\bfixed\b.*\b(?:md|sm|lg|xl|2xl):(?:static|relative)\b|\b(?:md|sm|lg|xl|2xl):(?:static|relative)\b.*\bfixed\b')
DRAWER_SLIDE_RE = re.compile(r'-?translate-x-')


def is_drawer_pattern(class_block: str) -> bool:
    return bool(DRAWER_POSITION_RE.search(class_block)) and bool(DRAWER_SLIDE_RE.search(class_block))


def check_file(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        content = f.read()

    violations = []
    for match in CLASSNAME_BLOCK_RE.finditer(content):
        class_block = match.group("template") or match.group("dq_expr") or match.group("dq") or ""

        if not FIXED_WIDTH_RE.search(class_block):
            continue
        if RESPONSIVE_PREFIX_RE.search(class_block):
            continue
        if is_drawer_pattern(class_block):
            continue

        line_no = content.count("\n", 0, match.start()) + 1
        snippet = " ".join(class_block.split())[:160]
        violations.append(f"{path}:{line_no}: {snippet}")

    return violations


def main(argv: list[str]) -> int:
    all_violations = []
    for path in argv:
        all_violations.extend(check_file(path))

    if all_violations:
        for v in all_violations:
            file_part, rest = v.split(":", 1)
            line_part, snippet = rest.split(":", 1)
            print(f"::error file={file_part},line={line_part}::Fixed pixel width without a responsive breakpoint variant or a recognized drawer pattern")
            print(v)
        print()
        print("One or more layout files use fixed pixel widths without sm:/md:/lg: variants,")
        print("and aren't using the fixed+translate-x off-canvas drawer pattern either.")
        print("See claude_conventions.md — 'Responsive by default'.")
        return 1

    print("No violations found.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
