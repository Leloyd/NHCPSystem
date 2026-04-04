export class UiController {
  constructor(refs) {
    this.refs = refs;
    this.onPointerLockRequested = null;
    this.onQualityChanged = null;
    this.onDebugCollisionChanged = null;
    this.hotspotHelperResetTimer = null;
  }

  bindHandlers({ onPointerLockRequested, onQualityChanged, onDebugCollisionChanged }) {
    this.onPointerLockRequested = onPointerLockRequested;
    this.onQualityChanged = onQualityChanged;
    this.onDebugCollisionChanged = onDebugCollisionChanged;

    this.refs.pointerLockButton?.addEventListener('click', () => {
      this.onPointerLockRequested?.();
    });

    this.refs.qualitySelect?.addEventListener('change', (event) => {
      const value = event.target.value;
      this.onQualityChanged?.(value);
    });

    this.refs.debugCollisionToggle?.addEventListener('change', (event) => {
      this.onDebugCollisionChanged?.(Boolean(event.target.checked));
    });
  }

  setLoadingProgress(progress, label) {
    const clamped = Math.max(0, Math.min(progress, 1));
    if (this.refs.loadingProgress) {
      this.refs.loadingProgress.style.width = `${Math.round(clamped * 100)}%`;
    }
    if (this.refs.loadingText && label) {
      this.refs.loadingText.textContent = label;
    }
  }

  completeLoading(message = 'Scene loaded.') {
    this.setLoadingProgress(1, message);
    window.setTimeout(() => {
      this.refs.loadingOverlay?.classList.add('hidden');
    }, 300);
  }

  showError(message) {
    if (!this.refs.errorBanner) {
      return;
    }
    this.refs.errorBanner.textContent = message;
    this.refs.errorBanner.classList.remove('hidden');
  }

  clearError() {
    this.refs.errorBanner?.classList.add('hidden');
  }

  setXrStatus(message) {
    if (this.refs.xrStatus) {
      this.refs.xrStatus.textContent = message;
    }
  }

  setPointerLockState(locked) {
    if (this.refs.pointerLockButton) {
      this.refs.pointerLockButton.textContent = locked
        ? 'Mouse captured (Esc to release)'
        : 'Click to capture mouse look';
    }

    if (this.refs.crosshair) {
      this.refs.crosshair.classList.toggle('hidden', !locked);
    }
  }

  setQuality(value) {
    if (this.refs.qualitySelect) {
      this.refs.qualitySelect.value = value;
    }
  }

  setDebugCollision(value) {
    if (this.refs.debugCollisionToggle) {
      this.refs.debugCollisionToggle.checked = value;
    }
  }

  setMobileControlsVisible(visible) {
    if (!this.refs.mobileControls) {
      return;
    }
    this.refs.mobileControls.classList.toggle('hidden', !visible);
  }

  setPlayerCoordinates(position) {
    if (!this.refs.playerCoordinates || !position) {
      return;
    }

    const x = Number.isFinite(position.x) ? position.x : 0;
    const y = Number.isFinite(position.y) ? position.y : 0;
    const z = Number.isFinite(position.z) ? position.z : 0;

    this.refs.playerCoordinates.textContent = `Position: X ${x.toFixed(2)} Y ${y.toFixed(2)} Z ${z.toFixed(2)}`;
  }

  setHotspotHelperHint(message, resetAfterMs = 0) {
    if (!this.refs.hotspotHelper) {
      return;
    }

    this.refs.hotspotHelper.textContent = message;

    if (this.hotspotHelperResetTimer) {
      window.clearTimeout(this.hotspotHelperResetTimer);
      this.hotspotHelperResetTimer = null;
    }

    if (resetAfterMs > 0) {
      this.hotspotHelperResetTimer = window.setTimeout(() => {
        this.refs.hotspotHelper.textContent = 'Press H to copy hotspot position.';
        this.hotspotHelperResetTimer = null;
      }, resetAfterMs);
    }
  }

  showInteraction(context) {
    if (!this.refs.interactionPanel || !this.refs.interactionName || !this.refs.interactionMeta) {
      return;
    }

    this.refs.interactionName.textContent = context?.name ?? 'Unnamed object';
    const metadata = context?.metadata && Object.keys(context.metadata).length > 0
      ? JSON.stringify(context.metadata, null, 2)
      : '{\n  "info": "No metadata"\n}';

    this.refs.interactionMeta.textContent = metadata;
    this.refs.interactionPanel.classList.remove('hidden');
  }

  hideInteraction() {
    this.refs.interactionPanel?.classList.add('hidden');
  }
}
