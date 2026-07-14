#!/usr/bin/env python3
"""Split a deliberately generated horizontal strip into measured frame cells."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--names", required=True, help="Comma-separated frame names")
    args = parser.parse_args()

    names = [name.strip() for name in args.names.split(",") if name.strip()]
    if not names:
        raise ValueError("At least one frame name is required")

    with Image.open(args.input) as source:
        image = source.convert("RGBA")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(names):
        left = round(index * image.width / len(names))
        right = round((index + 1) * image.width / len(names))
        frame = image.crop((left, 0, right, image.height))
        output = args.output_dir / f"{name}.png"
        frame.save(output, optimize=True)
        print(f"{name}: x={left}..{right} size={frame.width}x{frame.height}")


if __name__ == "__main__":
    main()
