import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { SHELF } from "./constants";

useTexture.preload("/textures/wood.jpg");
useTexture.preload("/textures/floor.jpg");
useTexture.preload("/textures/plaster.jpg");
useTexture.preload("/textures/leather.jpg");
useTexture.preload("/textures/window.jpg");

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useAlbedo(url: string, repeatX = 1, repeatY = 1) {
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 480;
    const pos = new Float32Array(n * 3);
    const rng = mulberry32(7);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * 7;
      pos[i * 3 + 1] = rng() * 4.2;
      pos[i * 3 + 2] = (rng() - 0.5) * 12;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const attr = ref.current?.geometry.getAttribute("position");
    if (!attr) return;
    for (let i = 0; i < attr.count; i++) {
      let y = attr.getY(i) + dt * 0.028;
      if (y > 4.3) y = 0.05;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geom} frustumCulled={false}>
      <pointsMaterial
        size={0.014}
        color="#ead7b4"
        transparent
        opacity={0.2}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function GodRay() {
  return (
    <mesh position={[2.55, 2.4, 0.6]} rotation={[0, 0, -0.45]} frustumCulled={false}>
      <planeGeometry args={[1.6, 4.4]} />
      <meshBasicMaterial
        color="#ffd7a0"
        transparent
        opacity={0.045}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Chandelier() {
  return (
    <group position={[0, 4.05, 0.4]}>
      <mesh>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
        <meshStandardMaterial color="#3a2a14" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.018, 8, 24]} />
        <meshStandardMaterial color="#c4a35a" metalness={0.7} roughness={0.3} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * 0.38;
        const z = Math.sin(a) * 0.38;
        return (
          <group key={i} position={[x, -0.52, z]}>
            <mesh>
              <cylinderGeometry args={[0.025, 0.03, 0.08, 8]} />
              <meshStandardMaterial color="#e8d5b0" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.07, 0]}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshStandardMaterial
                color="#ffe7b0"
                emissive="#ffcc77"
                emissiveIntensity={2.4}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
      <pointLight color="#ffcc88" intensity={0.45} distance={7} decay={2} />
    </group>
  );
}

function CaseFrame({
  wood,
  width,
  height,
  depth,
  position,
  rotationY = 0,
}: {
  wood: THREE.Texture;
  width: number;
  height: number;
  depth: number;
  position: [number, number, number];
  rotationY?: number;
}) {
  const thick = 0.06;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[width + thick * 2, height, thick]} />
        <meshStandardMaterial map={wood} roughness={0.62} metalness={0.04} />
      </mesh>
      <mesh position={[0, height + 0.08, 0.04]}>
        <boxGeometry args={[width + 0.22, 0.12, depth + 0.1]} />
        <meshStandardMaterial map={wood} roughness={0.62} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.08, 0.02]}>
        <boxGeometry args={[width + 0.18, 0.16, depth + 0.06]} />
        <meshStandardMaterial map={wood} roughness={0.62} metalness={0.04} />
      </mesh>
      {[-width / 2, width / 2].map((x) => (
        <mesh key={x} position={[x, height / 2, depth / 2 - thick / 2]}>
          <boxGeometry args={[thick, height, depth]} />
          <meshStandardMaterial map={wood} roughness={0.62} metalness={0.04} />
        </mesh>
      ))}
    </group>
  );
}

