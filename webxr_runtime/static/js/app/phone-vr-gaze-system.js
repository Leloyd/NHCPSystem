import * as THREE from 'three';

const VIEW_ORIGIN = new THREE.Vector3();
const VIEW_DIRECTION = new THREE.Vector3();
const EYE_POSITION = new THREE.Vector3();
const EYE_DIRECTION = new THREE.Vector3();
const EYE_PROJECTION_CENTER = new THREE.Vector3();
const RETICLE_DISTANCE = 1.25;
const XR_RETICLE_SIZE = 0.105;
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
    this.eyeOrigins = [new THREE.Vector3(), new THREE.Vector3()];
    this.eyeDirections = [new THREE.Vector3(), new THREE.Vector3()];
    this.activeEyeCount = 0;
    this.xrReticles = this._createXrReticles();
    this.xrReticles.forEach((reticle) => this.scene.add(reticle));

    this.targetObject = null;
    this.blockedObject = null;
    this.dwellSeconds = 0;
    this.hasTarget = false;
    this.reticleProgress = 0;
  }

  _createXrReticles() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, 256, 256);

      // A dark outline keeps the gaze circle visible against both bright
      // controls and the dark Gaussian-splat environment.
      context.beginPath();
      context.arc(128, 128, 67, 0, Math.PI * 2);
      context.lineWidth = 34;
      context.strokeStyle = 'rgba(0, 0, 0, 0.88)';
      context.stroke();

      context.beginPath();
      context.arc(128, 128, 67, 0, Math.PI * 2);
      context.lineWidth = 18;
      context.strokeStyle = '#ffffff';
      context.stroke();

      context.beginPath();
      context.arc(128, 128, 18, 0, Math.PI * 2);
      context.fillStyle = 'rgba(0, 0, 0, 0.9)';
      context.fill();

      context.beginPath();
      context.arc(128, 128, 9, 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      color: BASE_COLOR,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    // Three.js reserves layer 1 for the left XR eye and layer 2 for the
    // right. A separate reticle on each eye layer keeps the circle at the
    // exact optical center of both Cardboard views instead of projecting one
    // shared world sprite slightly off-center in stereo.
    return [1, 2].map((eyeLayer, index) => {
      const sprite = new THREE.Sprite(material);
      sprite.name = `phone-webxr-gaze-reticle-${index === 0 ? 'left' : 'right'}`;
      sprite.layers.set(eyeLayer);
      sprite.visible = false;
      sprite.scale.set(XR_RETICLE_SIZE, XR_RETICLE_SIZE, 1);
      sprite.renderOrder = 10002;
      sprite.frustumCulled = false;
      return sprite;
    });
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
        const cameraParent = this.camera.parent;
        cameraParent?.updateMatrixWorld(true);
        VIEW_ORIGIN.set(0, 0, 0);
        VIEW_DIRECTION.set(0, 0, 0);
        this.activeEyeCount = Math.min(eyeCameras.length, this.xrReticles.length);
        eyeCameras.slice(0, this.activeEyeCount).forEach((eyeCamera, index) => {
          // WebXRManager's eye cameras are held in an ArrayCamera but are not
          // parented to the application's player rig. Calling the ordinary
          // Object3D.updateWorldMatrix() here therefore drops the rig transform.
          // Reproduce WebXRManager.updateCamera() explicitly so the gaze pose
          // retains the authored spawn position, heading, and locomotion.
          if (cameraParent) {
            eyeCamera.matrixWorld.multiplyMatrices(cameraParent.matrixWorld, eyeCamera.matrix);
          } else {
            eyeCamera.matrixWorld.copy(eyeCamera.matrix);
          }
          eyeCamera.matrixWorldInverse.copy(eyeCamera.matrixWorld).invert();
          // Object3D.getWorldPosition() calls updateWorldMatrix() internally,
          // which would discard the manually applied rig transform again.
          EYE_POSITION.setFromMatrixPosition(eyeCamera.matrixWorld);
          // WebXR eye cameras commonly use asymmetric projection matrices.
          // Derive the ray through the rendered center of each eye instead of
          // assuming the camera's local -Z axis is also its visual center.
          EYE_PROJECTION_CENTER.set(0, 0, 0.5).unproject(eyeCamera);
          EYE_DIRECTION.copy(EYE_PROJECTION_CENTER).sub(EYE_POSITION).normalize();
          this.eyeOrigins[index].copy(EYE_POSITION);
          this.eyeDirections[index].copy(EYE_DIRECTION);
          VIEW_ORIGIN.add(EYE_POSITION);
          VIEW_DIRECTION.add(EYE_DIRECTION);
        });
        VIEW_ORIGIN.multiplyScalar(1 / this.activeEyeCount);
        VIEW_DIRECTION.normalize();
      } else {
        const cameraParent = this.camera.parent;
        cameraParent?.updateMatrixWorld(true);
        if (cameraParent) {
          xrCamera.matrixWorld.multiplyMatrices(cameraParent.matrixWorld, xrCamera.matrix);
        } else {
          xrCamera.matrixWorld.copy(xrCamera.matrix);
        }
        xrCamera.matrixWorldInverse.copy(xrCamera.matrixWorld).invert();
        VIEW_ORIGIN.setFromMatrixPosition(xrCamera.matrixWorld);
        EYE_PROJECTION_CENTER.set(0, 0, 0.5).unproject(xrCamera);
        VIEW_DIRECTION.copy(EYE_PROJECTION_CENTER).sub(VIEW_ORIGIN).normalize();
        this.activeEyeCount = 1;
        this.eyeOrigins[0].copy(VIEW_ORIGIN);
        this.eyeDirections[0].copy(VIEW_DIRECTION);
      }
    } else {
      this.camera.updateWorldMatrix(true, false);
      this.camera.getWorldPosition(VIEW_ORIGIN);
      this.camera.getWorldDirection(VIEW_DIRECTION).normalize();
      this.activeEyeCount = 1;
      this.eyeOrigins[0].copy(VIEW_ORIGIN);
      this.eyeDirections[0].copy(VIEW_DIRECTION);
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
    this.xrReticles.forEach((reticle, index) => {
      reticle.visible = index < this.activeEyeCount;
      if (!reticle.visible) {
        return;
      }
      reticle.position
        .copy(this.eyeOrigins[index])
        .addScaledVector(this.eyeDirections[index], RETICLE_DISTANCE);
      reticle.scale.set(scale, scale, 1);
      reticle.material.color.copy(BASE_COLOR).lerp(READY_COLOR, normalizedProgress);
    });
  }

  reset() {
    this.xrReticles.forEach((reticle) => {
      reticle.visible = false;
    });
    this.activeEyeCount = 0;
    this.targetObject = null;
    this.blockedObject = null;
    this.dwellSeconds = 0;
    this.hasTarget = false;
    this.reticleProgress = 0;
  }

  /**
   * Synchronize the visible reticle with the WebXR pose that will be submitted
   * in the current frame. Interaction processing remains in update() so a
   * helper failure can never prevent the immersive scene from rendering.
   */
  prepareForRender() {
    if (!this.isActive()) {
      this.xrReticles.forEach((reticle) => {
        reticle.visible = false;
      });
      return;
    }

    this._updateViewRay();
    this._updateReticle(this.reticleProgress);
  }

  update(deltaSeconds) {
    if (!this.isActive()) {
      this.reset();
      return;
    }

    const dt = Math.max(0, Math.min(0.1, Number(deltaSeconds) || 0));
    this._updateViewRay();
    this.reticleProgress = 0;
    this._updateReticle(this.reticleProgress);

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
    this.reticleProgress = progress;
    this._updateReticle(this.reticleProgress);
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
    const material = this.xrReticles[0]?.material;
    this.xrReticles.forEach((reticle) => this.scene.remove(reticle));
    material?.map?.dispose?.();
    material?.dispose?.();
  }
}
