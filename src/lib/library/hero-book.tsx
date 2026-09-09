import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bookTex } from "./assets";
import { anim, clamp, easeOutBack, lerp, smoothstep } from "./anim";
import {
  COVER_H,
  COVER_THICK,
  COVER_W,
  PAGE_BLOCK,
  PAGE_H,
  PAGE_LIFT,
  PAGE_W,
  SEG_X,
  SEG_Y,
} from "./constants";
import { deformPlane } from "./curl";
import { useLibrary } from "./state";
import { leafRecto, leafVerso, leftOfSpread, rightOfSpread } from "@/lib/book/page-textures";

function reverseWinding(geo: THREE.BufferGeometry) {
  const idx = geo.getIndex();
  if (!idx) return;
  const a = idx.array as Uint16Array | Uint32Array;
  for (let i = 0; i < a.length; i += 3) {
    const tmp = a[i + 1]!;
    a[i + 1] = a[i + 2]!;
    a[i + 2] = tmp;
  }
  idx.needsUpdate = true;
}

function flipUVsX(geo: THREE.BufferGeometry) {
  const uv = geo.getAttribute("uv");
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  uv.needsUpdate = true;
}

function makeSheetGeometry(width: number, height: number) {
  const front = new THREE.PlaneGeometry(width, height, SEG_X, SEG_Y);
  front.translate(width / 2, 0, 0);
  const originals = Float32Array.from(front.attributes.position!.array as Float32Array);
  const back = front.clone();
  reverseWinding(back);
  flipUVsX(back);
  return { front, back, originals };
}

function CurledSheet({
  getT,
  width,
  height,
  frontMap,
  backMap,
  stiffness,
  roughness = 0.72,
  metalness = 0.04,
  visible = true,
  renderOrder = 0,
}: {
  getT: () => number;
  width: number;
  height: number;
  frontMap: THREE.Texture;
  backMap: THREE.Texture;
  stiffness: number;
  roughness?: number;
  metalness?: number;
  visible?: boolean;
  renderOrder?: number;
}) {
  const geos = useMemo(() => makeSheetGeometry(width, height), [width, height]);
  const last = useRef(-1);

  useFrame(() => {
    const t = getT();
    if (Math.abs(t - last.current) < 0.0004) return;
    last.current = t;
    const fPos = geos.front.attributes.position;
    const bPos = geos.back.attributes.position;
    if (!fPos || !bPos) return;
    deformPlane(fPos.array as Float32Array, geos.originals, t, width, height, stiffness);
    deformPlane(bPos.array as Float32Array, geos.originals, t, width, height, stiffness);
    fPos.needsUpdate = true;
    bPos.needsUpdate = true;
    geos.front.computeVertexNormals();
    geos.back.computeVertexNormals();
  });

  useEffect(
    () => () => {
      geos.front.dispose();
      geos.back.dispose();
    },
    [geos],
  );

  return (
    <group visible={visible}>
      <mesh geometry={geos.front} castShadow renderOrder={renderOrder} frustumCulled={false}>
        <meshStandardMaterial
          map={frontMap}
          side={THREE.FrontSide}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>
      <mesh geometry={geos.back} renderOrder={renderOrder} frustumCulled={false}>
        <meshStandardMaterial
          map={backMap}
          side={THREE.FrontSide}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>
    </group>
  );
}

function PageLeaf({
  map,
  side,
  visible,
}: {
  map: THREE.Texture;
  side: "left" | "right";
  visible: boolean;
}) {
  const geo = useMemo(() => new THREE.PlaneGeometry(PAGE_W, PAGE_H), []);
  useEffect(() => () => geo.dispose(), [geo]);

  const x = side === "left" ? -PAGE_W / 2 + 0.003 : PAGE_W / 2 - 0.003;
  const rotY = side === "left" ? 0.004 : -0.004;

  return (
    <mesh
      geometry={geo}
      position={[x, 0, 0.004]}
      rotation={[0, rotY, 0]}
      visible={visible}
      castShadow
      receiveShadow={false}
      renderOrder={3}
      frustumCulled={false}
    >
      <meshStandardMaterial
        map={map}
        roughness={0.88}
        metalness={0}
        side={THREE.FrontSide}
        polygonOffset
        polygonOffsetFactor={-3}
        polygonOffsetUnits={-3}
      />
    </mesh>
  );
}

