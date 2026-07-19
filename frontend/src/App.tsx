import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/layout/Layout";
import Mainvps from "@/pages/Mainvps";
import Workervps from "@/pages/Workervps";
import Dockerfleet from "@/pages/Dockerfleet";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

const App = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Mainvps />} />
              <Route path="/workervps" element={<Workervps />} />
              <Route path="/dockerfleet" element={<Dockerfleet />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
