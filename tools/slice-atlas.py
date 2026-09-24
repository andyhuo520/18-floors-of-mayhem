#!/usr/bin/env python3
"""Cut a generated atlas into individual trimmed sprites.

The generator lays elements out on a loose grid, so rows and columns are found from the
image itself (bands of pure background) rather than assumed to be evenly spaced. Sheets
that already carry alpha are used as-is; flat-background sheets are keyed out by colour
distance to a sampled corner.
"""
import json
import pathlib
import sys

from PIL import Image

BG_TOLERANCE = 46


def content_mask(im):
    """Return a 2D list of booleans: True where the pixel is part of a sprite."""
    if im.mode == "RGBA" and im.split()[-1].getextrema()[0] < 250:
        alpha = im.split()[-1].load()
        w, h = im.size
        return [[alpha[x, y] > 24 for x in range(w)] for y in range(h)], None

    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    # Corners are background on every sheet the generator produces.
    corners = [px[1, 1], px[w - 2, 1], px[1, h - 2], px[w - 2, h - 2]]
    bg = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))
    mask = [
        [
            sum(abs(px[x, y][i] - bg[i]) for i in range(3)) > BG_TOLERANCE
            for x in range(w)
        ]
        for y in range(h)
    ]
    return mask, bg


def flood_background(im, tolerance=58):
    """Clear background that is connected to the image border.

    Only usable on sheets whose subject contrasts sharply with the backdrop. On textured
    pixel art the region grows along the subject's own shading and eats it, so the fix for a
    sheet with painted scenery is to regenerate it with a flat backdrop, not to key it here.
    """
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    out = im.load()
    seen = bytearray(w * h)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            stack.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            stack.append((x, y))
    while stack:
        x, y = stack.pop()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        here = px[x, y]
        out[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h) or seen[ny * w + nx]:
                continue
            there = px[nx, ny]
            if sum(abs(here[c] - there[c]) for c in range(3)) <= tolerance:
                stack.append((nx, ny))
    return im


def bands(counts, minimum):
    """Group consecutive indices whose content count clears `minimum`."""
    out, start = [], None
    for i, c in enumerate(counts):
        if c > minimum:
            if start is None:
                start = i
        elif start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(counts)))
    return out


def trim(mask, x0, x1, y0, y1):
    xs = [x for x in range(x0, x1) if any(mask[y][x] for y in range(y0, y1))]
    ys = [y for y in range(y0, y1) if any(mask[y][x] for x in range(x0, x1))]
    if not xs or not ys:
        return None
    return xs[0], ys[0], xs[-1] + 1, ys[-1] + 1


