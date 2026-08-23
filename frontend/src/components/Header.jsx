export default function Header({ apiOnline }) {
  return (
    <header className="border-b border-border bg-bg-panel/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <svg width="44" height="30" viewBox="0 0 44 30" className="shrink-0">
            <path d="M0 15 Q 5.5 2, 11 15 T 22 15" fill="none" stroke="#2FD9D2" strokeWidth="1.6" />
            <path d="M0 15 Q 5.5 22, 11 15 T 22 15 T 33 15" fill="none" stroke="#F5A623" strokeWidth="1.6" opacity="0.8" />
            <path d="M0 15 Q 5.5 9, 11 15 T 22 15 T 33 15 T 44 15" fill="none" stroke="#8B7CF6" strokeWidth="1.6" opacity="0.65" />
          </svg>
          <div>
            <h1 className="font-display font-semibold text-lg leading-none tracking-tight">
              Grid<span className="text-signal-cyan">Guard</span>
            </h1>
            <p className="eyebrow mt-1">AI Power System Fault Diagnosis</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
          <span
            className={`w-2 h-2 rounded-full ${apiOnline ? "bg-signal-green" : "bg-signal-red"} ${apiOnline ? "" : "animate-blink"}`}
          />
          <span className="text-xs font-mono text-ink-muted">
            {apiOnline ? "BACKEND ONLINE" : "BACKEND OFFLINE"}
          </span>
        </div>
      </div>
    </header>
  );
}
