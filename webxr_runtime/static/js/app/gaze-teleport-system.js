import * as THREE from 'three';

const MIN_GAZE_DOWN = -0.24;
const RELEASE_GAZE_DOWN = -0.1;
const MIN_DISTANCE = 0.75;
const MAX_DISTANCE = 2.8;
const TARGET_STABILITY_METERS = 0.3;
const DWELL_SECONDS = 1.15;
const TELEPORT_COOLDOWN_SECONDS = 0.45;

const VIEW_ORIGIN = new THREE.Vector3();
const VIEW_DIRECTION = new THREE.Vector3();
const HORIZONTAL_DIRECTION = new THREE.Vector3();
const DESIRED_TARGET = new THREE.Vector3();
const RESOLVED_TARGET = new THREE.Vector3();
const BASE_COLOR = new THREE.Color(0xf4d77f);
const READY_COLOR = new THREE.Color(0x63e6a3);

/**
 * Controller-free locomotion for phone viewers. Looking down exposes a floor
 * target; holding the target steady teleports the player through the same
 * collision/boundary path used by normal movement.
 */
export class GazeTeleportSystem {
  constructor({ scene, camera, rig, renderer, playerController, collisionSystem, isActive }) {
    this.scene = scene;
    this.camera = camera;
    this.rig = rig;
    this.renderer = renderer;
    this.playerController = playerController;
    this.collisionSystem = collisionSystem;
    this.isActive = typeof isActive === 'function' ? isActive : () => false;

    this.marker = this._createMarker();
    this.scene.add(this.marker);

    this.stableTarget = new THREE.Vector3();
    this.hasStableTarget = false;
    this.dwellSeconds = 0;
    this.cooldownSeconds = 0;
    this.requiresGazeRelease = false;
  }

  _createMarker() {
    const root = new THREE.Group();
    root.name = 'phone-vr-gaze-teleport-target';
    root.visible = false;
    root.renderOrder = 10000;

    const outerMaterial = new THREE.MeshBasicMaterial({
      color: BASE_COLOR,
      transparent: true,
      opacity: 0.94,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const outer = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.25, 48), outerMaterial);
    outer.rotation.x = -Math.PI / 2;
    outer.renderOrder = 10000;

    const fillMaterial = new THREE.MeshBasicMaterial({
      color: BASE_COLOR,
      transparent: true,
      opacity: 0.14,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const fill = new THREE.Mesh(new THREE.CircleGeometry(0.145, 48), fillMaterial);
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.002;
    fill.renderOrder = 10001;

    root.add(outer, fill);
    root.userData.outer = outer;
    root.userData.fill = fill;
    return root;
  }

  reset() {
    this.marker.visible = false;
    this.hasStableTarget = false;
    this.dwellSeconds = 0;
    this.cooldownSeconds = 0;
    this.requiresGazeRelease = false;
  }

  _getViewCamera() {
    if (!this.renderer.xr.isPresenting) {
      return this.camera;
    }

    const xrCamera = this.renderer.xr.getCamera(this.camera);
    if (Array.isArray(xrCamera?.cameras) && xrCamera.cameras.length > 0) {
      return xrCamera.cameras[0];
    }
    return xrCamera || this.camera;
  }

  update(deltaSeconds) {
    const dt = Math.max(0, Math.min(0.1, Number(deltaSeconds) || 0));
    this.cooldownSeconds = Math.max(0, this.cooldownSeconds - dt);

    if (!this.isActive()) {
      this.reset();
      return;
    }

    const viewCamera = this._getViewCamera();
    viewCamera.updateWorldMatrix(true, false);
    viewCamera.getWorldPosition(VIEW_ORIGIN);
    viewCamera.getWorldDirection(VIEW_DIRECTION).normalize();

    if (this.requiresGazeRelease) {
      this.marker.visible = false;
      if (VIEW_DIRECTION.y >= RELEASE_GAZE_DOWN) {
        this.requiresGazeRelease = false;
      }
      return;
    }

    if (VIEW_DIRECTION.y > MIN_GAZE_DOWN || this.cooldownSeconds > 0) {
      this.marker.visible = false;
      this.hasStableTarget = false;
      this.dwellSeconds = 0;
      return;
    }

    HORIZONTAL_DIRECTION.set(VIEW_DIRECTION.x, 0, VIEW_DIRECTION.z);
    if (HORIZONTAL_DIRECTION.lengthSq() < 1e-6) {
      this.marker.visible = false;
      return;
    }
    HORIZONTAL_DIRECTION.normalize();

    const floorY = this.rig.position.y;
    const rayDistance = (floorY - VIEW_ORIGIN.y) / VIEW_DIRECTION.y;
    const horizontalDistance = THREE.MathUtils.clamp(
      rayDistance * Math.hypot(VIEW_DIRECTION.x, VIEW_DIRECTION.z),
      MIN_DISTANCE,
      MAX_DISTANCE,
    );

    DESIRED_TARGET.copy(this.rig.position).addScaledVector(HORIZONTAL_DIRECTION, horizontalDistance);
    DESIRED_TARGET.y = floorY;

    if (!this.playerController.resolveTeleportTarget(
      DESIRED_TARGET,
      this.collisionSystem,
      RESOLVED_TARGET,
    )) {
      this.marker.visible = false;
      this.hasStableTarget = false;
      this.dwellSeconds = 0;
      return;
    }

    this.marker.visible = true;
    this.marker.position.set(RESOLVED_TARGET.x, RESOLVED_TARGET.y + 0.035, RESOLVED_TARGET.z);

    if (!this.hasStableTarget || this.stableTarget.distanceToSquared(RESOLVED_TARGET) > TARGET_STABILITY_METERS ** 2) {
      this.stableTarget.copy(RESOLVED_TARGET);
      this.hasStableTarget = true;
      this.dwellSeconds = 0;
    } else {
      this.stableTarget.lerp(RESOLVED_TARGET, 0.2);
      this.dwellSeconds += dt;
    }

    const progress = THREE.MathUtils.clamp(this.dwellSeconds / DWELL_SECONDS, 0, 1);
    const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.035;
    this.marker.scale.setScalar(pulse * (1 + progress * 0.18));
    this.marker.userData.outer.material.color.copy(BASE_COLOR).lerp(READY_COLOR, progress);
    this.marker.userData.fill.material.color.copy(BASE_COLOR).lerp(READY_COLOR, progress);
    this.marker.userData.fill.material.opacity = 0.14 + progress * 0.46;

    if (progress < 1) {
      return;
    }

    this.playerController.teleportTo(this.stableTarget, this.collisionSystem);
    this.marker.visible = false;
    this.hasStableTarget = false;
    this.dwellSeconds = 0;
    this.cooldownSeconds = TELEPORT_COOLDOWN_SECONDS;
    this.requiresGazeRelease = true;
  }

  dispose() {
    this.scene.remove(this.marker);
    this.marker.traverse((node) => {
      node.geometry?.dispose?.();
      node.material?.dispose?.();
    });
  }
}
