import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

import { clamp, normalize2D } from './utils.js';

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const DESIRED_MOVE = new THREE.Vector3();
const XR_LOCAL_OFFSET = new THREE.Vector3();
const XR_SESSION_MODE_AR = 'immersive-ar';
const XR_SESSION_MODE_VR = 'immersive-vr';
const VR_MIN_TRACKED_HEAD_HEIGHT = 1.0;
const AR_PHYSICAL_MOVE_DEADZONE_METERS = 0.012;

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
  constructor({ camera, rig, renderer, uiController, playerConfig, mobileRefs, mobileMode }) {
    this.camera = camera;
    this.rig = rig;
    this.renderer = renderer;
    this.uiController = uiController;
    this.mobileMode = Boolean(mobileMode);

    this.settings = {
      height: Number(playerConfig.height ?? 1.72),
      radius: Number(playerConfig.radius ?? 0.35),
      gravity: Number(playerConfig.gravity ?? 22.0),
      jumpStrength: Number(playerConfig.jump_strength ?? 8.3),
      moveSpeed: Number(playerConfig.move_speed ?? 4.0),
      sprintSpeed: Number(playerConfig.sprint_speed ?? 6.5),
    };

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
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
      look: { x: 0, y: 0 },
      sprint: false,
      jumpQueued: false,
    };

    this.xrInput = {
      x: 0,
      z: 0,
    };

    this.wasArPresenting = false;
    this.wasVrPresenting = false;
    this.xrPhysicalOffsetInitialized = false;
    this.xrPhysicalOffsetBaseline = new THREE.Vector3();

    this.mobilePad = this._createMobilePadState(mobileRefs);

    this._bindDesktopInput();
    this._bindPointerLock();
    this._bindMobileInput();

    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, this.settings.height, 0);
  }

  _createMobilePadState(mobileRefs = {}) {
    return {
      left: {
        zone: mobileRefs.leftStickZone ?? null,
        thumb: mobileRefs.leftStickThumb ?? null,
        active: false,
        pointerId: null,
        centerX: 0,
        centerY: 0,
        radius: 1,
      },
      right: {
        zone: mobileRefs.rightStickZone ?? null,
        thumb: mobileRefs.rightStickThumb ?? null,
        active: false,
        pointerId: null,
        centerX: 0,
        centerY: 0,
        radius: 1,
      },
      jumpButton: mobileRefs.mobileJumpButton ?? null,
      sprintButton: mobileRefs.mobileSprintButton ?? null,
    };
  }

  _bindDesktopInput() {
    window.addEventListener('keydown', (event) => {
      const mapped = KEY_MAP[event.code];
      if (mapped) {
        this.input[mapped] = true;
      }

      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.input.sprint = true;
      }

      if (event.code === 'Space') {
        this.input.jumpQueued = true;
      }
    });

    window.addEventListener('keyup', (event) => {
      const mapped = KEY_MAP[event.code];
      if (mapped) {
        this.input[mapped] = false;
      }

      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.input.sprint = false;
      }
    });
  }

  _bindPointerLock() {
    this.controls.addEventListener('lock', () => {
      this.uiController?.setPointerLockState(true);
    });

    this.controls.addEventListener('unlock', () => {
      this.uiController?.setPointerLockState(false);
    });

    this.uiController?.setPointerLockState(false);
  }

  _bindMobileInput() {
    const bindPad = (padKey, targetVector) => {
      const pad = this.mobilePad[padKey];
      if (!pad.zone) {
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
        this._updatePadVector(pad, targetVector, event.clientX, event.clientY);
      };

      const onPointerMove = (event) => {
        if (!pad.active || event.pointerId !== pad.pointerId) {
          return;
        }
        this._updatePadVector(pad, targetVector, event.clientX, event.clientY);
      };

      const onPointerUp = (event) => {
        if (!pad.active || event.pointerId !== pad.pointerId) {
          return;
        }
        pad.active = false;
        pad.pointerId = null;
        targetVector.x = 0;
        targetVector.y = 0;
        this._moveThumb(pad.thumb, 0, 0);
      };

      pad.zone.addEventListener('pointerdown', onPointerDown);
      pad.zone.addEventListener('pointermove', onPointerMove);
      pad.zone.addEventListener('pointerup', onPointerUp);
      pad.zone.addEventListener('pointercancel', onPointerUp);
    };

    bindPad('left', this.mobileInput.move);
    bindPad('right', this.mobileInput.look);

    const jumpButton = this.mobilePad.jumpButton;
    if (jumpButton) {
      jumpButton.addEventListener('pointerdown', () => {
        if (!this.mobileMode) {
          return;
        }
        this.mobileInput.jumpQueued = true;
      });
    }

    const sprintButton = this.mobilePad.sprintButton;
    if (sprintButton) {
      sprintButton.addEventListener('pointerdown', () => {
        if (!this.mobileMode) {
          return;
        }
        this.mobileInput.sprint = true;
      });
      const clearSprint = () => {
        this.mobileInput.sprint = false;
      };
      sprintButton.addEventListener('pointerup', clearSprint);
      sprintButton.addEventListener('pointercancel', clearSprint);
      sprintButton.addEventListener('pointerleave', clearSprint);
    }
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
      this.mobileInput.look.x = 0;
      this.mobileInput.look.y = 0;
      this.mobileInput.sprint = false;
      this.mobileInput.jumpQueued = false;
    }
  }

  requestPointerLock() {
    if (!this.mobileMode) {
      this.controls.lock();
    }
  }

  setFeetPosition(position) {
    this.rig.position.copy(position);
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
      ? this.renderer.xr.getSession?.()?.mode ?? null
      : null;
    const isArPresenting = sessionMode === XR_SESSION_MODE_AR;
    const isVrPresenting = sessionMode === XR_SESSION_MODE_VR;

    this._readXrMoveAxes(sessionMode);

    if (!this.renderer.xr.isPresenting) {
      this.camera.position.x = 0;
      this.camera.position.z = 0;
      this.camera.position.y = this.settings.height;
      this.wasArPresenting = false;
      this.wasVrPresenting = false;
      this.xrPhysicalOffsetInitialized = false;
      this.xrPhysicalOffsetBaseline.set(0, 0, 0);
    } else {
      if (isArPresenting && !this.wasArPresenting) {
        this._calibrateArHeightFromCurrentPose();
      } else if (isVrPresenting && !this.wasVrPresenting) {
        this._calibrateVrHeightFromCurrentPose();
      }

      this._applyXrPhysicalOffset(sessionMode);
    }

    this.wasArPresenting = isArPresenting;
    this.wasVrPresenting = isVrPresenting;

    if (isArPresenting) {
      this.velocity.set(0, 0, 0);
      this.input.jumpQueued = false;
      this.mobileInput.jumpQueued = false;
      this.xrInput.x = 0;
      this.xrInput.z = 0;
      return;
    }

    if (this.mobileMode && !this.renderer.xr.isPresenting) {
      this._applyMobileLook(deltaSeconds);
    }

    const moveInput = this._collectMoveInput();
    const speed = this._isSprinting() ? this.settings.sprintSpeed : this.settings.moveSpeed;

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

    const mobileJumpQueued = !this.renderer.xr.isPresenting && this.mobileInput.jumpQueued;
    if ((this.input.jumpQueued || mobileJumpQueued) && this.isGrounded) {
      this.velocity.y = this.settings.jumpStrength;
      this.isGrounded = false;
    }
    this.input.jumpQueued = false;
    this.mobileInput.jumpQueued = false;

    this.velocity.y -= this.settings.gravity * deltaSeconds;

    this.rig.position.addScaledVector(this.velocity, deltaSeconds);

    const collisionResult = collisionSystem.resolveCapsule({
      feetPosition: this.rig.position,
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

  _calibrateArHeightFromCurrentPose() {
    const currentHeadHeight = Number.isFinite(this.camera.position.y)
      ? this.camera.position.y
      : 0;
    const correction = this.settings.height - currentHeadHeight;

    if (Math.abs(correction) < 1e-4) {
      return;
    }

    this.rig.position.y += correction;
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

  _applyMobileLook(deltaSeconds) {
    const lookX = this.mobileInput.look.x;
    const lookY = this.mobileInput.look.y;
    if (Math.abs(lookX) < 0.001 && Math.abs(lookY) < 0.001) {
      return;
    }

    const sensitivity = 2.0;
    this.camera.rotation.y -= lookX * sensitivity * deltaSeconds;
    this.camera.rotation.x = clamp(
      this.camera.rotation.x - lookY * sensitivity * deltaSeconds,
      -Math.PI * 0.495,
      Math.PI * 0.495,
    );
  }

  _applyXrPhysicalOffset(sessionMode = null) {
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

    const isArPresenting = sessionMode === XR_SESSION_MODE_AR;
    if (isArPresenting) {
      const deadzoneSq = AR_PHYSICAL_MOVE_DEADZONE_METERS * AR_PHYSICAL_MOVE_DEADZONE_METERS;
      if (XR_LOCAL_OFFSET.lengthSq() < deadzoneSq) {
        this.xrPhysicalOffsetBaseline.set(currentX, 0, currentZ);
        this.camera.position.x = 0;
        this.camera.position.z = 0;
        return;
      }
    }

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

  _isSprinting() {
    if (this.renderer.xr.isPresenting) {
      return this.input.sprint;
    }

    return this.input.sprint || this.mobileInput.sprint;
  }
}
