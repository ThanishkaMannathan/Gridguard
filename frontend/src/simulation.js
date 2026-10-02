/**
 * simulation.js – GridGuard Simulation Engine
 * Generates synthetic electrical parameters and waveforms for SIMULATION MODE.
 * ⚠️ All values are simulated. Not real grid measurements.
 */

export const FAULT_SCENARIOS = {
  NORMAL: {
    label: "Normal Condition",
    icon: "🟢",
    Va: 230, Vb: 230, Vc: 230,
    Ia: 100, Ib: 100, Ic: 100,
    frequency: 50.0,
    powerFactor: 0.92,
    activePower: 63.25,
    reactivePower: 26.2,
    voltageUnbalance: 0.2,
    currentUnbalance: 0.3,
    faultType: "NONE",
    severity: "Normal",
    faultLocation: null,
    affectedPhase: "None",
    description: "System operating within normal parameters.",
  },
  LG: {
    label: "L-G Fault (Phase A to Ground)",
    icon: "🔴",
    Va: 20, Vb: 230, Vc: 230,
    Ia: 480, Ib: 100, Ic: 100,
    frequency: 49.8,
    powerFactor: 0.61,
    activePower: 28.4,
    reactivePower: 18.9,
    voltageUnbalance: 31.2,
    currentUnbalance: 58.7,
    faultType: "LG",
    severity: "Critical",
    faultLocation: 34.5,
    affectedPhase: "A",
    description: "Single line-to-ground fault detected on Phase A.",
  },
  LL: {
    label: "L-L Fault (Phase A-B)",
    icon: "🔴",
    Va: 95, Vb: 95, Vc: 230,
    Ia: 320, Ib: 320, Ic: 100,
    frequency: 49.9,
    powerFactor: 0.54,
    activePower: 33.1,
    reactivePower: 26.8,
    voltageUnbalance: 22.4,
    currentUnbalance: 44.5,
    faultType: "LL",
    severity: "High",
    faultLocation: 52.3,
    affectedPhase: "A-B",
    description: "Line-to-line fault detected between Phase A and Phase B.",
  },
  LLG: {
    label: "L-L-G Fault (Phase A-B to Ground)",
    icon: "🔴",
    Va: 40, Vb: 40, Vc: 230,
    Ia: 420, Ib: 410, Ic: 100,
    frequency: 49.7,
    powerFactor: 0.48,
    activePower: 22.3,
    reactivePower: 20.1,
    voltageUnbalance: 28.6,
    currentUnbalance: 56.3,
    faultType: "LLG",
    severity: "Critical",
    faultLocation: 28.7,
    affectedPhase: "A-B",
    description: "Double line-to-ground fault on Phase A and Phase B.",
  },
  LLL: {
    label: "Three-Phase Fault",
    icon: "🔴",
    Va: 10, Vb: 10, Vc: 10,
    Ia: 650, Ib: 650, Ic: 650,
    frequency: 49.5,
    powerFactor: 0.12,
    activePower: 5.8,
    reactivePower: 47.2,
    voltageUnbalance: 1.1,
    currentUnbalance: 1.5,
    faultType: "LLL",
    severity: "Critical",
    faultLocation: 18.2,
    affectedPhase: "A-B-C",
    description: "Symmetrical three-phase fault affecting all phases.",
  },
  VOLTAGE_IMBALANCE: {
    label: "Voltage Imbalance",
    icon: "🟠",
    Va: 210, Vb: 245, Vc: 218,
    Ia: 110, Ib: 130, Ic: 115,
    frequency: 50.0,
    powerFactor: 0.84,
    activePower: 58.7,
    reactivePower: 32.4,
    voltageUnbalance: 7.8,
    currentUnbalance: 9.2,
    faultType: "NONE",
    severity: "Warning",
    faultLocation: null,
    affectedPhase: "B",
    description: "Significant voltage imbalance detected across phases.",
  },
  OVERLOAD: {
    label: "Overload Condition",
    icon: "🟠",
    Va: 215, Vb: 213, Vc: 214,
    Ia: 185, Ib: 183, Ic: 184,
    frequency: 49.8,
    powerFactor: 0.88,
    activePower: 110.4,
    reactivePower: 52.1,
    voltageUnbalance: 0.8,
    currentUnbalance: 0.6,
    faultType: "NONE",
    severity: "High",
    faultLocation: null,
    affectedPhase: "A-B-C",
    description: "System overloaded. Currents exceed rated capacity.",
  },
};

