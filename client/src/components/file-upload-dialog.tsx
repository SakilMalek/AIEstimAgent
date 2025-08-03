import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileImage, 
  File,
  X,
  CheckCircle
} from "lucide-react";
import type { Drawing } from "@shared/schema";

interface FileUploadDialogProps {
  onFileUpload: (drawing: Drawing) => void;
}

export default function FileUploadDialog({ onFileUpload }: FileUploadDialogProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = file.type.includes('pdf') || 
                         file.type.includes('image') ||
                         file.name.toLowerCase().endsWith('.pdf') ||
                         file.name.toLowerCase().endsWith('.png') ||
                         file.name.toLowerCase().endsWith('.jpg') ||
                         file.name.toLowerCase().endsWith('.jpeg');
      
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported format. Please upload PDF, PNG, or JPG files.`,
          variant: "destructive",
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 50MB limit.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsUploading(true);
    
    // Simulate file processing
    setTimeout(() => {
      const firstFile = uploadedFiles[0];
      const mockDrawing: Drawing = {
        id: `drawing-${Date.now()}`,
        projectId: "proj-1",
        name: firstFile.name.replace(/\.[^/.]+$/, ""),
        filename: firstFile.name,
        fileSize: firstFile.size,
        uploadedAt: new Date().toISOString(),
        status: "complete",
        aiProcessed: true
      };
      
      setIsUploading(false);
      onFileUpload(mockDrawing);
      
      toast({
        title: "File uploaded successfully",
        description: `${firstFile.name} is ready for analysis.`,
      });
    }, 2000);
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('image')) {
      return <FileImage className="w-5 h-5 text-blue-500" />;
    }
    return <File className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="flex-1 bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-300 bg-white hover:border-slate-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="mb-6">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Drop files here to upload
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Upload blueprint PDFs or images for AI analysis
            </p>
            <p className="text-xs text-slate-500">
              Supports PDF, PNG, JPG files up to 50MB
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild className="cursor-pointer">
                <span>Choose Files</span>
              </Button>
            </label>

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-medium text-slate-900 text-left">
                  Selected Files ({uploadedFiles.length})
                </h4>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file)}
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <Button 
                  onClick={processFiles}
                  disabled={isUploading}
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}