function ShelfBoards({
  wood,
  origin,
  rotationY,
  width,
  rows,
  rowH,
  depth,
  y0,
}: {
  wood: THREE.Texture;
  origin: [number, number, number];
  rotationY: number;
  width: number;
  rows: number;
  rowH: number;
  depth: number;
  y0: number;
}) {
  return (
    <group position={origin} rotation={[0, rotationY, 0]}>
      {Array.from({ length: rows }, (_, i) => (
        <mesh key={i} position={[0, y0 + i * rowH, depth / 2]} receiveShadow>
          <boxGeometry args={[width - 0.08, 0.03, depth]} />
          <meshStandardMaterial map={wood} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

const PALETTE = [
  "#4a1518",
  "#1e2a1a",
  "#1a1e32",
  "#3a2412",
  "#2b120c",
  "#2d2416",
  "#3e1020",
  "#172018",
  "#4a2e12",
  "#241016",
];

const BOOK_COUNT = 980;

function Books({ leather }: { leather: THREE.Texture }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const rng = mulberry32(0xa11ce);
    let i = 0;

    const addBook = (
      x: number,
      y: number,
      z: number,
      rotY: number,
      spine: number,
      h: number,
      d: number,
    ) => {
      if (i >= BOOK_COUNT) return;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rotY, (Math.random() - 0.5) * 0.008);
      dummy.scale.set(spine, h, d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(PALETTE[(rng() * PALETTE.length) | 0]!);
      color.multiplyScalar(0.68 + rng() * 0.34);
      mesh.setColorAt(i, color);
      i += 1;
    };

    const fillEndRow = (y: number) => {
      const bays = [-2.0, -1.0, 0.0, 1.0, 2.0];
      for (const bx of bays) {
        let x = bx - 0.45;
        const xEnd = bx + 0.45;
        while (x < xEnd && i < BOOK_COUNT) {
          const spine = 0.03 + rng() * 0.04;
          const h = 0.255 + rng() * 0.1;
          const d = 0.145 + rng() * 0.065;
          const cx = x + spine / 2;
          const cy = y + h / 2;
          if (Math.abs(cx - SHELF.x) < 0.05 && Math.abs(cy - SHELF.y) < 0.1) {
            x += spine + 0.005;
            continue;
          }
          addBook(cx, cy, -3.86, 0, spine, h, d);
          x += spine + 0.003 + rng() * 0.005;
        }
      }
    };

    for (const y of [0.32, 0.78, 1.24, 1.7, 2.16, 2.62, 3.08]) fillEndRow(y);

    const fillSide = (wallX: number, rotY: number, inset: number) => {
      const zBays = [-2.4, -1.2, 0.0, 1.2, 2.4];
      for (const y of [0.32, 0.78, 1.24, 1.7, 2.16, 2.62]) {
        for (const zb of zBays) {
          let z = zb - 0.5;
          const zEnd = zb + 0.5;
          while (z < zEnd && i < BOOK_COUNT) {
            const spine = 0.03 + rng() * 0.038;
            const h = 0.25 + rng() * 0.1;
            const d = 0.14 + rng() * 0.06;
            addBook(wallX + inset, y + h / 2, z + spine / 2, rotY, spine, h, d);
            z += spine + 0.004;
          }
        }
      }
    };

    fillSide(-3.72, Math.PI / 2, 0);
    fillSide(3.72, -Math.PI / 2, 0);

    dummy.scale.set(0, 0, 0);
    dummy.position.set(0, -20, 0);
    dummy.updateMatrix();
    while (i < BOOK_COUNT) {
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set("#000000"));
      i += 1;
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BOOK_COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={leather} roughness={0.68} metalness={0.06} />
    </instancedMesh>
  );
}

export function LibraryRoom() {
  const wood = useAlbedo("/textures/wood.jpg", 2.2, 2.2);
  const floor = useAlbedo("/textures/floor.jpg", 7, 10);
  const plaster = useAlbedo("/textures/plaster.jpg", 3, 2);
  const leather = useAlbedo("/textures/leather.jpg", 1, 1);
  const windowMap = useAlbedo("/textures/window.jpg", 1, 1);
  windowMap.wrapS = windowMap.wrapT = THREE.ClampToEdgeWrapping;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
        <planeGeometry args={[9, 16]} />
        <meshStandardMaterial map={floor} roughness={0.55} metalness={0.04} />
      </mesh>

      <mesh position={[0, 4.45, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 16]} />
        <meshStandardMaterial map={plaster} color="#7a6248" roughness={0.95} />
      </mesh>
      {[-2.4, -0.8, 0.8, 2.4].map((z) => (
        <mesh key={z} position={[0, 4.32, z]}>
          <boxGeometry args={[8.6, 0.14, 0.18]} />
          <meshStandardMaterial map={wood} roughness={0.55} />
        </mesh>
      ))}

      <mesh position={[0, 2.2, -4.18]}>
        <boxGeometry args={[8.8, 4.5, 0.12]} />
        <meshStandardMaterial map={plaster} color="#6e5840" roughness={0.92} />
      </mesh>
      <mesh position={[-4.25, 2.2, 1]}>
        <boxGeometry args={[0.12, 4.5, 16]} />
        <meshStandardMaterial map={plaster} color="#6e5840" roughness={0.92} />
      </mesh>
      <mesh position={[4.25, 2.2, 1]}>
        <boxGeometry args={[0.12, 4.5, 16]} />
        <meshStandardMaterial map={plaster} color="#6e5840" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.2, 8.6]}>
        <boxGeometry args={[8.8, 4.5, 0.12]} />
        <meshStandardMaterial map={plaster} color="#4a3424" roughness={0.9} />
      </mesh>

      <mesh position={[4.12, 2.15, 0.7]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.35, 2.5]} />
        <meshStandardMaterial
          map={windowMap}
          emissive="#ffb070"
          emissiveIntensity={0.45}
          roughness={1}
          metalness={0}
        />
      </mesh>
      <mesh position={[4.19, 2.15, 0.7]}>
        <boxGeometry args={[0.08, 2.62, 1.48]} />
        <meshStandardMaterial map={wood} color="#4a321c" roughness={0.62} />
      </mesh>
      <pointLight position={[3.5, 2.3, 0.7]} color="#ffb978" intensity={1.1} distance={6} />

      <CaseFrame wood={wood} width={5.15} height={3.55} depth={0.4} position={[0, 0, -4.0]} />
      <ShelfBoards
        wood={wood}
        origin={[0, 0, -4.0]}
        rotationY={0}
        width={5.05}
        rows={7}
        rowH={0.46}
        depth={0.38}
        y0={0.32}
      />

      <CaseFrame
        wood={wood}
        width={7.2}
        height={3.2}
        depth={0.36}
        position={[-4.05, 0, 0.2]}
        rotationY={Math.PI / 2}
      />
      <ShelfBoards
        wood={wood}
        origin={[-4.05, 0, 0.2]}
        rotationY={Math.PI / 2}
        width={7.1}
        rows={6}
        rowH={0.46}
        depth={0.34}
        y0={0.32}
      />
      <CaseFrame
        wood={wood}
        width={7.2}
        height={3.2}
        depth={0.36}
        position={[4.05, 0, 0.2]}
        rotationY={-Math.PI / 2}
      />
      <ShelfBoards
        wood={wood}
        origin={[4.05, 0, 0.2]}
        rotationY={-Math.PI / 2}
        width={7.1}
        rows={6}
        rowH={0.46}
        depth={0.34}
        y0={0.32}
      />

      <mesh position={[-2.55, 1.85, -3.95]}>
        <cylinderGeometry args={[0.13, 0.16, 3.6, 16]} />
        <meshStandardMaterial map={wood} color="#4a321c" roughness={0.62} />
      </mesh>
      <mesh position={[2.55, 1.85, -3.95]}>
        <cylinderGeometry args={[0.13, 0.16, 3.6, 16]} />
        <meshStandardMaterial map={wood} color="#4a321c" roughness={0.62} />
      </mesh>
      <mesh position={[0, 3.72, -3.78]}>
        <boxGeometry args={[5.6, 0.16, 0.36]} />
        <meshStandardMaterial color="#c4a35a" metalness={0.45} roughness={0.4} />
      </mesh>

      <mesh position={[0, 0.015, 1.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.35, 7.2]} />
        <meshStandardMaterial color="#4a1518" roughness={0.7} map={leather} />
      </mesh>

      <Books leather={leather} />
      <Chandelier />
      <GodRay />
      <Dust />
    </group>
  );
}

