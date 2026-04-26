"use client";
/**
 * Three.js mesh loader helpers.
 * Returns a THREE.BufferGeometry from a remote URL.
 */

export async function loadGLB(url: string) {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  return new Promise<any>((resolve, reject) => {
    new GLTFLoader().load(url, resolve, undefined, reject);
  });
}

export async function loadSTL(url: string) {
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
  return new Promise<any>((resolve, reject) => {
    new STLLoader().load(url, resolve, undefined, reject);
  });
}

export async function loadOBJ(url: string) {
  const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
  return new Promise<any>((resolve, reject) => {
    new OBJLoader().load(url, resolve, undefined, reject);
  });
}
