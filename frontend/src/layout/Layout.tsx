import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

/**
 * Layout — full-screen dark-themed shell for DreamAgent Monitor.
 *
 * Structure:
 *   <Navbar />  (left sidebar + top control bar)
 *   <main><Outlet /></main>  (scrollable page content)
 */
const Layout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
