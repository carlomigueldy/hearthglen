"""Hearthglen 32-color palette — the single source of truth.

Every vertex color in every generated asset must come from this table
(enforced by build.py's conformance check). The app consumes the same
palette via the generated JSON (app/src/render/palette.json).

Usage: python3 palette.py [output.json]
"""

import json
import sys

# name -> sRGB hex (design-facing values; converted to linear for Blender)
PALETTE = {
    # foliage greens
    "pine_deep": "#2d4a32",
    "pine": "#3d6647",
    "pine_light": "#55835c",
    "grass": "#6a994e",
    "meadow": "#8ab661",
    "moss": "#7d9459",
    # wood browns
    "bark_dark": "#4a3728",
    "bark": "#6b4f3a",
    "wood_warm": "#8a6a4e",
    "plank": "#a58562",
    "tan": "#c2a878",
    # rock grays
    "slate_dark": "#4b4e57",
    "stone": "#6e7178",
    "granite": "#8d9096",
    "gray_pale": "#b0b3b8",
    # earth
    "soil": "#5c4433",
    "clay": "#9c6b4a",
    # warm accents
    "hearth_orange": "#d9772f",
    "ember": "#c1442e",
    "gold_harvest": "#d9a441",
    "honey": "#e8c170",
    # cool accents
    "sky": "#8fb8d0",
    "water": "#4e7d96",
    "water_deep": "#2f5468",
    "dusk": "#6f5d80",
    # autumn
    "russet": "#a85832",
    "amber": "#c98a3d",
    "maple": "#b33f2e",
    # neutrals
    "cream": "#e8dcc8",
    "off_white": "#f2ece0",
    "charcoal": "#2b2724",
    "night": "#1a1614",
}

assert len(PALETTE) == 32, f"palette must have exactly 32 colors, has {len(PALETTE)}"


def hex_to_srgb(hex_color):
    """'#rrggbb' -> (r, g, b) floats in 0..1, sRGB-encoded."""
    h = hex_color.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4))


def srgb_to_linear(c):
    """One sRGB-encoded channel -> scene-linear (Blender color attribute space)."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear_rgba(name):
    """Palette name -> (r, g, b, 1.0) scene-linear, for Blender color attributes."""
    r, g, b = hex_to_srgb(PALETTE[name])
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)


LINEAR = {name: linear_rgba(name) for name in PALETTE}


def is_palette_color(rgba, epsilon=1e-4):
    """True if a linear RGBA tuple matches some palette entry (alpha ignored)."""
    return any(
        all(abs(rgba[i] - lin[i]) <= epsilon for i in range(3)) for lin in LINEAR.values()
    )


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "palette.json"
    with open(out, "w") as f:
        json.dump(PALETTE, f, indent=2)
        f.write("\n")
    print(f"wrote {len(PALETTE)} colors -> {out}")
