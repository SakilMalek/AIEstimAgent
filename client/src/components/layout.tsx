import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Folder, BarChart3, DollarSign } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* MODIFICATION: Reduced vertical padding (py-2) */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="relative flex items-center px-4 md:px-6 py-2">
          {/* MODIFICATION: Replaced large image with a styled text logo */}
          <div className="flex items-center">
            <Link href="/">
              <span className="text-xl font-bold text-slate-800 cursor-pointer">
                EstimAgent
              </span>
            </Link>
          </div>

          <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center space-x-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className={location === "/" ? "text-blueprint-700 bg-blueprint-50" : "text-slate-600"}>
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className={location === "/projects" ? "text-blueprint-700 bg-blueprint-50" : "text-slate-600"}>
                <Folder className="w-4 h-4 mr-2" />
                Projects
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className={location === "/reports" ? "text-blueprint-700 bg-blueprint-50" : "text-slate-600"}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Reports
              </Button>
            </Link>
            <Link href="/advanced-cost-management">
              <Button variant="ghost" size="sm" className={location === "/advanced-cost-management" ? "text-blueprint-700 bg-blueprint-50" : "text-slate-600"}>
                <DollarSign className="w-4 h-4 mr-2" />
                Advanced Costs
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center ml-auto"></div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}