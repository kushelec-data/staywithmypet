"use client";

import {
  DOG_MODEL_PATH,
  type DogIntroPhase,
  phaseDurationMs,
  resolveDogClipMap,
} from "@/lib/membership-dog-animation";
import { ContactShadows, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import * as THREE from "three";

useGLTF.preload(DOG_MODEL_PATH);

type DogActorProps = {
  introComplete: boolean;
  onIntroComplete: () => void;
  hovered: boolean;
  clickedNonce: number;
  lookAtX: number;
  paused: boolean;
};

function DogActor({
  introComplete,
  onIntroComplete,
  hovered,
  clickedNonce,
  lookAtX,
  paused,
}: DogActorProps) {
  const rootRef = useRef<Group>(null);
  const rollRef = useRef(0);
  const introDoneRef = useRef(false);
  const happyLockRef = useRef(false);
  const [phase, setPhase] = useState<DogIntroPhase>("enter-walk");
  const phaseStartedAt = useRef(performance.now());
  const walkFrom = useRef(new THREE.Vector3(0.85, 0, 0.35));
  const walkTo = useRef(new THREE.Vector3(0, 0, 0));

  const gltf = useGLTF(DOG_MODEL_PATH);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const clips = gltf.animations;
  const clipMap = useMemo(() => resolveDogClipMap(clips), [clips]);
  const { actions, mixer } = useAnimations(clips, rootRef);

  const fadeTo = useCallback(
    (clipName: string | undefined, duration = 0.25, loop: THREE.AnimationActionLoopStyles = THREE.LoopRepeat) => {
      if (!clipName) return;
      const action = actions[clipName];
      if (!action) return;
      action.reset().fadeIn(duration).setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity).play();
      Object.values(actions).forEach((other) => {
        if (other && other !== action) other.fadeOut(duration);
      });
    },
    [actions],
  );

  useEffect(() => {
    scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    fadeTo(clipMap.walk?.name, 0.1);
    phaseStartedAt.current = performance.now();
    rollRef.current = 0;
  }, [clipMap.walk?.name, fadeTo]);

  useEffect(() => {
    if (introDoneRef.current) return;
    const timer = window.setTimeout(() => {
      setPhase((current) => {
        const order: DogIntroPhase[] = [
          "enter-walk",
          "idle-look",
          "jump",
          "roll",
          "sit-idle",
          "lean-cta",
          "idle-loop",
        ];
        const index = order.indexOf(current);
        const next = order[index + 1] ?? "idle-loop";
        if (next === "idle-loop" && !introDoneRef.current) {
          introDoneRef.current = true;
          onIntroComplete();
        }
        phaseStartedAt.current = performance.now();
        return next;
      });
    }, phaseDurationMs(phase));

    return () => window.clearTimeout(timer);
  }, [onIntroComplete, phase]);

  useEffect(() => {
    if (introComplete && phase === "idle-loop") return;

    switch (phase) {
      case "enter-walk":
        fadeTo(clipMap.walk?.name, 0.15);
        break;
      case "idle-look":
      case "sit-idle":
        fadeTo(clipMap.idle?.name, 0.25);
        break;
      case "jump":
        fadeTo(clipMap.jumpStart?.name, 0.08, THREE.LoopOnce);
        window.setTimeout(() => fadeTo(clipMap.jumpLoop?.name, 0.08, THREE.LoopOnce), 280);
        break;
      case "roll":
        fadeTo(clipMap.idle?.name, 0.1);
        rollRef.current = 0;
        break;
      case "lean-cta":
        fadeTo(clipMap.idleEating?.name ?? clipMap.idle?.name, 0.25);
        break;
      case "idle-loop":
        fadeTo(clipMap.idle?.name, 0.35);
        break;
      default:
        break;
    }
  }, [clipMap, fadeTo, introComplete, phase]);

  useEffect(() => {
    if (!clickedNonce || happyLockRef.current) return;
    happyLockRef.current = true;
    fadeTo(clipMap.jumpStart?.name, 0.08, THREE.LoopOnce);
    window.setTimeout(() => {
      fadeTo(clipMap.idle?.name, 0.2);
      happyLockRef.current = false;
    }, 900);
  }, [clickedNonce, clipMap.jumpStart?.name, clipMap.idle?.name, fadeTo]);

  useFrame((_, delta) => {
    if (paused) return;
    mixer.update(delta);

    const root = rootRef.current;
    if (!root) return;

    const elapsed = (performance.now() - phaseStartedAt.current) / 1000;

    if (phase === "enter-walk") {
      const t = Math.min(1, elapsed / 2.1);
      const eased = 1 - (1 - t) ** 3;
      root.position.lerpVectors(walkFrom.current, walkTo.current, eased);
    } else {
      root.position.lerp(walkTo.current, 0.12);
    }

    if (phase === "roll") {
      const t = Math.min(1, elapsed / 0.85);
      root.rotation.z = THREE.MathUtils.lerp(0, Math.PI * 2, t);
    } else {
      root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, 0, 0.15);
    }

    const lookTarget = introComplete
      ? THREE.MathUtils.clamp(lookAtX * 0.35, -0.45, 0.45)
      : THREE.MathUtils.lerp(0.25, 0, Math.min(1, elapsed));
    root.rotation.y = THREE.MathUtils.lerp(
      root.rotation.y,
      lookTarget + (hovered ? 0.12 : 0),
      0.08,
    );

    if (introComplete && phase === "idle-loop") {
      root.position.y = Math.sin(performance.now() * 0.0016) * 0.012;
    }
  });

  return (
    <group ref={rootRef} scale={0.42} position={[0, -0.05, 0]} rotation={[0, 0.35, 0]}>
      <primitive object={scene} />
    </group>
  );
}

