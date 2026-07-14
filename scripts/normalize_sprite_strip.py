#!/usr/bin/env python3
"""Normalize a keyed horizontal sprite strip with one shared scale and baseline."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--frames", required=True, type=int)
    parser.add_argument("--cell-width", type=int, default=96)
    parser.add_argument("--cell-height", type=int, default=112)
    parser.add_argument("--padding", type=int, default=4)
    parser.add_argument("--preview-dir", type=Path)
    args = parser.parse_args()

    if args.frames <= 0:
        raise ValueError("Frame count must be positive")

    with Image.open(args.input) as source:
        strip = source.convert("RGBA")

    frames: list[Image.Image] = []
    boxes: list[tuple[int, int, int, int]] = []
    for index in range(args.frames):
        left = round(index * strip.width / args.frames)
        right = round((index + 1) * strip.width / args.frames)
        frame = strip.crop((left, 0, right, strip.height))
        box = frame.getchannel("A").getbbox()
        if box is None:
            raise ValueError(f"Frame {index} has no visible pixels")
        frames.append(frame)
        boxes.append(box)

    max_width = max(box[2] - box[0] for box in boxes)
    max_height = max(box[3] - box[1] for box in boxes)
    drawable_width = args.cell_width - args.padding * 2
    drawable_height = args.cell_height - args.padding * 2
    scale = min(drawable_width / max_width, drawable_height / max_height)

    normalized_frames: list[Image.Image] = []
    for index, (frame, box) in enumerate(zip(frames, boxes, strict=True)):
        visible = frame.crop(box)
        size = (
            max(1, round(visible.width * scale)),
            max(1, round(visible.height * scale)),
        )
        visible = visible.resize(size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (args.cell_width, args.cell_height), (0, 0, 0, 0))
        x = (args.cell_width - visible.width) // 2
        y = args.cell_height - args.padding - visible.height
        canvas.alpha_composite(visible, (x, y))
        normalized_frames.append(canvas)

        if args.preview_dir:
            args.preview_dir.mkdir(parents=True, exist_ok=True)
            canvas.save(args.preview_dir / f"frame-{index}.png", "PNG", optimize=True)

    output = Image.new(
        "RGBA",
        (args.cell_width * args.frames, args.cell_height),
        (0, 0, 0, 0),
    )
    for index, frame in enumerate(normalized_frames):
        output.alpha_composite(frame, (index * args.cell_width, 0))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    output.save(args.output, "PNG", optimize=True)
    print(
        f"output={args.output} frames={args.frames} cell={args.cell_width}x{args.cell_height} "
        f"source-max={max_width}x{max_height} scale={scale:.5f}"
    )


if __name__ == "__main__":
    main()
