#!/usr/bin/env python3
"""Trim an alpha asset and place it on a deterministic transparent canvas."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--width", required=True, type=int)
    parser.add_argument("--height", required=True, type=int)
    parser.add_argument("--padding", type=int, default=24)
    parser.add_argument(
        "--anchor",
        choices=("center", "bottom-center"),
        default="center",
    )
    args = parser.parse_args()

    with Image.open(args.input) as source:
        rgba = source.convert("RGBA")

    alpha_box = rgba.getchannel("A").getbbox()
    if alpha_box is None:
        raise ValueError(f"Asset has no visible pixels: {args.input}")

    trimmed = rgba.crop(alpha_box)
    available_width = args.width - args.padding * 2
    available_height = args.height - args.padding * 2
    if available_width <= 0 or available_height <= 0:
        raise ValueError("Padding leaves no drawable canvas area")

    scale = min(available_width / trimmed.width, available_height / trimmed.height)
    size = (
        max(1, round(trimmed.width * scale)),
        max(1, round(trimmed.height * scale)),
    )
    resized = trimmed.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (args.width, args.height), (0, 0, 0, 0))
    x = (args.width - resized.width) // 2
    if args.anchor == "bottom-center":
        y = args.height - args.padding - resized.height
    else:
        y = (args.height - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.suffix.lower() == ".webp":
        canvas.save(args.output, "WEBP", quality=90, method=6)
    else:
        canvas.save(args.output, "PNG", optimize=True)
    print(
        f"output={args.output} canvas={args.width}x{args.height} "
        f"content={resized.width}x{resized.height} offset={x},{y}"
    )


if __name__ == "__main__":
    main()
