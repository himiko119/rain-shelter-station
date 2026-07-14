#!/usr/bin/env python3
"""Compose equal-size RGBA frames into one deterministic horizontal strip."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inputs", required=True, help="Comma-separated frame paths")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    paths = [Path(value.strip()) for value in args.inputs.split(",") if value.strip()]
    if not paths:
        raise ValueError("At least one input frame is required")

    frames: list[Image.Image] = []
    for path in paths:
        with Image.open(path) as image:
            frames.append(image.convert("RGBA"))

    cell_size = frames[0].size
    if any(frame.size != cell_size for frame in frames):
        raise ValueError("All frames must use the same canvas size")

    sheet = Image.new("RGBA", (cell_size[0] * len(frames), cell_size[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * cell_size[0], 0))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, "PNG", optimize=True)
    print(f"output={args.output} frames={len(frames)} cell={cell_size} sheet={sheet.size}")


if __name__ == "__main__":
    main()
