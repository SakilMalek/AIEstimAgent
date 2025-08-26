import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell, User, Home, Folder, BarChart3, Settings, DollarSign } from "lucide-react";
import estimagentLogo from "@/assets/estimagent-logo.png";

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
              <div className="flex items-center cursor-pointer">
                <img 
                  src={estimagentLogo} 
                  alt="Calculator Logo" 
                  className="h-20 w-20 object-contain"
                />
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

            <Link href="/advanced-cost-management">
              <Button
                variant="ghost"
                size="sm"
                className={
                  location === "/advanced-cost-management"
                    ? "text-blueprint-700 bg-blueprint-50 hover:bg-blueprint-100"
                    : "text-slate-600 hover:text-blueprint-700"
                }
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Advanced Costs
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