function PageStack({
  side,
  thick,
  visible,
}: {
  side: "left" | "right";
  thick: number;
  visible: boolean;
}) {
  const x = side === "left" ? -PAGE_W * 0.5 : PAGE_W * 0.5;
  const z = -thick * 0.5 - 0.008;
  return (
    <mesh
      position={[x, 0, z]}
      scale={[0.96, 0.97, 1]}
      visible={visible}
      renderOrder={1}
      frustumCulled={false}
    >
      <boxGeometry args={[PAGE_W, PAGE_H, Math.max(0.004, thick)]} />
      <meshStandardMaterial color="#e4d0a4" roughness={0.94} metalness={0} />
    </mesh>
  );
}

function FrontCover({
  frontMap,
  insideMap,
}: {
  frontMap: THREE.Texture;
  insideMap: THREE.Texture;
}) {
  return (
    <CurledSheet
      getT={() => anim.openT}
      width={COVER_W}
      height={COVER_H}
      frontMap={frontMap}
      backMap={insideMap}
      stiffness={2.85}
      roughness={0.46}
      metalness={0.14}
      visible
      renderOrder={2}
    />
  );
}

export function HeroBook() {
  const group = useRef<THREE.Group>(null);
  const backRef = useRef<THREE.Group>(null);
  const pagesRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Mesh>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const phase = useLibrary((s) => s.phase);
  const spread = useLibrary((s) => s.spread);
  const flipEpoch = useLibrary((s) => s.flipEpoch);
  const tex = bookTex;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(anim.bookPos);
    g.quaternion.copy(anim.bookQuat);
    g.scale.setScalar(anim.bookScale);
    if ((phase === "cover" || phase === "reading") && !anim.flipping) {
      g.position.y += Math.sin(performance.now() / 1400) * 0.008;
    }
    if (backRef.current) {
      backRef.current.rotation.y = -0.06 * anim.openT;
    }
    if (spineRef.current) {
      const closedZ = PAGE_BLOCK + COVER_THICK * 2.4;
      const openZ = COVER_THICK * 1.1;
      const z = lerp(closedZ, openZ, anim.openT);
      spineRef.current.scale.z = z / closedZ;
      spineRef.current.position.z = lerp(0, -0.004, anim.openT);
    }

    const o = anim.openT;
    const reveal = easeOutBack(smoothstep(0.18, 0.78, o));
    if (pagesRef.current) {
      pagesRef.current.visible = o > 0.12;
      const buried = -COVER_THICK - 0.006;
      pagesRef.current.position.z = lerp(buried, PAGE_LIFT, reveal);
      const s = lerp(0.92, 1, clamp(reveal, 0, 1));
      pagesRef.current.scale.set(s, s, 1);
    }
    if (lamp.current) {
      lamp.current.intensity = 0.22 + 0.7 * o;
    }
  });

  if (!tex) return null;

  const leafCount = tex.leafCount;
  const flipping = anim.flipping;
  const underLeft = flipping && anim.flipDir === -1 ? Math.max(0, spread - 1) : spread;
  const underRight = flipping && anim.flipDir === 1 ? Math.min(leafCount, spread + 1) : spread;
  const leftMap = leftOfSpread(tex.pages, tex.coverInside, underLeft);
  const rightMap = rightOfSpread(tex.pages, tex.coverInside, underRight, leafCount);
  const flipFront = leafRecto(tex.pages, tex.coverInside, anim.flipLeaf);
  const flipBack = leafVerso(tex.pages, tex.coverInside, anim.flipLeaf);

  const showLeft = underLeft > 0;
  const showRight = underRight < leafCount;
  const showFlip = flipping;

  const leftThick = 0.002 + PAGE_BLOCK * (spread / Math.max(1, leafCount));
  const rightThick = 0.002 + PAGE_BLOCK * (1 - spread / Math.max(1, leafCount));

  return (
    <group ref={group}>
      <mesh ref={spineRef} position={[-COVER_THICK * 0.55, 0, 0]} castShadow>
        <boxGeometry args={[COVER_THICK * 1.15, COVER_H, PAGE_BLOCK + COVER_THICK * 2.4]} />
        <meshStandardMaterial map={tex.spine} roughness={0.5} metalness={0.18} />
      </mesh>

      <group ref={backRef}>
        <mesh position={[COVER_W / 2, 0, -COVER_THICK - rightThick - 0.002]} castShadow>
          <boxGeometry args={[COVER_W, COVER_H, COVER_THICK]} />
          <meshStandardMaterial color="#3d1410" roughness={0.5} metalness={0.12} />
        </mesh>
        <mesh position={[COVER_W / 2, 0, -COVER_THICK - rightThick - 0.002 - COVER_THICK * 0.52]}>
          <planeGeometry args={[COVER_W, COVER_H]} />
          <meshStandardMaterial map={tex.coverBack} roughness={0.48} metalness={0.12} />
        </mesh>
        <mesh position={[COVER_W / 2, 0, -rightThick - COVER_THICK * 0.45]} renderOrder={0}>
          <planeGeometry args={[COVER_W - 0.004, COVER_H - 0.004]} />
          <meshStandardMaterial map={tex.coverInside} roughness={0.82} />
        </mesh>
      </group>

      <group ref={pagesRef} visible={false}>
        <mesh position={[0, 0, 0.0]} renderOrder={2} frustumCulled={false}>
          <boxGeometry args={[0.03, PAGE_H * 0.992, 0.014]} />
          <meshStandardMaterial color="#f0e2c0" roughness={0.9} metalness={0} />
        </mesh>
        <PageStack side="right" thick={rightThick} visible={showRight || spread === 0} />
        <PageStack side="left" thick={leftThick} visible={spread > 0} />
        <PageLeaf map={leftMap} side="left" visible={showLeft} />
        <PageLeaf map={rightMap} side="right" visible={showRight} />
        <group position={[0, 0, 0.007]}>
          <CurledSheet
            key={`flip-${flipEpoch}`}
            getT={() => anim.flipT}
            width={PAGE_W}
            height={PAGE_H}
            frontMap={flipFront}
            backMap={flipBack}
            stiffness={0.78}
            roughness={0.86}
            visible={showFlip}
            renderOrder={4}
          />
        </group>
        <PageHits />
      </group>

      <FrontCover frontMap={tex.coverFront} insideMap={tex.coverInside} />

      <pointLight
        ref={lamp}
        position={[0, 0.18, 0.42]}
        color="#ffe6c2"
        intensity={0.45}
        distance={1.8}
      />

      <CoverHit />
    </group>
  );
}

