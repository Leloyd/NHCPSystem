import * as THREE from 'three';

const CENTER = new THREE.Vector2(0, 0);
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
    this.reticle = this._createReticleOverlay();

    this.targetObject = null;
    this.blockedObject = null;
    this.dwellSeconds = 0;
    this.hasTarget = false;
  }

  _createReticleOverlay() {
    const root = document.createElement('div');
    root.id = 'cardboard-gaze-reticles';
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483000',
      'pointer-events:none',
      'user-select:none',
    ].join(';');

    const eyes = [25, 75].map((leftPercent) => {
      const outer = document.createElement('div');
      outer.style.cssText = [
        'position:absolute',
        `left:${leftPercent}%`,
        'top:50%',
        'width:34px',
        'height:34px',
        'border-radius:50%',
        'transform:translate(-50%, -50%)',
        'filter:drop-shadow(0 0 6px rgba(0,0,0,.9))',
      ].join(';');

      const inner = document.createElement('div');
      inner.style.cssText = [
        'position:absolute',
        'inset:5px',
        'border:3px solid #f4d77f',
        'border-radius:50%',
        'background:rgba(10,7,2,.38)',
        'box-sizing:border-box',
      ].join(';');

      const dot = document.createElement('span');
      dot.style.cssText = [
        'position:absolute',
        'left:50%',
        'top:50%',
        'width:5px',
        'height:5px',
        'border-radius:50%',
        'background:#f4d77f',
        'transform:translate(-50%, -50%)',
        'box-shadow:0 0 5px rgba(244,215,127,.9)',
      ].join(';');

      outer.append(inner, dot);
      root.appendChild(outer);
      return { outer, inner, dot };
    });

    document.body.appendChild(root);
    return { root, eyes };
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
    const normalizedProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const progressDegrees = Math.max(2, normalizedProgress * 360);
    const color = BASE_COLOR.clone().lerp(READY_COLOR, normalizedProgress).getStyle();
    this.reticle.root.hidden = false;
    this.reticle.eyes.forEach(({ outer, inner, dot }) => {
      outer.style.background = `conic-gradient(${color} ${progressDegrees}deg, rgba(244,215,127,.2) ${progressDegrees}deg)`;
      outer.style.transform = `translate(-50%, -50%) scale(${1 + normalizedProgress * 0.16})`;
      inner.style.borderColor = color;
      dot.style.background = color;
      dot.style.boxShadow = `0 0 ${5 + normalizedProgress * 4}px ${color}`;
    });
  }

  reset() {
    this.reticle.root.hidden = true;
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
    this.reticle.root.remove();
  }
}
