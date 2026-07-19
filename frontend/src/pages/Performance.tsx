import { useEffect, useMemo, useState } from "react";
import {
  Gauge,
  Cpu,
  MemoryStick,
  HardDrive,
  Network as NetworkIcon,
  TrendingUp,
  TrendingDown,
  Activity,
  ListOrdered,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ---- Types ----
type RangeKey = "1h" | "6h" | "24h";

interface SeriesPoint {
  t: string;
  cpu: number;
  mem: number;
  disk: number;
  netUp: number; // MB/s
  netDown: number; // MB/s
  diskRead: number; // MB/s
  diskWrite: number; // MB/s
}

interface CurrentLoad {
  cpu: number;
  memory: number;
  disk: number;
  netIo: number; // MB/s combined
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
  processCount: number;
  runningThreads: number;
}

// ---- Demo data generation (deterministic per range) ----
const RANGES: { key: RangeKey; label: string; points: number; testId: string }[] = [
  { key: "1h", label: "1 Hour", points: 12, testId: "performance-range-1h" },
  { key: "6h", label: "6 Hours", points: 12, testId: "performance-range-6h" },
  { key: "24h", label: "24 Hours", points: 12, testId: "performance-range-24h" },
];

function labelFor(index: number, range: RangeKey): string {
  const now = new Date();
  let stepMs = 0;
  if (range === "1h") stepMs = 5 * 60 * 1000;
  if (range === "6h") stepMs = 30 * 60 * 1000;
  if (range === "24h") stepMs = 2 * 60 * 60 * 1000;
  const totalSteps = 11; // 12 points
  const d = new Date(now.getTime() - (totalSteps - index) * stepMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildSeries(range: RangeKey): SeriesPoint[] {
  const count = 12;
  const seed = range === "1h" ? 3 : range === "6h" ? 7 : 13;
  const points: SeriesPoint[] = [];
  for (let i = 0; i < count; i++) {
    const wave = Math.sin((i + seed) / 1.8) * 18;
    const drift = (i / count) * 12;
    const cpu = Math.max(5, Math.min(96, Math.round(42 + wave + drift - 6)));
    const mem = Math.max(10, Math.min(94, Math.round(48 + wave * 0.7 + drift * 0.6)));
    const disk = Math.max(20, Math.min(92, Math.round(64 + wave * 0.4 + drift * 0.3)));
    const netUp = Math.max(0.4, +(2 + Math.cos((i + seed) / 2) * 1.6 + (i % 3) * 0.4).toFixed(1));
    const netDown = Math.max(0.6, +(5 + Math.sin((i + seed) / 2.2) * 3 + (i % 4) * 0.5).toFixed(1));
    const diskRead = Math.max(0.3, +(1.4 + Math.sin((i + seed) / 2.5) * 1.1 + (i % 2) * 0.3).toFixed(1));
    const diskWrite = Math.max(0.2, +(0.9 + Math.cos((i + seed) / 2.7) * 0.8 + (i % 3) * 0.25).toFixed(1));
    points.push({ t: labelFor(i, range), cpu, mem, disk, netUp, netDown, diskRead, diskWrite });
  }
  return points;
}

function buildCurrent(range: RangeKey): CurrentLoad {
  const s = range === "1h" ? 2 : range === "6h" ? 5 : 9;
  return {
    cpu: Math.max(8, Math.min(95, 47 + ((s * 3) % 19))),
    memory: Math.max(15, Math.min(92, 55 + ((s * 5) % 14))),
    disk: Math.max(30, Math.min(95, 68 + ((s * 2) % 16))),
    netIo: +(2.4 + (s % 6) * 0.7).toFixed(1),
    loadAvg1: +(0.8 + (s % 5) * 0.4).toFixed(2),
    loadAvg5: +(0.6 + (s % 4) * 0.35).toFixed(2),
    loadAvg15: +(0.5 + (s % 3) * 0.3).toFixed(2),
    processCount: 1400 - (s % 80),
    runningThreads: 3200 + (s * 11) % 240,
  };
}

// ---- SVG chart helpers (percent-based) ----
const W = 600;
const H = 180;
const PAD = 28;

function buildPathPct(points: number[]): string {
  if (points.length === 0) return "";
  const max = 100;
  const stepX = (W - PAD * 2) / (points.length - 1);
  return points
    .map((p, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - (Math.min(p, max) / max) * (H - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPct(points: number[]): string {
  if (points.length === 0) return "";
  const line = buildPathPct(points);
  const stepX = (W - PAD * 2) / (points.length - 1);
  const lastX = PAD + (points.length - 1) * stepX;
  return `${line} L${lastX.toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;
}

function buildPathScaled(points: number[], max: number): string {
  if (points.length === 0) return "";
  const stepX = (W - PAD * 2) / (points.length - 1);
  return points
    .map((p, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - (Math.min(p, max) / max) * (H - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function Performance() {
  const [range, setRange] = useState<RangeKey>("24h");
  const [series, setSeries] = useState<SeriesPoint[]>(() => buildSeries("24h"));
  const [current, setCurrent] = useState<CurrentLoad>(() => buildCurrent("24h"));
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchForRange = (r: RangeKey) => {
    setLoading(true);
    setTimeout(() => {
      setSeries(buildSeries(r));
      setCurrent(buildCurrent(r));
      setLastFetched(new Date().toLocaleTimeString());
      setLoading(false);
    }, 200);
  };

  useEffect(() => {
    setLastFetched(new Date().toLocaleTimeString());
    const onRefresh = () => fetchForRange(range);
    window.addEventListener("vps-monitor:refresh", onRefresh as EventListener);
    return () => window.removeEventListener("vps-monitor:refresh", onRefresh as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const selectRange = (r: RangeKey) => {
    setRange(r);
    fetchForRange(r);
  };

  // Chart data memo
  const cpuPath = useMemo(() => buildPathPct(series.map((p) => p.cpu)), [series]);
  const cpuArea = useMemo(() => buildAreaPct(series.map((p) => p.cpu)), [series]);
  const memPath = useMemo(() => buildPathPct(series.map((p) => p.mem)), [series]);
  const diskPctPath = useMemo(() => buildPathPct(series.map((p) => p.disk)), [series]);

  const netMax = useMemo(() => {
    const m = Math.max(8, ...series.map((p) => Math.max(p.netUp, p.netDown)));
    return Math.ceil(m);
  }, [series]);
  const netUpPath = useMemo(() => buildPathScaled(series.map((p) => p.netUp), netMax), [series, netMax]);
  const netDownPath = useMemo(() => buildPathScaled(series.map((p) => p.netDown), netMax), [series, netMax]);

  const diskIoMax = useMemo(() => {
    const m = Math.max(3, ...series.map((p) => Math.max(p.diskRead, p.diskWrite)));
    return Math.ceil(m);
  }, [series]);
  const diskReadPath = useMemo(() => buildPathScaled(series.map((p) => p.diskRead), diskIoMax), [series, diskIoMax]);
  const diskWritePath = useMemo(() => buildPathScaled(series.map((p) => p.diskWrite), diskIoMax), [series, diskIoMax]);

  const cpuTrendUp = series.length >= 2 && series[series.length - 1].cpu >= series[series.length - 2].cpu;
  const memTrendUp = series.length >= 2 && series[series.length - 1].mem >= series[series.length - 2].mem;

  const kpis = [
    {
      key: "cpu",
      label: "CPU Usage",
      value: `${current.cpu}%`,
      icon: Cpu,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      testId: "performance-kpi-cpu",
    },
    {
      key: "memory",
      label: "Memory Usage",
      value: `${current.memory}%`,
      icon: MemoryStick,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      testId: "performance-kpi-memory",
    },
    {
      key: "disk",
      label: "Disk Usage",
      value: `${current.disk}%`,
      icon: HardDrive,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      testId: "performance-kpi-disk",
    },
    {
      key: "network",
      label: "Network I/O",
      value: `${current.netIo} MB/s`,
      icon: NetworkIcon,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      testId: "performance-kpi-network",
    },
  ];

  return (
    <div data-testid="performance-page" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Gauge aria-hidden="true" className="h-6 w-6 text-slate-300" />
          <h1 className="text-2xl font-semibold text-slate-100">Performance</h1>
        </div>
        <div className="flex items-center gap-3">
          <div
            role="tablist"
            aria-label="Time range"
            className="inline-flex rounded-lg border border-slate-800 bg-slate-900/50 p-1"
            data-testid="performance-range-switcher"
          >
            {RANGES.map((r) => {
              const active = range === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={r.testId}
                  onClick={() => selectRange(r.key)}
                  className={[
                    "px-3 h-8 rounded-md text-xs font-medium transition-colors min-h-[36px]",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <span aria-live="polite" className="text-xs text-slate-500 font-mono">
            {loading ? "Updating…" : lastFetched ? `Last fetched: ${lastFetched}` : "Not fetched yet"}
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.key} data-testid={k.testId} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${k.bg} ${k.color}`}>
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </div>
                </div>
                <div className={`mt-3 text-2xl font-mono font-semibold ${k.color}`}>{k.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CPU & Memory trend + Load panel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card data-testid="performance-cpu-memory-chart" className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <TrendingUp aria-hidden="true" className="h-4 w-4 text-blue-400" />
              CPU &amp; Memory Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-44"
                role="img"
                aria-label={`Line chart showing CPU and memory usage over the last ${range}`}
              >
                {[0, 25, 50, 75, 100].map((g) => {
                  const y = H - PAD - (g / 100) * (H - PAD * 2);
                  return (
                    <g key={g}>
                      <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgb(30 41 59)" strokeWidth="1" />
                      <text x={4} y={y + 3} fill="rgb(100 116 139)" fontSize="9" fontFamily="monospace">{g}</text>
                    </g>
                  );
                })}
                <path d={cpuArea} fill="rgba(59,130,246,0.12)" />
                <path d={cpuPath} fill="none" stroke="rgb(96 165 250)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d={memPath} fill="none" stroke="rgb(192 132 252)" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
                {series.map((p, i) => {
                  if (i % 2 !== 0) return null;
                  const stepX = (W - PAD * 2) / (series.length - 1);
                  const x = PAD + i * stepX;
                  return (
                    <text key={p.t + i} x={x} y={H - 8} fill="rgb(100 116 139)" fontSize="9" fontFamily="monospace" textAnchor="middle">{p.t}</text>
                  );
                })}
              </svg>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-3 rounded-sm bg-blue-400" aria-hidden="true" /> CPU %
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-3 rounded-sm bg-purple-400/70" aria-hidden="true" /> Memory %
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="performance-load-panel" className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Activity aria-hidden="true" className="h-4 w-4 text-emerald-400" />
              Load Average &amp; Processes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  {cpuTrendUp ? <TrendingUp aria-hidden="true" className="h-3 w-3 text-blue-400" /> : <TrendingDown aria-hidden="true" className="h-3 w-3 text-slate-500" />}
                  CPU
                </span>
                <span className="font-mono text-slate-200">{current.cpu}%</span>
              </div>
              <Progress value={current.cpu} className="h-2 bg-blue-500" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  {memTrendUp ? <TrendingUp aria-hidden="true" className="h-3 w-3 text-purple-400" /> : <TrendingDown aria-hidden="true" className="h-3 w-3 text-slate-500" />}
                  Memory
                </span>
                <span className="font-mono text-slate-200">{current.memory}%</span>
              </div>
              <Progress value={current.memory} className="h-2 bg-purple-500" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Disk</span>
                <span className="font-mono text-slate-200">{current.disk}%</span>
              </div>
              <Progress value={current.disk} className="h-2 bg-amber-500" />
            </div>
            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500">Load (1m)</span>
                <span className="font-mono text-slate-200">{current.loadAvg1.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500">Load (5m)</span>
                <span className="font-mono text-slate-200">{current.loadAvg5.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500">Load (15m)</span>
                <span className="font-mono text-slate-200">{current.loadAvg15.toFixed(2)}</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-slate-500 flex items-center gap-1">
                  <ListOrdered aria-hidden="true" className="h-3 w-3" /> Processes
                </span>
                <span className="font-mono text-slate-200">{current.processCount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network traffic + Disk I/O */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="performance-network-chart" className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <NetworkIcon aria-hidden="true" className="h-4 w-4 text-emerald-400" />
              Network Traffic (MB/s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-44"
                role="img"
                aria-label={`Line chart showing network upload and download speeds over the last ${range}`}
              >
                {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                  const val = Math.round(netMax * f);
                  const y = H - PAD - f * (H - PAD * 2);
                  return (
                    <g key={f}>
                      <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgb(30 41 59)" strokeWidth="1" />
                      <text x={4} y={y + 3} fill="rgb(100 116 139)" fontSize="9" fontFamily="monospace">{val}</text>
                    </g>
                  );
                })}
                <path d={netDownPath} fill="none" stroke="rgb(52 211 153)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d={netUpPath} fill="none" stroke="rgb(56 189 248)" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
                {series.map((p, i) => {
                  if (i % 2 !== 0) return null;
                  const stepX = (W - PAD * 2) / (series.length - 1);
                  const x = PAD + i * stepX;
                  return (
                    <text key={"net" + i} x={x} y={H - 8} fill="rgb(100 116 139)" fontSize="9" fontFamily="monospace" textAnchor="middle">{p.t}</text>
                  );
                })}
              </svg>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-3 rounded-sm bg-emerald-400" aria-hidden="true" /> Download
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-3 rounded-sm bg-sky-400" aria-hidden="true" /> Upload
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="performance-disk-chart" className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <HardDrive aria-hidden="true" className="h-4 w-4 text-amber-400" />
              Disk I/O (MB/s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-44"
                role="img"
                aria-label={`Line chart showing disk read and write speeds over the last ${range}`}
              >
                {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                  const val = Math.round(diskIoMax * f);
                  const y = H - PAD - f * (H - PAD * 2);
                  return (
                    <g key={f}>
                      <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgb(30 41 59)" strokeWidth="1" />
                      <text x={4} y={y + 3} fill="rgb(100 116 139)" fontSize="9" fontFamily="monospace">{val}</text>
                    </g>
                  );
                })}
                <path d={diskReadPath} fill="none" stroke="rgb(251 191 36)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d={diskWritePath} fill="none" stroke="rgb(248 113 113)" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
                {series.map((p, i) => {
                  if (i % 2 !== 0) return null;
                  const stepX = (W - PAD * 2) / (series.length - 1);
                  const x = PAD + i * stepX;
                  return (
                    <text key={"disk" + i} x={x} y={H - 8} fill="rgb(100 116 139)" fontSize="9" fontFamily="monospace" textAnchor="middle">{p.t}</text>
                  );
                })}
              </svg>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-3 rounded-sm bg-amber-400" aria-hidden="true" /> Read
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-3 rounded-sm bg-red-400" aria-hidden="true" /> Write
              </span>
            </div>
            {/* Disk usage trend (hidden helper path, keeps disk% visible in DOM without a 4th big chart) */}
            <span data-testid="performance-disk-trend" aria-hidden="true" className="sr-only">
              {diskPctPath ? "available" : "none"}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
