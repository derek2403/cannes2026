import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Text, Billboard, Stars } from "@react-three/drei";
import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

type Vote = "YES" | "NO";

interface Evidence {
  label: string;
  type: "proof" | "reference" | "source";
}

interface Agent {
  id: number;
  name: string;
  reputation: number;
  vote: Vote;
  evidence: Evidence[];
}

interface Discussion {
  from: number;
  to: number;
}

/* ═══════════════════════════════════════════════════════════
   Mock Data
   ═══════════════════════════════════════════════════════════ */

const RESOLUTION: Vote = "YES";
const TRUTH_COLOR = RESOLUTION === "YES" ? "#00ff88" : "#ff4455";

const YES_COLORS = ["#00ff88", "#22ffaa", "#44ff66", "#33ff99", "#55ff77", "#66ffaa"];
const NO_COLORS = ["#ff4455", "#ff6644", "#ff3333", "#ee5544"];

const AGENTS: Agent[] = [
  {
    id: 0, name: "Oracle Alpha", reputation: 95, vote: "YES",
    evidence: [
      { label: "Reuters Report", type: "source" },
      { label: "On-chain TX Proof", type: "proof" },
      { label: "Expert Analysis", type: "reference" },
    ],
  },
  {
    id: 1, name: "Sentinel Beta", reputation: 78, vote: "NO",
    evidence: [
      { label: "Counter Analysis", type: "reference" },
      { label: "Twitter Thread", type: "source" },
    ],
  },
  {
    id: 2, name: "Arbiter Gamma", reputation: 88, vote: "YES",
    evidence: [
      { label: "Bloomberg Data", type: "source" },
      { label: "Statistical Model", type: "proof" },
      { label: "Academic Paper", type: "reference" },
      { label: "Satellite Imagery", type: "proof" },
    ],
  },
  {
    id: 3, name: "Watcher Delta", reputation: 65, vote: "NO",
    evidence: [
      { label: "Skeptic Report", type: "reference" },
      { label: "Historical Precedent", type: "source" },
    ],
  },
  {
    id: 4, name: "Veritas Epsilon", reputation: 82, vote: "YES",
    evidence: [
      { label: "AP News Wire", type: "source" },
      { label: "Gov Database", type: "proof" },
      { label: "Witness Testimony", type: "reference" },
    ],
  },
  {
    id: 5, name: "Cipher Zeta", reputation: 71, vote: "NO",
    evidence: [
      { label: "Anomaly Detection", type: "proof" },
      { label: "Dissenting Analysis", type: "reference" },
    ],
  },
  {
    id: 6, name: "Nexus Eta", reputation: 90, vote: "YES",
    evidence: [
      { label: "Consensus Data", type: "proof" },
      { label: "Market Signals", type: "source" },
      { label: "Cross-validation", type: "proof" },
    ],
  },
  {
    id: 7, name: "Prism Theta", reputation: 60, vote: "NO",
    evidence: [
      { label: "Alternative Source", type: "source" },
      { label: "Minority Report", type: "reference" },
      { label: "Edge Case Proof", type: "proof" },
    ],
  },
  {
    id: 8, name: "Echo Iota", reputation: 85, vote: "YES",
    evidence: [
      { label: "Corroborating Source", type: "source" },
      { label: "Network Analysis", type: "proof" },
    ],
  },
  {
    id: 9, name: "Flux Kappa", reputation: 74, vote: "YES",
    evidence: [
      { label: "Trend Analysis", type: "proof" },
      { label: "Social Sentiment", type: "source" },
      { label: "Prediction Model", type: "reference" },
    ],
  },
];

const DISCUSSIONS: Discussion[] = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 4 },
  { from: 3, to: 5 },
  { from: 4, to: 6 },
  { from: 5, to: 7 },
  { from: 6, to: 8 },
  { from: 0, to: 6 },
  { from: 1, to: 7 },
  { from: 2, to: 9 },
  { from: 8, to: 9 },
];

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

function getAgentColor(agent: Agent): string {
  return agent.vote === "YES"
    ? YES_COLORS[agent.id % YES_COLORS.length]
    : NO_COLORS[agent.id % NO_COLORS.length];
}

interface Layout {
  truthPos: THREE.Vector3;
  agentPositions: THREE.Vector3[];
  evidencePositions: THREE.Vector3[][];
}

