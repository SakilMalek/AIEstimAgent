import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  User, 
  Home, 
  Folder, 
  BarChart3,
  Settings
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="w-8 h-8 bg-blueprint-600 rounded-lg flex items-center justify-center">
                  <Home className="text-white w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-slate-900">EstimAgent</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-1 ml-8">
              <Link href="/">
                <Button variant="ghost" size="sm" className={location === "/" ? "text-blueprint-700 bg-blueprint-50 hover:bg-blueprint-100" : "text-slate-600 hover:text-blueprint-700"}>
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className={location === "/projects" ? "text-blueprint-700 bg-blueprint-50 hover:bg-blueprint-100" : "text-slate-600 hover:text-blueprint-700"}>
                  <Folder className="w-4 h-4 mr-2" />
                  Projects
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="ghost" size="sm" className={location === "/reports" ? "text-blueprint-700 bg-blueprint-50 hover:bg-blueprint-100" : "text-slate-600 hover:text-blueprint-700"}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </Button>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className={location === "/settings" ? "text-blueprint-700 bg-blueprint-50" : "text-slate-600 hover:text-blueprint-700"}>
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">John Constructor</span>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      {children}
    </div>
  );
}