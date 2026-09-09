import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { Experience } from "@/lib/library/experience";
import { useLibrary } from "@/lib/library/state";
import { playCoverOpen } from "@/lib/library/audio";
import { useEffect, useRef } from "react";

export default function LibraryApp() {
  const ready = useLibrary((s) => s.ready);
  const hover = useLibrary((s) => s.hover);
  const phase = useLibrary((s) => s.phase);
  const prev = useRef(phase);

  useEffect(() => {
    if (prev.current !== "opening" && phase === "opening") playCoverOpen();
    prev.current = phase;
  }, [phase]);

  const cursor =
    phase === "shelf" || phase === "cover" || phase === "approach"
      ? "pointer"
      : hover === "pageL"
        ? "w-resize"
        : hover === "pageR"
          ? "e-resize"
          : phase === "reading"
            ? "pointer"
            : "default";

  return (
    <div
      className="fixed inset-0"
      style={{
        cursor,
        touchAction: "none",
        backgroundColor: "#0c0704",
        backgroundImage: "url(/textures/preload.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Canvas
        shadows
        dpr={[1, 1.6]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
        }}
        camera={{ fov: 44, near: 0.05, far: 40, position: [0, 1.62, 5.8] }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.enabled = true;
        }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
      <div className="grain pointer-events-none absolute inset-0" />
      <div
        className="fade-veil pointer-events-none absolute inset-0"
        style={{
          opacity: ready ? 0 : 0.35,
          background: "linear-gradient(to bottom, rgb(12 7 4 / 0.4), rgb(12 7 4 / 0.15))",
        }}
      />
    </div>
  );
}
