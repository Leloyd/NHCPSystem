import * as THREE from 'three';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const UP = new THREE.Vector3(0, 1, 0);
const DEFAULT_MAX_POSITIVE_X = 2.5;
const DEFAULT_MAX_POSITIVE_Z = 2.5;

export class CollisionSystem {
  constructor({
    scene,
    debugEnabled = false,
    walkBoundary = null,
    walkBoundarySegments = null,
    maxPositiveClamp = null,
    floorRegions = null,
    boundsClampEnabled = true,
  }) {
    this.scene = scene;
    this.debugEnabled = Boolean(debugEnabled);
    this.walkBoundary = this._normalizeWalkBoundary(walkBoundary);
    this.walkBoundarySegments = this._normalizeWalkBoundarySegments(walkBoundarySegments);
    this.maxPositiveClamp = this._normalizeMaxPositiveClamp(maxPositiveClamp);
    this.floorRegions = this._normalizeFloorRegions(floorRegions);
    this.boundsClampEnabled = Boolean(boundsClampEnabled);

    this.colliders = [];
    this.fallbackBounds = new THREE.Box3(
      new THREE.Vector3(-8, 0, -8),
      new THREE.Vector3(8, 4, 8),
    );

    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'collision-debug';
    this.scene.add(this.debugGroup);

    this.debugColliderGroup = new THREE.Group();
    this.debugContactGroup = new THREE.Group();
    this.debugGroup.add(this.debugColliderGroup, this.debugContactGroup);

    this.capsuleLine = this._makeCapsuleLine();
    this.debugGroup.add(this.capsuleLine);

    this.worldBoundsHelper = new THREE.Box3Helper(this.fallbackBounds.clone(), 0x39ffb2);
    this.debugGroup.add(this.worldBoundsHelper);

    this.setDebugEnabled(this.debugEnabled);

    this._tempInverse = new THREE.Matrix4();
    this._tempSegment = new THREE.Line3(new THREE.Vector3(), new THREE.Vector3());
    this._tempBox = new THREE.Box3();

    this._tempStartWorld = new THREE.Vector3();
    this._tempEndWorld = new THREE.Vector3();
    this._tempOriginalFeet = new THREE.Vector3();
    this._tempCorrectedFeet = new THREE.Vector3();
    this._tempDelta = new THREE.Vector3();

    this._triPoint = new THREE.Vector3();
    this._capsulePoint = new THREE.Vector3();
    this._pushDirection = new THREE.Vector3();

    this._result = {
      position: new THREE.Vector3(),
      grounded: false,
      collisions: 0,
    };
  }

  setDebugEnabled(enabled) {
    this.debugEnabled = Boolean(enabled);
    this.debugGroup.visible = this.debugEnabled;
  }

  setMaxPositiveClamp(maxPositiveClamp) {
    this.maxPositiveClamp = this._normalizeMaxPositiveClamp(maxPositiveClamp);
  }

  _normalizeMaxPositiveClamp(maxPositiveClamp) {
    const rawX = Number(maxPositiveClamp?.x);
    const rawZ = Number(maxPositiveClamp?.z);

    return {
      x: Number.isFinite(rawX) ? rawX : DEFAULT_MAX_POSITIVE_X,
      z: Number.isFinite(rawZ) ? rawZ : DEFAULT_MAX_POSITIVE_Z,
    };
  }

  setFallbackBounds(box) {
    if (box && box.isBox3 && !box.isEmpty()) {
      this.fallbackBounds.copy(box);
      this.worldBoundsHelper.box.copy(this.fallbackBounds);
    }
  }

  setFloorRegions(floorRegions) {
    this.floorRegions = this._normalizeFloorRegions(floorRegions);
  }

