"""Asset factory entry point — runs inside Blender.

    blender --background --python build.py -- params/<recipe>.json

Recipe JSON: {"generator": "rock", "name": "rock_valley", "seed": 42,
              "variants": 4, "params": {...}}

For each variant i (seed + i): builds render mesh + convex collider + LOD1,
verifies palette conformance, exports exports/<name>_<i>.glb, renders 4-angle
turntables to review/, and writes review/<name>_stats.json.
"""

import importlib.util
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from palette import LINEAR, is_palette_color  # noqa: E402

EXPORTS = os.path.join(ROOT, "exports")
REVIEW = os.path.join(ROOT, "review")


# ---------- helpers handed to generators ----------

def make_object(name, mesh):
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def _tri_count(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


def decimate_to(ob, tri_budget):
    tris = _tri_count(ob)
    if tris > tri_budget:
        mod = ob.modifiers.new("decimate", "DECIMATE")
        mod.ratio = tri_budget / tris
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
        for poly in ob.data.polygons:
            poly.use_smooth = False
    return ob


def convex_collider(render_ob, max_verts=24, only_below_z=None, only_radius=None):
    """Convex hull of (optionally filtered) render verts -> new *_col object."""
    bm = bmesh.new()
    for v in render_ob.data.vertices:
        co = v.co
        if only_below_z is not None and co.z > only_below_z:
            continue
        if only_radius is not None and (co.x**2 + co.y**2) ** 0.5 > only_radius:
            continue
        bm.verts.new(co)
    if len(bm.verts) < 4:  # filtered too aggressively; fall back to all verts
        bm.clear()
        for v in render_ob.data.vertices:
            bm.verts.new(v.co)
    bm.verts.ensure_lookup_table()
    hull = bmesh.ops.convex_hull(bm, input=list(bm.verts))
    doomed = {
        g
        for g in list(hull["geom_interior"]) + list(hull["geom_unused"])
        if isinstance(g, bmesh.types.BMVert)
    }
    bmesh.ops.delete(bm, geom=list(doomed), context="VERTS")

    mesh = bpy.data.meshes.new(render_ob.name + "_col")
    bm.to_mesh(mesh)
    bm.free()
    col = make_object(render_ob.name + "_col", mesh)
    if len(mesh.vertices) > max_verts:
        decimate_to(col, max_verts * 2)  # hull tris ≈ 2·verts
    return col


# ---------- build pipeline ----------

def load_generator(name):
    path = os.path.join(ROOT, "generators", f"{name}.py")
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def palette_material():
    mat = bpy.data.materials.new("hearthglen_palette")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes["Principled BSDF"]
    attr = nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    mat.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    return mat


def check_conformance(ob):
    layer = ob.data.color_attributes.get("Col")
    assert layer is not None, f"{ob.name}: missing Col color attribute"
    bad = sum(1 for item in layer.data if not is_palette_color(tuple(item.color)))
    assert bad == 0, f"{ob.name}: {bad} loop colors outside the 32-color palette"


def bounds(ob):
    xs = [v.co for v in ob.data.vertices]
    lo = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs)))
    hi = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
    return lo, hi


def export_glb(objects, filepath):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:
        ob.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
    )


def turntable(render_ob, out_prefix):
    # Cycles CPU: works headless without a GL context (WSL2-friendly)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.render.resolution_x = scene.render.resolution_y = 512
    scene.render.film_transparent = True

    world = bpy.data.worlds.new("qa_world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.7
    scene.world = world

    sun_data = bpy.data.lights.new("qa_sun", type="SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("qa_sun", sun_data)
    sun.rotation_euler = (0.7, 0.2, 0.6)
    scene.collection.objects.link(sun)

    lo, hi = bounds(render_ob)
    center = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 0.1)

    cam_data = bpy.data.cameras.new("qa_cam")
    cam = bpy.data.objects.new("qa_cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    for i in range(4):
        angle = i * math.tau / 4 + 0.4
        offset = Vector((math.cos(angle), math.sin(angle), 0.55)) * radius * 2.6
        cam.location = center + offset
        cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = f"{out_prefix}_turntable_{i}.png"
        bpy.ops.render.render(write_still=True)

    bpy.data.objects.remove(cam)
    bpy.data.cameras.remove(cam_data)


def build(recipe_path):
    with open(recipe_path) as f:
        recipe = json.load(f)

    os.makedirs(EXPORTS, exist_ok=True)
    os.makedirs(REVIEW, exist_ok=True)

    gen = load_generator(recipe["generator"])
    name = recipe["name"]
    stats = {"recipe": name, "generator": recipe["generator"], "variants": []}

    for i in range(recipe.get("variants", 1)):
        reset_scene()
        mat = palette_material()
        seed = recipe.get("seed", 0) + i

        result = gen.generate(
            seed, recipe.get("params", {}), LINEAR, make_object, decimate_to, convex_collider
        )
        render, collider, lod1 = result["render"], result["collider"], result["lod1"]
        render.name = f"{name}_{i}"
        collider.name = f"{name}_{i}_col"
        lod1.name = f"{name}_{i}_lod1"
        for ob in (render, lod1):
            ob.data.materials.append(mat)

        check_conformance(render)
        lo, hi = bounds(render)
        glb = os.path.join(EXPORTS, f"{name}_{i}.glb")
        export_glb([render, collider, lod1], glb)
        turntable(render, os.path.join(REVIEW, f"{name}_{i}"))

        stats["variants"].append(
            {
                "seed": seed,
                "tris": _tri_count(render),
                "collider_verts": len(collider.data.vertices),
                "lod1_tris": _tri_count(lod1),
                "bounds_min": list(lo),
                "bounds_max": list(hi),
                "palette_ok": True,
                "glb_bytes": os.path.getsize(glb),
            }
        )
        print(f"[factory] {name}_{i}: {stats['variants'][-1]['tris']} tris -> {glb}")

    stats_path = os.path.join(REVIEW, f"{name}_stats.json")
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"[factory] stats -> {stats_path}")


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    assert argv, "usage: blender --background --python build.py -- params/<recipe>.json"
    build(argv[0])
