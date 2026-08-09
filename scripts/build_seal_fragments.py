"""Build the Heritage Trail seal as 10 fitted, separately addressable pieces.

Run with Blender, not the system Python:
    blender --background --python scripts/build_seal_fragments.py -- \
      public/Seal/Seal.glb public/Seal/Seal-fragments.glb

The output keeps all fragments in their assembled positions and shares the
source material/textures. This lets the browser reveal, hide, or animate each
piece without loading ten copies of the same texture maps.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROW_PIECES = (4, 3, 3)
PIECE_COUNT = sum(ROW_PIECES)
FRAGMENT_PREFIX = "Seal_Fragment_"

# Deterministic offsets keep the pieces irregular while preserving a balanced
# distribution across the medallion.
SEED_JITTER = (
    (-0.10, 0.05), (0.08, -0.07), (-0.06, 0.09), (0.07, -0.04),
    (0.06, -0.08), (-0.09, 0.06), (0.10, -0.03), (-0.05, 0.08),
    (-0.07, 0.09), (0.05, -0.06),
)


def command_arguments() -> tuple[Path, Path]:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) != 2:
        raise SystemExit("Expected input and output GLB paths after --")
    return Path(args[0]).resolve(), Path(args[1]).resolve()


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_source(path: Path) -> bpy.types.Object:
    bpy.ops.import_scene.gltf(filepath=str(path))
    mesh_objects = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if not mesh_objects:
        raise RuntimeError("The source GLB does not contain a mesh.")

    bpy.ops.object.select_all(action="DESELECT")
    for item in mesh_objects:
        item.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]
    if len(mesh_objects) > 1:
        bpy.ops.object.join()

    source = bpy.context.view_layer.objects.active
    source.name = "Seal_Source"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return source


def world_bounds(obj: bpy.types.Object) -> tuple[list[float], list[float]]:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = [min(point[axis] for point in corners) for axis in range(3)]
    maximum = [max(point[axis] for point in corners) for axis in range(3)]
    return minimum, maximum


def clip_half_plane(
    polygon: list[tuple[float, float]],
    normal_x: float,
    normal_y: float,
    limit: float,
) -> list[tuple[float, float]]:
    """Clip a convex polygon to normal dot point <= limit."""
    if not polygon:
        return []

    result: list[tuple[float, float]] = []
    epsilon = 1e-9
    for index, current in enumerate(polygon):
        previous = polygon[index - 1]
        previous_value = normal_x * previous[0] + normal_y * previous[1] - limit
        current_value = normal_x * current[0] + normal_y * current[1] - limit
        previous_inside = previous_value <= epsilon
        current_inside = current_value <= epsilon

        if previous_inside != current_inside:
            denominator = previous_value - current_value
            amount = previous_value / denominator if abs(denominator) > epsilon else 0.0
            result.append(
                (
                    previous[0] + amount * (current[0] - previous[0]),
                    previous[1] + amount * (current[1] - previous[1]),
                )
            )
        if current_inside:
            result.append(current)
    return result


def build_voronoi_cells(
    bounds: tuple[float, float, float, float],
) -> tuple[list[tuple[float, float]], list[list[tuple[float, float]]]]:
    min_u, max_u, min_v, max_v = bounds
    width = max_u - min_u
    height = max_v - min_v
    seeds: list[tuple[float, float]] = []

    seed_index = 0
    row_count = len(ROW_PIECES)
    for row, pieces_in_row in enumerate(ROW_PIECES):
        for column in range(pieces_in_row):
            jitter_u, jitter_v = SEED_JITTER[seed_index]
            u = min_u + ((column + 0.5 + jitter_u) / pieces_in_row) * width
            v = min_v + ((row + 0.5 + jitter_v) / row_count) * height
            seeds.append((u, v))
            seed_index += 1

    cells: list[list[tuple[float, float]]] = []
    for seed_index, seed in enumerate(seeds):
        polygon = [(min_u, min_v), (max_u, min_v), (max_u, max_v), (min_u, max_v)]
        for other_index, other in enumerate(seeds):
            if seed_index == other_index:
                continue
            normal_x = other[0] - seed[0]
            normal_y = other[1] - seed[1]
            limit = (
                other[0] * other[0]
                + other[1] * other[1]
                - seed[0] * seed[0]
                - seed[1] * seed[1]
            ) * 0.5
            polygon = clip_half_plane(polygon, normal_x, normal_y, limit)
            if not polygon:
                break
        cells.append(polygon)

    return seeds, cells


def create_fragments(source: bpy.types.Object) -> tuple[list[bpy.types.Object], dict]:
    minimum, maximum = world_bounds(source)
    extents = [maximum[index] - minimum[index] for index in range(3)]
    depth_axis = min(range(3), key=lambda index: extents[index])
    plane_axes = tuple(index for index in range(3) if index != depth_axis)

    padding_u = extents[plane_axes[0]] * 0.08
    padding_v = extents[plane_axes[1]] * 0.08
    plane_bounds = (
        minimum[plane_axes[0]] - padding_u,
        maximum[plane_axes[0]] + padding_u,
        minimum[plane_axes[1]] - padding_v,
        maximum[plane_axes[1]] + padding_v,
    )
    seeds, cells = build_voronoi_cells(plane_bounds)

    # Assign every original polygon to its closest irregular-grid seed. Unlike
    # a boolean intersection, this retains every source triangle and all of its
    # UV data—even when an AI-generated GLB is not a clean manifold solid.
    polygon_assignments: list[list[int]] = [[] for _ in range(PIECE_COUNT)]
    for polygon in source.data.polygons:
        center = polygon.center
        u = center[plane_axes[0]]
        v = center[plane_axes[1]]
        nearest_index = min(
            range(len(seeds)),
            key=lambda index: (u - seeds[index][0]) ** 2 + (v - seeds[index][1]) ** 2,
        )
        polygon_assignments[nearest_index].append(polygon.index)

    fragments: list[bpy.types.Object] = []
    records: list[dict] = []
    for piece_index, cell in enumerate(cells, start=1):
        if len(cell) < 3:
            raise RuntimeError(f"Fragment {piece_index} has an invalid clipping cell.")
        keep_indices = set(polygon_assignments[piece_index - 1])
        if not keep_indices:
            raise RuntimeError(f"Fragment {piece_index} did not receive any source faces.")

        fragment = source.copy()
        fragment.data = source.data.copy()
        fragment.animation_data_clear()
        bpy.context.collection.objects.link(fragment)
        fragment.name = f"{FRAGMENT_PREFIX}{piece_index:02d}"

        mesh_data = fragment.data
        working_mesh = bmesh.new()
        working_mesh.from_mesh(mesh_data)
        working_mesh.faces.ensure_lookup_table()
        remove_faces = [face for face in working_mesh.faces if face.index not in keep_indices]
        bmesh.ops.delete(working_mesh, geom=remove_faces, context="FACES")
        working_mesh.to_mesh(mesh_data)
        working_mesh.free()
        mesh_data.update()

        if len(fragment.data.vertices) < 3 or len(fragment.data.polygons) < 1:
            raise RuntimeError(f"Fragment {piece_index} is empty after partitioning.")

        fragment["fragment_index"] = piece_index
        fragment["fragment_source"] = "trail"
        fragment["assembled"] = True
        fragments.append(fragment)

        fragment_minimum, fragment_maximum = world_bounds(fragment)
        records.append(
            {
                "index": piece_index,
                "name": fragment.name,
                "source": fragment["fragment_source"],
                "vertices": len(fragment.data.vertices),
                "triangles": sum(max(1, len(face.vertices) - 2) for face in fragment.data.polygons),
                "bounds": {"min": fragment_minimum, "max": fragment_maximum},
                "seed": [seeds[piece_index - 1][0], seeds[piece_index - 1][1]],
            }
        )

    bpy.data.objects.remove(source, do_unlink=True)

    for fragment in fragments:
        bpy.context.view_layer.objects.active = fragment
        fragment.select_set(True)
        bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
        fragment.select_set(False)

    metadata = {
        "pieceCount": len(fragments),
        "layout": "irregular-voronoi-4-3-3",
        "partitionMethod": "source-triangle-centroid",
        "assembledByDefault": True,
        "depthAxisInBlender": depth_axis,
        "planeAxesInBlender": list(plane_axes),
        "sourceBounds": {"min": minimum, "max": maximum},
        "fragments": records,
    }
    return fragments, metadata


def export_fragments(path: Path, fragments: list[bpy.types.Object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for fragment in fragments:
        fragment.select_set(True)
    bpy.context.view_layer.objects.active = fragments[0]
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_apply=True,
        export_extras=True,
        export_yup=True,
    )


def write_manifest(path: Path, metadata: dict) -> None:
    manifest_path = path.with_suffix(".json")
    manifest_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def main() -> None:
    input_path, output_path = command_arguments()
    if not input_path.is_file():
        raise FileNotFoundError(input_path)
    reset_scene()
    source = import_source(input_path)
    fragments, metadata = create_fragments(source)
    export_fragments(output_path, fragments)
    write_manifest(output_path, metadata)
    print(
        f"Created {len(fragments)} fitted fragments: {output_path} "
        f"({output_path.stat().st_size} bytes)"
    )


if __name__ == "__main__":
    main()
