import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Text, Billboard, Stars } from "@react-three/drei";
import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

type Vote = "YES" | "NO";
type Phase = "idle" | "selecting" | "fading" | "voting" | "discussion";

interface Evidence { label: string; type: "proof" | "reference" | "source"; }
interface Agent { id: number; name: string; reputation: number; vote: Vote; evidence: Evidence[]; }
interface Discussion { from: number; to: number; }
type PhaseRefs = { phase: React.MutableRefObject<Phase>; elapsed: React.MutableRefObject<number> };

/* ═══════════════════════════════════════════════════════════
   Mock Data
   ═══════════════════════════════════════════════════════════ */

const RESOLUTION: Vote = "YES";
const TRUTH_COLOR = RESOLUTION === "YES" ? "#00ff88" : "#ff4455";
const YES_COLORS = ["#00ff88", "#22ffaa", "#44ff66", "#33ff99", "#55ff77", "#66ffaa"];
const NO_COLORS = ["#ff4455", "#ff6644", "#ff3333", "#ee5544"];

const AGENTS: Agent[] = [
  { id: 0, name: "Oracle Alpha", reputation: 95, vote: "YES", evidence: [
    { label: "Reuters Report", type: "source" }, { label: "On-chain TX Proof", type: "proof" }, { label: "Expert Analysis", type: "reference" },
  ]},
  { id: 1, name: "Sentinel Beta", reputation: 78, vote: "NO", evidence: [
    { label: "Counter Analysis", type: "reference" }, { label: "Twitter Thread", type: "source" },
  ]},
  { id: 2, name: "Arbiter Gamma", reputation: 88, vote: "YES", evidence: [
    { label: "Bloomberg Data", type: "source" }, { label: "Statistical Model", type: "proof" },
    { label: "Academic Paper", type: "reference" }, { label: "Satellite Imagery", type: "proof" },
  ]},
  { id: 3, name: "Watcher Delta", reputation: 65, vote: "NO", evidence: [
    { label: "Skeptic Report", type: "reference" }, { label: "Historical Precedent", type: "source" },
  ]},
  { id: 4, name: "Veritas Epsilon", reputation: 82, vote: "YES", evidence: [
    { label: "AP News Wire", type: "source" }, { label: "Gov Database", type: "proof" }, { label: "Witness Testimony", type: "reference" },
  ]},
  { id: 5, name: "Cipher Zeta", reputation: 71, vote: "NO", evidence: [
    { label: "Anomaly Detection", type: "proof" }, { label: "Dissenting Analysis", type: "reference" },
  ]},
  { id: 6, name: "Nexus Eta", reputation: 90, vote: "YES", evidence: [
    { label: "Consensus Data", type: "proof" }, { label: "Market Signals", type: "source" }, { label: "Cross-validation", type: "proof" },
  ]},
  { id: 7, name: "Prism Theta", reputation: 60, vote: "NO", evidence: [
    { label: "Alternative Source", type: "source" }, { label: "Minority Report", type: "reference" }, { label: "Edge Case Proof", type: "proof" },
  ]},
  { id: 8, name: "Echo Iota", reputation: 85, vote: "YES", evidence: [
    { label: "Corroborating Source", type: "source" }, { label: "Network Analysis", type: "proof" },
  ]},
  { id: 9, name: "Flux Kappa", reputation: 74, vote: "YES", evidence: [
    { label: "Trend Analysis", type: "proof" }, { label: "Social Sentiment", type: "source" }, { label: "Prediction Model", type: "reference" },
  ]},
];

const DISCUSSIONS: Discussion[] = [
  { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 4 },
  { from: 3, to: 5 }, { from: 4, to: 6 }, { from: 5, to: 7 }, { from: 6, to: 8 },
  { from: 0, to: 6 }, { from: 1, to: 7 }, { from: 2, to: 9 }, { from: 8, to: 9 },
];

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