// Deterministic pseudo-random so positions are stable across renders
function seeded(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function computeLayout(): Layout {
  const truthPos = new THREE.Vector3(0, 0, 0);

  const agentPositions = AGENTS.map((agent, i) => {
    const rng1 = seeded(agent.id * 7 + 1);
    const rng2 = seeded(agent.id * 13 + 3);
    const rng3 = seeded(agent.id * 19 + 7);

    // Base angle with random offset so they aren't evenly spaced
    const baseAngle = (i / AGENTS.length) * Math.PI * 2;
    const angle = baseAngle + (rng1 - 0.5) * 1.2;

    // Random radius between 7 and 19
    const radius = 7 + rng2 * 12;

    // Random Y between -5 and 5
    const y = (rng3 - 0.5) * 10;

    return new THREE.Vector3(
      radius * Math.cos(angle),
      y,
      radius * Math.sin(angle),
    );
  });

  const evidencePositions = AGENTS.map((agent, i) => {
    const agentPos = agentPositions[i];
    const outDir = new THREE.Vector3(agentPos.x, 0, agentPos.z).normalize();
    const perpDir = new THREE.Vector3(-outDir.z, 0, outDir.x);

    return agent.evidence.map((_, j) => {
      const rngD = seeded(i * 31 + j * 17 + 5);
      const rngP = seeded(i * 23 + j * 11 + 9);
      const rngY = seeded(i * 37 + j * 29 + 13);

      // Random distance 2.5–5.5 from parent agent
      const evDist = 2.5 + rngD * 3;
      const count = agent.evidence.length;
      const spread = j - (count - 1) / 2;
      const perpOffset = spread * 1.8 + (rngP - 0.5) * 1.5;
      const yOffset = (rngY - 0.5) * 3;

      return new THREE.Vector3(
        agentPos.x + outDir.x * evDist + perpDir.x * perpOffset,
        agentPos.y + yOffset,
        agentPos.z + outDir.z * evDist + perpDir.z * perpOffset,
      );
    });
  });

  return { truthPos, agentPositions, evidencePositions };
}

const SCALE_NORMAL = new THREE.Vector3(1, 1, 1);
const SCALE_HOVERED = new THREE.Vector3(1.2, 1.2, 1.2);

/* ═══════════════════════════════════════════════════════════
   3D Components
   ═══════════════════════════════════════════════════════════ */

function PulsingNode({
  position, radius, color, emissiveIntensity = 0.5,
}: {
  position: THREE.Vector3; radius: number; color: string; emissiveIntensity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.06);
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshStandardMaterial
        color={color} emissive={color} emissiveIntensity={emissiveIntensity}
        roughness={0.15} metalness={0.8} transparent opacity={0.92}
      />
    </mesh>
  );
}

function TruthRing({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    ref.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    ref.current.rotation.z = state.clock.elapsedTime * 0.2;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[2.2, 0.03, 16, 64]} />
      <meshStandardMaterial
        color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.5}
      />
    </mesh>
  );
}

function AgentSphere({
  position, radius, color, hovered, onHover, onUnhover,
}: {
  position: THREE.Vector3; radius: number; color: string;
  hovered: boolean; onHover: () => void; onUnhover: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
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
        color={color} emissive={color}
        emissiveIntensity={hovered ? 0.9 : 0.5}
        roughness={0.2} metalness={0.7} transparent opacity={0.9}
      />
    </mesh>
  );
}

function EvidenceNode({
  position, type, color,
}: {
  position: THREE.Vector3; type: "proof" | "reference" | "source"; color: string;
}) {
  const lighterColor = useMemo(
    () => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35).getStyle(),
    [color],
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
    () => new THREE.Vector3(position.x, position.y + yOffset, position.z),
    [position, yOffset],
  );

  return (
    <Billboard position={labelPos}>
      <Text
        fontSize={fontSize} color={color}
        anchorX="center" anchorY="middle"
        outlineWidth={0.04} outlineColor="#000000"
      >
        {text}
      </Text>
    </Billboard>
  );
}

function Connection({
  start, end, color = "#ffffff", opacity = 0.3, lineWidth = 1,
}: {
  start: THREE.Vector3; end: THREE.Vector3;
  color?: string; opacity?: number; lineWidth?: number;
}) {
  const points = useMemo(() => [start.toArray(), end.toArray()], [start, end]);
  return <Line points={points} color={color} lineWidth={lineWidth} transparent opacity={opacity} />;
}

function CurvedConnection({
  start, end, color, opacity = 0.2, lineWidth = 0.8,
}: {
  start: THREE.Vector3; end: THREE.Vector3;
  color: string; opacity?: number; lineWidth?: number;
}) {
  const points = useMemo(() => {
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += start.distanceTo(end) * 0.25;
    return new THREE.QuadraticBezierCurve3(start, mid, end)
      .getPoints(24)
      .map((p) => p.toArray());
  }, [start, end]);

  return <Line points={points} color={color} lineWidth={lineWidth} transparent opacity={opacity} />;
}

