import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell, User, Home, Folder, BarChart3, Settings } from "lucide-react";
import CalculatorRobotIcon from "@/components/calculator-robot-icon";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="relative flex items-center px-6 py-4">
          {/* Logo - Fixed Left */}
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
                  <CalculatorRobotIcon className="text-white" size={20} />
                </div>
                <span
                  className="text-xl font-bold font-family-Roboto text-slate-900"
                  style={{ fontFamily: "Roboto, sans-serif" }}
                >
                  EstimAgent
                </span>
              </div>
            </Link>
          </div>

          {/* Absolutely Centered Navigation */}
          <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center space-x-1">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className={
                  location === "/"
                    ? "text-blueprint-700 bg-blueprint-50 hover:bg-blueprint-100"
                    : "text-slate-600 hover:text-blueprint-700"
                }
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/projects">
              <Button
                variant="ghost"
                size="sm"
                className={
                  location === "/projects"
                    ? "text-blueprint-700 bg-blueprint-50 hover:bg-blueprint-100"
                    : "text-slate-600 hover:text-blueprint-700"
                }
              >
                <Folder className="w-4 h-4 mr-2" />
                Projects
              </Button>
            </Link>
            <Link href="/projects-manager">
              <Button
                variant="ghost"
                size="sm"
                className={
                  location === "/projects-manager"
                    ? "text-blueprint-700 bg-blueprint-50 hover:bg-blueprint-100"
                    : "text-slate-600 hover:text-blueprint-700"
                }
              >
                <Settings className="w-4 h-4 mr-2" />
                Manager
              </Button>
            </Link>
            <Link href="/reports">
              <Button
                variant="ghost"
                size="sm"
                className={
                  location === "/reports"
                    ? "text-blueprint-700 bg-blueprint-50 hover:bg-blueprint-100"
                    : "text-slate-600 hover:text-blueprint-700"
                }
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Reports
              </Button>
            </Link>
          </div>

          {/* Right side placeholder for balance */}
          <div className="flex items-center ml-auto">
            {/* Empty space for header balance */}
          </div>
        </div>
      </header>

      {/* Page Content */}
      {children}
    </div>
  );
}
