import * as THREE from 'three';

export function applyAssetTransform(target, transform = {}) {
  const position = transform.position ?? [0, 0, 0];
  const scale = transform.scale ?? [1, 1, 1];

  target.position.set(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0);
  target.scale.set(scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1);

  if (transform.hasQuaternion && Array.isArray(transform.quaternion)) {
    target.quaternion.set(
      transform.quaternion[0] ?? 0,
      transform.quaternion[1] ?? 0,
      transform.quaternion[2] ?? 0,
      transform.quaternion[3] ?? 1,
    );
    return;
  }

  const rotationDeg = transform.rotationEulerDeg ?? [0, 0, 0];
  target.rotation.set(
    THREE.MathUtils.degToRad(rotationDeg[0] ?? 0),
    THREE.MathUtils.degToRad(rotationDeg[1] ?? 0),
    THREE.MathUtils.degToRad(rotationDeg[2] ?? 0),
  );
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function isMobileLikeDevice() {
  return window.matchMedia('(pointer: coarse)').matches || /android|iphone|ipad|mobile/i.test(navigator.userAgent);
}

export function normalize2D(x, y) {
  const len = Math.hypot(x, y);
  if (len <= 1e-6) {
    return { x: 0, y: 0 };
  }
  if (len <= 1) {
    return { x, y };
  }
  return { x: x / len, y: y / len };
}
