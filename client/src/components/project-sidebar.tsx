import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UploadZone from "./upload-zone";
import {
  Settings,
  Plus,
  FileImage,
  File,
  Loader2,
  CheckCircle,
  Clock,
  ChevronRight
} from "lucide-react";
import type { Project, Drawing } from "@shared/schema";

interface ProjectSidebarProps {
  currentProject: Project | null;
  setCurrentProject: (project: Project) => void;
  drawings: Drawing[];
  selectedDrawing: Drawing | null;
  setSelectedDrawing: (drawing: Drawing) => void;
  isLoading: boolean;
}

export default function ProjectSidebar({
  currentProject,
  drawings,
  selectedDrawing,
  setSelectedDrawing,
  isLoading
}: ProjectSidebarProps) {
  const [showUpload, setShowUpload] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-2 h-2 text-green-500" />;
      case "processing":
        return <Loader2 className="w-2 h-2 text-amber-500 animate-spin" />;
      default:
        return <Clock className="w-2 h-2 text-slate-400" />;
    }
  };

  const getStatusText = (status: string, aiProcessed: boolean) => {
    if (status === "complete" && aiProcessed) return "AI Processing Complete";
    if (status === "processing") return "Processing...";
    if (status === "complete") return "Ready for Review";
    return "Pending Analysis";
  };

  const getDrawingIcon = (fileType: string) => {
    return fileType === "application/pdf" ? File : FileImage;
  };

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
      {/* Project Selector */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Current Project</h2>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        {currentProject && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-medium text-slate-900">{currentProject.name}</h3>
            <p className="text-sm text-slate-600 mt-1">{currentProject.address}</p>
            <div className="flex items-center mt-3 space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {currentProject.status}
              </Badge>
              <span className="text-xs text-slate-500">Updated 2h ago</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Upload Drawings</h3>
        
        {!showUpload ? (
          <div 
            className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blueprint-400 transition-colors cursor-pointer"
            onClick={() => setShowUpload(true)}
          >
            <div className="w-8 h-8 mx-auto mb-3 text-slate-400">
              <Plus className="w-full h-full" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Drop files here or click to browse</p>
            <p className="text-xs text-slate-500">PDF, PNG, JPG up to 50MB</p>
          </div>
        ) : (
          <UploadZone 
            projectId={currentProject?.id || ""} 
            onUploadComplete={() => setShowUpload(false)}
            onCancel={() => setShowUpload(false)}
          />
        )}
        
        <Button 
          className="w-full mt-3 bg-blueprint-600 hover:bg-blueprint-700"
          onClick={() => setShowUpload(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Drawing
        </Button>
      </div>

      {/* Drawing List */}
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Project Drawings</h3>
          <Badge variant="outline" className="text-xs">
            {drawings.length} files
          </Badge>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-100 rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {drawings.map((drawing) => {
              const Icon = getDrawingIcon(drawing.fileType);
              const isSelected = selectedDrawing?.id === drawing.id;
              const isProcessingComplete = drawing.status === "complete" && drawing.aiProcessed;
              
              return (
                <div
                  key={drawing.id}
                  className={`rounded-lg p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blueprint-50 border border-blueprint-200"
                      : "bg-white border border-slate-200 hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedDrawing(drawing)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-blueprint-600" : "text-slate-600"}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{drawing.name}</p>
                        <p className="text-xs text-slate-500">
                          {getStatusText(drawing.status, drawing.aiProcessed || false)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(drawing.status)}
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })}
            
            {drawings.length === 0 && (
              <div className="text-center py-8">
                <FileImage className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">No drawings uploaded yet</p>
                <p className="text-xs text-slate-500">Upload your first drawing to get started</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