type Membership3DDogSceneProps = {
  onIntroComplete?: () => void;
  className?: string;
};

export default function Membership3DDogScene({
  onIntroComplete,
  className = "",
}: Membership3DDogSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [clickedNonce, setClickedNonce] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [lookAtX, setLookAtX] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    onIntroComplete?.();
  }, [onIntroComplete]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const frameLoop = paused || !inView ? "never" : "always";

  return (
    <div
      ref={hostRef}
      className={`membership-3d-dog-host pointer-events-auto ${className}`}
      aria-hidden
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        setLookAtX(x);
      }}
      onPointerLeave={() => setLookAtX(0)}
    >
      <Canvas
        className="membership-3d-dog-canvas"
        dpr={[1, 1.5]}
        frameloop={frameLoop}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        camera={{ position: [0, 0.75, 2.35], fov: 34, near: 0.1, far: 20 }}
        style={{ background: "transparent", pointerEvents: "auto" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        onPointerMissed={() => setHovered(false)}
      >
        <ambientLight intensity={0.62} />
        <hemisphereLight args={["#f6f2ea", "#c3e8d2", 0.45]} />
        <directionalLight position={[2.5, 4.5, 3.5]} intensity={1.05} castShadow />
        <directionalLight position={[-2, 2.5, -1.5]} intensity={0.28} />

        <DogActor
          introComplete={introComplete}
          onIntroComplete={handleIntroComplete}
          hovered={hovered}
          clickedNonce={clickedNonce}
          lookAtX={lookAtX}
          paused={paused || !inView}
        />

        <ContactShadows
          position={[0, -0.06, 0]}
          opacity={0.32}
          scale={2.4}
          blur={2.4}
          far={1.2}
          color="#2b2b2b"
        />

        <mesh
          visible={false}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(event) => {
            event.stopPropagation();
            setClickedNonce((value) => value + 1);
          }}
        >
          <boxGeometry args={[1.2, 0.9, 1.2]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </Canvas>
    </div>
  );
}