function CoverHit() {
  const phase = useLibrary((s) => s.phase);
  const setHover = useLibrary((s) => s.setHover);
  const setPhase = useLibrary((s) => s.setPhase);
  if (phase !== "cover") return null;
  return (
    <mesh
      position={[COVER_W / 2, 0, 0.012]}
      onPointerOver={() => setHover("cover")}
      onPointerOut={() => setHover("none")}
      onClick={(e) => {
        e.stopPropagation();
        if (useLibrary.getState().phase !== "cover") return;
        setHover("none");
        setPhase("opening");
      }}
    >
      <planeGeometry args={[COVER_W, COVER_H]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function PageHits() {
  const phase = useLibrary((s) => s.phase);
  const setHover = useLibrary((s) => s.setHover);
  if (phase !== "reading") return null;
  return (
    <group>
      <mesh
        position={[-PAGE_W / 2, 0, 0.02]}
        onPointerOver={() => setHover("pageL")}
        onPointerOut={() => setHover("none")}
      >
        <planeGeometry args={[PAGE_W, PAGE_H]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh
        position={[PAGE_W / 2, 0, 0.02]}
        onPointerOver={() => setHover("pageR")}
        onPointerOut={() => setHover("none")}
      >
        <planeGeometry args={[PAGE_W, PAGE_H]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