function FlowParticle({
  start, end, color, speed = 0.4, offset = 0,
}: {
  start: THREE.Vector3; end: THREE.Vector3;
  color: string; speed?: number; offset?: number;
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
  start: THREE.Vector3; end: THREE.Vector3;
  color: string; speed?: number; offset?: number;
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
   Scene
   ═══════════════════════════════════════════════════════════ */

function Scene() {
  const layout = useMemo(() => computeLayout(), []);
  const [hoveredAgent, setHoveredAgent] = useState<number | null>(null);
  const { truthPos, agentPositions, evidencePositions } = layout;

  return (
    <>
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5} />
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 0, 0]} intensity={3} color={TRUTH_COLOR} distance={35} decay={2} />
      <pointLight position={[20, 20, 20]} intensity={0.8} />
      <pointLight position={[-20, -10, -20]} intensity={0.4} />

      {/* Truth node */}
      <PulsingNode position={truthPos} radius={1.5} color={TRUTH_COLOR} emissiveIntensity={1.2} />
      <TruthRing color={TRUTH_COLOR} />
      <NodeLabel
        position={truthPos} text={`TRUTH: ${RESOLUTION}`}
        color={TRUTH_COLOR} fontSize={0.55} yOffset={2.2}
      />

      {/* Agents + Evidence */}
      {AGENTS.map((agent, i) => {
        const pos = agentPositions[i];
        const color = getAgentColor(agent);
        const size = 0.35 + (agent.reputation / 100) * 0.65;
        const isHovered = hoveredAgent === i;

        return (
          <group key={agent.id}>
            <AgentSphere
              position={pos} radius={size} color={color} hovered={isHovered}
              onHover={() => setHoveredAgent(i)}
              onUnhover={() => setHoveredAgent(null)}
            />
            <NodeLabel
              position={pos} text={agent.name}
              color={color} fontSize={0.32} yOffset={size + 0.5}
            />
            <NodeLabel
              position={pos} text={`Rep: ${agent.reputation} | ${agent.vote}`}
              color={color} fontSize={0.2} yOffset={size + 0.15}
            />

            {/* Truth -> Agent link */}
            <Connection
              start={truthPos} end={pos} color={color}
              opacity={isHovered ? 0.8 : 0.5} lineWidth={isHovered ? 2.5 : 1.5}
            />

            {/* Evidence nodes */}
            {agent.evidence.map((ev, j) => {
              const evPos = evidencePositions[i][j];
              return (
                <group key={j}>
                  <EvidenceNode position={evPos} type={ev.type} color={color} />
                  <NodeLabel
                    position={evPos} text={ev.label}
                    color="#cccccc" fontSize={0.2} yOffset={0.45}
                  />
                  <Connection
                    start={pos} end={evPos} color={color}
                    opacity={isHovered ? 0.6 : 0.35} lineWidth={isHovered ? 1 : 0.7}
                  />
                  <FlowParticle
                    start={pos} end={evPos} color={color}
                    speed={0.5} offset={i * 0.3 + j * 0.15}
                  />
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Discussion links (curved) */}
      {DISCUSSIONS.map((disc, i) => {
        const a1 = AGENTS[disc.from];
        const a2 = AGENTS[disc.to];
        const sameVote = a1.vote === a2.vote;
        const lineColor = sameVote
          ? new THREE.Color(getAgentColor(a1))
              .lerp(new THREE.Color(getAgentColor(a2)), 0.5)
              .getStyle()
          : "#ffaa22";
        const isHighlighted = hoveredAgent === disc.from || hoveredAgent === disc.to;

        return (
          <group key={i}>
            <CurvedConnection
              start={agentPositions[disc.from]} end={agentPositions[disc.to]}
              color={lineColor}
              opacity={isHighlighted ? 0.7 : 0.35}
              lineWidth={isHighlighted ? 2 : 1}
            />
            <CurvedFlowParticle
              start={agentPositions[disc.from]} end={agentPositions[disc.to]}
              color={lineColor} speed={0.25} offset={i * 0.2}
            />
            <CurvedFlowParticle
              start={agentPositions[disc.to]} end={agentPositions[disc.from]}
              color={lineColor} speed={0.2} offset={i * 0.15 + 0.5}
            />
          </group>
        );
      })}

      <OrbitControls
        enablePan enableZoom autoRotate autoRotateSpeed={0.3}
        minDistance={5} maxDistance={60}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   UI Overlays
   ═══════════════════════════════════════════════════════════ */

const overlayBase: React.CSSProperties = {
  position: "absolute",
  background: "rgba(0,0,0,0.7)",
  borderRadius: 12,
  padding: "16px 20px",
  color: "#fff",
  fontFamily: "monospace",
  fontSize: 13,
  lineHeight: 1.8,
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
};

function Legend() {
  return (
    <div style={{ ...overlayBase, bottom: 24, left: 24 }}>
      <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 8 }}>Legend</div>
      <div><span style={{ color: "#00ff88" }}>&#9679;</span> YES vote (green)</div>
      <div><span style={{ color: "#ff4455" }}>&#9679;</span> NO vote (red)</div>
      <div style={{ marginTop: 6 }}>
        &#9670; Proof &nbsp; &#9632; Source &nbsp; &#9679; Reference
      </div>
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
      <div style={{ marginTop: 6, color: TRUTH_COLOR, fontWeight: "bold" }}>
        Resolution: {RESOLUTION}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{
      position: "absolute", top: 20, left: 0, right: 0,
      textAlign: "center", color: "#fff", fontFamily: "monospace", zIndex: 10,
      pointerEvents: "none",
    }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
        AI Oracle Agent Discussion Graph
      </h1>
      <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
        Drag to rotate &middot; Scroll to zoom &middot; Hover agents to highlight connections
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */

export default function TestPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div style={{ width: "100vw", height: "100vh", background: "#000" }} />;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative" }}>
      <Canvas camera={{ position: [0, 15, 30], fov: 60 }}>
        <Scene />
      </Canvas>
      <Header />
      <Legend />
      <Stats />
    </div>
  );
}