  /**
   * Build collider meshes from GLB mesh entries. Tries a merged static collider first,
   * and falls back to separate colliders if merge is not possible.
   */
  buildFromMeshes(meshEntries = []) {
    this._clearColliders();

    const transformedGeometries = [];
    const worldBounds = new THREE.Box3();

    for (const entry of meshEntries) {
      const root = entry?.root;
      if (!root) {
        continue;
      }

      root.updateMatrixWorld(true);
      root.traverse((child) => {
        if (!child.isMesh || !child.geometry?.attributes?.position) {
          return;
        }

        const cloned = child.geometry.clone();
        cloned.applyMatrix4(child.matrixWorld);
        cloned.computeBoundingBox();

        if (cloned.boundingBox) {
          worldBounds.union(cloned.boundingBox);
        }

        transformedGeometries.push(cloned);
      });
    }

    let merged = null;
    if (transformedGeometries.length === 1) {
      merged = transformedGeometries[0];
    } else if (transformedGeometries.length > 1) {
      merged = mergeGeometries(transformedGeometries, false);
    }

    if (merged) {
      this._addColliderGeometry(merged);
    } else {
      for (const geometry of transformedGeometries) {
        this._addColliderGeometry(geometry);
      }
    }

    if (!worldBounds.isEmpty()) {
      worldBounds.expandByScalar(0.5);
      if (worldBounds.max.y <= worldBounds.min.y + 0.01) {
        worldBounds.max.y = worldBounds.min.y + 4.0;
      }
      this.setFallbackBounds(worldBounds);
    }

    this._rebuildDebugMeshes();

    return {
      colliderCount: this.colliders.length,
      merged: Boolean(merged),
    };
  }

  resolveCapsule({
    feetPosition,
    previousFeetPosition = null,
    capsuleHeight,
    capsuleRadius,
    velocity,
    deltaSeconds,
  }) {
    const radius = Math.max(0.05, Number(capsuleRadius));
    const topOffset = Math.max(radius + 0.05, Number(capsuleHeight) - radius);

    this._tempOriginalFeet.copy(feetPosition);
    this._tempStartWorld.copy(feetPosition).addScaledVector(UP, radius);
    this._tempEndWorld.copy(feetPosition).addScaledVector(UP, topOffset);

    let collisions = 0;
    this._clearContactDebug();

    for (const collider of this.colliders) {
      if (!collider.geometry.boundsTree) {
        continue;
      }

      this._tempInverse.copy(collider.matrixWorld).invert();

      this._tempSegment.start.copy(this._tempStartWorld).applyMatrix4(this._tempInverse);
      this._tempSegment.end.copy(this._tempEndWorld).applyMatrix4(this._tempInverse);

      this._tempBox.makeEmpty();
      this._tempBox.expandByPoint(this._tempSegment.start);
      this._tempBox.expandByPoint(this._tempSegment.end);
      this._tempBox.min.addScalar(-radius);
      this._tempBox.max.addScalar(radius);

      const segment = this._tempSegment;

      collider.geometry.boundsTree.shapecast({
        intersectsBounds: (box) => box.intersectsBox(this._tempBox),
        intersectsTriangle: (tri) => {
          const distance = tri.closestPointToSegment(
            segment,
            this._triPoint,
            this._capsulePoint,
          );

          if (distance >= radius) {
            return;
          }

          collisions += 1;

          const depth = radius - distance;
          this._pushDirection.subVectors(this._capsulePoint, this._triPoint);

          if (this._pushDirection.lengthSq() <= 1e-10) {
            tri.getNormal(this._pushDirection);
          } else {
            this._pushDirection.normalize();
          }

          segment.start.addScaledVector(this._pushDirection, depth);
          segment.end.addScaledVector(this._pushDirection, depth);

          if (this.debugEnabled) {
            const point = this._capsulePoint.clone().applyMatrix4(collider.matrixWorld);
            const normal = this._pushDirection.clone().transformDirection(collider.matrixWorld);
            this._addContactDebug(point, normal);
          }
        },
      });

      this._tempStartWorld.copy(segment.start).applyMatrix4(collider.matrixWorld);
      this._tempEndWorld.copy(segment.end).applyMatrix4(collider.matrixWorld);
    }

    this._tempCorrectedFeet.copy(this._tempStartWorld).addScaledVector(UP, -radius);

    const minX = this.fallbackBounds.min.x + radius;
    const maxX = Math.min(this.fallbackBounds.max.x - radius, this.maxPositiveClamp.x);
    const minZ = this.fallbackBounds.min.z + radius;
    const maxZ = Math.min(this.fallbackBounds.max.z - radius, this.maxPositiveClamp.z);

    if (this.boundsClampEnabled) {
      if (Number.isFinite(minX) && Number.isFinite(maxX)) {
        this._tempCorrectedFeet.x = THREE.MathUtils.clamp(this._tempCorrectedFeet.x, minX, maxX);
      }
      if (Number.isFinite(minZ) && Number.isFinite(maxZ)) {
        this._tempCorrectedFeet.z = THREE.MathUtils.clamp(this._tempCorrectedFeet.z, minZ, maxZ);
      }
    }

    this._applyWalkBoundaryClamp(this._tempCorrectedFeet, previousFeetPosition);

    const floorY = this._getFloorYAtPosition(this._tempCorrectedFeet);
    if (Number.isFinite(floorY) && this._tempCorrectedFeet.y < floorY) {
      this._tempCorrectedFeet.y = floorY;
    }

    this._tempDelta.subVectors(this._tempCorrectedFeet, this._tempOriginalFeet);

    const groundedFromPush =
      this._tempDelta.y > Math.max(0, Math.abs(Number(velocity.y) * Number(deltaSeconds)) * 0.2);
    const groundedFromFloor =
      Number.isFinite(floorY) &&
      Math.abs(this._tempCorrectedFeet.y - floorY) <= 1e-4 &&
      Number(velocity.y) <= 0;

    const grounded = groundedFromPush || groundedFromFloor;

    this._result.position.copy(this._tempCorrectedFeet);
    this._result.grounded = grounded;
    this._result.collisions = collisions;

    if (this.debugEnabled) {
      this._updateCapsuleDebug(this._tempCorrectedFeet, radius, topOffset);
      this.worldBoundsHelper.box.copy(this.fallbackBounds);
    }

    return this._result;
  }

