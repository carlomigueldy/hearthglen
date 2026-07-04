"""Boar enemy generator — M1 placeholder creature, blocky and flat-shaded.

Nose points toward Blender +Y so the exported glb faces -Z (three.js forward).
generate(seed, params) -> {"render": Object, "collider": Object, "lod1": Object}
"""

import random

import bmesh
import bpy
from mathutils import Matrix, Vector

DEFAULTS = {
    "length": 1.25,
    "height": 0.62,
    "width": 0.55,
    "tri_budget": 320,
    "body_colors": ["russet", "bark_dark", "soil"],
    "tusk_color": "cream",
    "hoof_color": "charcoal",
}


def _box(bm, size, center):
    ret = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(Vector(center)))
    verts = ret["verts"]
    sx, sy, sz = size
    for v in verts:
        c = Vector(center)
        v.co = Vector((c.x + (v.co.x - c.x) * sx, c.y + (v.co.y - c.y) * sy, c.z + (v.co.z - c.z) * sz))
    return verts


def _cone(bm, radius, depth, center, direction):
    rot = direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
    mat = Matrix.Translation(Vector(center)) @ rot
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=True, segments=5, radius1=radius, radius2=0.01,
        depth=depth, matrix=mat,
    )


def generate(seed, params, palette_linear, make_object, decimate_to, convex_collider):
    p = {**DEFAULTS, **params}
    rng = random.Random(seed)

    L = p["length"] * rng.uniform(0.9, 1.15)
    H = p["height"] * rng.uniform(0.9, 1.1)
    W = p["width"] * rng.uniform(0.9, 1.1)
    leg_h = H * 0.45
    body_z = leg_h + H * 0.3

    mesh = bpy.data.meshes.new(f"boar_{seed}")
    bm = bmesh.new()

    # body (+Y = nose direction), slight taper via two boxes
    _box(bm, (W, L * 0.72, H * 0.62), (0, -L * 0.1, body_z))
    _box(bm, (W * 0.86, L * 0.34, H * 0.5), (0, L * 0.3, body_z + H * 0.02))
    # head + snout
    head_y = L * 0.52
    _box(bm, (W * 0.62, L * 0.26, H * 0.46), (0, head_y, body_z + H * 0.06))
    _box(bm, (W * 0.3, L * 0.14, H * 0.2), (0, head_y + L * 0.18, body_z - H * 0.02))
    # ears
    _box(bm, (W * 0.14, L * 0.06, H * 0.16), (W * 0.2, head_y, body_z + H * 0.34))
    _box(bm, (W * 0.14, L * 0.06, H * 0.16), (-W * 0.2, head_y, body_z + H * 0.34))
    # tusks (up-forward)
    tusk_dir = Vector((0, 0.5, 1)).normalized()
    _cone(bm, 0.03, 0.16, (W * 0.16, head_y + L * 0.15, body_z - H * 0.08), tusk_dir)
    _cone(bm, 0.03, 0.16, (-W * 0.16, head_y + L * 0.15, body_z - H * 0.08), tusk_dir)
    # legs
    for sx in (1, -1):
        for sy in (0.28, -0.38):
            _box(bm, (W * 0.2, L * 0.14, leg_h), (sx * W * 0.3, sy * L, leg_h / 2))
    # tail nub
    _box(bm, (W * 0.1, L * 0.08, H * 0.1), (0, -L * 0.52, body_z + H * 0.2))

    bm.to_mesh(mesh)
    bm.free()

    layer = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
    body_color = palette_linear[rng.choice(p["body_colors"])]
    tusk = palette_linear[p["tusk_color"]]
    hoof = palette_linear[p["hoof_color"]]
    for poly in mesh.polygons:
        poly.use_smooth = False
        c = poly.center
        if c.z < leg_h * 0.4:
            color = hoof
        elif c.y > L * 0.6 and c.z < body_z:
            color = tusk
        else:
            color = body_color
        for li in poly.loop_indices:
            layer.data[li].color = color

    render = make_object(f"boar_{seed}", mesh)
    decimate_to(render, p["tri_budget"])
    collider = convex_collider(render, max_verts=16)
    lod1 = decimate_to(make_object(f"boar_{seed}_lod1", mesh.copy()), p["tri_budget"] // 4)
    return {"render": render, "collider": collider, "lod1": lod1}
