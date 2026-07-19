import { useEffect, useMemo, useState } from "react";
import { Box, Cpu, MemoryStick, Hash, Clock, Folder, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface UserContainer {
  name: string;
  user_id: number;
  status: "running" | "stopped";
  cpu_percent: number;
  memory_mb: number;
  pid_count: number;
  last_used: string;
  workspace_path: string;
}

const MOCK: UserContainer[] = [
  { name: "dreamagent-user-24", user_id: 24, status: "running", cpu_percent: 12.4, memory_mb: 412, pid_count: 88, last_used: "2026-07-19 07:28", workspace_path: "/workspaces/user_24/website/1745_vps-monitor" },
  { name: "dreamagent-user-31", user_id: 31, status: "running", cpu_percent: 64.8, memory_mb: 1180, pid_count: 312, last_used: "2026-07-19 07:30", workspace_path: "/workspaces/user_31/api/payment-service" },
  { name: "dreamagent-user-42", user_id: 42, status: "running", cpu_percent: 4.1, memory_mb: 188, pid_count: 42, last_used: "2026-07-19 06:55", workspace_path: "/workspaces/user_42/scripts/data-pipeline" },
  { name: "dreamagent-user-58", user_id: 58, status: "stopped", cpu_percent: 0, memory_mb: 0, pid_count: 0, last_used: "2026-07-18 22:14", workspace_path: "/workspaces/user_58/experiments/ml-bench" },
  { name: "dreamagent-user-67", user_id: 67, status: "running", cpu_percent: 92.3, memory_mb: 2048, pid_count: 487, last_used: "2026-07-19 07:31", workspace_path: "/workspaces/user_67/compiler-toolchain" },
  { name: "dreamagent-user-71", user_id: 71, status: "running", cpu_percent: 22.7, memory_mb: 624, pid_count: 154, last_used: "2026-07-19 07:20", workspace_path: "/workspaces/user_71/mobile/app-release" },
  { name: "dreamagent-user-83", user_id: 83, status: "running", cpu_percent: 8.9, memory_mb: 340, pid_count: 96, last_used: "2026-07-19 07:10", workspace_path: "/workspaces/user_83/web/landing-redesign" },
  { name: "dreamagent-user-99", user_id: 99, status: "stopped", cpu_percent: 0, memory_mb: 0, pid_count: 0, last_used: "2026-07-17 11:02", workspace_path: "/workspaces/user_99/research/quant-sim" },
  { name: "dreamagent-user-104", user_id: 104, status: "running", cpu_percent: 38.2, memory_mb: 892, pid_count: 221, last_used: "2026-07-19 07:25", workspace_path: "/workspaces/user_104/game/physics-engine" },
];

function pidColor(n: number): string {
  if (n > 400) return "bg-red-500";
  if (n >= 200) return "bg-yellow-500";
  return "bg-emerald-500";
}
function pidTextColor(n: number): string {
  if (n > 400) return "text-red-400";
  if (n >= 200) return "text-yellow-400";
  return "text-emerald-400";
}
function pidPct(n: number): number {
  // normalize against an arbitrary max for visualization
  return Math.min(100, Math.round((n / 500) * 100));
}

export default function Dockerfleet() {
  const [containers, setContainers] = useState<UserContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchFleet = () => {
      setLoading(true);
      setError(null);
      try {
        setTimeout(() => {
          setContainers(MOCK);
          setLoading(false);
        }, 250);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load containers");
        setLoading(false);
      }
    };
    fetchFleet();
    window.addEventListener("vps-monitor:refresh", fetchFleet as EventListener);
    return () => window.removeEventListener("vps-monitor:refresh", fetchFleet as EventListener);
  }, []);

  const stats = useMemo(() => {
    const total = containers.length;
    const running = containers.filter((c) => c.status === "running").length;
    const totalPids = containers.reduce((s, c) => s + c.pid_count, 0);
    return { total, running, totalPids };
  }, [containers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return containers;
    return containers.filter(
      (c) => c.name.toLowerCase().includes(q) || String(c.user_id).includes(q)
    );
  }, [containers, query]);

  if (loading && containers.length === 0) {
    return (
      <div data-testid="dockerfleet-page" className="space-y-4" aria-live="polite">
        <h1 className="text-2xl font-semibold text-slate-100">Docker Fleet</h1>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-10 text-center text-slate-400">Loading containers…</CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="dockerfleet-page" className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-100">Docker Fleet</h1>
        <Card className="bg-slate-900/50 border-slate-800 border-red-800/50">
          <CardContent className="py-10 text-center text-red-400" role="alert">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="dockerfleet-page" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-slate-100">Docker Fleet</h1>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            aria-label="Search containers by name or user id"
            data-testid="dockerfleet-search-input"
            placeholder="Search containers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 w-64 bg-slate-900/50 border-slate-800 text-slate-200 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3" data-testid="dockerfleet-summary">
        <Card data-testid="dockerfleet-summary-total" className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800/60 text-slate-300">
              <Box aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xl font-mono font-semibold text-slate-100">{stats.total}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Containers</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="dockerfleet-summary-running" className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xl font-mono font-semibold text-emerald-400">{stats.running}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Running</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="dockerfleet-summary-pids" className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Hash aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xl font-mono font-semibold text-slate-100">{stats.totalPids}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Total PIDs</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Container grid */}
      {filtered.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-10 text-center text-slate-400">
            No containers match “{query}”.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card
              key={c.name}
              data-testid={`dockerfleet-container-${c.user_id}`}
              className="bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:shadow-lg transition-all duration-200"
            >
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-slate-100 truncate">{c.name}</div>
                    <Badge className="mt-1 bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/15">
                      user_id: {c.user_id}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${c.status === "running" ? "bg-emerald-500" : "bg-slate-600"}`}
                      aria-hidden="true"
                    />
                    <span className={`text-xs ${c.status === "running" ? "text-emerald-400" : "text-slate-500"}`}>
                      {c.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 rounded-md bg-slate-800/40 px-2 py-1.5">
                    <Cpu aria-hidden="true" className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-slate-500">CPU</span>
                    <span className="ml-auto font-mono text-slate-200">{c.cpu_percent.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md bg-slate-800/40 px-2 py-1.5">
                    <MemoryStick aria-hidden="true" className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-slate-500">Mem</span>
                    <span className="ml-auto font-mono text-slate-200">{c.memory_mb} MB</span>
                  </div>
                </div>

                <div data-testid={`dockerfleet-container-${c.user_id}-pids`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Hash aria-hidden="true" className="h-3.5 w-3.5" />
                      PIDs
                    </span>
                    <span className={`font-mono ${pidTextColor(c.pid_count)}`}>{c.pid_count}</span>
                  </div>
                  <Progress value={pidPct(c.pid_count)} className={`h-1.5 ${pidColor(c.pid_count)}`} />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono">{c.last_used}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                  <Folder aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono truncate" title={c.workspace_path}>{c.workspace_path}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
