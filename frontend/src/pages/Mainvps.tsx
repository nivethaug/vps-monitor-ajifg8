import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Box,
  AlertTriangle,
  Server,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---- Types ----
interface DiskMount {
  mount: string;
  fstype: string;
  used: number;
  total: number;
}
interface DbSize {
  name: string;
  size_pretty: string;
}
interface Pm2Process {
  name: string;
  status: "online" | "errored" | "stopped";
  restarts: number;
  cpu: number;
  memory_mb: number;
  uptime: string;
}
interface MainVpsMetrics {
  hostname: string;
  role: "Main";
  uptime_days: number;
  uptime_hours: number;
  status: "online" | "offline";
  cpu: { percent: number; load1: number; load5: number; load15: number; cores: number };
  memory: { used_gb: number; total_gb: number; swap_used_gb: number; swap_total_gb: number };
  disks: DiskMount[];
  docker: { total: number; running: number };
  postgres: {
    connections: number;
    uptime: string;
    active_queries: number;
    top_dbs: DbSize[];
  };
  pm2: Pm2Process[];
  oom_events: number;
}

// ---- Helpers ----
const REAL_FSTYPES = ["ext4", "xfs", "btrfs", "vfat"];

function usagePercent(used: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

function barColor(pct: number): string {
  if (pct > 85) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-emerald-500";
}

function textColor(pct: number): string {
  if (pct > 85) return "text-red-400";
  if (pct >= 70) return "text-yellow-400";
  return "text-emerald-400";
}

// ---- Mock data (would come from /api/metrics) ----
const MOCK: MainVpsMetrics = {
  hostname: "dream-main-01",
  role: "Main",
  uptime_days: 47,
  uptime_hours: 9,
  status: "online",
  cpu: { percent: 38, load1: 0.92, load5: 1.04, load15: 1.11, cores: 8 },
  memory: { used_gb: 11.4, total_gb: 31.3, swap_used_gb: 0.2, swap_total_gb: 4.0 },
  disks: [
    { mount: "/", fstype: "ext4", used: 58, total: 100 },
    { mount: "/var/lib/docker", fstype: "ext4", used: 142, total: 200 },
    { mount: "/data", fstype: "xfs", used: 780, total: 1000 },
    { mount: "/boot/efi", fstype: "vfat", used: 0.03, total: 0.5 },
  ],
  docker: { total: 42, running: 38 },
  postgres: {
    connections: 27,
    uptime: "12d 4h",
    active_queries: 3,
    top_dbs: [
      { name: "dreamagent", size_pretty: "12 GB" },
      { name: "analytics", size_pretty: "4.2 GB" },
      { name: "audit_log", size_pretty: "1.8 GB" },
      { name: "sessions", size_pretty: "820 MB" },
      { name: "cache", size_pretty: "340 MB" },
    ],
  },
  pm2: [
    { name: "dreamagent-api", status: "online", restarts: 2, cpu: 18.4, memory_mb: 412, uptime: "12d" },
    { name: "scheduler", status: "online", restarts: 0, cpu: 4.1, memory_mb: 188, uptime: "12d" },
    { name: "worker-queue", status: "online", restarts: 5, cpu: 22.7, memory_mb: 504, uptime: "8d" },
    { name: "webhooks", status: "errored", restarts: 14, cpu: 0.0, memory_mb: 0, uptime: "—" },
    { name: "metrics-collector", status: "online", restarts: 1, cpu: 6.3, memory_mb: 220, uptime: "11d" },
    { name: "cleanup-job", status: "online", restarts: 0, cpu: 1.2, memory_mb: 96, uptime: "12d" },
  ],
  oom_events: 0,
};

export default function Mainvps() {
  const [data, setData] = useState<MainVpsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  // Listen for global refresh events dispatched by Layout top bar.
  useEffect(() => {
    const fetchMetrics = () => {
      setLoading(true);
      setError(null);
      try {
        // Real implementation: fetch("/api/metrics").then(r => r.json()).then(d => setData(d.main))
        setTimeout(() => {
          setData(MOCK);
          setLastFetched(new Date().toLocaleTimeString());
          setLoading(false);
        }, 250);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load metrics");
        setLoading(false);
      }
    };

    fetchMetrics();
    window.addEventListener("vps-monitor:refresh", fetchMetrics as EventListener);
    return () => window.removeEventListener("vps-monitor:refresh", fetchMetrics as EventListener);
  }, []);

  if (loading && !data) {
    return (
      <div data-testid="mainvps-page" className="space-y-4" aria-live="polite">
        <h1 className="text-2xl font-semibold text-slate-100">Main VPS</h1>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-10 text-center text-slate-400">
            Loading metrics…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div data-testid="mainvps-page" className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-100">Main VPS</h1>
        <Card className="bg-slate-900/50 border-slate-800 border-red-800/50">
          <CardContent className="py-10 text-center text-red-400" role="alert">
            {error || "No data available. Click Refresh to load metrics."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const cpuPct = data.cpu.percent;
  const memPct = usagePercent(data.memory.used_gb, data.memory.total_gb);
  const swapPct = usagePercent(data.memory.swap_used_gb, data.memory.swap_total_gb);
  const realDisks = data.disks.filter((d) => REAL_FSTYPES.includes(d.fstype));

  return (
    <div data-testid="mainvps-page" className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold text-slate-100">Main VPS</h1>
        <span aria-live="polite" className="text-xs text-slate-500 font-mono">
          {lastFetched ? `Last fetched: ${lastFetched}` : "Not fetched yet"}
        </span>
      </div>

      {/* Header card */}
      <Card data-testid="mainvps-header-card" className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Server aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-slate-100 font-mono">{data.hostname}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Primary control plane</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/15">
                {data.role}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="font-mono">{data.uptime_days}d {data.uptime_hours}h</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${data.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
                  aria-hidden="true"
                />
                <span className={`text-xs font-medium ${data.status === "online" ? "text-emerald-400" : "text-red-400"}`}>
                  {data.status === "online" ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* CPU card */}
      <Card data-testid="mainvps-cpu-card" className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-200">
            <Cpu aria-hidden="true" className="h-4 w-4 text-blue-400" />
            CPU
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className={`text-3xl font-mono font-semibold ${textColor(cpuPct)}`}>{cpuPct}%</span>
            <span className="text-xs text-slate-500">{data.cpu.cores} cores</span>
          </div>
          <Progress value={cpuPct} className={`h-2 ${barColor(cpuPct)}`} />
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(["load1", "load5", "load15"] as const).map((k, i) => (
              <div key={k} className="rounded-md bg-slate-800/40 px-2 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">load {i + 1}</div>
                <div className="text-sm font-mono text-slate-200">{data.cpu[k].toFixed(2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Memory card */}
      <Card data-testid="mainvps-memory-card" className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-200">
            <MemoryStick aria-hidden="true" className="h-4 w-4 text-purple-400" />
            Memory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className={`text-3xl font-mono font-semibold ${textColor(memPct)}`}>{memPct}%</span>
            <span className="text-xs text-slate-400 font-mono">
              {data.memory.used_gb.toFixed(1)} / {data.memory.total_gb.toFixed(1)} GB
            </span>
          </div>
          <Progress value={memPct} className={`h-2 ${barColor(memPct)}`} />
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-500">Swap</span>
            <span className="text-slate-300 font-mono">
              {data.memory.swap_used_gb.toFixed(2)} / {data.memory.swap_total_gb.toFixed(1)} GB
              <span className={`ml-2 ${textColor(swapPct)}`}>({swapPct}%)</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Disk card */}
      <Card data-testid="mainvps-disk-card" className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-200">
            <HardDrive aria-hidden="true" className="h-4 w-4 text-emerald-400" />
            Disk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {realDisks.map((d) => {
            const pct = usagePercent(d.used, d.total);
            return (
              <div key={d.mount} data-testid={`mainvps-disk-${d.mount.replace(/\//g, "_")}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300">
                    {d.mount} <span className="text-slate-600">({d.fstype})</span>
                  </span>
                  <span className="font-mono text-slate-400">
                    {d.used} / {d.total} {d.total < 5 ? "GB" : "GB"}
                    <span className={`ml-2 ${textColor(pct)}`}>{pct}%</span>
                  </span>
                </div>
                <Progress value={pct} className={`h-1.5 ${barColor(pct)}`} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Docker + Postgres side by side on md+ */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="mainvps-docker-card" className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Box aria-hidden="true" className="h-4 w-4 text-cyan-400" />
              Docker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-3xl font-mono font-semibold text-slate-100">{data.docker.total}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Total</div>
              </div>
              <div className="h-10 w-px bg-slate-800" aria-hidden="true" />
              <div>
                <div className="text-3xl font-mono font-semibold text-emerald-400">{data.docker.running}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Running</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="mainvps-postgres-card" className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Database aria-hidden="true" className="h-4 w-4 text-indigo-400" />
              PostgreSQL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-mono text-slate-100">{data.postgres.connections}</div>
                <div className="text-[10px] uppercase text-slate-500">Conns</div>
              </div>
              <div>
                <div className="text-lg font-mono text-slate-100">{data.postgres.active_queries}</div>
                <div className="text-[10px] uppercase text-slate-500">Active</div>
              </div>
              <div>
                <div className="text-sm font-mono text-slate-300">{data.postgres.uptime}</div>
                <div className="text-[10px] uppercase text-slate-500">Uptime</div>
              </div>
            </div>
            <div className="pt-1 space-y-1">
              {data.postgres.top_dbs.map((db) => (
                <div key={db.name} className="flex justify-between text-xs">
                  <span className="font-mono text-slate-400 truncate">{db.name}</span>
                  <span className="font-mono text-slate-300">{db.size_pretty}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PM2 card */}
      <Card data-testid="mainvps-pm2-card" className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-200">
            <Activity aria-hidden="true" className="h-4 w-4 text-yellow-400" />
            PM2 Processes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto rounded-md border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Name</TableHead>
                  <TableHead className="text-slate-400 text-xs">Status</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Restarts</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">CPU</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Memory</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Uptime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pm2.map((p) => {
                  const bad = p.status !== "online";
                  return (
                    <TableRow
                      key={p.name}
                      className={`border-slate-800 ${bad ? "bg-red-950/20" : ""}`}
                    >
                      <TableCell className="font-mono text-slate-200 text-xs">{p.name}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            p.status === "online"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15"
                              : "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/15"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-300 text-xs">{p.restarts}</TableCell>
                      <TableCell className="text-right font-mono text-slate-300 text-xs">{p.cpu.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-mono text-slate-300 text-xs">{p.memory_mb} MB</TableCell>
                      <TableCell className="text-right font-mono text-slate-300 text-xs">{p.uptime}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* OOM card */}
      <Card
        data-testid="mainvps-oom-card"
        className={`bg-slate-900/50 border-slate-800 ${data.oom_events > 0 ? "border-red-800/60" : ""}`}
      >
        <CardContent className="py-4">
          {data.oom_events > 0 ? (
            <div className="flex items-center gap-3 text-red-400" role="alert">
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
              <span className="font-medium">{data.oom_events} OOM event(s) detected in the last 24h.</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              <span className="font-medium">No OOM events in the last 24h.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
