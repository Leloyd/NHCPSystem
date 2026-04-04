import * as THREE from 'three';

export class InteractionSystem {
  constructor({
    camera,
    renderer,
    domElement,
    uiController,
    registry,
    getPickables,
    pointerLockControls,
  }) {
    this.camera = camera;
    this.renderer = renderer;
    this.domElement = domElement;
    this.uiController = uiController;
    this.registry = registry;
    this.getPickables = getPickables;
    this.pointerLockControls = pointerLockControls;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;

    this.pointer = new THREE.Vector2();
    this.selected = null;

    this._boundClick = this._onClick.bind(this);
    this._boundTouchEnd = this._onTouchEnd.bind(this);

    this.domElement.addEventListener('click', this._boundClick);
    this.domElement.addEventListener('touchend', this._boundTouchEnd, { passive: true });
  }

  dispose() {
    this.domElement.removeEventListener('click', this._boundClick);
    this.domElement.removeEventListener('touchend', this._boundTouchEnd);
    this._clearHighlight();
  }

  _onClick(event) {
    this._pickFromEvent(event);
  }

  _onTouchEnd(event) {
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

  _pickAtCenter() {
    this._pickNormalized(0, 0);
  }

  _pickNormalized(x, y) {
    this.pointer.set(x, y);

    const pickables = this.getPickables?.() ?? [];
    if (pickables.length === 0) {
      return;
    }

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(pickables, false);

    if (hits.length === 0) {
      this.uiController?.hideInteraction();
      this._clearHighlight();
      return;
    }

    const hit = hits[0];
    const mesh = hit.object;

    this._highlight(mesh);

    const interactionData = mesh.userData.interaction ?? {};
    const context = {
      name:
        interactionData.name ||
        mesh.name ||
        mesh.parent?.name ||
        'Unnamed object',
      metadata: interactionData.metadata ?? {},
      object: mesh,
      point: hit.point.clone(),
      distance: hit.distance,
      assetId: interactionData.assetId ?? null,
    };

    this.uiController?.showInteraction(context);
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