/**
 * Generate three-phase waveform data for a given scenario.
 * Returns 200 sample points at 50 Hz.
 */
export function generateWaveform(scenario, addFault = false) {
  const points = 200;
  const f = 50;
  const fs = 10000; // samples/sec
  const dt = 1 / fs;
  const Vm_a = (scenario.Va || 230) * Math.sqrt(2);
  const Vm_b = (scenario.Vb || 230) * Math.sqrt(2);
  const Vm_c = (scenario.Vc || 230) * Math.sqrt(2);
  const Im_a = (scenario.Ia || 100) * Math.sqrt(2);
  const Im_b = (scenario.Ib || 100) * Math.sqrt(2);
  const Im_c = (scenario.Ic || 100) * Math.sqrt(2);
  const phi = Math.acos(Math.max(0.01, scenario.powerFactor || 0.9));

  const data = [];
  for (let i = 0; i < points; i++) {
    const t = i * dt;
    const faultStart = addFault ? 0.004 : 9999;
    const inFault = t >= faultStart;

    const faultFactor_a = inFault && (scenario.affectedPhase?.includes("A")) ? 0.08 : 1.0;
    const faultFactor_b = inFault && (scenario.affectedPhase?.includes("B")) ? 0.08 : 1.0;
    const faultFactor_c = inFault && (scenario.affectedPhase?.includes("C")) ? 0.08 : 1.0;
    const currentBoost_a = inFault && (scenario.affectedPhase?.includes("A")) ? 4.5 : 1.0;
    const currentBoost_b = inFault && (scenario.affectedPhase?.includes("B")) ? 4.5 : 1.0;
    const currentBoost_c = inFault && (scenario.affectedPhase?.includes("C")) ? 4.5 : 1.0;

    const noise = () => (Math.random() - 0.5) * 2;

    data.push({
      t: parseFloat(t.toFixed(5)),
      Va: parseFloat((Vm_a * faultFactor_a * Math.sin(2 * Math.PI * f * t) + noise()).toFixed(2)),
      Vb: parseFloat((Vm_b * faultFactor_b * Math.sin(2 * Math.PI * f * t - (2 * Math.PI) / 3) + noise()).toFixed(2)),
      Vc: parseFloat((Vm_c * faultFactor_c * Math.sin(2 * Math.PI * f * t + (2 * Math.PI) / 3) + noise()).toFixed(2)),
      Ia: parseFloat((Im_a * currentBoost_a * Math.sin(2 * Math.PI * f * t - phi) + noise()).toFixed(2)),
      Ib: parseFloat((Im_b * currentBoost_b * Math.sin(2 * Math.PI * f * t - (2 * Math.PI) / 3 - phi) + noise()).toFixed(2)),
      Ic: parseFloat((Im_c * currentBoost_c * Math.sin(2 * Math.PI * f * t + (2 * Math.PI) / 3 - phi) + noise()).toFixed(2)),
    });
  }
  return data;
}

/**
 * Compute grid health score (0–100) from simulation parameters.
 */
