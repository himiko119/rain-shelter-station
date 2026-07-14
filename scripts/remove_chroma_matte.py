#!/usr/bin/env python3
"""Remove a connected cyan generation matte while preserving interior colors."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--feather", type=float, default=0.7)
    parser.add_argument(
        "--include-islands",
        action="store_true",
        help="Also remove enclosed cyan matte islands (recommended for props).",
    )
    args = parser.parse_args()

    with Image.open(args.input) as source:
        rgba = source.convert("RGBA")

    rgb = np.asarray(rgba, dtype=np.int16)[..., :3]
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    cyan_candidate = (
        (red <= 150)
        & (green >= 105)
        & (blue >= 105)
        & (((green + blue) // 2 - red) >= 35)
        & (np.abs(green - blue) <= 120)
    )

    # Flood only candidate pixels connected to the image border. This protects
    # intentional cyan details inside a character or prop.
    candidate = Image.fromarray(np.where(cyan_candidate, 0, 255).astype(np.uint8), "L")
    draw = ImageDraw.Draw(candidate)
    for seed in (
        (0, 0),
        (candidate.width - 1, 0),
        (0, candidate.height - 1),
        (candidate.width - 1, candidate.height - 1),
        (candidate.width // 2, 0),
        (candidate.width // 2, candidate.height - 1),
    ):
        if candidate.getpixel(seed) == 0:
            ImageDraw.floodfill(candidate, seed, 128, thresh=0)

    connected_background = (
        Image.fromarray(np.where(cyan_candidate, 255, 0).astype(np.uint8), "L")
        if args.include_islands
        else candidate.point(lambda value: 255 if value == 128 else 0)
    )
    if args.feather > 0:
        connected_background = connected_background.filter(
            ImageFilter.GaussianBlur(radius=args.feather),
        )
    alpha = ImageOps.invert(connected_background)
    rgba.putalpha(alpha)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(args.output, "PNG", optimize=True)
    visible = alpha.getbbox()
    print(
        f"output={args.output} size={rgba.width}x{rgba.height} "
        f"visible={visible} alpha={alpha.getextrema()}"
    )


if __name__ == "__main__":
    main()
