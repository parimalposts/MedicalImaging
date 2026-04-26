"use client";
/**
 * Three.js 3D mesh viewer via @react-three/fiber.
 * Supports GLB, STL, OBJ from backend download URL.
 * Must be imported with dynamic({ ssr: false }).
 */
import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats, Environment } from "@react-three/drei";
import * as THREE from "three";

function MeshObject({ url, format, wireframe }: { url: string; format: string; wireframe: boolean }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [gltfScene, setGltfScene] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (format === "glb") {
          const { loadGLB } = await import("@/lib/three-loaders");
          const gltf = await loadGLB(url);
          if (!cancelled) setGltfScene(gltf.scene);
        } else if (format === "stl") {
          const { loadSTL } = await import("@/lib/three-loaders");
          const geo = await loadSTL(url);
          if (!cancelled) setGeometry(geo);
        } else if (format === "obj") {
          const { loadOBJ } = await import("@/lib/three-loaders");
          const obj = await loadOBJ(url);
          const geo = (obj.children[0] as THREE.Mesh)?.geometry;
          if (!cancelled && geo) setGeometry(geo);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [url, format]);

  if (error) return null;

  const mat = (
    <meshStandardMaterial
      color="#4a90d9"
      wireframe={wireframe}
      side={THREE.DoubleSide}
    />
  );

  if (gltfScene) {
    gltfScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: "#4a90d9",
          wireframe,
          side: THREE.DoubleSide,
        });
      }
    });
    return <primitive object={gltfScene} />;
  }

  if (geometry) {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    return <mesh geometry={geometry}>{mat}</mesh>;
  }

  return null;
}

interface Props {
  downloadUrl: string;
  format: string;
}

export function MeshViewer({ downloadUrl, format }: Props) {
  const [wireframe, setWireframe] = useState(false);

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-950" style={{ height: 500 }}>
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <button
          onClick={() => setWireframe((v) => !v)}
          className="text-xs px-2 py-1 rounded bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-600"
        >
          {wireframe ? "Solid" : "Wireframe"}
        </button>
      </div>
      <Canvas camera={{ position: [0, 0, 150], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[100, 100, 100]} intensity={1} />
        <directionalLight position={[-100, -50, -100]} intensity={0.3} />
        <Suspense fallback={null}>
          <MeshObject url={downloadUrl} format={format} wireframe={wireframe} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enablePan enableZoom enableRotate />
        <Stats />
      </Canvas>
    </div>
  );
}
