"""
GridGuard synthetic fault-record generator.

We first try to source a real dataset (Kaggle: "Electrical Fault detection and
classification" style datasets, three-phase Ia/Ib/Ic/Va/Vb/Vc records). Kaggle
requires network + credentials which are not guaranteed in every environment,
so this script always falls back to generating a physically-plausible
synthetic dataset of three-phase voltage/current/frequency fault records.

Fault types modeled (standard power-system protection taxonomy):
  NONE  - healthy / no fault
  LG    - single line-to-ground fault
  LL    - line-to-line fault
  LLG   - double line-to-ground fault
  LLL   - three-phase (symmetrical) fault
  LLLG  - three-phase-to-ground fault

For each record we synthesize one electrical cycle (128 samples) of the three
phase voltages and currents at a nominal 50 Hz, inject the fault signature
(sag/swell, phase imbalance, harmonic content, frequency deviation), and
compute summary features used by the ML classifier.

Run: python generate_synthetic_data.py
Output: fault_dataset.csv (summary/features, one row per record) and
        waveforms.json (per-record raw sample arrays used for charting)
"""
import json
import os
import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

FAULT_TYPES = ["NONE", "LG", "LL", "LLG", "LLL", "LLLG"]
SAMPLES_PER_CYCLE = 128
NOMINAL_FREQ = 50.0
NOMINAL_V = 230.0  # phase-to-neutral RMS volts
NOMINAL_I = 100.0  # nominal load current amps

OUT_DIR = os.path.dirname(os.path.abspath(__file__))


def make_waveform(v_scale, i_scale, freq, phase_shift_deg, noise=0.02, harmonic=0.0):
    t = np.linspace(0, 1 / NOMINAL_FREQ, SAMPLES_PER_CYCLE, endpoint=False)
    w = 2 * np.pi * freq
    phi = np.deg2rad(phase_shift_deg)
    fundamental_v = v_scale * np.sqrt(2) * np.sin(w * t + phi)
    fundamental_i = i_scale * np.sqrt(2) * np.sin(w * t + phi - np.deg2rad(20))
    if harmonic > 0:
        fundamental_v += harmonic * v_scale * np.sqrt(2) * np.sin(5 * w * t + phi)
        fundamental_i += harmonic * i_scale * np.sqrt(2) * np.sin(5 * w * t + phi)
    fundamental_v += RNG.normal(0, noise * v_scale, SAMPLES_PER_CYCLE)
    fundamental_i += RNG.normal(0, noise * i_scale, SAMPLES_PER_CYCLE)
    return fundamental_v, fundamental_i


