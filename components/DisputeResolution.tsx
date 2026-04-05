import { useState, useCallback } from "react";

interface DisputeResolutionProps {
  marketId: string;
}

export default function DisputeResolution({ marketId }: DisputeResolutionProps) {
  const [disputeStep, setDisputeStep] = useState(1);
  const [animating, setAnimating] = useState(false);

  const startDispute = useCallback(async () => {
    setAnimating(true);
    setDisputeStep(2);
    let step = 2;

    // Trigger backend dispute orchestration
    try {
      await fetch(`https://localhost:3001/dispute/${marketId}`, {
        method: "POST",
      });
    } catch {
      // orchestrator may not be running
    }

    const interval = setInterval(() => {
      step++;
      setDisputeStep(step);
      if (step >= 6) {
        clearInterval(interval);
        setAnimating(false);
      }
    }, 5000);
  }, [marketId]);

  const gavelIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 4.5L11 2l5 5-2.5 2.5" />
      <path d="M6 7l5 5" />
      <path d="M4 14l3.5-3.5 5 5L9 19" />
      <line x1="5" y1="21" x2="19" y2="21" />
    </svg>
  );

  const chatIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );

  const allSteps = [
    { label: "Outcome proposed: Yes", sub: null, icon: null },
    { label: "Dispute window", sub: "Bond: 750 USDC", icon: gavelIcon },
    { label: "First round voting", sub: "Result: Unsure", icon: null },
    { label: "Discussion", sub: "3 agents debated", icon: chatIcon },
    { label: "Second round voting", sub: "Result: Yes", icon: null },
    { label: "Final outcome", sub: null, icon: null },
  ];

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-100 p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Resolution
      </p>
      <p className="mb-6 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Dispute resolution tracker
      </p>

      <div className="flex flex-col gap-3">
        {allSteps.map((s, i, arr) => {
          const isDone = i < disputeStep;
          const isActive = i === disputeStep;

          return (
            <div key={i} className="flex items-start gap-3">
              {/* Dot + vertical connector */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-700 ${
                    s.icon
                      ? isActive
                        ? "bg-zinc-300 text-zinc-700 ring-[2px] ring-inset ring-blue-500 dark:bg-zinc-600 dark:text-zinc-300"
                        : "bg-zinc-300 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-300"
                      : isDone
                        ? "bg-blue-500 text-white"
                        : isActive
                          ? "border-[2px] border-blue-500 bg-white text-blue-500 dark:bg-zinc-900"
                          : "border-[2px] border-zinc-300 bg-white text-zinc-300 dark:border-zinc-600 dark:bg-zinc-900"
                  }`}
                >
                  {s.icon
                    ? s.icon
                    : isDone
                      ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )
                      : null}
                </div>
                {i < arr.length - 1 && (
                  <div
                    className={`w-[2px] h-4 transition-colors duration-700 ${
                      isDone ? "bg-blue-500" : "bg-zinc-200 dark:bg-zinc-700"
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pt-1">
                <div
                  className={`text-xs font-semibold transition-colors duration-700 ${
                    isDone
                      ? "text-zinc-900 dark:text-zinc-100"
                      : isActive
                        ? "text-blue-500"
                        : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {s.label}
                </div>
                {s.sub && isDone && (
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{s.sub}</div>
                )}
                {isActive && i === 1 && disputeStep === 1 && (
                  <div className="text-[11px] text-blue-500 font-semibold mt-0.5">1h 47m remaining</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dispute button */}
      {disputeStep === 1 && (
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Bond:</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">750 USDC</span>
          </div>
          <button
            onClick={startDispute}
            className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs transition-colors active:scale-[0.98]"
          >
            Dispute &amp; Submit Bond
          </button>
        </div>
      )}

      {/* Progress / result */}
      {disputeStep >= 2 && (
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          {disputeStep < 6 && (
            <div className="flex items-start gap-2">
              <div className="w-3.5 h-3.5 mt-0.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <span className="text-xs text-blue-500 font-semibold">Processing dispute...</span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {disputeStep === 2 && "Bond of 750 USDC locked."}
                  {disputeStep >= 3 && disputeStep < 6 && "Bond cannot be returned after final result."}
                </p>
              </div>
            </div>
          )}

          {disputeStep >= 6 && !animating && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Market resolved: <span className="text-blue-500">Yes</span>
                </span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-900/20 dark:border-red-800">
                <div className="text-xs font-bold text-red-700 dark:text-red-400 mb-0.5">Bond slashed</div>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Result didn&apos;t change. Your bond of <span className="font-bold">750 USDC</span> has been slashed.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
