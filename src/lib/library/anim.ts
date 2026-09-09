import * as THREE from "three";
import { SHELF } from "./constants";

export const anim = {
  approachT: 0,
  extractT: 0,
  openT: 0,
  flipT: 0,
  flipDir: 1 as 1 | -1,
  flipping: false,
  flipLeaf: 0,
  snapTo: null as number | null,
  dragging: false,
  skipApproach: false,
  bookPos: new THREE.Vector3(SHELF.x, SHELF.y, SHELF.z),
  bookQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, SHELF.rotY, 0)),
  bookScale: SHELF.scale,
  camPos: new THREE.Vector3(0, 1.62, 5.8),
  camLook: new THREE.Vector3(0.08, 1.42, -3.55),
  mouse: { x: 0, y: 0 },
};

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

export function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

export function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

export function smoothstep(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
