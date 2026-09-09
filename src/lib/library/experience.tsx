import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LibraryRoom } from "./room";
import { HeroBook } from "./hero-book";
import { anim, easeInOutCubic, easeInOutSine, lerp } from "./anim";
import {
  APPROACH_SEC,
  CAM,
  EXTRACT_SEC,
  FLIP_SEC,
  OPEN_SEC,
  PRESENT,
  READING,
  SHELF,
} from "./constants";
import { bookTex, setBookTex } from "./assets";
import { useLibrary } from "./state";
import { makeBookTextures } from "@/lib/book/page-textures";
import { PAGE_STAMP } from "@/lib/book/content";
import { playPageTurn, playPull, unlockAudio } from "./audio";

const _v = new THREE.Vector3();
const _look = new THREE.Vector3();

function vec3(a: readonly number[], out: THREE.Vector3) {
  return out.set(a[0]!, a[1]!, a[2]!);
}

function Director() {
  const { camera, size } = useThree();
  const setPhase = useLibrary((s) => s.setPhase);
  const drag = useRef({ startX: 0, startT: 0, moved: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      anim.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      anim.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (anim.dragging && anim.flipping) {
        const pull = (drag.current.startX - e.clientX) / Math.max(160, window.innerWidth * 0.3);
        anim.flipT = Math.min(1, Math.max(0, drag.current.startT + pull));
        drag.current.moved = Math.max(drag.current.moved, Math.abs(e.clientX - drag.current.startX));
      }
    };
    const onUp = () => {
      if (!anim.dragging) return;
      anim.dragging = false;
      const click = drag.current.moved < 8;
      if (click) {
        anim.snapTo = anim.flipDir === 1 ? 1 : 0;
      } else {
        anim.snapTo = anim.flipT > 0.32 ? 1 : 0;
      }
      playPageTurn();
    };
    const onDown = (e: PointerEvent) => {
      unlockAudio();
      drag.current.startX = e.clientX;
      drag.current.startT = anim.flipT;
      drag.current.moved = 0;
      const st = useLibrary.getState();
      if (st.phase === "approach") {
        if (anim.skipApproach) {
          anim.approachT = 1;
          st.setHover("none");
          if (st.bookReady) {
            playPull();
            st.setPhase("extract");
          } else {
            st.setPhase("shelf");
          }
        } else {
          anim.skipApproach = true;
        }
      } else if (st.phase === "shelf") {
        if (!st.bookReady) return;
        st.setHover("none");
        playPull();
        st.setPhase("extract");
      } else if (st.phase === "cover" && anim.openT < 0.05) {
        st.setHover("none");
        st.setPhase("opening");
      } else if (st.phase === "reading" && !anim.flipping) {
        const dir: 1 | -1 = e.clientX >= window.innerWidth / 2 ? 1 : -1;
        if (dir === 1 && st.spread >= (bookTex?.leafCount ?? 0)) return;
        if (dir === -1 && st.spread <= 0) {
          st.setPhase("cover");
          return;
        }
        anim.flipping = true;
        anim.dragging = true;
        anim.flipDir = dir;
        anim.flipLeaf = dir === 1 ? st.spread : st.spread - 1;
        anim.flipT = dir === 1 ? 0 : 1;
        anim.snapTo = null;
        drag.current.startT = anim.flipT;
        st.bumpFlip();
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const phaseDt = Math.min(delta, 0.4);
    const st = useLibrary.getState();
    if (st.phase === "shelf" || st.phase === "extract" || st.phase === "cover" || st.phase === "opening" || st.phase === "reading") {
      anim.approachT = Math.max(anim.approachT, st.phase === "shelf" ? 1 : anim.approachT);
    }
    if (st.phase === "cover" || st.phase === "opening" || st.phase === "reading") {
      anim.approachT = 1;
      anim.extractT = 1;
    }
    if (st.phase === "reading") {
      anim.openT = 1;
    }
    (window as unknown as { __phase: string }).__phase = `${st.phase} a=${anim.approachT.toFixed(2)} e=${anim.extractT.toFixed(2)} o=${anim.openT.toFixed(2)} s=${st.spread}`;

    if (st.phase === "approach") {
      const speed = anim.skipApproach ? 3.4 : 1;
      anim.approachT = Math.min(1, anim.approachT + (phaseDt / APPROACH_SEC) * speed);
      if (anim.approachT >= 1) setPhase("shelf");
    }

    if (st.phase === "extract") {
      anim.extractT = Math.min(1, anim.extractT + phaseDt / EXTRACT_SEC);
      if (anim.extractT >= 1) setPhase("cover");
    }

    if (st.phase === "opening") {
      anim.openT = Math.min(1, anim.openT + phaseDt / OPEN_SEC);
      if (anim.openT >= 1) setPhase("reading");
    }

    if (st.phase === "cover" && anim.openT > 0) {
      anim.openT = Math.max(0, anim.openT - phaseDt / 1.15);
    }

    if (st.phase === "reading" && anim.flipping && !anim.dragging && anim.snapTo !== null) {
      const dir = anim.snapTo > anim.flipT ? 1 : -1;
      const mid = Math.sin(anim.flipT * Math.PI);
      const speed = 0.42 + mid * 1.15;
      anim.flipT = Math.min(1, Math.max(0, anim.flipT + dir * (phaseDt / FLIP_SEC) * speed));
      if (Math.abs(anim.flipT - anim.snapTo) < 0.012) {
        anim.flipT = anim.snapTo;
        const next = anim.flipLeaf + (anim.snapTo >= 1 ? 1 : 0);
        anim.flipping = false;
        anim.snapTo = null;
        st.setSpread(next);
        st.bumpFlip();
      }
    }

    const eA = easeInOutSine(anim.approachT);
    const eE = easeInOutCubic(anim.extractT);
    const eO = easeInOutCubic(anim.openT);
    const rotY = lerp(SHELF.rotY, 0, eE);

    if (st.phase === "approach" || st.phase === "shelf" || st.phase === "boot") {
      vec3(CAM.approachFrom.pos, anim.camPos);
      anim.camPos.lerp(vec3(CAM.shelf.pos, _v), eA);
      vec3(CAM.approachFrom.look, anim.camLook);
      anim.camLook.lerp(vec3(CAM.shelf.look, _look), eA);
      const bob = Math.sin(anim.approachT * Math.PI * 7) * 0.018 * (1 - eA) * (anim.skipApproach ? 0.2 : 1);
      anim.camPos.y += bob;
    } else if (st.phase === "extract") {
      vec3(CAM.shelf.pos, anim.camPos);
      anim.camPos.lerp(vec3(CAM.cover.pos, _v), eE);
      vec3(CAM.shelf.look, anim.camLook);
      anim.camLook.lerp(vec3(CAM.cover.look, _look), eE);
    } else {
      vec3(CAM.cover.pos, anim.camPos);
      anim.camPos.lerp(vec3(CAM.read.pos, _v), eO);
      vec3(CAM.cover.look, anim.camLook);
      anim.camLook.lerp(vec3(CAM.read.look, _look), eO);
      const aspect = size.width / Math.max(1, size.height);
      if (aspect < 0.85) {
        anim.camPos.z += 0.28;
      } else if (aspect < 1.15) {
        anim.camPos.z += 0.12;
      }
    }

    const par = st.phase === "reading" ? 0.012 : st.phase === "cover" ? 0.028 : 0.045;
    anim.camPos.x += anim.mouse.x * par;
    anim.camPos.y += -anim.mouse.y * par * 0.6;

    camera.position.copy(anim.camPos);
    camera.lookAt(anim.camLook);
    const fovTarget = st.phase === "reading" || st.phase === "opening" ? 38 : 44;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov += (fovTarget - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();

    if (st.phase === "extract" || st.phase === "cover" || st.phase === "opening" || st.phase === "reading") {
      anim.bookPos.x = lerp(SHELF.x, lerp(PRESENT.x, READING.x, eO), eE);
      anim.bookPos.y = lerp(SHELF.y, lerp(PRESENT.y, READING.y, eO), eE);
      anim.bookPos.z = lerp(SHELF.z, lerp(PRESENT.z, READING.z, eO), eE);
      anim.bookQuat.setFromEuler(new THREE.Euler(0, rotY, 0));
      anim.bookScale = lerp(SHELF.scale, lerp(PRESENT.scale, READING.scale, eO), eE);
    } else {
      anim.bookPos.set(SHELF.x, SHELF.y, SHELF.z);
      anim.bookQuat.setFromEuler(new THREE.Euler(0, SHELF.rotY, 0));
      anim.bookScale = SHELF.scale;
    }
  });

  return null;
}

function Lights() {
  const target = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(SHELF.x, SHELF.y, SHELF.z);
    return t;
  }, []);

  return (
    <>
      <color attach="background" args={["#100804"]} />
      <fog attach="fog" args={["#160e08", 18, 34]} />
      <hemisphereLight args={["#c4a882", "#1a0e08", 0.28]} />
      <ambientLight intensity={0.14} color="#4a3020" />
      <primitive object={target} />
      <spotLight
        position={[0.15, 3.5, -1.0]}
        intensity={1.7}
        color="#ffd7a0"
        angle={0.42}
        penumbra={0.7}
        distance={12}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        target={target}
      />
      <spotLight
        position={[0, 2.6, -1.6]}
        intensity={1.15}
        color="#ffc888"
        angle={0.5}
        penumbra={0.85}
        distance={8}
        target={target}
      />
      <directionalLight position={[2.2, 3.6, 0.8]} intensity={0.22} color="#ffc58a" />
      <directionalLight position={[-2.4, 2.6, 2.4]} intensity={0.12} color="#8ea4c8" />
      <pointLight position={[SHELF.x, SHELF.y + 0.25, SHELF.z + 0.45]} color="#ffd19a" intensity={0.7} distance={1.8} />
    </>
  );
}

function Boot() {
  const setReady = useLibrary((s) => s.setReady);
  const setPhase = useLibrary((s) => s.setPhase);
  const setSpreadCount = useLibrary((s) => s.setSpreadCount);
  const setBookReady = useLibrary((s) => s.setBookReady);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      anim.approachT = 1;
      setPhase("shelf");
    } else {
      setPhase("approach");
    }
    setReady(true);

    let live = true;
    setBookReady(false);
    void (async () => {
      try {
        const tex = await makeBookTextures();
        if (!live) return;
        setBookTex(tex);
        setSpreadCount(tex.spreadCount);
        setBookReady(true);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      live = false;
    };
  }, [setPhase, setReady, setSpreadCount, setBookReady, PAGE_STAMP]);

  return null;
}

export function Experience() {
  const bookReady = useLibrary((s) => s.bookReady);
  return (
    <>
      <Boot />
      <Lights />
      <LibraryRoom />
      {bookReady && bookTex ? <HeroBook key={PAGE_STAMP} /> : null}
      <Director />
    </>
  );
}
