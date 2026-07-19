import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Server,
  Box,
  Activity,
  Cpu,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
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
interface MetricSummary {
  total_vps: number;
  online_vps: number;
  total_containers: number;
  running_containers: number;
  total_pids: number;
  oom_events_24h: number;
  avg_cpu: number;
  avg_memory: number;
}

interface TrendPoint {
  t: string;
  cpu: number;
  mem: number;
}

interface ActivityRow {
  id: string;
  time: string;
  host: string;
  event: string;
  severity: "info" | "warn" | "error";
}

// ---- Mock data ----
const METRICS: MetricSummary = {
  total_vps: 2,
  online_vps: 2,
  total_containers: 60,
  running_containers: 56,
  total_pids: 1400,
  oom_events_24h: 2,
  avg_cpu: 51,
  avg_memory: 54,
};

const TREND: TrendPoint[] = [
  { t: "00:00", cpu: 22, mem: 30 },
  { t: "02:00", cpu: 18, mem: 28 },
  { t: "04:00", cpu: 25, mem: 33 },
  { t: "06:00", cpu: 41, mem: 42 },
  { t: "08:00", cpu: 58, mem: 51 },
  { t: "10:00", cpu: 67, mem: 58 },
  { t: "12:00", cpu: 73, mem: 62 },
  { t: "14:00", cpu: 64, mem: 60 },
  { t: "16:00", cpu: 71, mem: 64 },
  { t: "18:00", cpu: 55, mem: 57 },
  { t: "20:00", cpu: 47, mem: 53 },
  { t: "22:00", cpu: 38, mem: 47 },
];

const ACTIVITY: ActivityRow[] = [
  { id: "a1", time: "07:31:12", host: "dream-worker-02", event: "Container dreamagent-user-67 CPU exceeded 90%", severity: "warn" },
  { id: "a2", time: "07:28:44", host: "dream-main-01", event: "PM2 process webhooks entered errored state", severity: "error" },
  { id: "a3", time: "07:20:03", host: "dream-worker-02", event: "OOM event detected on snapshot-worker", severity: "error" },
  { id: "a4", time: "06:55:21", host: "dream-main-01", event: "Postgres connections reached 27", severity: "info" },
  { id: "a5", time: "06:30:09", host: "dream-worker-02", event: "Disk /workspace reached 82% usage", severity: "warn" },
  { id: "a6", time: "05:14:47", host: "dream-main-01", event: "Auto-refresh tick — metrics collected", severity: "info" },
  { id: "a7", time: "04:02:33", host: "dream-worker-02", event: "Container dreamagent-user-99 stopped", severity: "info" },
];

// ---- Helpers ----
function severityBadge(s: ActivityRow["severity"]) {
  if (s === "error") return "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/15";
  if (s === "warn") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/15";
  return "bg-slate-500/15 text-slate-300 border-slate-500/30 hover:bg-slate-500/15";
}

// SVG line chart constants
const W = 600;
const H = 180;
const PAD = 28;

