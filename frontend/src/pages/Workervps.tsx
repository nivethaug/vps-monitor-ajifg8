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
interface Pm2Process {
  name: string;
  status: "online" | "errored" | "stopped";
  restarts: number;
  cpu: number;
  memory_mb: number;
  uptime: string;
}
interface WorkerVpsMetrics {
  hostname: string;
  role: "Worker";
  uptime_days: number;
  uptime_hours: number;
  status: "online" | "offline";
  cpu: { percent: number; load1: number; load5: number; load15: number; cores: number };
  memory: { used_gb: number; total_gb: number; swap_used_gb: number; swap_total_gb: number };
  disks: DiskMount[];
  docker: { total: number; running: number };
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

// ---- Mock data ----
const MOCK: WorkerVpsMetrics = {
  hostname: "dream-worker-02",
  role: "Worker",
  uptime_days: 31,
  uptime_hours: 14,
  status: "online",
  cpu: { percent: 64, load1: 2.41, load5: 2.18, load15: 1.95, cores: 16 },
  memory: { used_gb: 22.7, total_gb: 31.3, swap_used_gb: 0.0, swap_total_gb: 4.0 },
  disks: [
    { mount: "/", fstype: "ext4", used: 24, total: 80 },
    { mount: "/workspace", fstype: "xfs", used: 410, total: 500 },
    { mount: "/var/lib/docker", fstype: "ext4", used: 95, total: 200 },
  ],
  docker: { total: 18, running: 18 },
  pm2: [
    { name: "task-runner", status: "online", restarts: 1, cpu: 41.3, memory_mb: 612, uptime: "31d" },
    { name: "build-agent", status: "online", restarts: 3, cpu: 28.7, memory_mb: 488, uptime: "12d" },
    { name: "file-indexer", status: "online", restarts: 0, cpu: 9.2, memory_mb: 204, uptime: "31d" },
    { name: "log-shipper", status: "online", restarts: 2, cpu: 3.4, memory_mb: 142, uptime: "20d" },
    { name: "snapshot-worker", status: "errored", restarts: 22, cpu: 0.0, memory_mb: 0, uptime: "—" },
  ],
  oom_events: 2,
};

export default function Workervps() {
  const [data, setData] = useState<WorkerVpsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = () => {
      setLoading(true);
      setError(null);
      try {
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
      <div data-testid="workervps-page" className="space-y-4" aria-live="polite">
        <h1 className="text-2xl font-semibold text-slate-100">Worker VPS</h1>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-10 text-center text-slate-400">Loading metrics…</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div data-testid="workervps-page" className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-100">Worker VPS</h1>
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
    <div data-testid="workervps-page" className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold text-slate-100">Worker VPS</h1>
        <span aria-live="polite" className="text-xs text-slate-500 font-mono">
          {lastFetched ? `Last fetched: ${lastFetched}` : "Not fetched yet"}
        </span>
      </div>

      {/* Header card */}
      <Card data-testid="workervps-header-card" className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Server aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-slate-100 font-mono">{data.hostname}</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Task execution node</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/15">
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
      <Card data-testid="workervps-cpu-card" className="bg-slate-900/50 border-slate-800">
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
      <Card data-testid="workervps-memory-card" className="bg-slate-900/50 border-slate-800">
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
      <Card data-testid="workervps-disk-card" className="bg-slate-900/50 border-slate-800">
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
              <div key={d.mount} data-testid={`workervps-disk-${d.mount.replace(/\//g, "_")}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300">
                    {d.mount} <span className="text-slate-600">({d.fstype})</span>
                  </span>
                  <span className="font-mono text-slate-400">
                    {d.used} / {d.total} GB
                    <span className={`ml-2 ${textColor(pct)}`}>{pct}%</span>
                  </span>
                </div>
                <Progress value={pct} className={`h-1.5 ${barColor(pct)}`} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Docker card */}
      <Card data-testid="workervps-docker-card" className="bg-slate-900/50 border-slate-800">
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

      {/* PM2 card */}
      <Card data-testid="workervps-pm2-card" className="bg-slate-900/50 border-slate-800">
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
                    <TableRow key={p.name} className={`border-slate-800 ${bad ? "bg-red-950/20" : ""}`}>
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
        data-testid="workervps-oom-card"
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