function seeded(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function getAgentColor(agent: Agent): string {
  return agent.vote === "YES" ? YES_COLORS[agent.id % YES_COLORS.length] : NO_COLORS[agent.id % NO_COLORS.length];
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ═══════════════════════════════════════════════════════════
   Layout
   ═══════════════════════════════════════════════════════════ */

interface Layout {
  truthPos: THREE.Vector3;
  agentPositions: THREE.Vector3[];
  evidencePositions: THREE.Vector3[][];
}

function computeLayout(): Layout {
  const truthPos = new THREE.Vector3(0, 0, 0);

  const agentPositions = AGENTS.map((agent, i) => {
    const rng1 = seeded(agent.id * 7 + 1);
    const rng2 = seeded(agent.id * 13 + 3);
    const rng3 = seeded(agent.id * 19 + 7);
    const baseAngle = (i / AGENTS.length) * Math.PI * 2;
    const angle = baseAngle + (rng1 - 0.5) * 1.2;
    const radius = 7 + rng2 * 12;
    const y = (rng3 - 0.5) * 10;
    return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
  });

  const evidencePositions = AGENTS.map((agent, i) => {
    const agentPos = agentPositions[i];
    const outDir = new THREE.Vector3(agentPos.x, 0, agentPos.z).normalize();
    const perpDir = new THREE.Vector3(-outDir.z, 0, outDir.x);
    return agent.evidence.map((_, j) => {
      const rngD = seeded(i * 31 + j * 17 + 5);
      const rngP = seeded(i * 23 + j * 11 + 9);
      const rngY = seeded(i * 37 + j * 29 + 13);
      const evDist = 2.5 + rngD * 3;
      const count = agent.evidence.length;
      const spread = j - (count - 1) / 2;
      const perpOffset = spread * 1.8 + (rngP - 0.5) * 1.5;
      const yOff = (rngY - 0.5) * 3;
      return new THREE.Vector3(
        agentPos.x + outDir.x * evDist + perpDir.x * perpOffset,
        agentPos.y + yOff,
        agentPos.z + outDir.z * evDist + perpDir.z * perpOffset,
      );
    });
  });

  return { truthPos, agentPositions, evidencePositions };
}

/* ═══════════════════════════════════════════════════════════
   Candidates (30 random nodes, 10 get chosen)
   ═══════════════════════════════════════════════════════════ */

const TOTAL_CANDIDATES = 50;
// Which candidate indices map to which agent (scattered through the 50)
const CHOSEN_MAP = [3, 8, 12, 17, 21, 26, 31, 36, 41, 47];

function generateCandidatePositions(): THREE.Vector3[] {
  return Array.from({ length: TOTAL_CANDIDATES }, (_, i) => {
    const r1 = seeded(i * 71 + 11);
    const r2 = seeded(i * 131 + 31);
    const r3 = seeded(i * 191 + 71);
    const theta = r1 * Math.PI * 2;
    const phi = Math.acos(2 * r2 - 1);
    const radius = 6 + r3 * 16;
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      (r2 - 0.5) * 14,
      radius * Math.sin(phi) * Math.sin(theta),
    );
  });
}

/* ═══════════════════════════════════════════════════════════
   Animated Candidate Node
   ═══════════════════════════════════════════════════════════ */

function CandidateNode({
  index, position, isChosen, chosenOrder, finalPos, refs,
}: {
  index: number; position: THREE.Vector3; isChosen: boolean;
  chosenOrder: number; finalPos: THREE.Vector3 | null; refs: PhaseRefs;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const floatSeed = useMemo(() => seeded(index * 43) * Math.PI * 2, [index]);
  // Varied base size per node (0.25 to 0.55)
  const baseSize = useMemo(() => 0.25 + seeded(index * 67 + 3) * 0.3, [index]);

  useFrame((state) => {
    const phase = refs.phase.current;
    const t = refs.elapsed.current;
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const floatY = Math.sin(state.clock.elapsedTime * 0.6 + floatSeed) * 0.5;
    const floatX = Math.cos(state.clock.elapsedTime * 0.4 + floatSeed * 1.3) * 0.3;

    if (phase === "idle") {
      mesh.visible = true;
      mesh.position.set(position.x + floatX, position.y + floatY, position.z);
      mat.color.setHex(0x888888);
      mat.emissive.setHex(0x555555);
      mat.emissiveIntensity = 0.4;
      mat.opacity = 0.75;
      mesh.scale.setScalar(1);
    } else if (phase === "selecting") {
      mesh.position.set(position.x + floatX, position.y + floatY, position.z);

      if (isChosen) {
        // Each chosen node lights up one by one (0.3s apart, 0.5s transition each)
        const myStart = chosenOrder * 0.3;
        const p = smoothstep(Math.max(0, Math.min((t - myStart) / 0.5, 1)));
        const g = 0.53 + p * 0.47;
        mat.color.setRGB(g, g, g);
        mat.emissive.setRGB(g * 0.8, g * 0.8, g * 0.8);
        mat.emissiveIntensity = 0.4 + p * 1.2;
        mat.opacity = 0.75 + p * 0.25;
        mesh.scale.setScalar((1 + p * 0.6) * (1 + Math.sin(t * 6) * 0.06 * p));
      } else {
        // Unchosen stay visible at idle look
        mat.color.setHex(0x888888);
        mat.emissive.setHex(0x555555);
        mat.emissiveIntensity = 0.4;
        mat.opacity = 0.75;
      }
    } else if (phase === "fading") {
      const p = smoothstep(Math.min(t / 2, 1));

      if (!isChosen) {
        mesh.scale.setScalar(Math.max(0.001, 1 - p));
        mat.opacity = Math.max(0, 0.4 * (1 - p));
        if (p >= 0.99) mesh.visible = false;
      } else if (finalPos) {
        mesh.visible = true;
        mesh.position.lerpVectors(position, finalPos, easeInOutCubic(p));
        const g = 0.9 + 0.1 * Math.sin(t * 3);
        mat.color.setRGB(g, g, g);
        mat.emissive.setRGB(0.8, 0.8, 0.8);
        mat.emissiveIntensity = 1.0;
        mat.opacity = 1;
        mesh.scale.setScalar(1.3 + 0.1 * Math.sin(t * 2));
      }
    } else {
      mesh.visible = false;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[baseSize, 24, 24]} />
      <meshStandardMaterial
        ref={matRef} color="#888888" emissive="#555555"
        emissiveIntensity={0.4} roughness={0.3} metalness={0.6}
        transparent opacity={0.75}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════
   Discussion-phase 3D Components
   ═══════════════════════════════════════════════════════════ */

const SCALE_NORMAL = new THREE.Vector3(1, 1, 1);
const SCALE_HOVERED = new THREE.Vector3(1.2, 1.2, 1.2);

function TruthNodeAnimated({ position, refs }: { position: THREE.Vector3; refs: PhaseRefs }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = refs.elapsed.current;
    const scaleIn = smoothstep(Math.min(t / 0.8, 1));
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.06;
    meshRef.current.scale.setScalar(scaleIn * pulse);
    ringRef.current.scale.setScalar(scaleIn);
    ringRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    ringRef.current.rotation.z = state.clock.elapsedTime * 0.2;
  });

  return (
    <group>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[1.5, 48, 48]} />
        <meshStandardMaterial
          color={TRUTH_COLOR} emissive={TRUTH_COLOR} emissiveIntensity={1.2}
          roughness={0.15} metalness={0.8} transparent opacity={0.92}
        />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[2.2, 0.03, 16, 64]} />
        <meshStandardMaterial
          color={TRUTH_COLOR} emissive={TRUTH_COLOR} emissiveIntensity={0.8}
          transparent opacity={0.5}
        />
      </mesh>
    </group>
  );
}

function AgentSphereAnimated({
  position, radius, color, hovered, onHover, onUnhover, refs,
}: {
  position: THREE.Vector3; radius: number; color: string;
  hovered: boolean; onHover: () => void; onUnhover: () => void;
  refs: PhaseRefs;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const white = useMemo(() => new THREE.Color("#eeeeee"), []);

  useFrame(() => {
    const cp = smoothstep(Math.min(refs.elapsed.current / 1.5, 1));
    matRef.current.color.copy(white).lerp(targetColor, cp);
    matRef.current.emissive.copy(white).lerp(targetColor, cp);
    matRef.current.emissiveIntensity = 0.4 + (hovered ? 0.5 : 0) * cp;
    matRef.current.opacity = 0.9;
    ref.current.scale.lerp(hovered ? SCALE_HOVERED : SCALE_NORMAL, 0.1);
  });

  return (
    <mesh
      ref={ref} position={position}
      onPointerOver={(e) => { e.stopPropagation(); onHover(); }}
      onPointerOut={onUnhover}
    >
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        ref={matRef} color="#eeeeee" emissive="#eeeeee"
        emissiveIntensity={0.5} roughness={0.2} metalness={0.7}
        transparent opacity={0.9}
      />
    </mesh>
  );
}

function EvidenceNode({ position, type, color }: {
  position: THREE.Vector3; type: "proof" | "reference" | "source"; color: string;
}) {
  const lighterColor = useMemo(
    () => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35).getStyle(), [color],
  );
  const size = type === "proof" ? 0.22 : type === "source" ? 0.2 : 0.17;

  return (
    <mesh position={position}>
      {type === "proof" && <octahedronGeometry args={[size, 0]} />}
      {type === "source" && <boxGeometry args={[size * 1.4, size * 1.4, size * 1.4]} />}
      {type === "reference" && <sphereGeometry args={[size, 16, 16]} />}
      <meshStandardMaterial
        color={lighterColor} emissive={lighterColor}
        emissiveIntensity={0.4} roughness={0.3} metalness={0.5}
      />
    </mesh>
  );
}

function NodeLabel({
  position, text, color = "#ffffff", fontSize = 0.4, yOffset = 1.2,
}: {
  position: THREE.Vector3; text: string; color?: string; fontSize?: number; yOffset?: number;
}) {
  const labelPos = useMemo(
    () => new THREE.Vector3(position.x, position.y + yOffset, position.z), [position, yOffset],
  );
  return (
    <Billboard position={labelPos}>
      <Text fontSize={fontSize} color={color} anchorX="center" anchorY="middle"
        outlineWidth={0.04} outlineColor="#000000">{text}</Text>
    </Billboard>
  );
}

function Connection({
  start, end, color = "#ffffff", opacity = 0.3, lineWidth = 1,
}: {
  start: THREE.Vector3; end: THREE.Vector3; color?: string; opacity?: number; lineWidth?: number;
}) {
  const points = useMemo(() => [start.toArray(), end.toArray()], [start, end]);
  return <Line points={points} color={color} lineWidth={lineWidth} transparent opacity={opacity} />;
}

function CurvedConnection({
  start, end, color, opacity = 0.2, lineWidth = 0.8,
}: {
  start: THREE.Vector3; end: THREE.Vector3; color: string; opacity?: number; lineWidth?: number;
}) {
  const points = useMemo(() => {
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += start.distanceTo(end) * 0.25;
    return new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(24).map((p) => p.toArray());
  }, [start, end]);
  return <Line points={points} color={color} lineWidth={lineWidth} transparent opacity={opacity} />;
}

function FlowParticle({
  start, end, color, speed = 0.4, offset = 0,
}: {
  start: THREE.Vector3; end: THREE.Vector3; color: string; speed?: number; offset?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = ((state.clock.elapsedTime * speed + offset) % 1 + 1) % 1;
    ref.current.position.lerpVectors(start, end, t);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.8;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
}

function CurvedFlowParticle({
  start, end, color, speed = 0.3, offset = 0,
}: {
  start: THREE.Vector3; end: THREE.Vector3; color: string; speed?: number; offset?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const curve = useMemo(() => {
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += start.distanceTo(end) * 0.25;
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [start, end]);
  useFrame((state) => {
    const t = ((state.clock.elapsedTime * speed + offset) % 1 + 1) % 1;
    curve.getPoint(t, ref.current.position);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.9;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════
   Voting Node (color reveal, no links)
   ═══════════════════════════════════════════════════════════ */

// Which color-reveal wave each agent belongs to (0=first, 1=second, 2=stays grey)
const VOTE_WAVE: number[] = [0, 0, 1, 2, 1, 0, 2, 2, 1, 2];

function VotingNode({
  position, agent, agentIndex, refs,
}: {
  position: THREE.Vector3; agent: Agent; agentIndex: number; refs: PhaseRefs;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const size = 0.35 + (agent.reputation / 100) * 0.65;
  const wave = VOTE_WAVE[agentIndex];
  const voteColor = useMemo(() => new THREE.Color(getAgentColor(agent)), [agent]);
  const grey = useMemo(() => new THREE.Color("#cccccc"), []);

  useFrame(() => {
    const t = refs.elapsed.current;
    const mat = matRef.current;
    if (!mat) return;

    // Wave 0 starts at 0.3s, wave 1 at 1.2s, wave 2 stays grey
    if (wave === 2) {
      mat.color.set(grey);
      mat.emissive.set(grey);
      mat.emissiveIntensity = 0.5;
    } else {
      const delay = wave === 0 ? 0.3 : 1.2;
      const p = smoothstep(Math.max(0, Math.min((t - delay) / 0.6, 1)));
      mat.color.copy(grey).lerp(voteColor, p);
      mat.emissive.copy(grey).lerp(voteColor, p);
      mat.emissiveIntensity = 0.5 + p * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        ref={matRef} color="#cccccc" emissive="#cccccc"
        emissiveIntensity={0.5} roughness={0.2} metalness={0.7}
        transparent opacity={0.9}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════
   Delayed visibility wrapper (staggered pop-in)
   ═══════════════════════════════════════════════════════════ */

function DelayedGroup({ refs, delay, children }: {
  refs: PhaseRefs; delay: number; children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => { ref.current.visible = refs.elapsed.current >= delay; });
  return <group ref={ref} visible={false}>{children}</group>;
}

/* ═══════════════════════════════════════════════════════════
   Scene
   ═══════════════════════════════════════════════════════════ */

function Scene({ phase, setPhase }: { phase: Phase; setPhase: (p: Phase) => void }) {
  const phaseRef = useRef<Phase>(phase);
  const elapsedRef = useRef(0);
  const refs: PhaseRefs = useMemo(() => ({ phase: phaseRef, elapsed: elapsedRef }), []);
  const layout = useMemo(() => computeLayout(), []);
  const candidatePositions = useMemo(() => generateCandidatePositions(), []);
  const [hoveredAgent, setHoveredAgent] = useState<number | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
    elapsedRef.current = 0;
  }, [phase]);

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    if (phaseRef.current === "selecting" && elapsedRef.current >= 4.0) {
      phaseRef.current = "fading";
      elapsedRef.current = 0;
      setPhase("fading");
    } else if (phaseRef.current === "fading" && elapsedRef.current >= 2.2) {
      phaseRef.current = "voting";
      elapsedRef.current = 0;
      setPhase("voting");
    } else if (phaseRef.current === "voting" && elapsedRef.current >= 3.0) {
      phaseRef.current = "discussion";
      elapsedRef.current = 0;
      setPhase("discussion");
    }
  });

  const { truthPos, agentPositions, evidencePositions } = layout;
  const showCandidates = phase !== "discussion" && phase !== "voting";
  const showVoting = phase === "voting";
  const showDiscussion = phase === "discussion";

  return (
    <>
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5} />
      <ambientLight intensity={showDiscussion ? 0.25 : 0.5} />
      <pointLight position={[0, 0, 0]} intensity={showDiscussion ? 3 : 2}
        color={showDiscussion ? TRUTH_COLOR : "#aaaaaa"} distance={50} decay={2} />
      <pointLight position={[20, 20, 20]} intensity={0.8} />
      <pointLight position={[-20, -10, -20]} intensity={0.4} />

      {/* ── Candidate layer ── */}
      {showCandidates && candidatePositions.map((pos, i) => {
        const chosenIdx = CHOSEN_MAP.indexOf(i);
        const isChosen = chosenIdx !== -1;
        return (
          <CandidateNode
            key={`c-${i}`} index={i} position={pos}
            isChosen={isChosen} chosenOrder={chosenIdx}
            finalPos={isChosen ? agentPositions[chosenIdx] : null}
            refs={refs}
          />
        );
      })}

      {/* ── Voting layer (no links, colors appear) ── */}
      {showVoting && AGENTS.map((agent, i) => (
        <VotingNode
          key={`v-${agent.id}`}
          position={agentPositions[i]}
          agent={agent}
          agentIndex={i}
          refs={refs}
        />
      ))}

      {/* ── Discussion layer ── */}
      {showDiscussion && (
        <>
          {/* Truth node - scales in immediately */}
          <TruthNodeAnimated position={truthPos} refs={refs} />
          <DelayedGroup refs={refs} delay={0.6}>
            <NodeLabel position={truthPos} text={`TRUTH: ${RESOLUTION}`}
              color={TRUTH_COLOR} fontSize={0.55} yOffset={2.2} />
          </DelayedGroup>

          {/* Agents */}
          {AGENTS.map((agent, i) => {
            const pos = agentPositions[i];
            const color = getAgentColor(agent);
            const size = 0.35 + (agent.reputation / 100) * 0.65;
            const isHovered = hoveredAgent === i;

            return (
              <group key={agent.id}>
                {/* Agent sphere - color fades from white to vote color */}
                <AgentSphereAnimated
                  position={pos} radius={size} color={color}
                  hovered={isHovered}
                  onHover={() => setHoveredAgent(i)}
                  onUnhover={() => setHoveredAgent(null)}
                  refs={refs}
                />

                {/* Labels - staggered */}
                <DelayedGroup refs={refs} delay={1.0 + i * 0.06}>
                  <NodeLabel position={pos} text={agent.name}
                    color={color} fontSize={0.32} yOffset={size + 0.5} />
                  <NodeLabel position={pos} text={`Rep: ${agent.reputation} | ${agent.vote}`}
                    color={color} fontSize={0.2} yOffset={size + 0.15} />
                </DelayedGroup>

                {/* Truth -> Agent link */}
                <DelayedGroup refs={refs} delay={0.4 + i * 0.06}>
                  <Connection start={truthPos} end={pos} color={color}
                    opacity={isHovered ? 0.8 : 0.5} lineWidth={isHovered ? 2.5 : 1.5} />
                </DelayedGroup>

                {/* Evidence nodes - staggered per agent */}
                {agent.evidence.map((ev, j) => {
                  const evPos = evidencePositions[i][j];
                  return (
                    <DelayedGroup key={j} refs={refs} delay={1.6 + i * 0.08 + j * 0.12}>
                      <EvidenceNode position={evPos} type={ev.type} color={color} />
                      <NodeLabel position={evPos} text={ev.label}
                        color="#cccccc" fontSize={0.2} yOffset={0.45} />
                      <Connection start={pos} end={evPos} color={color}
                        opacity={isHovered ? 0.6 : 0.35} lineWidth={isHovered ? 1 : 0.7} />
                      <FlowParticle start={pos} end={evPos} color={color}
                        speed={0.5} offset={i * 0.3 + j * 0.15} />
                    </DelayedGroup>
                  );
                })}
              </group>
            );
          })}

          {/* Discussion links - staggered last */}
          {DISCUSSIONS.map((disc, i) => {
            const a1 = AGENTS[disc.from];
            const a2 = AGENTS[disc.to];
            const sameVote = a1.vote === a2.vote;
            const lineColor = sameVote
              ? new THREE.Color(getAgentColor(a1)).lerp(new THREE.Color(getAgentColor(a2)), 0.5).getStyle()
              : "#ffaa22";
            const isHL = hoveredAgent === disc.from || hoveredAgent === disc.to;

            return (
              <DelayedGroup key={`d-${i}`} refs={refs} delay={2.2 + i * 0.1}>
                <CurvedConnection
                  start={agentPositions[disc.from]} end={agentPositions[disc.to]}
                  color={lineColor} opacity={isHL ? 0.7 : 0.35} lineWidth={isHL ? 2 : 1} />
                <CurvedFlowParticle
                  start={agentPositions[disc.from]} end={agentPositions[disc.to]}
                  color={lineColor} speed={0.25} offset={i * 0.2} />
                <CurvedFlowParticle
                  start={agentPositions[disc.to]} end={agentPositions[disc.from]}
                  color={lineColor} speed={0.2} offset={i * 0.15 + 0.5} />
              </DelayedGroup>
            );
          })}
        </>
      )}

      <OrbitControls enablePan enableZoom autoRotate autoRotateSpeed={0.3}
        minDistance={5} maxDistance={60} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   UI Overlays
   ═══════════════════════════════════════════════════════════ */

const overlayBase: React.CSSProperties = {
  position: "absolute", background: "rgba(0,0,0,0.7)", borderRadius: 12,
  padding: "16px 20px", color: "#fff", fontFamily: "monospace", fontSize: 13,
  lineHeight: 1.8, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
};

const btnBase: React.CSSProperties = {
  position: "absolute", left: "50%", bottom: 40, transform: "translateX(-50%)",
  padding: "14px 36px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(0,0,0,0.8)", color: "#fff", fontFamily: "monospace",
  fontSize: 15, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(10px)",
  transition: "all 0.2s",
};

function Legend() {
  return (
    <div style={{ ...overlayBase, bottom: 24, left: 24 }}>
      <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 8 }}>Legend</div>
      <div><span style={{ color: "#00ff88" }}>&#9679;</span> YES vote (green)</div>
      <div><span style={{ color: "#ff4455" }}>&#9679;</span> NO vote (red)</div>
      <div style={{ marginTop: 6 }}>&#9670; Proof &nbsp; &#9632; Source &nbsp; &#9679; Reference</div>
      <div style={{ marginTop: 6, color: "#888" }}>Node size = reputation score</div>
      <div style={{ color: "#ffaa22" }}>&#8212; Debate link (opposing votes)</div>
      <div style={{ color: "#44ffaa" }}>&#8212; Alliance link (same vote)</div>
    </div>
  );
}

function Stats() {
  const yesCount = AGENTS.filter((a) => a.vote === "YES").length;
  const noCount = AGENTS.filter((a) => a.vote === "NO").length;
  return (
    <div style={{ ...overlayBase, top: 24, right: 24 }}>
      <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 8 }}>Resolution Stats</div>
      <div>Agents: {AGENTS.length}</div>
      <div style={{ color: "#00ff88" }}>YES: {yesCount}</div>
      <div style={{ color: "#ff4455" }}>NO: {noCount}</div>
      <div style={{ marginTop: 6, color: TRUTH_COLOR, fontWeight: "bold" }}>Resolution: {RESOLUTION}</div>
    </div>
  );
}

const PHASE_LABELS: Record<Phase, string> = {
  idle: "50 candidate agents standing by",
  selecting: "Selecting 10 oracle agents...",
  fading: "Forming oracle network...",
  voting: "Agents casting votes...",
  discussion: "Oracle discussion in progress",
};

function Header({ phase }: { phase: Phase }) {
  return (
    <div style={{
      position: "absolute", top: 20, left: 0, right: 0,
      textAlign: "center", color: "#fff", fontFamily: "monospace", zIndex: 10,
      pointerEvents: "none",
    }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
        AI Oracle Agent Discussion Graph
      </h1>
      <p style={{
        fontSize: 13, marginTop: 6,
        color: phase === "discussion" ? TRUTH_COLOR : "#888",
        transition: "color 1s",
      }}>
        {PHASE_LABELS[phase]}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */

export default function TestPage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div style={{ width: "100vw", height: "100vh", background: "#000" }} />;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative" }}>
      <Canvas camera={{ position: [0, 15, 30], fov: 60 }}>
        <Scene phase={phase} setPhase={setPhase} />
      </Canvas>

      <Header phase={phase} />

      {phase === "idle" && (
        <button style={btnBase} onClick={() => setPhase("selecting")}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = TRUTH_COLOR; e.currentTarget.style.color = TRUTH_COLOR; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#fff"; }}>
          Select Oracle Agents
        </button>
      )}

      {phase === "discussion" && (
        <>
          <Legend />
          <Stats />
          <button
            style={{ ...btnBase, fontSize: 12, padding: "10px 24px", opacity: 0.6 }}
            onClick={() => setPhase("idle")}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}>
            Reset
          </button>
        </>
      )}
    </div>
  );
}
