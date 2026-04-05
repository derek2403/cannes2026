import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { AgentDiscussionGraphProps } from "@/components/AgentDiscussionGraph";

const AgentDiscussionGraph = dynamic<AgentDiscussionGraphProps>(
  () => import("@/components/AgentDiscussionGraph"),
  { ssr: false },
);

const TRUTH_COLOR = "#00ff88";

const btnBase: React.CSSProperties = {
  position: "absolute", left: "50%", bottom: 40, transform: "translateX(-50%)",
  padding: "14px 36px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(0,0,0,0.8)", color: "#fff", fontFamily: "monospace",
  fontSize: 15, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(10px)",
  transition: "all 0.2s", zIndex: 20,
};

const STAGE_LABELS: Record<number, string> = {
  1: "Select Oracle Agents",
  5: "Reset",
};

export default function TestPage() {
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(1);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <AgentDiscussionGraph stage={stage} />

      {stage === 1 && (
        <button
          style={btnBase}
          onClick={() => setStage(2)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = TRUTH_COLOR; e.currentTarget.style.color = TRUTH_COLOR; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#fff"; }}
        >
          {STAGE_LABELS[1]}
        </button>
      )}

      {stage === 5 && (
        <button
          style={{ ...btnBase, fontSize: 12, padding: "10px 24px", opacity: 0.6 }}
          onClick={() => setStage(1)}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
        >
          {STAGE_LABELS[5]}
        </button>
      )}
    </div>
  );
}
