import * as THREE from 'three';

const VIEW_ORIGIN = new THREE.Vector3();
const VIEW_DIRECTION = new THREE.Vector3();
const EYE_POSITION = new THREE.Vector3();
const EYE_DIRECTION = new THREE.Vector3();
const RETICLE_DISTANCE = 1.25;
const XR_RETICLE_SIZE = 0.085;
const DWELL_SECONDS = 1;
const BASE_COLOR = new THREE.Color(0xf4d77f);
const READY_COLOR = new THREE.Color(0x63e6a3);

/**
 * Controller-free interaction for native phone WebXR VR sessions.
 * Keeping the center reticle on a registered 3D control for one second
 * activates the same handler used by mouse, touch, and WebXR selection.
 */
export class PhoneVrGazeSystem {
  constructor({ scene, camera, renderer, registry, uiController, getPickables, getPlayerPosition, isActive }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.registry = registry;
    this.uiController = uiController;
    this.getPickables = getPickables;
    this.getPlayerPosition = getPlayerPosition;
    this.isActive = typeof isActive === 'function' ? isActive : () => false;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;
    this.xrReticle = this._createXrReticle();
    this.scene.add(this.xrReticle);

    this.targetObject = null;
    this.blockedObject = null;
    this.dwellSeconds = 0;
    this.hasTarget = false;
  }

  _createXrReticle() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, 256, 256);
      context.beginPath();
      context.arc(128, 128, 67, 0, Math.PI * 2);
      context.lineWidth = 20;
      context.strokeStyle = '#ffffff';
      context.stroke();

      context.beginPath();
      context.arc(128, 128, 10, 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      color: BASE_COLOR,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }));
    sprite.name = 'phone-webxr-gaze-reticle';
    sprite.visible = false;
    sprite.scale.set(XR_RETICLE_SIZE, XR_RETICLE_SIZE, 1);
    sprite.renderOrder = 10002;
    sprite.frustumCulled = false;
    return sprite;
  }

  _getInteractionHit() {
    const pickables = this.getPickables?.() ?? [];
    if (pickables.length === 0) {
      return null;
    }

    const hits = this.raycaster.intersectObjects(pickables, false);
    const playerPosition = this.getPlayerPosition?.();

    for (const hit of hits) {
      const interaction = hit.object?.userData?.interaction;
      if (!interaction) {
        continue;
      }

      const planarDistance = playerPosition && hit.point
        ? Math.hypot(hit.point.x - playerPosition.x, hit.point.z - playerPosition.z)
        : hit.distance;
      const maxDistance = Number(interaction.maxDistance);
      if (Number.isFinite(maxDistance) && Number.isFinite(planarDistance) && planarDistance > maxDistance) {
        continue;
      }

      return hit;
    }

    return null;
  }

  _updateViewRay() {
    if (this.renderer?.xr?.isPresenting) {
      const xrCamera = this.renderer.xr.getCamera(this.camera);
      const eyeCameras = Array.isArray(xrCamera?.cameras) ? xrCamera.cameras : [];

      if (eyeCameras.length > 0) {
        VIEW_ORIGIN.set(0, 0, 0);
        VIEW_DIRECTION.set(0, 0, 0);
        eyeCameras.forEach((eyeCamera) => {
          eyeCamera.updateWorldMatrix(true, false);
          eyeCamera.getWorldPosition(EYE_POSITION);
          eyeCamera.getWorldDirection(EYE_DIRECTION);
          VIEW_ORIGIN.add(EYE_POSITION);
          VIEW_DIRECTION.add(EYE_DIRECTION);
        });
        VIEW_ORIGIN.multiplyScalar(1 / eyeCameras.length);
        VIEW_DIRECTION.normalize();
      } else {
        xrCamera.updateWorldMatrix(true, false);
        xrCamera.getWorldPosition(VIEW_ORIGIN);
        xrCamera.getWorldDirection(VIEW_DIRECTION).normalize();
      }
    } else {
      this.camera.updateWorldMatrix(true, false);
      this.camera.getWorldPosition(VIEW_ORIGIN);
      this.camera.getWorldDirection(VIEW_DIRECTION).normalize();
    }

    this.raycaster.ray.origin.copy(VIEW_ORIGIN);
    this.raycaster.ray.direction.copy(VIEW_DIRECTION);
  }

  _buildContext(hit) {
    const object = hit.object;
    const interaction = object.userData.interaction ?? {};
    const playerPosition = this.getPlayerPosition?.();
    const planarDistance = playerPosition && hit.point
      ? Math.hypot(hit.point.x - playerPosition.x, hit.point.z - playerPosition.z)
      : null;
    const maxDistance = Number(interaction.maxDistance);

    return {
      name: interaction.name || object.name || object.parent?.name || 'Unnamed object',
      metadata: interaction.metadata ?? {},
      suppressPanel: Boolean(interaction.suppressPanel),
      object,
      point: hit.point.clone(),
      distance: hit.distance,
      playerDistance: planarDistance,
      maxDistance: Number.isFinite(maxDistance) ? maxDistance : null,
      assetId: interaction.assetId ?? null,
    };
  }

  _updateReticle(progress = 0) {
    const normalizedProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const scale = XR_RETICLE_SIZE * (1 + normalizedProgress * 0.22);
    this.xrReticle.visible = true;
    this.xrReticle.position.copy(VIEW_ORIGIN).addScaledVector(VIEW_DIRECTION, RETICLE_DISTANCE);
    this.xrReticle.scale.set(scale, scale, 1);
    this.xrReticle.material.color.copy(BASE_COLOR).lerp(READY_COLOR, normalizedProgress);
  }

  reset() {
    this.xrReticle.visible = false;
    this.targetObject = null;
    this.blockedObject = null;
    this.dwellSeconds = 0;
    this.hasTarget = false;
  }

  update(deltaSeconds) {
    if (!this.isActive()) {
      this.reset();
      return;
    }

    const dt = Math.max(0, Math.min(0.1, Number(deltaSeconds) || 0));
    this._updateViewRay();
    this._updateReticle(0);

    const hit = this._getInteractionHit();
    const object = hit?.object ?? null;
    this.hasTarget = Boolean(object);

    if (this.blockedObject) {
      if (object === this.blockedObject) {
        return;
      }
      this.blockedObject = null;
    }

    if (!object) {
      this.targetObject = null;
      this.dwellSeconds = 0;
      return;
    }

    if (object !== this.targetObject) {
      this.targetObject = object;
      this.dwellSeconds = 0;
    } else {
      this.dwellSeconds += dt;
    }

    const progress = THREE.MathUtils.clamp(this.dwellSeconds / DWELL_SECONDS, 0, 1);
    this._updateReticle(progress);
    if (progress < 1) {
      return;
    }

    const context = this._buildContext(hit);
    if (context.suppressPanel) {
      this.uiController?.hideInteraction();
    } else {
      this.uiController?.showInteraction(context);
    }
    this.registry?.trigger(context);

    this.blockedObject = object;
    this.targetObject = null;
    this.dwellSeconds = 0;
    this.hasTarget = false;
  }

  dispose() {
    this.scene.remove(this.xrReticle);
    this.xrReticle.material?.map?.dispose?.();
    this.xrReticle.material?.dispose?.();
  }
}