  _addColliderGeometry(geometry) {
    if (!geometry?.attributes?.position) {
      return;
    }

    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    geometry.boundsTree = geometry.boundsTree ?? null;
    if (!geometry.boundsTree) {
      geometry.computeBoundsTree();
    }

    const collider = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    collider.matrixAutoUpdate = false;
    collider.updateMatrix();
    collider.updateMatrixWorld(true);

    this.colliders.push(collider);
  }

  _normalizeWalkBoundary(points) {
    if (!Array.isArray(points) || points.length < 3) {
      return null;
    }

    const normalized = points
      .map((point) => {
        if (!Array.isArray(point) || point.length < 2) {
          return null;
        }

        const x = Number(point[0]);
        const z = Number(point[1]);
        if (!Number.isFinite(x) || !Number.isFinite(z)) {
          return null;
        }

        return new THREE.Vector2(x, z);
      })
      .filter(Boolean);

    return normalized.length >= 3 ? normalized : null;
  }

  _normalizeWalkBoundarySegments(segments) {
    if (!Array.isArray(segments)) {
      return [];
    }

    return segments
      .map((segment) => {
        if (!Array.isArray(segment) || segment.length < 2) {
          return null;
        }

        const startX = Number(segment[0]?.[0]);
        const startZ = Number(segment[0]?.[1]);
        const endX = Number(segment[1]?.[0]);
        const endZ = Number(segment[1]?.[1]);
        if (![startX, startZ, endX, endZ].every(Number.isFinite)) {
          return null;
        }

        return {
          start: new THREE.Vector2(startX, startZ),
          end: new THREE.Vector2(endX, endZ),
          thickness: Math.max(0, Number(segment[2]) || 0),
        };
      })
      .filter(Boolean);
  }

  _normalizeFloorRegions(floorRegions) {
    if (!Array.isArray(floorRegions) || floorRegions.length === 0) {
      return [];
    }

    const normalizedRegions = [];
    for (const region of floorRegions) {
      const floorY = Number(region?.floorY);
      const points = this._normalizeWalkBoundary(region?.points);
      if (!Number.isFinite(floorY) || !points) {
        continue;
      }

      normalizedRegions.push({
        floorY,
        points,
      });
    }

    return normalizedRegions;
  }

