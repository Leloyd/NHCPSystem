"""Render a neutral front or rear preview of a GLB for asset validation."""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def arguments() -> tuple[Path, Path, float, bool]:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) < 2:
        raise SystemExit("Expected model and output paths after --")
    side = float(args[2]) if len(args) > 2 else -1.0
    exploded = len(args) > 3 and args[3].lower() == "exploded"
    return Path(args[0]).resolve(), Path(args[1]).resolve(), side, exploded


def look_at(obj: bpy.types.Object, point: Vector) -> None:
    obj.rotation_euler = (point - obj.location).to_track_quat("-Z", "Y").to_euler()


def main() -> None:
    model_path, output_path, side, exploded = arguments()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(model_path))
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if not meshes:
        raise RuntimeError("No mesh objects found.")

    corners = [item.matrix_world @ Vector(corner) for item in meshes for corner in item.bound_box]
    minimum = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    center = (minimum + maximum) * 0.5
    extents = maximum - minimum
    depth_axis = min(range(3), key=lambda axis: extents[axis])
    plane_axes = [axis for axis in range(3) if axis != depth_axis]
    view_size = max(extents[plane_axes[0]], extents[plane_axes[1]])
    print(
        "Preview geometry:",
        "objects=", len(meshes),
        "min=", tuple(round(value, 4) for value in minimum),
        "max=", tuple(round(value, 4) for value in maximum),
        "extents=", tuple(round(value, 4) for value in extents),
        "depth_axis=", depth_axis,
        "hidden=", [item.hide_render for item in meshes],
        "visible=", [item.visible_get() for item in meshes],
        "normal_lengths=", [
            (
                round(min((face.normal.length for face in item.data.polygons), default=0.0), 4),
                round(max((face.normal.length for face in item.data.polygons), default=0.0), 4),
            )
            for item in meshes
        ],
    )

    if exploded and len(meshes) > 1:
        for index, item in enumerate(meshes):
            object_center = item.matrix_world.translation.copy()
            direction = object_center - center
            direction[depth_axis] = 0.0
            if direction.length < 1e-6:
                angle = (index / len(meshes)) * math.tau
                direction[plane_axes[0]] = math.cos(angle)
                direction[plane_axes[1]] = math.sin(angle)
            direction.normalize()
            item.location += direction * view_size * 0.085
            item.location[depth_axis] += ((index % 3) - 1) * view_size * 0.012

    camera_data = bpy.data.cameras.new("Preview_Camera")
    camera = bpy.data.objects.new("Preview_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = center.copy()
    camera.location[depth_axis] += side * view_size * 1.65
    look_at(camera, center)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = view_size * (1.38 if exploded else 1.14)
    bpy.context.scene.camera = camera
    bpy.context.view_layer.update()
    projected_center = camera.matrix_world.inverted() @ center
    print(
        "Camera:",
        "location=", tuple(round(value, 4) for value in camera.location),
        "rotation=", tuple(round(value, 4) for value in camera.rotation_euler),
        "center_camera_space=", tuple(round(value, 4) for value in projected_center),
        "surface_area=", round(sum(face.area for item in meshes for face in item.data.polygons), 5),
    )

    key_data = bpy.data.lights.new("Key_Light", type="AREA")
    key_data.energy = 900
    key_data.shape = "DISK"
    key_data.size = view_size * 1.8
    key = bpy.data.objects.new("Key_Light", key_data)
    bpy.context.collection.objects.link(key)
    key.location = camera.location.copy()
    key.location[plane_axes[0]] += view_size * 0.35
    key.location[plane_axes[1]] += view_size * 0.45
    look_at(key, center)

    fill_data = bpy.data.lights.new("Fill_Light", type="AREA")
    fill_data.energy = 450
    fill_data.size = view_size * 1.4
    fill = bpy.data.objects.new("Fill_Light", fill_data)
    bpy.context.collection.objects.link(fill)
    fill.location = camera.location.copy()
    fill.location[plane_axes[0]] -= view_size * 0.55
    fill.location[plane_axes[1]] -= view_size * 0.15
    look_at(fill, center)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (0.62, 0.40, 0.12)
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(output_path)
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Preview_World")
    scene.world.color = (0.008, 0.006, 0.003)
    scene.view_settings.look = "AgX - Medium High Contrast"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {output_path}")


if __name__ == "__main__":
    main()
