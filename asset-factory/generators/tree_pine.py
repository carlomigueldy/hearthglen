"""Pine tree generator.

generate(seed, params) -> {"render": Object, "collider": Object, "lod1": Object}

A low-poly pine: tapered 6-sided trunk with a slight lean, 2-4 stacked
foliage cones with per-cone green variation. Collider is the trunk only
(players brush past foliage, bump into wood).
"""

import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

DEFAULTS = {
    "height": 5.0,
    "height_jitter": 0.3,
    "trunk_radius": 0.22,
    "trunk_segments": 6,
    "lean": 0.06,
    "cones": (3, 4),
    "cone_segments": 7,
    "spread": 1.6,
    "tri_budget": 500,
    "trunk_colors": ["bark", "bark_dark"],
    "foliage_colors": ["pine_deep", "pine", "pine_light"],
}


def _add_cone(bm, rng, radius, depth, z, segments, lean_off):
    mat = Matrix.Translation(Vector((lean_off.x, lean_off.y, z + depth / 2)))
    ret = bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=True,
        segments=segments,
        radius1=radius,
        radius2=0.02,
        depth=depth,
        matrix=mat,
    )
    return ret["verts"]


def generate(seed, params, palette_linear, make_object, decimate_to, convex_collider):
    p = {**DEFAULTS, **params}
    rng = random.Random(seed)

    height = p["height"] * rng.uniform(1 - p["height_jitter"], 1 + p["height_jitter"])
    trunk_top = height * 0.35
    lean_dir = rng.uniform(0, math.tau)
    lean = Vector((math.cos(lean_dir), math.sin(lean_dir), 0)) * p["lean"] * height

    mesh = bpy.data.meshes.new(f"pine_{seed}")
    bm = bmesh.new()

    # trunk: tapered cylinder, marked so we can color it after tessellation
    trunk_verts = bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=True,
        segments=p["trunk_segments"],
        radius1=p["trunk_radius"] * rng.uniform(0.9, 1.3),
        radius2=p["trunk_radius"] * 0.6,
        depth=trunk_top,
        matrix=Matrix.Translation(Vector((0, 0, trunk_top / 2))),
    )["verts"]
    trunk_ids = {v.index for v in trunk_verts}
    trunk_top_z = trunk_top  # faces below this (and in trunk set) are bark

    # stacked foliage cones from ~30% height to the tip
    n_cones = rng.randint(*p["cones"])
    cone_colors = []
    base_z = height * 0.28
    for i in range(n_cones):
        t = i / n_cones
        z = base_z + (height - base_z) * t * 0.82
        radius = p["spread"] * (1 - t * 0.72) * rng.uniform(0.85, 1.15)
        depth = (height - base_z) / n_cones * rng.uniform(1.25, 1.6)
        _add_cone(bm, rng, radius, depth, z, p["cone_segments"], lean * t)
        cone_colors.append(rng.choice(p["foliage_colors"]))

    bm.to_mesh(mesh)
    bm.free()

    # per-face flat palette colors: bark low + inside trunk radius, foliage otherwise
    layer = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
    trunk_color = palette_linear[rng.choice(p["trunk_colors"])]
    for poly in mesh.polygons:
        poly.use_smooth = False
        center = poly.center
        if center.z < trunk_top_z and (center.x**2 + center.y**2) ** 0.5 < p["spread"] * 0.5:
            color = trunk_color
        else:
            band = min(
                n_cones - 1,
                max(0, int((center.z - base_z) / max(height - base_z, 1e-6) * n_cones)),
            )
            color = palette_linear[cone_colors[band]]
        for li in poly.loop_indices:
            layer.data[li].color = color

    render = make_object(f"pine_{seed}", mesh)
    decimate_to(render, p["tri_budget"])

    # collider: trunk only — a slim convex prism up to foliage base
    collider = convex_collider(render, max_verts=12, only_below_z=base_z * 1.1, only_radius=p["trunk_radius"] * 2.5)
    lod1 = decimate_to(make_object(f"pine_{seed}_lod1", mesh.copy()), p["tri_budget"] // 4)
    _ = trunk_ids  # trunk vertex ids kept for future variants (snow caps, stumps)
    return {"render": render, "collider": collider, "lod1": lod1}
