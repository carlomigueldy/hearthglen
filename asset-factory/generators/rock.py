"""Boulder/rock generator.

generate(seed, params) -> {"render": Object, "collider": Object, "lod1": Object}

A displaced, non-uniformly scaled icosphere with per-face palette colors
(rock grays, optional mossy top faces). Deliberately chunky and faceted.
"""

import random

import bmesh
import bpy
from mathutils import Vector

DEFAULTS = {
    "subdivisions": 2,
    "radius": 1.0,
    "displace": 0.25,
    "squash": (0.8, 1.25),
    "moss_chance": 0.45,
    "moss_threshold": 0.55,
    "tri_budget": 400,
    "colors": ["stone", "slate_dark", "granite"],
    "moss_color": "moss",
}


def _base_mesh(rng, p, name):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=p["subdivisions"], radius=p["radius"])

    # jitter every vertex outward/inward for a craggy silhouette
    for v in bm.verts:
        v.co += v.normal * rng.uniform(-p["displace"], p["displace"]) * p["radius"]

    # non-uniform squash so no two rocks read the same
    sx = rng.uniform(*p["squash"])
    sy = rng.uniform(*p["squash"])
    sz = rng.uniform(0.6, 0.95)
    for v in bm.verts:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))

    # sit on the ground: lift so lowest point is z=0, sink slightly for contact
    min_z = min(v.co.z for v in bm.verts)
    for v in bm.verts:
        v.co.z -= min_z + 0.05 * p["radius"]

    bm.to_mesh(mesh)
    bm.free()
    return mesh


def _paint(mesh, rng, p, palette_linear):
    layer = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
    mossy = rng.random() < p["moss_chance"]
    for poly in mesh.polygons:
        poly.use_smooth = False
        if mossy and poly.normal.z > p["moss_threshold"]:
            color = palette_linear[p["moss_color"]]
        else:
            color = palette_linear[rng.choice(p["colors"])]
        for li in poly.loop_indices:
            layer.data[li].color = color


def generate(seed, params, palette_linear, make_object, decimate_to, convex_collider):
    p = {**DEFAULTS, **params}
    rng = random.Random(seed)

    mesh = _base_mesh(rng, p, f"rock_{seed}")
    _paint(mesh, rng, p, palette_linear)
    render = make_object(f"rock_{seed}", mesh)
    decimate_to(render, p["tri_budget"])

    collider = convex_collider(render, max_verts=24)
    lod1 = decimate_to(make_object(f"rock_{seed}_lod1", mesh.copy()), p["tri_budget"] // 4)
    return {"render": render, "collider": collider, "lod1": lod1}
