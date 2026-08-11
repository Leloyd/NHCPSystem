import * as THREE from 'three';

import { clamp, normalize2D } from './utils.js';

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const DESIRED_MOVE = new THREE.Vector3();
const PREVIOUS_FEET_POSITION = new THREE.Vector3();
const XR_LOCAL_OFFSET = new THREE.Vector3();
const TELEPORT_START = new THREE.Vector3();
const TELEPORT_CURRENT = new THREE.Vector3();
const TELEPORT_REQUEST = new THREE.Vector3();
const TELEPORT_VELOCITY = new THREE.Vector3();

// Scratch objects for the gyro "magic window" math (no per-frame allocation).
const GYRO_ZEE = new THREE.Vector3(0, 0, 1);
const GYRO_EULER = new THREE.Euler();
const GYRO_Q0 = new THREE.Quaternion();
const GYRO_Q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const GYRO_QUAT = new THREE.Quaternion();
const XR_SESSION_MODE_VR = 'immersive-vr';
const VR_MIN_TRACKED_HEAD_HEIGHT = 1.0;
const DESKTOP_JUMP_KEYS = new Set(['Space']);
const DESKTOP_SPRINT_KEYS = new Set(['ShiftLeft', 'ShiftRight']);

const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export class PlayerController {
  constructor({ camera, rig, renderer, uiController, playerConfig, mobileRefs, mobileMode, getXrSessionMode }) {
    this.camera = camera;
    this.rig = rig;
    this.renderer = renderer;
    this.uiController = uiController;
    this.mobileMode = Boolean(mobileMode);
    this.getXrSessionMode = typeof getXrSessionMode === 'function'
      ? getXrSessionMode
      : () => null;

    const moveSpeed = Number(playerConfig.move_speed ?? 4.0);
    const sprintSpeed = Number(playerConfig.sprint_speed ?? (moveSpeed * Number(playerConfig.sprint_multiplier ?? 1.55)));

    this.settings = {
      height: Number(playerConfig.height ?? 1.72),
      radius: Number(playerConfig.radius ?? 0.35),
      gravity: Number(playerConfig.gravity ?? 22.0),
      moveSpeed,
      jumpVelocity: Number(playerConfig.jump_strength ?? playerConfig.jump_velocity ?? 8.3),
      sprintMultiplier: moveSpeed > 0 ? sprintSpeed / moveSpeed : 1,
    };

    this.velocity = new THREE.Vector3();

    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jumpQueued: false,
    };

    this.isGrounded = false;

    this.mobileInput = {
      move: { x: 0, y: 0 },
    };

    this.lookInput = {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
    };

    this.xrInput = {
      x: 0,
      z: 0,
    };

    this.wasVrPresenting = false;
    this.xrPhysicalOffsetInitialized = false;
    this.xrPhysicalOffsetBaseline = new THREE.Vector3();

    // Gyro "magic window" look: point the phone to look around. Works on
    // browsers without WebXR (all iOS browsers) using DeviceOrientation.
    this.gyro = {
      enabled: false,
      hasReading: false,
      needsSync: false,
      yawOffset: 0,
      alpha: 0,
      beta: 0,
      gamma: 0,
      onOrientation: null,
    };

    this.mobilePad = this._createMobilePadState(mobileRefs);

    this._bindDesktopInput();
    this._bindLookInput();
    this._bindMobileInput();

    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, this.settings.height, 0);
  }

  _shouldUseDesktopActions() {
    return !this.mobileMode && !this.renderer.xr.isPresenting;
  }

  _createMobilePadState(mobileRefs = {}) {
    return {
      move: {
        zone: mobileRefs.moveStickZone ?? null,
        thumb: mobileRefs.moveStickThumb ?? null,
        active: false,
        pointerId: null,
        centerX: 0,
        centerY: 0,
        radius: 1,
      },
    };
  }

  _bindDesktopInput() {
    window.addEventListener('keydown', (event) => {
      const mapped = KEY_MAP[event.code];
      if (mapped) {
        this.input[mapped] = true;
      }

      if (this.mobileMode) {
        return;
      }

      if (DESKTOP_SPRINT_KEYS.has(event.code)) {
        this.input.sprint = true;
      }

      if (DESKTOP_JUMP_KEYS.has(event.code) && !event.repeat) {
        this.input.jumpQueued = true;
      }
    });

    window.addEventListener('keyup', (event) => {
      const mapped = KEY_MAP[event.code];
      if (mapped) {
        this.input[mapped] = false;
      }

      if (DESKTOP_SPRINT_KEYS.has(event.code)) {
        this.input.sprint = false;
      }
    });
  }

  _bindLookInput() {
    const element = this.renderer?.domElement;
    if (!element) {
      return;
    }

    const onPointerDown = (event) => {
      if (this.renderer.xr.isPresenting) {
        return;
      }

      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      if (this._isMoveStickTarget(event.target)) {
        return;
      }

      this.lookInput.active = true;
      this.lookInput.pointerId = event.pointerId;
      this.lookInput.lastX = event.clientX;
      this.lookInput.lastY = event.clientY;

      try {
        element.setPointerCapture(event.pointerId);
      } catch {
      }
    };

    const onPointerMove = (event) => {
      if (!this.lookInput.active || event.pointerId !== this.lookInput.pointerId) {
        return;
      }

      const deltaX = event.clientX - this.lookInput.lastX;
      const deltaY = event.clientY - this.lookInput.lastY;
      this.lookInput.lastX = event.clientX;
      this.lookInput.lastY = event.clientY;

      this._applyLookDelta(deltaX, deltaY);
    };

    const onPointerUp = (event) => {
      if (!this.lookInput.active || event.pointerId !== this.lookInput.pointerId) {
        return;
      }

      this.lookInput.active = false;
      this.lookInput.pointerId = null;

      try {
        element.releasePointerCapture(event.pointerId);
      } catch {
      }
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
  }

  _applyLookDelta(deltaX, deltaY) {
    const sensitivity = this.mobileMode ? 0.0062 : 0.0046;
    if (this.gyro.enabled) {
      // While the gyro owns the camera, dragging re-aims the heading instead
      // (pitch stays with the device so the horizon never fights the sensor).
      this.gyro.yawOffset -= deltaX * sensitivity;
      return;
    }
    this.camera.rotation.y -= deltaX * sensitivity;
    this.camera.rotation.x = clamp(
      this.camera.rotation.x - deltaY * sensitivity,
      -Math.PI * 0.495,
      Math.PI * 0.495,
    );
  }

  /* --- Gyro "magic window" -------------------------------------------------
     Turns DeviceOrientation readings into camera yaw/pitch so visitors look
     around by moving the phone. This is the cross-browser fallback for
     devices without WebXR (every iOS browser). iOS 13+ requires an explicit
     motion permission that MUST be requested inside a user tap — which is
     why setGyroEnabled is async and called from the Gyro button. */
  async setGyroEnabled(enabled) {
    if (!enabled) {
      if (this.gyro.onOrientation) {
        window.removeEventListener('deviceorientation', this.gyro.onOrientation, true);
        this.gyro.onOrientation = null;
      }
      this.gyro.enabled = false;
      this.gyro.hasReading = false;
      this.levelHorizon();
      return true;
    }

    if (typeof window.DeviceOrientationEvent === 'undefined') {
      throw new Error('This device does not report motion.');
    }

    // iOS motion-permission gate (no-op elsewhere).
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      let response;
      try {
        response = await DeviceOrientationEvent.requestPermission();
      } catch {
        throw new Error('Motion permission request failed. Use HTTPS and tap the button again.');
      }
      if (response !== 'granted') {
        throw new Error('Motion access was denied. Allow motion & orientation access to use gyro look.');
      }
    }

    this.gyro.onOrientation = (event) => {
      if (event.alpha === null || event.alpha === undefined) {
        return;
      }
      this.gyro.alpha = event.alpha;
      this.gyro.beta = event.beta ?? 0;
      this.gyro.gamma = event.gamma ?? 0;
      this.gyro.hasReading = true;
    };
    window.addEventListener('deviceorientation', this.gyro.onOrientation, true);

    this.gyro.enabled = true;
    this.gyro.hasReading = false;
    this.gyro.needsSync = true; // keep the current view direction as the anchor
    return true;
  }

  _updateGyroLook() {
    if (!this.gyro.enabled || !this.gyro.hasReading || this.renderer.xr.isPresenting) {
      return;
    }

    const degToRad = Math.PI / 180;
    const alpha = this.gyro.alpha * degToRad;
    const beta = this.gyro.beta * degToRad;
    const gamma = this.gyro.gamma * degToRad;
    const screenAngle = ((window.screen?.orientation?.angle ?? window.orientation ?? 0) || 0) * degToRad;

    // Standard DeviceOrientation → camera quaternion (the three.js
    // DeviceOrientationControls recipe): device euler, look out of the back
    // of the screen, then compensate for the screen rotation.
    GYRO_EULER.set(beta, alpha, -gamma, 'YXZ');
    GYRO_QUAT.setFromEuler(GYRO_EULER);
    GYRO_QUAT.multiply(GYRO_Q1);
    GYRO_QUAT.multiply(GYRO_Q0.setFromAxisAngle(GYRO_ZEE, -screenAngle));

    // Reduce to yaw/pitch (drop roll — this is a window, not a headset).
    GYRO_EULER.setFromQuaternion(GYRO_QUAT, 'YXZ');

    if (this.gyro.needsSync) {
      // First reading: anchor so the view doesn't jump when gyro turns on.
      this.gyro.yawOffset = this.camera.rotation.y - GYRO_EULER.y;
      this.gyro.needsSync = false;
    }

    this.camera.rotation.y = this.gyro.yawOffset + GYRO_EULER.y;
    this.camera.rotation.x = clamp(GYRO_EULER.x, -Math.PI * 0.495, Math.PI * 0.495);
    this.camera.rotation.z = 0;
  }

  _isMoveStickTarget(target) {
    if (!target || !(target instanceof Element)) {
      return false;
    }

    const stickZone = this.mobilePad.move?.zone;
    if (!stickZone) {
      return false;
    }

    return stickZone.contains(target);
  }

  _bindMobileInput() {
    const pad = this.mobilePad.move;
    if (!pad?.zone) {
      return;
    }

    const onPointerDown = (event) => {
      if (!this.mobileMode || pad.active) {
        return;
      }

      pad.active = true;
      pad.pointerId = event.pointerId;

      const rect = pad.zone.getBoundingClientRect();
      pad.centerX = rect.left + rect.width / 2;
      pad.centerY = rect.top + rect.height / 2;
      pad.radius = Math.max(20, Math.min(rect.width, rect.height) * 0.45);

      pad.zone.setPointerCapture(event.pointerId);
      this._updatePadVector(pad, this.mobileInput.move, event.clientX, event.clientY);
    };

    const onPointerMove = (event) => {
      if (!pad.active || event.pointerId !== pad.pointerId) {
        return;
      }
      this._updatePadVector(pad, this.mobileInput.move, event.clientX, event.clientY);
    };

    const onPointerUp = (event) => {
      if (!pad.active || event.pointerId !== pad.pointerId) {
        return;
      }
      pad.active = false;
      pad.pointerId = null;
      this.mobileInput.move.x = 0;
      this.mobileInput.move.y = 0;
      this._moveThumb(pad.thumb, 0, 0);
    };

    pad.zone.addEventListener('pointerdown', onPointerDown);
    pad.zone.addEventListener('pointermove', onPointerMove);
    pad.zone.addEventListener('pointerup', onPointerUp);
    pad.zone.addEventListener('pointercancel', onPointerUp);
  }

  _updatePadVector(pad, target, x, y) {
    const dx = x - pad.centerX;
    const dy = y - pad.centerY;
    const normalized = normalize2D(dx / pad.radius, dy / pad.radius);

    target.x = normalized.x;
    target.y = normalized.y;

    this._moveThumb(
      pad.thumb,
      normalized.x * pad.radius,
      normalized.y * pad.radius,
    );
  }

  _moveThumb(thumb, x, y) {
    if (!thumb) {
      return;
    }
    thumb.style.transform = `translate(${x}px, ${y}px)`;
  }

  setMobileMode(enabled) {
    this.mobileMode = Boolean(enabled);
    if (!this.mobileMode) {
      this.mobileInput.move.x = 0;
      this.mobileInput.move.y = 0;
    }
  }

  requestPointerLock() {
    return;
  }

  setFeetPosition(position) {
    this.rig.position.copy(position);
  }

  levelHorizon({ syncGyro = true } = {}) {
    // WebXR can leave its final tracked quaternion on the base camera. Drop
    // that stale roll before returning to the normal view.
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.z = 0;

    if (!this.renderer.xr.isPresenting) {
      this.camera.position.set(0, this.settings.height, 0);
    }

    if (syncGyro && this.gyro.enabled) {
      this.gyro.needsSync = true;
    }
  }

  restoreAfterXrSession() {
    this.velocity.set(0, 0, 0);
    this.xrInput.x = 0;
    this.xrInput.z = 0;
    this.wasVrPresenting = false;
    this.xrPhysicalOffsetInitialized = false;
    this.xrPhysicalOffsetBaseline.set(0, 0, 0);
    this.levelHorizon();
  }

  resolveTeleportTarget(target, collisionSystem, output) {
    if (!target || !collisionSystem || !output) {
      return false;
    }

    TELEPORT_REQUEST.copy(target);
    TELEPORT_VELOCITY.set(0, 0, 0);
    const result = collisionSystem.resolveCapsule({
      feetPosition: TELEPORT_REQUEST,
      previousFeetPosition: this.rig.position,
      capsuleHeight: this.settings.height,
      capsuleRadius: this.settings.radius,
      velocity: TELEPORT_VELOCITY,
      deltaSeconds: 1 / 60,
    });
    output.copy(result.position);

    const dx = output.x - this.rig.position.x;
    const dz = output.z - this.rig.position.z;
    return dx * dx + dz * dz >= 0.35 * 0.35;
  }

  teleportTo(target, collisionSystem) {
    if (!target || !collisionSystem) {
      return false;
    }

    TELEPORT_START.copy(this.rig.position);
    TELEPORT_CURRENT.copy(TELEPORT_START);
    const distance = Math.hypot(
      target.x - TELEPORT_START.x,
      target.z - TELEPORT_START.z,
    );
    const stepLength = Math.max(0.08, this.settings.radius * 0.38);
    const steps = Math.max(1, Math.ceil(distance / stepLength));
    TELEPORT_VELOCITY.set(0, 0, 0);

    for (let index = 1; index <= steps; index += 1) {
      TELEPORT_REQUEST.lerpVectors(TELEPORT_START, target, index / steps);
      const result = collisionSystem.resolveCapsule({
        feetPosition: TELEPORT_REQUEST,
        previousFeetPosition: TELEPORT_CURRENT,
        capsuleHeight: this.settings.height,
        capsuleRadius: this.settings.radius,
        velocity: TELEPORT_VELOCITY,
        deltaSeconds: 1 / 60,
      });

      const correction = Math.hypot(
        result.position.x - TELEPORT_REQUEST.x,
        result.position.z - TELEPORT_REQUEST.z,
      );
      TELEPORT_CURRENT.copy(result.position);

      // Stop at a wall or calibrated boundary instead of teleporting through.
      if (correction > Math.max(0.075, this.settings.radius * 0.45)) {
        break;
      }
    }

    this.rig.position.copy(TELEPORT_CURRENT);
    this.velocity.set(0, 0, 0);
    this.xrInput.x = 0;
    this.xrInput.z = 0;
    this.xrPhysicalOffsetInitialized = false;
    this.xrPhysicalOffsetBaseline.set(0, 0, 0);

    return Math.hypot(
      TELEPORT_CURRENT.x - TELEPORT_START.x,
      TELEPORT_CURRENT.z - TELEPORT_START.z,
    ) >= 0.2;
  }

  _readXrMoveAxes(sessionMode = null) {
    this.xrInput.x = 0;
    this.xrInput.z = 0;

    if (!this.renderer.xr.isPresenting || sessionMode !== XR_SESSION_MODE_VR) {
      return;
    }

    const session = this.renderer.xr.getSession();
    if (!session) {
      return;
    }

    for (const source of session.inputSources) {
      const gamepad = source.gamepad;
      if (!gamepad || gamepad.axes.length === 0) {
        continue;
      }

      const axes = gamepad.axes;
      let x = 0;
      let y = 0;

      if (axes.length >= 4) {
        x = axes[2];
        y = axes[3];
      } else if (axes.length >= 2) {
        x = axes[0];
        y = axes[1];
      }

      if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
        this.xrInput.x = x;
        this.xrInput.z = y;
        return;
      }
    }
  }

  update(deltaSeconds, collisionSystem) {
    const sessionMode = this.renderer.xr.isPresenting
      ? this.getXrSessionMode()
      : null;
    const isVrPresenting = sessionMode === XR_SESSION_MODE_VR;

    // Capture the feet before any input source moves the rig. In particular,
    // physical WebXR head movement is folded into the rig below and must not
    // be able to bypass calibrated boundary segments.
    PREVIOUS_FEET_POSITION.copy(this.rig.position);

    this._updateGyroLook();

    // Normal/mobile rendering should never inherit a rolled XR camera.
    if (!this.renderer.xr.isPresenting) {
      this.camera.rotation.z = 0;
    }

    this._readXrMoveAxes(sessionMode);

    if (!this.renderer.xr.isPresenting) {
      this.camera.position.x = 0;
      this.camera.position.z = 0;
      this.camera.position.y = this.settings.height;
      this.wasVrPresenting = false;
      this.xrPhysicalOffsetInitialized = false;
      this.xrPhysicalOffsetBaseline.set(0, 0, 0);
    } else {
      if (isVrPresenting && !this.wasVrPresenting) {
        this._calibrateVrHeightFromCurrentPose();
      }

      this._applyXrPhysicalOffset();
    }

    this.wasVrPresenting = isVrPresenting;

    const moveInput = this._collectMoveInput();
    const speedMultiplier = this._shouldUseDesktopActions() && this.input.sprint
      ? this.settings.sprintMultiplier
      : 1;
    const speed = this.settings.moveSpeed * speedMultiplier;

    if (this._shouldUseDesktopActions() && this.input.jumpQueued) {
      if (this.isGrounded) {
        this.velocity.y = this.settings.jumpVelocity;
        this.isGrounded = false;
      }
      this.input.jumpQueued = false;
    }

    this._computeMoveDirection(moveInput.x, moveInput.z);
    if (DESIRED_MOVE.lengthSq() > 0) {
      DESIRED_MOVE.normalize().multiplyScalar(speed);
      this.velocity.x = DESIRED_MOVE.x;
      this.velocity.z = DESIRED_MOVE.z;
    } else {
      const damping = Math.exp(-12.0 * deltaSeconds);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
    }

    this.velocity.y -= this.settings.gravity * deltaSeconds;

    this.rig.position.addScaledVector(this.velocity, deltaSeconds);

    const collisionResult = collisionSystem.resolveCapsule({
      feetPosition: this.rig.position,
      previousFeetPosition: PREVIOUS_FEET_POSITION,
      capsuleHeight: this.settings.height,
      capsuleRadius: this.settings.radius,
      velocity: this.velocity,
      deltaSeconds,
    });

    this.rig.position.copy(collisionResult.position);
    this.isGrounded = collisionResult.grounded;

    if (this.isGrounded && this.velocity.y < 0) {
      this.velocity.y = 0;
    }
  }

  _calibrateVrHeightFromCurrentPose() {
    const currentHeadHeight = Number.isFinite(this.camera.position.y)
      ? this.camera.position.y
      : 0;

    if (currentHeadHeight >= VR_MIN_TRACKED_HEAD_HEIGHT) {
      return;
    }

    const correction = this.settings.height - currentHeadHeight;
    if (Math.abs(correction) < 1e-4) {
      return;
    }

    this.rig.position.y += correction;
  }

  _applyXrPhysicalOffset() {
    const currentX = Number.isFinite(this.camera.position.x) ? this.camera.position.x : 0;
    const currentZ = Number.isFinite(this.camera.position.z) ? this.camera.position.z : 0;

    if (!this.xrPhysicalOffsetInitialized) {
      this.xrPhysicalOffsetBaseline.set(currentX, 0, currentZ);
      this.xrPhysicalOffsetInitialized = true;
      this.camera.position.x = 0;
      this.camera.position.z = 0;
      return;
    }

    XR_LOCAL_OFFSET.set(
      currentX - this.xrPhysicalOffsetBaseline.x,
      0,
      currentZ - this.xrPhysicalOffsetBaseline.z,
    );

    if (XR_LOCAL_OFFSET.lengthSq() > 1e-8) {
      this.rig.position.add(XR_LOCAL_OFFSET);
    }

    this.xrPhysicalOffsetBaseline.set(currentX, 0, currentZ);
    this.camera.position.x = 0;
    this.camera.position.z = 0;
  }

  _collectMoveInput() {
    let x = 0;
    let z = 0;

    if (this.input.forward) z += 1;
    if (this.input.backward) z -= 1;
    if (this.input.left) x -= 1;
    if (this.input.right) x += 1;

    if (this.mobileMode && !this.renderer.xr.isPresenting) {
      x += this.mobileInput.move.x;
      z += -this.mobileInput.move.y;
    }

    if (this.renderer.xr.isPresenting) {
      x += this.xrInput.x;
      z += -this.xrInput.z;
    }

    const normalized = normalize2D(x, z);
    return { x: normalized.x, z: normalized.y };
  }

  _computeMoveDirection(moveX, moveZ) {
    FORWARD.set(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()));
    FORWARD.y = 0;
    if (FORWARD.lengthSq() < 1e-6) {
      FORWARD.set(0, 0, -1);
    }
    FORWARD.normalize();

    RIGHT.crossVectors(FORWARD, UP).normalize();

    DESIRED_MOVE.set(0, 0, 0);
    DESIRED_MOVE.addScaledVector(RIGHT, moveX);
    DESIRED_MOVE.addScaledVector(FORWARD, moveZ);
  }
}
