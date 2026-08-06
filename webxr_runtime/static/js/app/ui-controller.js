export class UiController {
  constructor(refs) {
    this.refs = refs;
    this.onBackRequested = null;
    this.onFullscreenToggled = null;
    this.errorResetTimer = null;
  }

  bindHandlers({ onBackRequested, onFullscreenToggled, onGyroToggled, onCardboardToggled }) {
    this.onBackRequested = onBackRequested;
    this.onFullscreenToggled = onFullscreenToggled;
    this.onGyroToggled = onGyroToggled;
    this.onCardboardToggled = onCardboardToggled;

    this.refs.backButton?.addEventListener('click', () => {
      this.onBackRequested?.();
    });

    this.refs.fullscreenButton?.addEventListener('click', () => {
      this.onFullscreenToggled?.();
    });

    this.refs.gyroButton?.addEventListener('click', () => {
      this.onGyroToggled?.();
    });

    this.refs.cardboardButton?.addEventListener('click', () => {
      this.onCardboardToggled?.();
    });
  }

  setGyroVisible(visible) {
    if (this.refs.gyroButton) {
      this.refs.gyroButton.hidden = !visible;
    }
  }

  setGyroState(active) {
    if (!this.refs.gyroButton) {
      return;
    }
    this.refs.gyroButton.classList.toggle('is-active', Boolean(active));
    this.refs.gyroButton.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  setCardboardVisible(visible) {
    if (this.refs.cardboardButton) {
      this.refs.cardboardButton.hidden = !visible;
    }
  }

  setCardboardState(active) {
    if (!this.refs.cardboardButton) {
      return;
    }
    this.refs.cardboardButton.classList.toggle('is-active', Boolean(active));
    this.refs.cardboardButton.setAttribute('aria-pressed', active ? 'true' : 'false');
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

  showError(message, resetAfterMs = 0) {
    if (!this.refs.errorBanner) {
      return;
    }

    if (this.errorResetTimer) {
      window.clearTimeout(this.errorResetTimer);
      this.errorResetTimer = null;
    }

    this.refs.errorBanner.textContent = message;
    this.refs.errorBanner.classList.remove('hidden');

    if (resetAfterMs > 0) {
      this.errorResetTimer = window.setTimeout(() => {
        this.clearError();
      }, resetAfterMs);
    }
  }

  clearError() {
    if (this.errorResetTimer) {
      window.clearTimeout(this.errorResetTimer);
      this.errorResetTimer = null;
    }

    this.refs.errorBanner?.classList.add('hidden');
  }

  setXrStatus(message) {
    if (this.refs.xrStatus) {
      this.refs.xrStatus.textContent = message;
    }
  }

  setFullscreenState(active) {
    if (!this.refs.fullscreenButton) {
      return;
    }

    this.refs.fullscreenButton.classList.toggle('is-active', Boolean(active));
    this.refs.fullscreenButton.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  setMobileControlsVisible(visible) {
    if (!this.refs.mobileControls) {
      return;
    }
    this.refs.mobileControls.classList.toggle('hidden', !visible);
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

  setPositionDebugVisible(visible) {
    this.refs.positionDebugPanel?.classList.toggle('hidden', !visible);
  }

  setPositionDebugValue(value) {
    if (this.refs.positionDebugValue) {
      this.refs.positionDebugValue.textContent = value;
    }
  }
}
