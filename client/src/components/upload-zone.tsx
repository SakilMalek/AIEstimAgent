import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CloudUpload, X, Upload } from "lucide-react";

interface UploadZoneProps {
  projectId: string;
  onUploadComplete: () => void;
  onCancel: () => void;
}

export default function UploadZone({ projectId, onUploadComplete, onCancel }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [drawingName, setDrawingName] = useState("");
  const [scale, setScale] = useState("1/4\" = 1'");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/projects/${projectId}/drawings/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: "Your drawing has been uploaded and AI processing has started.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "drawings"] });
      onUploadComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, PNG, and JPG files are allowed.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setDrawingName(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", drawingName);
    formData.append("scale", scale);

    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? "border-blueprint-500 bg-blueprint-50" 
              : "border-slate-300 hover:border-blueprint-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUpload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-1">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-slate-500">PDF, PNG, JPG up to 50MB</p>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Upload className="w-5 h-5 text-blueprint-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="drawing-name">Drawing Name</Label>
              <Input
                id="drawing-name"
                value={drawingName}
                onChange={(e) => setDrawingName(e.target.value)}
                placeholder="Enter drawing name"
              />
            </div>

            <div>
              <Label htmlFor="scale">Scale</Label>
              <select
                id="scale"
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="1/4&quot; = 1'">1/4" = 1'</option>
                <option value="1/8&quot; = 1'">1/8" = 1'</option>
                <option value="1/2&quot; = 1'">1/2" = 1'</option>
                <option value="1&quot; = 1'">1" = 1'</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleUpload}
              disabled={!drawingName.trim() || uploadMutation.isPending}
              className="flex-1 bg-blueprint-600 hover:bg-blueprint-700"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload Drawing"}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
