import * as THREE from 'three';

const XR_RAY_MATRIX = new THREE.Matrix4();
const XR_RAY_DIRECTION = new THREE.Vector3();
const XR_SELECT_DEDUP_MS = 120;

export class InteractionSystem {
  constructor({
    camera,
    renderer,
    domElement,
    uiController,
    registry,
    getPickables,
    getPlayerPosition,
    pointerLockControls,
  }) {
    this.camera = camera;
    this.renderer = renderer;
    this.domElement = domElement;
    this.uiController = uiController;
    this.registry = registry;
    this.getPickables = getPickables;
    this.getPlayerPosition = getPlayerPosition;
    this.pointerLockControls = pointerLockControls;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;

    this.pointer = new THREE.Vector2();
    this.selected = null;
    this.xrSession = null;
    this.lastXrSelectTimestamp = -Infinity;

    this._boundClick = this._onClick.bind(this);
    this._boundPointerUp = this._onPointerUp.bind(this);
    this._boundTouchEnd = this._onTouchEnd.bind(this);
    this._boundXrSessionStart = this._onXrSessionStart.bind(this);
    this._boundXrSessionEnd = this._onXrSessionEnd.bind(this);
    this._boundXrSelect = this._onXrSelect.bind(this);

    this.domElement.addEventListener('click', this._boundClick);
    this.domElement.addEventListener('pointerup', this._boundPointerUp, { passive: true });
    this.domElement.addEventListener('touchend', this._boundTouchEnd, { passive: true });

    this.renderer.xr.addEventListener('sessionstart', this._boundXrSessionStart);
    this.renderer.xr.addEventListener('sessionend', this._boundXrSessionEnd);

    const activeSession = this.renderer.xr.getSession?.();
    if (activeSession) {
      this._attachXrSession(activeSession);
    }
  }

  dispose() {
    this.domElement.removeEventListener('click', this._boundClick);
    this.domElement.removeEventListener('pointerup', this._boundPointerUp);
    this.domElement.removeEventListener('touchend', this._boundTouchEnd);
    this.renderer.xr.removeEventListener('sessionstart', this._boundXrSessionStart);
    this.renderer.xr.removeEventListener('sessionend', this._boundXrSessionEnd);
    this._detachXrSession();
    this._clearHighlight();
  }

  _onClick(event) {
    if (this.renderer.xr.isPresenting) {
      return;
    }

    this._pickFromEvent(event);
  }

  _onPointerUp(event) {
    if (!event || event.pointerType === 'mouse') {
      return;
    }

    if (this.renderer.xr.isPresenting) {
      return;
    }

    this._pickFromEvent(event);
  }

  _onTouchEnd(event) {
    if (this.renderer.xr.isPresenting) {
      return;
    }

    const touch = event.changedTouches?.[0];
    if (!touch) {
      this._pickAtCenter();
      return;
    }

    this._pickNormalized(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1,
    );
  }

  _pickFromEvent(event) {
    const locked = Boolean(this.pointerLockControls?.isLocked);
    if (locked) {
      this._pickAtCenter();
      return;
    }

    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    this._pickNormalized(x, y);
  }

  _onXrSessionStart() {
    const session = this.renderer.xr.getSession?.();
    this._attachXrSession(session ?? null);
  }

  _onXrSessionEnd() {
    this._detachXrSession();
  }

  _attachXrSession(session) {
    this._detachXrSession();

    if (!session) {
      return;
    }

    this.xrSession = session;
    this.xrSession.addEventListener('selectstart', this._boundXrSelect);
    this.xrSession.addEventListener('select', this._boundXrSelect);
  }

  _detachXrSession() {
    if (!this.xrSession) {
      return;
    }

    this.xrSession.removeEventListener('selectstart', this._boundXrSelect);
    this.xrSession.removeEventListener('select', this._boundXrSelect);
    this.xrSession = null;
  }

  _onXrSelect(event) {
    const now = performance.now();
    if (now - this.lastXrSelectTimestamp < XR_SELECT_DEDUP_MS) {
      return;
    }
    this.lastXrSelectTimestamp = now;

    const frame = event?.frame;
    const targetRaySpace = event?.inputSource?.targetRaySpace;
    const referenceSpace = this.renderer.xr.getReferenceSpace?.();

    if (frame && targetRaySpace && referenceSpace) {
      const pose = frame.getPose(targetRaySpace, referenceSpace);
      if (pose?.transform?.matrix) {
        XR_RAY_MATRIX.fromArray(pose.transform.matrix);
        this.raycaster.ray.origin.setFromMatrixPosition(XR_RAY_MATRIX);
        this.raycaster.ray.direction
          .copy(XR_RAY_DIRECTION.set(0, 0, -1))
          .transformDirection(XR_RAY_MATRIX)
          .normalize();
        this._pickFromCurrentRay();
        return;
      }
    }

    this._pickAtCenter();
  }

