type OrbProps = {
  interactive?: boolean;
  active?: boolean;
  busy?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (source: "pointer" | "keyboard") => void;
  onFocus?: () => void;
};

export default function Orb({
  interactive = true,
  active = false,
  busy = false,
  disabled = false,
  ariaLabel,
  onClick,
  onFocus
}: OrbProps) {
  const env = useEnvironmentSignal();

  const rootRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloARef = useRef<THREE.Mesh>(null);
  const haloBRef = useRef<THREE.Mesh>(null);
  const focusRingRef = useRef<THREE.Mesh>(null);
  const hitTargetRef = useRef<THREE.Mesh>(null);
  const lureRef = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const canInteract = interactive && !disabled && !busy;

  const triggerActivate = (source: "pointer" | "keyboard") => {
    if (canInteract && onClick) onClick(source);
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    const boost =
      (active ? 1 : 0) +
      (hovered && canInteract ? 1 : 0);

    const signalEnergy = env.scene.orbEnergy;

    const basePulse = reducedMotion
      ? 1
      : 1 + Math.sin(t * env.motion.pulseRate) * (0.018 + env.aliveness * 0.012);

    const pulse = basePulse + boost * 0.015;

    if (rootRef.current) {
      rootRef.current.scale.setScalar(pulse);
      rootRef.current.rotation.y = reducedMotion
        ? 0
        : t * (0.045 + env.motion.drift);
    }

    if (shellRef.current) {
      const m = shellRef.current.material as THREE.MeshPhysicalMaterial;
      m.emissive.set(env.palette.orbHalo);

      m.emissiveIntensity = disabled
        ? 2
        : busy
        ? 7
        : 4.8 + signalEnergy * 1.2 + boost * 0.9;
    }
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!focused) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        triggerActivate("keyboard");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focused, canInteract]);

  return (
    <group
      ref={rootRef}
      userData={{ ariaLabel }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!canInteract) return;
        setHovered(true);
        setFocused(true);
        onFocus?.();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        triggerActivate("pointer");
      }}
    >
      {/* rest unchanged */}
    </group>
  );
}