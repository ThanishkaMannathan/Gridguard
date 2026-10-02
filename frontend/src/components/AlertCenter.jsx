/**
 * AlertCenter.jsx – Real-time alert banner system.
 * Shows 🟢 Normal | 🟡 Warning | 🟠 Abnormal | 🔴 Critical
 */
import { useEffect, useState } from "react";

const LEVELS = {
  Normal:   { emoji: "🟢", color: "text-signal-green",  bg: "bg-signal-green/10",  border: "border-signal-green/30" },
  Warning:  { emoji: "🟡", color: "text-signal-amber",  bg: "bg-signal-amber/10",  border: "border-signal-amber/30" },
  Abnormal: { emoji: "🟠", color: "text-orange-400",    bg: "bg-orange-400/10",    border: "border-orange-400/30"   },
  Critical: { emoji: "🔴", color: "text-signal-red",    bg: "bg-signal-red/10",    border: "border-signal-red/30"   },
  High:     { emoji: "🟠", color: "text-orange-400",    bg: "bg-orange-400/10",    border: "border-orange-400/30"   },
};

export default function AlertCenter({ alerts }) {
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    setDismissed([]);
  }, [alerts]);

  const visible = (alerts || []).filter((a, i) => !dismissed.includes(i));
  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      {visible.map((alert, i) => {
        const lvl = LEVELS[alert.level] || LEVELS.Normal;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${lvl.bg} ${lvl.border}`}
          >
            <span className="text-xl shrink-0">{lvl.emoji}</span>
            <div className="flex-1 min-w-0">
              <span className={`font-semibold ${lvl.color}`}>{alert.level}: </span>
              <span className="text-ink-primary">{alert.message}</span>
              {alert.timestamp && (
                <span className="text-ink-faint text-xs ml-2 font-mono">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            <button
              onClick={() => setDismissed((d) => [...d, i])}
              className="text-ink-faint hover:text-ink-primary transition text-lg leading-none shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compute alerts from current simulation parameters.
 */
export function computeAlerts(params, severity) {
  const alerts = [];
  const ts = Date.now();

  if (severity === "Critical") {
    alerts.push({ level: "Critical", message: `Fault detected: ${params.faultType || "Unknown"} on Phase ${params.affectedPhase || "?"}. Immediate action required!`, timestamp: ts });
  } else if (severity === "High") {
    alerts.push({ level: "Abnormal", message: `High severity condition detected. Voltage/current outside safe limits.`, timestamp: ts });
  } else if (severity === "Warning") {
    alerts.push({ level: "Warning", message: `System showing abnormal parameters. Monitor closely.`, timestamp: ts });
  }

  if (params.voltageUnbalance > 10) {
    alerts.push({ level: "Warning", message: `Voltage unbalance is ${params.voltageUnbalance?.toFixed(1)}% — exceeds 5% limit.`, timestamp: ts });
  }
  if (params.currentUnbalance > 15) {
    alerts.push({ level: "Abnormal", message: `Current unbalance is ${params.currentUnbalance?.toFixed(1)}% — check load and protection.`, timestamp: ts });
  }
  if (Math.abs((params.frequency || 50) - 50) > 0.5) {
    alerts.push({ level: "Warning", message: `Frequency deviation: ${params.frequency?.toFixed(3)} Hz — grid frequency instability.`, timestamp: ts });
  }
  if (!alerts.length) {
    alerts.push({ level: "Normal", message: "All parameters within normal operating range. System healthy.", timestamp: ts });
  }
  return alerts;
}