def slice_grid(path, names, out_dir, rows, cols, flood=False, bleed=0.0):
    """Cut a known rows x cols layout, trimming each cell to its own content.

    A fixed grid keeps each sprite matched to its intended name, which projection-based
    row finding cannot guarantee once a tall element overflows its row.
    """
    im = Image.open(path).convert("RGBA")
    mask, bg = content_mask(im)
    w, h = im.size
    if bg is not None:
        px = im.load()
        for y in range(h):
            row = mask[y]
            for x in range(w):
                if not row[x]:
                    px[x, y] = (0, 0, 0, 0)

    # Rows come from the image because content does not sit on even thirds; columns stay a
    # fixed division so a sprite with an internal gap is never split into two names.
    row_counts = [sum(r) for r in mask]
    row_bands = []
    for band in bands(row_counts, w // 120):
        # Spikes and coils leave thin horizontal gaps inside one row; those are not row breaks.
        if row_bands and band[0] - row_bands[-1][1] <= h // 24:
            row_bands[-1] = (row_bands[-1][0], band[1])
        else:
            row_bands.append(band)
    row_bands = [b for b in row_bands if b[1] - b[0] >= 24]
    if len(row_bands) != rows:
        ch = h / rows
        row_bands = [(int(r * ch), int((r + 1) * ch)) for r in range(rows)]
    cw = w / cols
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for r, (y0, y1) in enumerate(row_bands):
        for c in range(cols):
            x0, x1 = int(c * cw), int((c + 1) * cw)
            name = names[r * cols + c]
            if flood:
                # Clear this cell's own painted backdrop before measuring the subject, so rock
                # behind the creature does not travel into a differently coloured biome.
                cell = flood_background(im.crop((x0, y0, x1, y1)).copy())
                alpha = cell.split()[-1].load()
                cw_, ch_ = cell.size
                cell_mask = [[alpha[x, y] > 24 for x in range(cw_)] for y in range(ch_)]
                inner = trim(cell_mask, 0, cw_, 0, ch_)
                if not inner:
                    continue
                sprite = cell.crop(inner)
                target = out_dir / f"{name}.webp"
                sprite.save(target, "WEBP", lossless=True)
                written.append({"name": name, "file": target.name, "w": sprite.width, "h": sprite.height})
                continue
            box = trim(mask, x0, x1, y0, y1)
            if not box:
                continue
            sprite = im.crop(box)
            target = out_dir / f"{name}.webp"
            sprite.save(target, "WEBP", lossless=True)
            written.append({"name": name, "file": target.name, "w": sprite.width, "h": sprite.height})
    return written


def slice_sheet(path, names, out_dir, min_side=24):
    im = Image.open(path).convert("RGBA")
    mask, bg = content_mask(im)
    w, h = im.size
    if bg is not None:
        # Drop the flat background so sprites composite over the cave art.
        px = im.load()
        for y in range(h):
            row = mask[y]
            for x in range(w):
                if not row[x]:
                    px[x, y] = (0, 0, 0, 0)

    row_counts = [sum(r) for r in mask]
    row_bands = [b for b in bands(row_counts, w // 120) if b[1] - b[0] >= min_side]
    out_dir.mkdir(parents=True, exist_ok=True)
    written, index = [], 0
    for y0, y1 in row_bands:
        col_counts = [sum(mask[y][x] for y in range(y0, y1)) for x in range(w)]
        col_bands = [b for b in bands(col_counts, 1) if b[1] - b[0] >= min_side]
        # Cells separated by only a few pixels are one sprite with a gap in it.
        merged = []
        for b in col_bands:
            if merged and b[0] - merged[-1][1] < min_side:
                merged[-1] = (merged[-1][0], b[1])
            else:
                merged.append(b)
        for x0, x1 in merged:
            box = trim(mask, x0, x1, y0, y1)
            if not box:
                continue
            name = names[index] if index < len(names) else f"cell{index:02d}"
            index += 1
            sprite = im.crop(box)
            target = out_dir / f"{name}.webp"
            sprite.save(target, "WEBP", lossless=True)
            written.append({"name": name, "file": target.name, "w": sprite.width, "h": sprite.height})
    return written


SHEETS = {
    "items": (
        "v2/2099390317816938496.webp",
        (3, 4),
        False,
        [
            "heart", "hourglass", "shield", "poison",
            "platform-solid", "platform-cracked", "platform-collapsing", "platform-conveyor",
            "spikes-down", "spikes-up", "spring-idle", "spring-fired",
        ],
    ),
    "beast": (
        "v3/2099409770143850496.webp",
        (2, 4),
        False,
        [
            "eyes-hidden", "eye-opening", "eyes-glowing", "head-out",
            "arm-wind", "arm-reach", "claw-grip", "arm-retract",
        ],
    ),
    "shield-variants": (
        "v4/2099414340567867392.webp",
        (2, 4),
        False,
        [
            "heater", "echo-hourglass", "plain-hex", "echo-poison",
            "heater-alt", "buckler", "kite", "tower",
        ],
    ),
    "badges": (
        "v5/BADGE_SHEET.webp",
        (2, 4),
        False,
        [
            "badge-anthropic", "badge-openai", "badge-deepseek", "badge-glm",
            "badge-custom", "flag-us", "flag-cn", "badge-crown",
        ],
    ),
    "cave": (
        "v2/2099389831646773248.webp",
        (3, 4),
        False,
        [
            "wall-roots", "wall-pebbles", "wall-vein", "wall-root-vein",
            "top-moss", "top-rootbeam", "top-cracked", "top-vine",
            "prop-vines", "prop-leaves", "prop-tendrils", "prop-fruit",
        ],
    ),
}

# The first shield read as a flat green plate that blended into the mossy platform tops.
OVERRIDES = {"items/shield.webp": "shield-variants/heater.webp"}


if __name__ == "__main__":
    base = pathlib.Path(__file__).resolve().parent.parent / "public" / "combos-assets"
    manifest = {}
    for key, (filename, (rows, cols), flood, names) in SHEETS.items():
        source = base / filename
        if not source.exists():
            # A registered sheet whose generation has not landed yet (the badges sheet sat in the
            # provider queue for
            # nearly an hour) must not stop every other sheet from being re-cut.
            print(f"{key}: source {filename} not present, skipped")
            continue
        written = slice_grid(source, names, base / "sprites" / key, rows, cols, flood)
        manifest[key] = written
        print(f"{key}: {len(written)} sprites")
        for entry in written:
            print(f"  {entry['name']:22} {entry['w']:4}x{entry['h']:<4}")
        missing = [n for n in names if n not in {e["name"] for e in written}]
        if missing:
            print(f"  MISSING: {', '.join(missing)}", file=sys.stderr)
    # A follow-up sheet can replace a single icon from an earlier batch. The replacement is copied
    # under the name the renderer already asks for, so nothing outside this table has to change.
    for target, source in OVERRIDES.items():
        dst = base / "sprites" / target
        src = base / "sprites" / source
        dst.write_bytes(src.read_bytes())
        group, name = target.split("/")[0], pathlib.Path(target).stem
        for entry in manifest[group]:
            if entry["name"] == name:
                with Image.open(dst) as im:
                    entry["w"], entry["h"] = im.size
                entry["replaced_by"] = source
        print(f"override: {target} <- {source}")

    (base / "sprites" / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