  _pickAtCenter() {
    this._pickNormalized(0, 0);
  }

  _pickNormalized(x, y) {
    this.pointer.set(x, y);

    this.raycaster.setFromCamera(this.pointer, this.camera);
    this._pickFromCurrentRay();
  }

  _pickFromCurrentRay() {
    const pickables = this.getPickables?.() ?? [];
    if (pickables.length === 0) {
      return;
    }

    const hits = this.raycaster.intersectObjects(pickables, false);
    this._processHits(hits);
  }

  _processHits(hits) {
    if (hits.length === 0) {
      this.uiController?.hideInteraction();
      this._clearHighlight();
      return;
    }

    const hit = hits[0];
    const mesh = hit.object;

    this._highlight(mesh);

    const interactionData = mesh.userData.interaction ?? {};
    const playerPosition = this.getPlayerPosition?.();
    const planarDistance = playerPosition && hit.point
      ? Math.hypot(hit.point.x - playerPosition.x, hit.point.z - playerPosition.z)
      : null;
    const maxDistance = Number(interactionData.maxDistance);
    const context = {
      name:
        interactionData.name ||
        mesh.name ||
        mesh.parent?.name ||
        'Unnamed object',
      metadata: interactionData.metadata ?? {},
      suppressPanel: Boolean(interactionData.suppressPanel),
      object: mesh,
      point: hit.point.clone(),
      distance: hit.distance,
      playerDistance: planarDistance,
      maxDistance: Number.isFinite(maxDistance) ? maxDistance : null,
      assetId: interactionData.assetId ?? null,
    };

    const measuredDistance = Number.isFinite(planarDistance) ? planarDistance : hit.distance;
    if (Number.isFinite(maxDistance) && Number.isFinite(measuredDistance) && measuredDistance > maxDistance) {
      const metadataType = String(interactionData.metadata?.type || '').toLowerCase();
      const targetLabel = metadataType.includes('door')
        ? 'door'
        : metadataType.includes('hotspot')
          ? 'hotspot'
          : 'object';
      this.uiController?.hideInteraction();
      this.uiController?.setHotspotHelperHint(
        `Move closer to the ${targetLabel}. Current ${measuredDistance.toFixed(2)}, max ${maxDistance.toFixed(2)}.`,
        2200,
      );
      return;
    }

    if (context.suppressPanel) {
      this.uiController?.hideInteraction();
    } else {
      this.uiController?.showInteraction(context);
    }
    this.registry?.trigger(context);
  }

  _highlight(mesh) {
    this._clearHighlight();

    if (!mesh?.material) {
      return;
    }

    const originalMaterial = mesh.material;
    const clonedMaterial = Array.isArray(originalMaterial)
      ? originalMaterial.map((mat) => this._cloneHighlighted(mat))
      : this._cloneHighlighted(originalMaterial);

    mesh.material = clonedMaterial;

    this.selected = {
      mesh,
      originalMaterial,
      highlightedMaterial: clonedMaterial,
    };
  }

  _cloneHighlighted(material) {
    const cloned = material.clone();

    if ('emissive' in cloned && cloned.emissive?.isColor) {
      cloned.emissive = new THREE.Color(0x1dd3ff);
      cloned.emissiveIntensity = Math.max(0.45, cloned.emissiveIntensity ?? 0);
      return cloned;
    }

    if ('color' in cloned && cloned.color?.isColor) {
      cloned.color = cloned.color.clone();
      cloned.color.offsetHSL(0, 0, 0.16);
    }

    return cloned;
  }

  _clearHighlight() {
    if (!this.selected) {
      return;
    }

    const { mesh, originalMaterial, highlightedMaterial } = this.selected;
    mesh.material = originalMaterial;

    if (Array.isArray(highlightedMaterial)) {
      highlightedMaterial.forEach((material) => material.dispose?.());
    } else {
      highlightedMaterial.dispose?.();
    }

    this.selected = null;
  }
}