  _getFloorYAtPosition(position) {
    const x = Number(position?.x);
    const z = Number(position?.z);
    if (Number.isFinite(x) && Number.isFinite(z)) {
      for (const region of this.floorRegions) {
        if (this._isInsidePolygon(region.points, x, z)) {
          return region.floorY;
        }
      }
    }

    return this.fallbackBounds.min.y;
  }

  _isInsideWalkBoundary(x, z) {
    if (!this.walkBoundary) {
      return true;
    }

    return this._isInsidePolygon(this.walkBoundary, x, z);
  }

  _isInsidePolygon(points, x, z) {
    if (!points || points.length < 3) {
      return false;
    }

    let inside = false;
    const count = points.length;

    for (let index = 0, prev = count - 1; index < count; prev = index, index += 1) {
      const current = points[index];
      const previous = points[prev];

      const crossesRay = (current.y > z) !== (previous.y > z);
      if (!crossesRay) {
        continue;
      }

      const intersectX =
        ((previous.x - current.x) * (z - current.y)) / (previous.y - current.y) + current.x;

      if (x < intersectX) {
        inside = !inside;
      }
    }

    return inside;
  }

  _applyWalkBoundaryClamp(feetPosition, previousFeetPosition = null) {
    if (this.walkBoundarySegments.length > 0) {
      this._applyWalkBoundarySegmentsClamp(feetPosition, previousFeetPosition);
      return;
    }

    if (!this.walkBoundary) {
      return;
    }

    const x = feetPosition.x;
    const z = feetPosition.z;
    if (this._isInsideWalkBoundary(x, z)) {
      return;
    }

    const count = this.walkBoundary.length;
    let closestX = this.walkBoundary[0].x;
    let closestZ = this.walkBoundary[0].y;
    let closestDistanceSq = Number.POSITIVE_INFINITY;

    for (let index = 0; index < count; index += 1) {
      const start = this.walkBoundary[index];
      const end = this.walkBoundary[(index + 1) % count];

      const edgeX = end.x - start.x;
      const edgeZ = end.y - start.y;
      const edgeLengthSq = edgeX * edgeX + edgeZ * edgeZ;

      let t = 0;
      if (edgeLengthSq > 1e-8) {
        t = ((x - start.x) * edgeX + (z - start.y) * edgeZ) / edgeLengthSq;
        t = THREE.MathUtils.clamp(t, 0, 1);
      }

      const projectedX = start.x + edgeX * t;
      const projectedZ = start.y + edgeZ * t;
      const dx = x - projectedX;
      const dz = z - projectedZ;
      const distanceSq = dx * dx + dz * dz;

      if (distanceSq < closestDistanceSq) {
        closestDistanceSq = distanceSq;
        closestX = projectedX;
        closestZ = projectedZ;
      }
    }

    feetPosition.x = closestX;
    feetPosition.z = closestZ;
  }