def synth_record(record_id, fault_type):
    freq = NOMINAL_FREQ + RNG.normal(0, 0.03)
    v_scales = {"A": 1.0, "B": 1.0, "C": 1.0}
    i_scales = {"A": 1.0, "B": 1.0, "C": 1.0}
    harmonic = 0.02
    fault_res_ohm = None
    fault_location_pct = None
    duration_ms = 0

    if fault_type != "NONE":
        fault_location_pct = float(RNG.uniform(2, 98))
        fault_res_ohm = float(RNG.uniform(0.1, 15))
        duration_ms = float(RNG.uniform(20, 180))
        freq += RNG.normal(0, 0.35)
        harmonic += RNG.uniform(0.03, 0.12)

    if fault_type == "LG":
        faulted = RNG.choice(["A", "B", "C"])
        v_scales[faulted] *= RNG.uniform(0.15, 0.5)
        i_scales[faulted] *= RNG.uniform(3.0, 9.0)
    elif fault_type == "LL":
        p1, p2 = RNG.choice(["A", "B", "C"], size=2, replace=False)
        for p in (p1, p2):
            v_scales[p] *= RNG.uniform(0.3, 0.65)
            i_scales[p] *= RNG.uniform(2.5, 6.0)
    elif fault_type == "LLG":
        p1, p2 = RNG.choice(["A", "B", "C"], size=2, replace=False)
        for p in (p1, p2):
            v_scales[p] *= RNG.uniform(0.1, 0.4)
            i_scales[p] *= RNG.uniform(4.0, 9.0)
    elif fault_type == "LLL":
        for p in ("A", "B", "C"):
            v_scales[p] *= RNG.uniform(0.1, 0.3)
            i_scales[p] *= RNG.uniform(6.0, 12.0)
    elif fault_type == "LLLG":
        for p in ("A", "B", "C"):
            v_scales[p] *= RNG.uniform(0.05, 0.2)
            i_scales[p] *= RNG.uniform(7.0, 14.0)

    phases = {}
    for idx, p in enumerate(["A", "B", "C"]):
        shift = -120 * idx
        v_wave, i_wave = make_waveform(
            NOMINAL_V * v_scales[p], NOMINAL_I * i_scales[p], freq, shift, harmonic=harmonic
        )
        phases[p] = {"v": v_wave, "i": i_wave}

    def rms(x):
        return float(np.sqrt(np.mean(np.square(x))))

    Va, Vb, Vc = rms(phases["A"]["v"]), rms(phases["B"]["v"]), rms(phases["C"]["v"])
    Ia, Ib, Ic = rms(phases["A"]["i"]), rms(phases["B"]["i"]), rms(phases["C"]["i"])

    v_avg = (Va + Vb + Vc) / 3
    i_avg = (Ia + Ib + Ic) / 3
    v_unbalance = float(max(abs(Va - v_avg), abs(Vb - v_avg), abs(Vc - v_avg)) / v_avg * 100)
    i_unbalance = float(max(abs(Ia - i_avg), abs(Ib - i_avg), abs(Ic - i_avg)) / i_avg * 100)
    zero_seq_v = float(abs(Va + Vb + Vc) / 3)
    zero_seq_i = float(abs(Ia + Ib + Ic) / 3)

    row = {
        "record_id": record_id,
        "fault_type": fault_type,
        "Va_rms": round(Va, 2), "Vb_rms": round(Vb, 2), "Vc_rms": round(Vc, 2),
        "Ia_rms": round(Ia, 2), "Ib_rms": round(Ib, 2), "Ic_rms": round(Ic, 2),
        "frequency_hz": round(float(freq), 3),
        "voltage_unbalance_pct": round(v_unbalance, 2),
        "current_unbalance_pct": round(i_unbalance, 2),
        "zero_seq_voltage": round(zero_seq_v, 2),
        "zero_seq_current": round(zero_seq_i, 2),
        "fault_resistance_ohm": round(fault_res_ohm, 2) if fault_res_ohm else None,
        "fault_location_pct": round(fault_location_pct, 1) if fault_location_pct else None,
        "duration_ms": round(duration_ms, 1) if duration_ms else 0,
    }

    waveform = {
        "record_id": record_id,
        "samples": SAMPLES_PER_CYCLE,
        "Va": phases["A"]["v"].round(2).tolist(),
        "Vb": phases["B"]["v"].round(2).tolist(),
        "Vc": phases["C"]["v"].round(2).tolist(),
        "Ia": phases["A"]["i"].round(2).tolist(),
        "Ib": phases["B"]["i"].round(2).tolist(),
        "Ic": phases["C"]["i"].round(2).tolist(),
    }
    return row, waveform


def generate(n_per_class=60):
    rows, waveforms = [], {}
    rid = 1
    for ftype in FAULT_TYPES:
        for _ in range(n_per_class):
            record_id = f"FR-{rid:05d}"
            row, wf = synth_record(record_id, ftype)
            rows.append(row)
            waveforms[record_id] = wf
            rid += 1
    df = pd.DataFrame(rows).sample(frac=1, random_state=7).reset_index(drop=True)
    return df, waveforms


if __name__ == "__main__":
    df, waveforms = generate(n_per_class=60)
    csv_path = os.path.join(OUT_DIR, "fault_dataset.csv")
    wf_path = os.path.join(OUT_DIR, "waveforms.json")
    df.to_csv(csv_path, index=False)
    with open(wf_path, "w") as f:
        json.dump(waveforms, f)
    print(f"Generated {len(df)} records -> {csv_path}")
    print(f"Waveforms -> {wf_path}")
    print(df["fault_type"].value_counts())