export function computeGridHealth(params) {
  const {
    Va = 230, Vb = 230, Vc = 230,
    Ia = 100, Ib = 100, Ic = 100,
    frequency = 50,
    powerFactor = 0.9,
    voltageUnbalance = 0,
    currentUnbalance = 0,
  } = params;

  // Voltage stability: penalize deviation from 230 V
  const vNom = 230;
  const vDevA = Math.abs(Va - vNom) / vNom;
  const vDevB = Math.abs(Vb - vNom) / vNom;
  const vDevC = Math.abs(Vc - vNom) / vNom;
  const vStab = Math.max(0, 100 - (vDevA + vDevB + vDevC) * 100);

  // Frequency stability: penalize deviation from 50 Hz
  const fDev = Math.abs(frequency - 50) / 50;
  const fStab = Math.max(0, 100 - fDev * 1000);

  // Phase balance
  const vUBal = Math.max(0, 100 - voltageUnbalance * 5);
  const iUBal = Math.max(0, 100 - currentUnbalance * 4);

  // Power factor
  const pfScore = Math.max(0, (powerFactor - 0.5) / 0.5 * 100);

  // Current within limits (rated = 150 A)
  const ratedCurrent = 150;
  const cLoad = Math.max(0, 100 - (Math.max(Ia, Ib, Ic) / ratedCurrent - 0.8) * 200);

  const score = vStab * 0.3 + fStab * 0.2 + vUBal * 0.2 + iUBal * 0.1 + pfScore * 0.1 + cLoad * 0.1;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute fault risk percentage from parameters.
 */
export function computeFaultRisk(params) {
  const health = computeGridHealth(params);
  return Math.max(0, Math.min(100, 100 - health));
}

/**
 * Get risk level string from risk percentage.
 */
export function getRiskLevel(riskPct) {
  if (riskPct < 20) return { label: "Low", color: "#3ADC8C", bg: "bg-green-500/10", border: "border-green-500/30" };
  if (riskPct < 45) return { label: "Medium", color: "#F5A623", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  if (riskPct < 70) return { label: "High", color: "#FF8C42", bg: "bg-orange-500/10", border: "border-orange-500/30" };
  return { label: "Critical", color: "#FF5470", bg: "bg-red-500/10", border: "border-red-500/30" };
}

/**
 * Generate fake XAI (Explainable AI) factors for a given scenario.
 */
export function generateXAIFactors(scenario) {
  const factors = [];
  const { Va, Vb, Vc, Ia, Ib, Ic, voltageUnbalance, currentUnbalance, frequency, powerFactor } = scenario;

  if (voltageUnbalance > 5) {
    factors.push({ name: "Voltage Unbalance", value: `${voltageUnbalance.toFixed(1)}%`, impact: "High", direction: "↑", description: "High voltage unbalance is a key indicator of asymmetric fault." });
  }
  if (currentUnbalance > 10) {
    factors.push({ name: "Current Unbalance", value: `${currentUnbalance.toFixed(1)}%`, impact: "High", direction: "↑", description: "Significant current unbalance indicates fault current injection on one phase." });
  }
  if (Math.abs(frequency - 50) > 0.2) {
    factors.push({ name: "Frequency Deviation", value: `${frequency.toFixed(2)} Hz`, impact: "Medium", direction: frequency < 50 ? "↓" : "↑", description: "Frequency deviation indicates power imbalance due to fault loading." });
  }
  if (powerFactor < 0.7) {
    factors.push({ name: "Power Factor", value: powerFactor.toFixed(2), impact: "Medium", direction: "↓", description: "Low power factor indicates high reactive power demand, typical in fault conditions." });
  }
  if (Va < 100) {
    factors.push({ name: "Phase A Voltage Collapse", value: `${Va} V`, impact: "Critical", direction: "↓", description: "Phase A voltage has collapsed significantly, strongly indicating an L-G or L-L fault." });
  }
  if (Ia > 300) {
    factors.push({ name: "Phase A Overcurrent", value: `${Ia} A`, impact: "Critical", direction: "↑", description: "Phase A current is far above rated value, consistent with fault current flow." });
  }
  if (Ib > 300) {
    factors.push({ name: "Phase B Overcurrent", value: `${Ib} A`, impact: "High", direction: "↑", description: "Phase B current is above rated value, indicating phase involvement in fault." });
  }

  if (factors.length === 0) {
    factors.push({ name: "All Parameters Normal", value: "Nominal", impact: "Low", direction: "→", description: "All electrical parameters are within acceptable operating ranges." });
  }
  return factors;
}

/**
 * Live monitoring simulation – returns a tick of updated data.
 */
export function liveMonitorTick(baseScenario) {
  const noise = (v, pct = 0.01) => v + (Math.random() - 0.5) * v * pct;
  return {
    Va: parseFloat(noise(baseScenario.Va || 230, 0.005).toFixed(1)),
    Vb: parseFloat(noise(baseScenario.Vb || 230, 0.005).toFixed(1)),
    Vc: parseFloat(noise(baseScenario.Vc || 230, 0.005).toFixed(1)),
    Ia: parseFloat(noise(baseScenario.Ia || 100, 0.01).toFixed(1)),
    Ib: parseFloat(noise(baseScenario.Ib || 100, 0.01).toFixed(1)),
    Ic: parseFloat(noise(baseScenario.Ic || 100, 0.01).toFixed(1)),
    frequency: parseFloat(noise(baseScenario.frequency || 50, 0.002).toFixed(3)),
    powerFactor: parseFloat(Math.min(1, Math.max(0, noise(baseScenario.powerFactor || 0.9, 0.005))).toFixed(3)),
    activePower: parseFloat(noise(baseScenario.activePower || 63, 0.01).toFixed(2)),
    reactivePower: parseFloat(noise(baseScenario.reactivePower || 26, 0.01).toFixed(2)),
    timestamp: Date.now(),
  };
}
