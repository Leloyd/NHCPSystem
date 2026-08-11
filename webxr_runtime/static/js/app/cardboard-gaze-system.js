import * as THREE from 'three';

const CENTER = new THREE.Vector2(0, 0);
const VIEW_ORIGIN = new THREE.Vector3();
const VIEW_DIRECTION = new THREE.Vector3();
const RETICLE_DISTANCE = 1.35;
const RETICLE_SIZE = 0.052;
const DWELL_SECONDS = 1;
const BASE_COLOR = new THREE.Color(0xf4d77f);
const READY_COLOR = new THREE.Color(0x63e6a3);

/**
 * Controller-free interaction for the side-by-side Cardboard viewer.
 * Keeping the center reticle on a registered 3D control for one second
 * activates the same handler used by mouse, touch, and WebXR selection.
 */
export class CardboardGazeSystem {
  constructor({ scene, camera, registry, uiController, getPickables, getPlayerPosition, isActive }) {
    this.scene = scene;
    this.camera = camera;
    this.registry = registry;
    this.uiController = uiController;
    this.getPickables = getPickables;
    this.getPlayerPosition = getPlayerPosition;
    this.isActive = typeof isActive === 'function' ? isActive : () => false;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;
    this.reticle = this._createReticle();
    this.scene.add(this.reticle);

    this.targetObject = null;
    this.blockedObject = null;
    this.dwellSeconds = 0;
    this.hasTarget = false;
  }

  _createReticle() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');

    if (context) {
      context.clearRect(0, 0, 128, 128);
      context.beginPath();
      context.arc(64, 64, 31, 0, Math.PI * 2);
      context.lineWidth = 9;
      context.strokeStyle = '#ffffff';
      context.stroke();

      context.beginPath();
      context.arc(64, 64, 5, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 255, 255, 0.72)';
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
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }));
    sprite.name = 'cardboard-gaze-reticle';
    sprite.visible = false;
    sprite.scale.set(RETICLE_SIZE, RETICLE_SIZE, 1);
    sprite.renderOrder = 10002;
    sprite.frustumCulled = false;
    return sprite;
  }

  _getInteractionHit() {
    const pickables = this.getPickables?.() ?? [];
    if (pickables.length === 0) {
      return null;
    }

    this.raycaster.setFromCamera(CENTER, this.camera);
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
    this.camera.updateWorldMatrix(true, false);
    this.camera.getWorldPosition(VIEW_ORIGIN);
    this.camera.getWorldDirection(VIEW_DIRECTION).normalize();
    this.reticle.position.copy(VIEW_ORIGIN).addScaledVector(VIEW_DIRECTION, RETICLE_DISTANCE);

    const normalizedProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const pulse = 1 + normalizedProgress * 0.24;
    this.reticle.scale.set(RETICLE_SIZE * pulse, RETICLE_SIZE * pulse, 1);
    this.reticle.material.color.copy(BASE_COLOR).lerp(READY_COLOR, normalizedProgress);
    this.reticle.material.opacity = 0.92 + normalizedProgress * 0.08;
    this.reticle.visible = true;
  }

  reset() {
    this.reticle.visible = false;
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
    this.scene.remove(this.reticle);
    this.reticle.material?.map?.dispose?.();
    this.reticle.material?.dispose?.();
  }
}
