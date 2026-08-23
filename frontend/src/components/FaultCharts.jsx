import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function Metric({ label, value, unit, accent }) {
  return (
    <div className="panel px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="data-value text-xl mt-1" style={{ color: accent }}>
        {value}
        <span className="text-xs text-ink-muted ml-1">{unit}</span>
      </p>
    </div>
  );
}

export default function FaultCharts({ record }) {
  if (!record) return null;
  const { waveform } = record;

  const voltageData = waveform
    ? waveform.Va.map((v, i) => ({
        i,
        Va: v,
        Vb: waveform.Vb[i],
        Vc: waveform.Vc[i],
      }))
    : [];

  const currentData = waveform
    ? waveform.Ia.map((v, i) => ({
        i,
        Ia: v,
        Ib: waveform.Ib[i],
        Ic: waveform.Ic[i],
      }))
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Frequency" value={record.frequency_hz} unit="Hz" accent="#2FD9D2" />
        <Metric label="Voltage Unbalance" value={record.voltage_unbalance_pct} unit="%" accent="#F5A623" />
        <Metric label="Current Unbalance" value={record.current_unbalance_pct} unit="%" accent="#F5A623" />
        <Metric label="Duration" value={record.duration_ms || 0} unit="ms" accent="#8B7CF6" />
      </div>

      <div className="panel p-4">
        <p className="eyebrow mb-2">Phase Voltage — one cycle (V)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={voltageData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
            <XAxis dataKey="i" stroke="#5A6B8C" tick={{ fontSize: 10 }} />
            <YAxis stroke="#5A6B8C" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Va" stroke="#2FD9D2" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="Vb" stroke="#F5A623" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="Vc" stroke="#8B7CF6" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel p-4">
        <p className="eyebrow mb-2">Phase Current — one cycle (A)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={currentData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#1B2740" strokeDasharray="3 3" />
            <XAxis dataKey="i" stroke="#5A6B8C" tick={{ fontSize: 10 }} />
            <YAxis stroke="#5A6B8C" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #233049", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Ia" stroke="#FF5470" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="Ib" stroke="#F5A623" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="Ic" stroke="#3ADC8C" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
