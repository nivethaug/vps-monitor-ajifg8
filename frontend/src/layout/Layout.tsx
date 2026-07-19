import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Server,
  Network,
  Boxes,
  LayoutDashboard,
  Gauge,
  RefreshCw,
  LogOut,
  Activity,
  X,
  Menu,
} from "lucide-react";

/**
 * Layout — full-screen dark-themed shell for DreamAgent Monitor.
 *
 * Structure:
 *   <aside>          (desktop sidebar, fixed width)
 *   <div column>      (flex-1: top bar + scrollable page content)
 *     <header>
 *     <main><Outlet /></main>
 *   </div>
 *   <mobile drawer>  (slide-over on small screens)
 */
const NAV_ITEMS = [
  { to: "/", label: "Main VPS", icon: Server, end: true },
  { to: "/workervps", label: "Worker VPS", icon: Network, end: false },
  { to: "/dockerfleet", label: "Docker Fleet", icon: Boxes, end: false },
  { to: "/performance", label: "Performance", icon: Gauge, end: false },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: false },
];

const LS_KEY = "vps-monitor:autorefresh";

const Layout = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, String(autoRefresh));
    } catch {
      /* ignore */
    }
  }, [autoRefresh]);

  const handleRefresh = () => {
    setRefreshing(true);
    setLastRefreshed(new Date().toLocaleTimeString());
    window.dispatchEvent(new CustomEvent("vps-monitor:refresh"));
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      setLastRefreshed(new Date().toLocaleTimeString());
      window.dispatchEvent(new CustomEvent("vps-monitor:refresh"));
    }, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const handleLogout = () => {
    navigate("/");
  };

  const sidebarLinks = (
    <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Primary">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          data-testid={`navbar-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
              isActive
                ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent",
            ].join(" ")
          }
        >
          <span className="flex items-center gap-3">
            <Icon aria-hidden="true" className="h-4 w-4" />
            <span>{label}</span>
          </span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2 px-5 h-14 border-b border-slate-800">
          <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <Activity aria-hidden="true" className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-100 tracking-tight">DreamAgent</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-600">Monitor</span>
        </div>
        {sidebarLinks}
        <div className="mt-auto px-5 py-3 border-t border-slate-800 text-[10px] text-slate-600 font-mono">
          v1.0.0 · infrastructure
        </div>
      </aside>

      {/* Main column: top bar + page content */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center gap-3 h-14 px-4 md:px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
          <button
            type="button"
            aria-label="Open navigation menu"
            data-testid="sidebar-toggle-button"
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-slate-300 hover:bg-slate-800"
            onClick={() => setMobileOpen(true)}
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>

          <h1 className="text-sm md:text-base font-semibold text-slate-100 truncate">
            DreamAgent Monitor
          </h1>

          <span
            aria-live="polite"
            className="hidden sm:inline ml-2 text-xs text-slate-500 font-mono"
          >
            {lastRefreshed ? `Refreshed ${lastRefreshed}` : "Not refreshed yet"}
          </span>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="navbar-refresh-button"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-medium transition-colors min-h-[44px]"
            >
              <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="hidden sm:inline text-xs text-slate-400">Auto (30s)</span>
              <button
                type="button"
                role="switch"
                aria-checked={autoRefresh}
                aria-label="Toggle auto-refresh every 30 seconds"
                data-testid="navbar-autorefresh-toggle"
                onClick={() => setAutoRefresh((v) => !v)}
                className={[
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  autoRefresh ? "bg-emerald-500" : "bg-slate-700",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    autoRefresh ? "translate-x-4" : "translate-x-0.5",
                  ].join(" ")}
                />
              </button>
            </label>

            <button
              type="button"
              aria-label="Logout"
              data-testid="navbar-logout-button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-slate-950 border-r border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <Activity aria-hidden="true" className="h-4 w-4" />
                </div>
                <span className="font-semibold text-slate-100">DreamAgent</span>
              </div>
              <button
                type="button"
                aria-label="Close navigation menu"
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-slate-400 hover:bg-slate-800"
                onClick={() => setMobileOpen(false)}
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            {sidebarLinks}
          </aside>
        </div>
      )}
    </div>
  );
};

export default Layout;
