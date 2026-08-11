export class UiController {
  constructor(refs) {
    this.refs = refs;
    this.onBackRequested = null;
    this.onFullscreenToggled = null;
    this.errorResetTimer = null;
    this.positionCopyResetTimer = null;
  }

  bindHandlers({ onBackRequested, onFullscreenToggled, onGyroToggled }) {
    this.onBackRequested = onBackRequested;
    this.onFullscreenToggled = onFullscreenToggled;
    this.onGyroToggled = onGyroToggled;

    this.refs.backButton?.addEventListener('click', () => {
      this.onBackRequested?.();
    });

    this.refs.fullscreenButton?.addEventListener('click', () => {
      this.onFullscreenToggled?.();
    });

    this.refs.gyroButton?.addEventListener('click', () => {
      this.onGyroToggled?.();
    });

    this.refs.positionDebugCopy?.addEventListener('click', () => {
      this.copyPositionDebugValue();
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

  setPositionDebugMode({ label, hint, ariaLabel, copyLabel = 'Copy' }) {
    if (this.refs.positionDebugLabel) {
      this.refs.positionDebugLabel.textContent = label;
    }
    if (this.refs.positionDebugHint) {
      this.refs.positionDebugHint.textContent = hint;
    }
    if (this.refs.positionDebugPanel && ariaLabel) {
      this.refs.positionDebugPanel.setAttribute('aria-label', ariaLabel);
    }
    if (this.refs.positionDebugCopy && ariaLabel) {
      this.refs.positionDebugCopy.setAttribute('aria-label', `Copy ${ariaLabel.toLowerCase()}`);
    }
    if (this.refs.positionDebugCopyLabel) {
      this.refs.positionDebugCopyLabel.textContent = copyLabel;
    }
  }

  setPositionDebugCopyEnabled(enabled) {
    if (this.refs.positionDebugCopy) {
      this.refs.positionDebugCopy.disabled = !enabled;
      this.refs.positionDebugCopy.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    }
  }

  setPositionDebugValue(value) {
    if (this.refs.positionDebugValue) {
      this.refs.positionDebugValue.textContent = value;
    }
  }

  setHotspotHelperHint(message, duration = 2200) {
    this.showError(message, duration);
  }

  async copyPositionDebugValue() {
    const value = this.refs.positionDebugValue?.textContent?.trim();
    if (!value || !this.refs.positionDebugCopy) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const helper = document.createElement('textarea');
        helper.value = value;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        let copied = false;
        try {
          document.body.appendChild(helper);
          helper.select();
          copied = document.execCommand('copy');
        } finally {
          helper.remove();
        }
        if (!copied) {
          throw new Error('Copy command was rejected.');
        }
      }

      this.setPositionCopyFeedback('Copied', true);
    } catch (error) {
      console.warn('Unable to copy player coordinates.', error);
      this.setPositionCopyFeedback('Copy failed', false);
    }
  }

  setPositionCopyFeedback(message, succeeded) {
    if (this.positionCopyResetTimer) {
      window.clearTimeout(this.positionCopyResetTimer);
    }

    if (this.refs.positionDebugCopyLabel) {
      this.refs.positionDebugCopyLabel.textContent = message;
    }
    this.refs.positionDebugCopy?.classList.toggle('is-copied', Boolean(succeeded));

    this.positionCopyResetTimer = window.setTimeout(() => {
      if (this.refs.positionDebugCopyLabel) {
        this.refs.positionDebugCopyLabel.textContent = 'Copy';
      }
      this.refs.positionDebugCopy?.classList.remove('is-copied');
      this.positionCopyResetTimer = null;
    }, 1800);
  }
}