  _applyWalkBoundarySegmentsClamp(feetPosition, previousFeetPosition) {
    if (!previousFeetPosition) {
      return;
    }

    const epsilon = 1e-4;

    for (const segment of this.walkBoundarySegments) {
      const { start, end, thickness: clearance } = segment;
      const movementX = feetPosition.x - previousFeetPosition.x;
      const movementZ = feetPosition.z - previousFeetPosition.z;
      const edgeX = end.x - start.x;
      const edgeZ = end.y - start.y;
      const edgeLengthSq = edgeX * edgeX + edgeZ * edgeZ;
      const edgeLength = Math.sqrt(edgeLengthSq);

      if (edgeLength <= 1e-8) {
        continue;
      }

      const denominator = movementX * edgeZ - movementZ * edgeX;
      let crossedSegment = false;

      if (Math.abs(denominator) > 1e-10) {
        const offsetX = start.x - previousFeetPosition.x;
        const offsetZ = start.y - previousFeetPosition.z;
        const movementT = (offsetX * edgeZ - offsetZ * edgeX) / denominator;
        const edgeT = (offsetX * movementZ - offsetZ * movementX) / denominator;
        crossedSegment = movementT >= 0 && movementT <= 1 && edgeT >= 0 && edgeT <= 1;
      }

      const normalX = -edgeZ / edgeLength;
      const normalZ = edgeX / edgeLength;
      const previousDistance =
        (previousFeetPosition.x - start.x) * normalX
        + (previousFeetPosition.z - start.y) * normalZ;
      const side = previousDistance < 0 ? -1 : 1;

      if (crossedSegment) {
        const projectedT = THREE.MathUtils.clamp(
          ((feetPosition.x - start.x) * edgeX + (feetPosition.z - start.y) * edgeZ)
            / edgeLengthSq,
          0,
          1,
        );

        feetPosition.x = start.x + edgeX * projectedT + normalX * side * epsilon;
        feetPosition.z = start.y + edgeZ * projectedT + normalZ * side * epsilon;
      }

      if (clearance <= 0) {
        continue;
      }

      const closestT = THREE.MathUtils.clamp(
        ((feetPosition.x - start.x) * edgeX + (feetPosition.z - start.y) * edgeZ)
          / edgeLengthSq,
        0,
        1,
      );
      const closestX = start.x + edgeX * closestT;
      const closestZ = start.y + edgeZ * closestT;
      const distanceX = feetPosition.x - closestX;
      const distanceZ = feetPosition.z - closestZ;
      const distanceSq = distanceX * distanceX + distanceZ * distanceZ;

      if (distanceSq >= clearance * clearance) {
        continue;
      }

      const previousClosestT = THREE.MathUtils.clamp(
        ((previousFeetPosition.x - start.x) * edgeX
          + (previousFeetPosition.z - start.y) * edgeZ) / edgeLengthSq,
        0,
        1,
      );
      const previousClosestX = start.x + edgeX * previousClosestT;
      const previousClosestZ = start.y + edgeZ * previousClosestT;
      let pushX = previousFeetPosition.x - previousClosestX;
      let pushZ = previousFeetPosition.z - previousClosestZ;
      const pushLength = Math.hypot(pushX, pushZ);

      if (pushLength > 1e-8) {
        pushX /= pushLength;
        pushZ /= pushLength;
      } else {
        pushX = normalX * side;
        pushZ = normalZ * side;
      }

      feetPosition.x = closestX + pushX * clearance;
      feetPosition.z = closestZ + pushZ * clearance;
    }
  }

  _clearColliders() {
    for (const collider of this.colliders) {
      if (collider.geometry?.disposeBoundsTree) {
        collider.geometry.disposeBoundsTree();
      }
      collider.geometry?.dispose();
      collider.material?.dispose?.();
    }
    this.colliders = [];
  }

  _rebuildDebugMeshes() {
    while (this.debugColliderGroup.children.length > 0) {
      const child = this.debugColliderGroup.children.pop();
      if (child.geometry) {
        child.geometry.dispose?.();
      }
      child.material?.dispose?.();
    }

    for (const collider of this.colliders) {
      const wire = new THREE.Mesh(
        collider.geometry.clone(),
        new THREE.MeshBasicMaterial({
          color: 0x2cf7b2,
          wireframe: true,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        }),
      );
      this.debugColliderGroup.add(wire);
    }
  }

  _makeCapsuleLine() {
    const points = [new THREE.Vector3(), new THREE.Vector3(0, 1, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffbb33 });
    return new THREE.Line(geometry, material);
  }

  _updateCapsuleDebug(feetPosition, radius, topOffset) {
    const start = new THREE.Vector3().copy(feetPosition).addScaledVector(UP, radius);
    const end = new THREE.Vector3().copy(feetPosition).addScaledVector(UP, topOffset);
    this.capsuleLine.geometry.setFromPoints([start, end]);
  }

  _clearContactDebug() {
    while (this.debugContactGroup.children.length > 0) {
      const child = this.debugContactGroup.children.pop();
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
  }

  _addContactDebug(point, normal) {
    if (!this.debugEnabled) {
      return;
    }

    if (this.debugContactGroup.children.length >= 12) {
      return;
    }

    const end = point.clone().addScaledVector(normal, 0.35);
    const geometry = new THREE.BufferGeometry().setFromPoints([point, end]);
    const material = new THREE.LineBasicMaterial({ color: 0xff4a4a });
    const line = new THREE.Line(geometry, material);
    this.debugContactGroup.add(line);
  }
}