function buildPath(points: number[]): string {
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

function buildArea(points: number[]): string {
  if (points.length === 0) return "";
  const line = buildPath(points);
  const stepX = (W - PAD * 2) / (points.length - 1);
  const lastX = PAD + (points.length - 1) * stepX;
  return `${line} L${lastX.toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = () => {
      setLoading(true);
      setError(null);
      try {
        setTimeout(() => {
          setMetrics(METRICS);
          setTrend(TREND);
          setActivity(ACTIVITY);
          setLastFetched(new Date().toLocaleTimeString());
          setLoading(false);
        }, 250);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard data");
        setLoading(false);
      }
    };
    fetchAll();
    window.addEventListener("vps-monitor:refresh", fetchAll as EventListener);
    return () => window.removeEventListener("vps-monitor:refresh", fetchAll as EventListener);
  }, []);

  const cpuPath = useMemo(() => buildPath(trend.map((t) => t.cpu)), [trend]);
  const cpuArea = useMemo(() => buildArea(trend.map((t) => t.cpu)), [trend]);
  const memPath = useMemo(() => buildPath(trend.map((t) => t.mem)), [trend]);

  if (loading && !metrics) {
    return (
      <div data-testid="dashboard-page" className="space-y-4" aria-live="polite">
        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-10 text-center text-slate-400">Loading dashboard…</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div data-testid="dashboard-page" className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        <Card className="bg-slate-900/50 border-slate-800 border-red-800/50">
          <CardContent className="py-10 text-center text-red-400" role="alert">
            {error || "No data available. Click Refresh to load metrics."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const cpuTrendUp = trend.length >= 2 && trend[trend.length - 1].cpu >= trend[trend.length - 2].cpu;
  const memTrendUp = trend.length >= 2 && trend[trend.length - 1].mem >= trend[trend.length - 2].mem;

  const kpis = [
    {
      key: "vps",
      label: "VPS Online",
      value: `${metrics.online_vps}/${metrics.total_vps}`,
      icon: Server,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      testId: "dashboard-kpi-vps",
    },
    {
      key: "containers",
      label: "Containers Running",
      value: `${metrics.running_containers}/${metrics.total_containers}`,
      icon: Box,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      testId: "dashboard-kpi-containers",
    },
    {
      key: "pids",
      label: "Total PIDs",
      value: metrics.total_pids.toLocaleString(),
      icon: Activity,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      testId: "dashboard-kpi-pids",
    },
    {
      key: "oom",
      label: "OOM Events (24h)",
      value: String(metrics.oom_events_24h),
      icon: metrics.oom_events_24h > 0 ? AlertTriangle : CheckCircle2,
      color: metrics.oom_events_24h > 0 ? "text-red-400" : "text-emerald-400",
      bg: metrics.oom_events_24h > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
      testId: "dashboard-kpi-oom",
    },
  ];

  return (
    <div data-testid="dashboard-page" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <LayoutDashboard aria-hidden="true" className="h-6 w-6 text-slate-300" />
          <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        </div>
        <span aria-live="polite" className="text-xs text-slate-500 font-mono">
          {lastFetched ? `Last fetched: ${lastFetched}` : "Not fetched yet"}
        </span>
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

      {/* Chart + current load */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card data-testid="dashboard-trend-chart" className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <TrendingUp aria-hidden="true" className="h-4 w-4 text-blue-400" />
              CPU & Memory Trend (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-44"
                role="img"
                aria-label="Line chart showing CPU and memory usage over the last 24 hours"
              >
                {/* gridlines */}
                {[0, 25, 50, 75, 100].map((g) => {
                  const y = H - PAD - (g / 100) * (H - PAD * 2);
                  return (
                    <g key={g}>
                      <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgb(30 41 59)" strokeWidth="1" />
                      <text x={4} y={y + 3} fill="rgb(100 116 139)" fontSize="9" fontFamily="monospace">{g}</text>
                    </g>
                  );
                })}
                {/* CPU area + line */}
                <path d={cpuArea} fill="rgba(59,130,246,0.12)" />
                <path d={cpuPath} fill="none" stroke="rgb(96 165 250)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {/* Memory line */}
                <path d={memPath} fill="none" stroke="rgb(192 132 252)" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
                {/* x labels */}
                {trend.map((p, i) => {
                  if (i % 2 !== 0) return null;
                  const stepX = (W - PAD * 2) / (trend.length - 1);
                  const x = PAD + i * stepX;
                  return (
                    <text key={p.t} x={x} y={H - 8} fill="rgb(100 116 139)" fontSize="9" fontFamily="monospace" textAnchor="middle">{p.t}</text>
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

        <Card data-testid="dashboard-current-load" className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Cpu aria-hidden="true" className="h-4 w-4 text-blue-400" />
              Current Load
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  {cpuTrendUp ? <TrendingUp aria-hidden="true" className="h-3 w-3 text-blue-400" /> : <TrendingDown aria-hidden="true" className="h-3 w-3 text-slate-500" />}
                  Avg CPU
                </span>
                <span className="font-mono text-slate-200">{metrics.avg_cpu}%</span>
              </div>
              <Progress value={metrics.avg_cpu} className="h-2 bg-blue-500" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  {memTrendUp ? <TrendingUp aria-hidden="true" className="h-3 w-3 text-purple-400" /> : <TrendingDown aria-hidden="true" className="h-3 w-3 text-slate-500" />}
                  Avg Memory
                </span>
                <span className="font-mono text-slate-200">{metrics.avg_memory}%</span>
              </div>
              <Progress value={metrics.avg_memory} className="h-2 bg-purple-500" />
            </div>
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Fleet Status</span>
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15">
                  All systems nominal
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Auto-refresh</span>
                <span className="text-slate-300 font-mono">30s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity table */}
      <Card data-testid="dashboard-activity-table" className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-200">
            <Clock aria-hidden="true" className="h-4 w-4 text-yellow-400" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Time</TableHead>
                  <TableHead className="text-slate-400 text-xs">Host</TableHead>
                  <TableHead className="text-slate-400 text-xs">Severity</TableHead>
                  <TableHead className="text-slate-400 text-xs">Event</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((row) => (
                  <TableRow key={row.id} className="border-slate-800">
                    <TableCell className="font-mono text-slate-400 text-xs whitespace-nowrap">{row.time}</TableCell>
                    <TableCell className="font-mono text-slate-300 text-xs whitespace-nowrap">{row.host}</TableCell>
                    <TableCell>
                      <Badge className={severityBadge(row.severity)}>{row.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-300 text-xs">{row.event}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
