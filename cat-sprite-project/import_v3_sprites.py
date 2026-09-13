#!/usr/bin/env python3
"""Pack the reviewed V3 cat videos into game-ready transparent sprite sheets."""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from pack_sprite_sheets import COLUMNS, FRAME_SIZE, prepare_frame, validate_sheet


@dataclass(frozen=True)
class Selection:
    start: int
    end: int
    playback: str
    ping_pong: bool = False
    step: int = 1
    frames_per_second: int = 25


SELECTIONS = {
    "idle": Selection(0, 37, "loop", ping_pong=True),
    "walk": Selection(45, 64, "loop"),
    "run": Selection(45, 60, "loop"),
    "attack": Selection(32, 82, "once"),
    "fall": Selection(10, 78, "once", step=3, frames_per_second=16),
    "groom": Selection(18, 88, "once"),
    "hit": Selection(42, 82, "once"),
    "jump": Selection(18, 92, "once", step=3, frames_per_second=16),
    "land": Selection(18, 70, "once"),
    "scratch": Selection(20, 86, "once"),
    "sleep": Selection(18, 76, "hold"),
    "surprise": Selection(24, 86, "once"),
    "scruff_lift": Selection(60, 103, "once", ping_pong=True, step=5, frames_per_second=14),
}

VARIANTS = {
    "04": ("orange-tabby-v2", "tabby-v2"),
    "05": ("silver", "silver"),
    "06": ("calico", "calico"),
    "07": ("tuxedo", "tuxedo"),
    "08": ("fold", "fold"),
}

SOURCE_OVERRIDES = {
    ("04", "scruff_lift"): "cat_04_scruff_fluffy_ref",
    ("05", "surprise"): "cat_05_v3_fix2",
    ("05", "scruff_lift"): "cat_05_scruff_fluffy_ref",
    ("06", "hit"): "cat_06_v3_fix3",
    ("06", "scruff_lift"): "cat_06_scruff_fluffy_ref",
    ("07", "idle"): "cat_07_v3_fix2",
    ("07", "hit"): "cat_07_v3_fix3",
    ("07", "scruff_lift"): "cat_07_scruff_fluffy_ref",
    ("08", "scruff_lift"): "cat_08_scruff_fluffy_ref",
}


def source_video(source_root: Path, cat_id: str, action: str) -> Path:
    source_variant = SOURCE_OVERRIDES.get((cat_id, action), f"cat_{cat_id}_v3")
    candidates = sorted((source_root / source_variant / action).glob("*_hq*.mp4"))
    if len(candidates) != 1:
        raise FileNotFoundError(f"Expected one V3 source video for cat_{cat_id}/{action}: {candidates}")
    return candidates[0]


def extract_frames(video: Path, output: Path) -> list[Path]:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        import imageio_ffmpeg

        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(video),
            "-vf",
            "chromakey=0x00FF00:0.10:0.03,despill=green:mix=1.0,format=rgba",
            str(output / "frame_%04d.png"),
        ],
        check=True,
    )
    return sorted(output.glob("frame_*.png"))


def pack_video(video: Path, selection: Selection) -> tuple[Image.Image, int]:
    with tempfile.TemporaryDirectory(prefix="cat-v3-frames-") as temporary_directory:
        paths = extract_frames(video, Path(temporary_directory))
        if len(paths) <= selection.end:
            raise ValueError(f"{video} has {len(paths)} frames; selection requires {selection.end + 1}")
        paths = paths[selection.start : selection.end + 1]
        paths = paths[:: selection.step]
        if selection.ping_pong:
            paths.extend(reversed(paths[1:-1]))
        rows = math.ceil(len(paths) / COLUMNS)
        sheet = Image.new("RGBA", (COLUMNS * FRAME_SIZE, rows * FRAME_SIZE), (0, 0, 0, 0))
        for index, path in enumerate(paths):
            source = np.asarray(Image.open(path).convert("RGBA"))
            if source.shape != (512, 512, 4):
                raise ValueError(f"Expected a 512x512 RGBA frame: {path}")
            frame = prepare_frame(source)
            sheet.alpha_composite(frame, (index % COLUMNS * FRAME_SIZE, index // COLUMNS * FRAME_SIZE))
        validate_sheet(sheet, len(paths))
        return sheet, len(paths)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--only-action", choices=tuple(SELECTIONS))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest: dict[str, list[dict[str, object]]] = {}
    for cat_id, (directory_name, catalog_variant) in VARIANTS.items():
        output_directory = args.output_root / directory_name
        output_directory.mkdir(parents=True, exist_ok=True)
        assets: list[dict[str, object]] = []
        for action, selection in SELECTIONS.items():
            if args.only_action and action != args.only_action:
                continue
            video = source_video(args.source_root, cat_id, action)
            sheet, frame_count = pack_video(video, selection)
            file_action = action.replace("_", "-")
            filename = f"{directory_name}-{file_action}-01.png"
            sheet.save(output_directory / filename, optimize=True)
            assets.append(
                {
                    "action": action,
                    "catalogVariant": catalog_variant,
                    "file": filename,
                    "source": str(video.relative_to(args.source_root)),
                    "frameCount": frame_count,
                    "framesPerSecond": selection.frames_per_second,
                    "playback": selection.playback,
                }
            )
            print(f"cat_{cat_id} {action}: {frame_count} frames from {video.parent.parent.name}", flush=True)
        manifest[directory_name] = assets
    (args.output_root / "manifest.json").write_text(
        json.dumps({"version": 1, "variants": manifest}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
