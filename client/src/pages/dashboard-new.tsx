import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import FileUploadDialog from "@/components/file-upload-dialog";
import { PDFGallerySidebar } from "@/components/pdf-gallery-sidebar";
import UnifiedDocumentViewer from "@/components/unified-document-viewer";
import VerticalTakeoffSelector from "@/components/vertical-takeoff-selector";
import OrganizedTakeoffPanel from "@/components/organized-takeoff-panel";
import { CollapsibleTakeoffSelector } from "@/components/collapsible-takeoff-selector";
import { ElementListPanel } from "@/components/element-list-panel";
import { CollapsiblePanel } from "@/components/collapsible-panel";
import { VerticalToolPalette, type ToolType } from "@/components/VerticalToolPalette";
import { TakeoffSelectionModal } from "@/components/TakeoffSelectionModal";
import { MeasurementCategoryDialog } from "@/components/MeasurementCategoryDialog";
import { ReportGeneratorComponent } from "@/components/report-generator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CalibrationTool from "@/components/calibration-tool";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useDocument } from "@/hooks/useDocument";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createApiUrl, createMlUrl } from "@/config/api";
import { Download, Ruler, Square, Hash, MessageSquare, PanelLeft, PanelRight, Hand, FileText, ChevronDown, Keyboard, Sparkles } from "lucide-react";
import type { Drawing, Project } from "@shared/schema";
import { useDetectionsStore } from "@/store/useDetectionsStore";
import type { Detection } from "@/store/useDetectionsStore";
import { useStore, type Detection as StoreDetection } from "@/store/useStore";
import { recalculateDimensions } from "@/utils/dimensionCalculator";
import { toPairs } from "@/utils/geometry";
import { compressImage, formatFileSize } from "@/utils/imageOptimizer";
import { AnalysisLoading } from "@/components/analysis-loading";
import { useMeasurementStore } from "@/store/useMeasurementStore";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { SettingsPanel } from "@/components/settings-panel";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import {
  calculateDistance,
  calculateArea,
  pixelsToRealWorld,
  formatMeasurement,
} from "@/utils/measurementUtils";

const isDetection = (value: unknown): value is Detection => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Detection;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.cls === "string" &&
    Array.isArray(candidate.points)
  );
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedTakeoffTypes, setSelectedTakeoffTypes] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [pdfPageData, setPdfPageData] = useState<any>(null);
  const [pdfData, setPdfData] = useState<any>(null);
  const [selectedPdfPageNumber, setSelectedPdfPageNumber] = useState<number | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [pdfPageAnalysisResults, setPdfPageAnalysisResults] = useState<Map<number, any>>(new Map());
  const [showAnalysisButtonPulse, setShowAnalysisButtonPulse] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'view' | 'annotate'>('view');
  const [activeTool, setActiveTool] = useState<'ruler' | 'area' | 'count' | null>(null);
  const [selectedScale, setSelectedScale] = useState("1/4\" = 1'");
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{ x: number; y: number }[]>([]);
  const [customPixelsPerFoot, setCustomPixelsPerFoot] = useState<number | null>(null);
  const [isPanMode, setIsPanMode] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [hiddenElements, setHiddenElements] = useState<Set<string>>(new Set());
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activePaletteTool, setActivePaletteTool] = useState<ToolType>('select');
  const [showTakeoffModal, setShowTakeoffModal] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [pendingMeasurement, setPendingMeasurement] = useState<{
    points: [number, number][];
    type: 'distance' | 'area';
    value: number;
    label: string;
  } | null>(null);

  const { toast } = useToast();
  
  // Keyboard shortcut: Ctrl+L to toggle right panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setIsRightPanelCollapsed(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  // MODIFICATION: The Zustand hook is now called at the top level, which is correct.
  const setDetections = useDetectionsStore(s => s.setDetections);
  
  // Undo/Redo from store with toast feedback
  const undoStore = useStore(s => s.undo);
  const redoStore = useStore(s => s.redo);
  const canUndo = useStore(s => s.canUndo);
  const canRedo = useStore(s => s.canRedo);
  
  const undo = () => {
    undoStore();
    toast({
      title: "Undone",
      description: "Previous action has been undone",
      duration: 2000,
    });
  };
  
  const redo = () => {
    redoStore();
    toast({
      title: "Redone",
      description: "Action has been redone",
      duration: 2000,
    });
  };
  
  // Measurement store
  const {
    measurementMode,
    setMeasurementMode,
    addMeasurement,
    updateCurrentMeasurement,
  } = useMeasurementStore();
  
  // Debug: Log when measurementMode changes
  useEffect(() => {
    console.log('[Dashboard] measurementMode changed to:', measurementMode);
  }, [measurementMode]);

  // Pulse AI Analysis button for 3 seconds when drawing is uploaded
  useEffect(() => {
    if (currentDrawing && !analysisResults) {
      setShowAnalysisButtonPulse(true);
      const timer = setTimeout(() => {
        setShowAnalysisButtonPulse(false);
      }, 3000); // Stop after 3 seconds
      
      return () => clearTimeout(timer);
    } else {
      setShowAnalysisButtonPulse(false);
    }
  }, [currentDrawing, analysisResults]);
  
  const [measurementPoints, setMeasurementPoints] = useState<[number, number][]>([]);
  
  // Keyboard shortcuts for measurement tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keys if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (measurementMode && !isTyping) {
        if (e.key === 'Escape') {
          // Cancel current measurement
          setMeasurementPoints([]);
          updateCurrentMeasurement([]);
          setMeasurementMode(null);
          setActivePaletteTool('select');
          toast({
            title: "Measurement Cancelled",
            description: "Press Measure to start again",
          });
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          // Remove last vertex (only if not typing in a dialog)
          if (measurementPoints.length > 0) {
            e.preventDefault(); // Prevent browser back navigation
            const newPoints = measurementPoints.slice(0, -1);
            setMeasurementPoints(newPoints);
            updateCurrentMeasurement(newPoints);
            toast({
              title: "Vertex Removed",
              description: `${newPoints.length} point${newPoints.length !== 1 ? 's' : ''} remaining`,
            });
          }
        } else if (e.key === 'Enter' && measurementMode === 'area' && measurementPoints.length >= 3) {
          // Complete area measurement
          completeMeasurement(measurementPoints);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [measurementMode, measurementPoints]);
  
  // NOTE: Real-time dimension updates are now handled in OrganizedTakeoffPanel
  // by reading directly from the store, avoiding re-renders that break editing
  
  const getPixelsPerFoot = (scale: string): number => {
    const scaleMap: { [key: string]: number } = {
      '1/4" = 1\'': 48,
      '1/8" = 1\'': 24,
      '1/2" = 1\'': 96,
      '1" = 1\'': 192,
    };
    return scaleMap[scale] || 48;
  };

  const handleRunAnalysis = async () => {
    // Determine if analyzing PDF pages or single image
    const isAnalyzingPdf = pdfData && pdfData.pages && pdfData.pages.length > 0;
    
    if (!currentDrawing && !isAnalyzingPdf) {
      toast({ title: "No Drawing", description: "Please upload a drawing first.", variant: "destructive" });
      return;
    }

    const typesToAnalyze = selectedTakeoffTypes.length > 0 ? selectedTakeoffTypes : ['flooring', 'openings', 'walls'];
    if (typesToAnalyze.length === 0) {
      toast({ title: "No Selection", description: "Please select at least one takeoff type.", variant: "destructive" });
      return;
    }

    // Get pages to analyze
    let pagesToAnalyze: any[] = [];
    if (isAnalyzingPdf) {
      // Get all floor plan pages from pdfData
      pagesToAnalyze = pdfData.pages.filter((p: any) => p.type === 'floor_plan');
      if (pagesToAnalyze.length === 0) {
        toast({ 
          title: "No Floor Plans", 
          description: "No floor plan pages found in the PDF. Only floor plans can be analyzed.",
          variant: "destructive" 
        });
        return;
      }
    } else if (currentDrawing) {
      pagesToAnalyze = [{ image_path: currentDrawing.file_url, page_number: 0, filename: currentDrawing.filename }];
    }

    const startTime = performance.now();
    console.log('[Analysis] Starting analysis for', pagesToAnalyze.length, 'page(s)...');
    
    setIsAnalyzing(true);
    setAnalysisResults(null);

    try {
      // Calculate scale value once
      let scaleValue: number;
      if (customPixelsPerFoot) {
        scaleValue = customPixelsPerFoot / 96;
      } else {
        const scaleMap: { [key: string]: number } = {
          '1/4" = 1\'': 0.25,
          '1/8" = 1\'': 0.125,
          '1/2" = 1\'': 0.5,
          '1" = 1\'': 1.0,
        };
        scaleValue = scaleMap[selectedScale] || 0.25;
      }

      // Analyze all pages
      let allPredictions: Detection[] = [];
      let lastResults: any = null;
      const pageResultsMap = new Map<number, any>();

      for (const page of pagesToAnalyze) {
        const pageImageUrl = page.image_path || page.fileUrl;
        const pageNum = page.page_number || 0;
        console.log(`[Analysis] Analyzing page ${pageNum}...`);
        
        const fetchStart = performance.now();
        const response = await fetch(pageImageUrl);
        const imageBlob = await response.blob();
        const filename = page.filename || (page.page_number ? `page_${page.page_number}.jpg` : 'image.jpg');
        const imageFile = new File([imageBlob], filename, { type: imageBlob.type });
        console.log(`[Analysis] Image fetch took ${(performance.now() - fetchStart).toFixed(0)}ms`);

        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('types', JSON.stringify(typesToAnalyze));
        formData.append('scale', scaleValue.toString());

        console.log('[Analysis] Sending request to ML service:', createMlUrl('/analyze'));
        const mlStart = performance.now();
        const results = await apiRequest(createMlUrl('/analyze'), 'POST', formData, true);
        console.log(`[Analysis] ML inference took ${(performance.now() - mlStart).toFixed(0)}ms`);

        lastResults = results;
        
        // Store results per page for PDF pages
        if (isAnalyzingPdf) {
          pageResultsMap.set(pageNum, results);
          console.log(`[Analysis] Stored results for page ${pageNum}`);
        }

        // Collect predictions from this page
        if (results && results.predictions) {
          const pagePredictions = Object.values(results.predictions)
            .flat()
            .filter((item): item is Detection => isDetection(item));
          allPredictions = [...allPredictions, ...pagePredictions];
        }
      }

      setAnalysisResults(lastResults);
      
      // Store per-page results for PDF
      if (isAnalyzingPdf && pageResultsMap.size > 0) {
        setPdfPageAnalysisResults(pageResultsMap);
        console.log(`[Analysis] Stored analysis results for ${pageResultsMap.size} pages`);
      }

      // Update detections with all collected predictions
      if (allPredictions.length > 0) {
        // Preserve manual rooms (from measurement tool) when updating detections
        const currentDetections = useDetectionsStore.getState().detections;
        const manualRooms = currentDetections.filter((d: any) => d.isManual);
        
        // Combine AI predictions with manual rooms
        setDetections([...allPredictions, ...manualRooms]);

        // Save analysis results to database as takeoffs (only for uploaded images, not PDF pages)
        try {
          if (currentDrawing?.id) {
            const saveStart = performance.now();
            await apiRequest(createApiUrl(`/api/drawings/${currentDrawing.id}/analysis`), 'POST', {
              results: lastResults,
              scale: scaleValue
            });
            console.log(`[Analysis] Saving to DB took ${(performance.now() - saveStart).toFixed(0)}ms`);

            // Invalidate takeoffs query to refresh the takeoff panel
            queryClient.invalidateQueries({ queryKey: ["/api/drawings", currentDrawing.id, "takeoffs"] });
          }
        } catch (saveError) {
          console.error("Failed to save analysis results:", saveError);
        }
      } else {
        setDetections([]);
      }

      const totalTime = performance.now() - startTime;
      console.log(`[Analysis] ✅ Total analysis time: ${totalTime.toFixed(0)}ms (${(totalTime / 1000).toFixed(1)}s)`);
      
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${pagesToAnalyze.length} page(s) with ${typesToAnalyze.length} element types in ${(totalTime / 1000).toFixed(1)}s`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createNewProject = async (drawingName: string): Promise<Project> => {
    const projectData = { name: `Project - ${drawingName}`, description: `Auto-generated project for ${drawingName}`, status: "active" };
    const project = await apiRequest(createApiUrl("/api/projects"), "POST", projectData);
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    return project;
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setCurrentDrawing(null);
    setAnalysisResults(null);
    setDetections([]); // Clear previous detections on new upload

    try {
      console.log('[Upload] Starting optimized upload flow...');
      const uploadStart = performance.now();
      
      // Aggressive compression for faster upload (1280px max, 0.75 quality)
      const originalSize = formatFileSize(file.size);
      console.log('[Upload] Compressing image from', originalSize);
      
      const optimizedFile = await compressImage(file, {
        maxWidth: 1280,    // Reduced from 2048 for faster upload
        maxHeight: 1280,   // Reduced from 2048 for faster upload
        quality: 0.75,     // Reduced from 0.85 for faster compression
        maxSizeMB: 3       // Reduced from 5 for faster upload
      });
      const newSize = formatFileSize(optimizedFile.size);
      const compressionTime = performance.now() - uploadStart;
      console.log(`[Upload] Compressed: ${originalSize} → ${newSize} (${compressionTime.toFixed(0)}ms)`);
      
      // Parallel: Create project and upload file simultaneously
      console.log('[Upload] Starting parallel upload and project creation...');
      const uploadStart2 = performance.now();
      
      const [uploadResult, projectToUse] = await Promise.all([
        // Upload file
        (async () => {
          const uploadFormData = new FormData();
          uploadFormData.append('file', optimizedFile);
          return apiRequest(createApiUrl('/api/upload'), 'POST', uploadFormData, true);
        })(),
        // Create project in parallel
        currentProject ? Promise.resolve(currentProject) : createNewProject(file.name)
      ]);

      if (!uploadResult || !uploadResult.filename || !uploadResult.file_url) {
        throw new Error('Invalid upload response');
      }

      const uploadTime = performance.now() - uploadStart2;
      console.log(`[Upload] Upload + project creation completed in ${uploadTime.toFixed(0)}ms`);
      
      setCurrentProject(projectToUse);

      // Create drawing record
      const drawingData = {
        project_id: projectToUse.id,
        name: file.name,
        filename: uploadResult.filename,
        file_url: uploadResult.file_url,
        file_type: file.type,
        status: "complete",
        scale: selectedScale,
        ai_processed: false
      };
      
      console.log('[Upload] Creating drawing record...');
      const savedDrawing = await apiRequest(createApiUrl(`/api/projects/${projectToUse.id}/drawings`), "POST", drawingData);
      
      const totalTime = performance.now() - uploadStart;
      console.log(`[Upload] ✅ Complete in ${totalTime.toFixed(0)}ms`);

      setCurrentDrawing(savedDrawing);
      toast({ title: "Upload Successful", description: "Select takeoff types and click 'Run AI Analysis'." });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({ title: "Upload Failed", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleElementVisibilityToggle = (elementId: string, visible: boolean) => {
    console.log(`[Dashboard] Eye button clicked! Element ${elementId} (type: ${typeof elementId}) visibility changed to ${visible}`);
    setHiddenElements(prevHidden => {
      const newHidden = new Set(prevHidden);
      // Ensure elementId is a string
      const idStr = String(elementId);
      if (visible) {
        newHidden.delete(idStr);
        console.log(`[Dashboard] Removed ${idStr} from hidden set`);
      } else {
        newHidden.add(idStr);
        console.log(`[Dashboard] Added ${idStr} to hidden set`);
      }
      console.log(`[Dashboard] Hidden elements:`, Array.from(newHidden));
      console.log(`[Dashboard] Hidden elements count: ${newHidden.size}`);
      return newHidden;
    });
  };

  const handleElementDelete = (elementId: string) => {
    // Remove from useStore (canvas detections)
    const removeDetection = useStore.getState().removeDetection;
    removeDetection(elementId);
    
    // Remove from useDetectionsStore (analysis results)
    const currentDetections = useDetectionsStore.getState().detections;
    useDetectionsStore.getState().setDetections(
      currentDetections.filter(d => d.id !== elementId)
    );
    
    // Remove from analysisResults
    if (analysisResults?.predictions) {
      setAnalysisResults({
        ...analysisResults,
        predictions: {
          ...analysisResults.predictions,
          rooms: analysisResults.predictions.rooms?.filter((r: any) => r.id !== elementId) || [],
          walls: analysisResults.predictions.walls?.filter((w: any) => w.id !== elementId) || [],
          openings: analysisResults.predictions.openings?.filter((o: any) => o.id !== elementId) || [],
        }
      });
    }
    
    // Remove from hidden elements set if present
    setHiddenElements(prev => {
      const newHidden = new Set(prev);
      newHidden.delete(elementId);
      return newHidden;
    });
    
    console.log('Deleted element:', elementId);
  };

  const handleElementRename = (elementId: string, newName: string) => {
    // Update in analysisResults
    if (analysisResults?.predictions) {
      const updateElementName = (elements: any[]) => 
        elements?.map((el: any) => el.id === elementId ? { ...el, name: newName } : el) || [];

      setAnalysisResults({
        ...analysisResults,
        predictions: {
          ...analysisResults.predictions,
          rooms: updateElementName(analysisResults.predictions.rooms),
          walls: updateElementName(analysisResults.predictions.walls),
          openings: updateElementName(analysisResults.predictions.openings),
        }
      });
    }
    
    console.log('Renamed element:', elementId, 'to', newName);
  };

  const completeMeasurement = (points: [number, number][]) => {
    const pixelsPerFoot = customPixelsPerFoot || getPixelsPerFoot(selectedScale);
    
    if (measurementMode === 'distance' && points.length === 2) {
      const distancePixels = calculateDistance(points[0], points[1]);
      const distanceFeet = pixelsToRealWorld(distancePixels, pixelsPerFoot, false);
      const label = formatMeasurement(distanceFeet, 'distance');
      
      // For distance, auto-show dialog
      setPendingMeasurement({
        points,
        type: 'distance',
        value: distanceFeet,
        label,
      });
      setShowCategoryDialog(true);
    } else if (measurementMode === 'area' && points.length >= 3) {
      const areaPixels = calculateArea(points);
      const areaSqFt = pixelsToRealWorld(areaPixels, pixelsPerFoot, true);
      const label = formatMeasurement(areaSqFt, 'area');
      
      // For area, save pending but DON'T show dialog yet (wait for right-click)
      setPendingMeasurement({
        points,
        type: 'area',
        value: areaSqFt,
        label,
      });
      
      // Keep the area visible by updating current measurement
      updateCurrentMeasurement(points);
      
      toast({
        title: "Area Drawn",
        description: "Right-click inside the area to categorize it",
      });
    }
    
    setMeasurementPoints([]);
  };

  const handleMeasurementRightClick = () => {
    if (pendingMeasurement && pendingMeasurement.type === 'area') {
      setShowCategoryDialog(true);
    }
  };

  const handleMeasurementConfirm = (category: string, name: string) => {
    if (!pendingMeasurement) return;
    
    const measurementId = uuidv4();
    
    // Define colors for each category
    const categoryColors: { [key: string]: string } = {
      room: '#10B981',      // Green for rooms
      wall: '#3B82F6',      // Blue for walls
      flooring: '#8B5CF6',  // Purple for flooring
      other: '#EC4899',     // Pink for other
    };
    
    // For area measurements, add as detection (appears in right panel with toolbar)
    if (pendingMeasurement.type === 'area') {
      const pixelsPerFoot = customPixelsPerFoot || getPixelsPerFoot(selectedScale);
      const areaPixels = calculateArea(pendingMeasurement.points);
      const areaSqFt = pixelsToRealWorld(areaPixels, pixelsPerFoot, true);
      
      const newStoreDetection: any = {
        id: measurementId,
        cls: category, // Use the category as the class (room, wall, flooring, other)
        points: pendingMeasurement.points,
        label: name || category,
        isManual: true,
        color: categoryColors[category] || '#4ecdc4', // Assign color based on category
      };
      
      // Add to useStore for EditableOverlay (this gives it the draggable toolbar)
      const { setDetections: setStoreDetections, detections: storeDetections } = useStore.getState();
      setStoreDetections([...storeDetections, newStoreDetection]);
      
      // Also add to useDetectionsStore with isManual flag (so it persists through analysis)
      const newDetection: any = {
        id: measurementId,
        cls: category,
        class: name || category,
        points: pendingMeasurement.points,
        isManual: true,
        color: categoryColors[category] || '#4ecdc4',
        display: {
          area_sqft: areaSqFt,
          perimeter_ft: 0,
        }
      };
      const currentDetections = useDetectionsStore.getState().detections;
      useDetectionsStore.getState().setDetections([...currentDetections, newDetection]);
    } else {
      // For distance measurements, save to measurement store
      const color = categoryColors[category] || '#ff6b6b';
      
      const newMeasurement = {
        id: measurementId,
        type: pendingMeasurement.type,
        points: pendingMeasurement.points,
        value: pendingMeasurement.value,
        label: name || pendingMeasurement.label,
        color,
        category,
        name,
      };
      
      addMeasurement(newMeasurement);
    }
    
    // Reset all measurement state to allow creating new measurements
    setPendingMeasurement(null);
    setShowCategoryDialog(false);
    setMeasurementPoints([]);
    
    // Clear any selection mode in the store to prevent editing mode conflicts
    const { setSelectionMode, clearSelectedVertices } = useStore.getState();
    setSelectionMode('normal');
    clearSelectedVertices(); // Deselect all vertices after saving
    
    // Re-initialize currentMeasurement with the correct type for next measurement
    // This ensures the preview will work for the next measurement
    if (measurementMode) {
      updateCurrentMeasurement([]);
      // Or better: reinitialize with type
      const { setCurrentMeasurement } = useMeasurementStore.getState();
      setCurrentMeasurement({ type: measurementMode, points: [] });
    }
    
    console.log('[Dashboard] Measurement saved, ready for next measurement. Mode:', measurementMode);
    
    toast({
      title: "Measurement Saved",
      description: `${pendingMeasurement.type === 'distance' ? 'Distance' : 'Area'} measurement added as ${category}`,
    });
  };

  const handleMeasurementCancel = () => {
    setPendingMeasurement(null);
    setShowCategoryDialog(false);
    updateCurrentMeasurement([]); // Clear the preview
  };

  const handleToolChange = (tool: ToolType) => {
    console.log('[Dashboard] Tool changed to:', tool);
    
    if (tool === 'settings') {
      setShowSettingsPanel(true);
    } else if (tool === 'pan') {
      setActivePaletteTool(tool);
      setIsPanMode(true);
      // Keep measurement mode and points active so user can pan and return to measuring
      // Don't clear measurementMode or measurementPoints
    } else if (tool === 'measure') {
      setActivePaletteTool(tool);
      setIsPanMode(false);
      // Always ensure measurement mode is set when activating measure tool
      if (!measurementMode) {
        setMeasurementMode('distance');
      }
    } else if (tool === 'select') {
      console.log('[Dashboard] Select tool activated - clearing measurement mode');
      setActivePaletteTool(tool);
      setIsPanMode(false);
      setMeasurementMode(null);
      setMeasurementPoints([]);
      updateCurrentMeasurement([]);
    } else {
      setActivePaletteTool(tool);
      setIsPanMode(false);
      setMeasurementMode(null);
      setMeasurementPoints([]);
      updateCurrentMeasurement([]);
      // TODO: Implement tool-specific logic
    }
  };

  // Action buttons for navbar
  const actionButtons = (
    <>
      {/* AI Analysis Button */}
      <Button
        onClick={() => setShowTakeoffModal(true)}
        className={cn(
          "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all hover:scale-105 text-xs px-2 h-7",
          showAnalysisButtonPulse && "animate-pulse"
        )}
        size="sm"
      >
        <Sparkles className="w-3 h-3 mr-1" />
        AI Analysis
      </Button>

      {/* Export Report Button */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 h-7"
            disabled={!currentProject || !currentDrawing}
          >
            <FileText className="w-3 h-3 mr-1" />
            Export Report
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          {currentProject && currentDrawing ? (
            <ReportGeneratorComponent
              project={currentProject}
              takeoffs={[]}
              drawings={[currentDrawing]}
              analyses={[]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Please select a project and drawing first.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Chat Button */}
      <Button 
        variant="outline"
        size="sm" 
        className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600 text-xs px-2 h-7"
      >
        <MessageSquare className="w-3 h-3 mr-1" />
        AI Chat
      </Button>
    </>
  );

  return (
    <Layout actionButtons={actionButtons}>
      <div className="flex h-full overflow-hidden">
        {/* Vertical Tool Palette */}
        <div className="hidden md:flex">
          <VerticalToolPalette
            activeTool={activePaletteTool}
            onToolChange={handleToolChange}
            onMeasurementModeChange={(mode) => setMeasurementMode(mode as 'distance' | 'area')}
            measurementMode={measurementMode as 'distance' | 'area' | undefined}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden">

          <div className="flex-1 relative bg-muted/30 flex flex-col border-border p-1 sm:p-2 md:p-3 lg:p-4 overflow-hidden">

            {/* Scale & Calibration Controls - Fixed Bottom Right */}
                <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 md:bottom-4 md:right-4 z-20 flex items-center gap-1 sm:gap-2 bg-card rounded-lg shadow-lg border border-border p-2 sm:p-3">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    {!customPixelsPerFoot ? (
                      <>
                        <span className="text-xs text-muted-foreground hidden sm:inline">Scale:</span>
                        <select className="text-xs bg-background border border-border rounded px-1 sm:px-2 py-1 text-foreground" value={selectedScale} onChange={(e) => setSelectedScale(e.target.value)} disabled={isCalibrating}>
                          <option>1/4" = 1'</option>
                          <option>1/8" = 1'</option>
                          <option>1/2" = 1'</option>
                          <option>1" = 1'</option>
                        </select>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Calibrated:</span>
                        <span className="text-xs font-medium text-primary">{customPixelsPerFoot.toFixed(1)} px/ft</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomPixelsPerFoot(null)}
                          className="h-6 px-2 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    )}
                  </div>
                  <CalibrationTool
                    isActive={isCalibrating}
                    points={calibrationPoints}
                    onActivate={() => {
                      setIsCalibrating(true);
                      setIsPanMode(false);
                    }}
                    onComplete={(pixelsPerFoot) => {
                      setCustomPixelsPerFoot(pixelsPerFoot);
                      setIsCalibrating(false);
                      setCalibrationPoints([]);
                      toast({
                        title: "Calibration Complete",
                        description: `Scale set to ${pixelsPerFoot.toFixed(1)} pixels per foot`,
                      });
                    }}
                    onCancel={() => {
                      setIsCalibrating(false);
                      setCalibrationPoints([]);
                    }}
                  />
                </div>

                <UnifiedDocumentViewer
                  drawing={currentDrawing}
                  highlightedElement={selectedElementId}
                  activeViewMode={activeViewMode}
                  activeTool={activeTool}
                  selectedScale={selectedScale}
                  onElementClick={setSelectedElementId}
                  onMeasurement={() => { }}
                  analysisResults={pdfPageData ? null : analysisResults}
                  isCalibrating={isCalibrating}
                  calibrationPoints={calibrationPoints}
                  isPanMode={isPanMode}
                  hiddenElements={hiddenElements}
                  measurementMode={measurementMode}
                  isAnalyzing={isAnalyzing}
                  onMeasurementClick={(point) => {
                    // Don't add points while in pan mode
                    if (isPanMode) {
                      return;
                    }
                    
                    console.log('[Dashboard] Measurement click. Current points:', measurementPoints.length, 'Adding:', point);
                    const newPoints = [...measurementPoints, point];
                    setMeasurementPoints(newPoints);
                    updateCurrentMeasurement(newPoints);
                    console.log('[Dashboard] New points array:', newPoints.length);
                    
                    // Auto-complete distance measurement after 2 points
                    if (measurementMode === 'distance' && newPoints.length === 2) {
                      completeMeasurement(newPoints);
                    }
                  }}
                  onMeasurementComplete={() => {
                    // Complete area measurement
                    if (measurementMode === 'area' && measurementPoints.length >= 3) {
                      completeMeasurement(measurementPoints);
                    }
                  }}
                  onMeasurementRightClick={handleMeasurementRightClick}
                  onCalibrationClick={(x, y) => {
                    if (calibrationPoints.length < 2) {
                      setCalibrationPoints([...calibrationPoints, { x, y }]);
                    }
                  }}
                  onBack={() => {
                    setCurrentDrawing(null);
                    setAnalysisResults(null); 
                    setDetections([]); 
                  }}
                />

                {/* Show PDF gallery + viewer only when viewing PDF pages (not regular images) */}
                {pdfPageData && !currentDrawing ? (
                  <div className="flex-1 flex overflow-hidden">
                    {/* Show PDF gallery sidebar when PDF is being viewed */}
                    {pdfData && (
                      <PDFGallerySidebar 
                        pdfData={pdfData}
                        selectedPageNumber={selectedPdfPageNumber}
                        onPageSelect={(pageNum) => {
                          console.log(`[Dashboard] Page selected: ${pageNum}`);
                          setSelectedPdfPageNumber(pageNum);
                          const page = pdfData.pages.find((p: any) => p.page_number === pageNum);
                          if (page) {
                            console.log(`[Dashboard] Setting pdfPageData for page ${pageNum}`);
                            setPdfPageData(page);
                            // Set analysis results for this page if available
                            const pageResults = pdfPageAnalysisResults.get(pageNum);
                            console.log(`[Dashboard] Looking for results for page ${pageNum}, found:`, !!pageResults);
                            if (pageResults) {
                              setAnalysisResults(pageResults);
                              console.log(`[Dashboard] Loaded analysis results for page ${pageNum}`, pageResults);
                            } else {
                              console.log(`[Dashboard] No analysis results for page ${pageNum}`);
                              setAnalysisResults(null);
                            }
                          }
                        }}
                        onBack={() => {
                          setPdfData(null);
                          setPdfPageData(null);
                          setSelectedPdfPageNumber(null);
                          setAnalysisResults(null); 
                          setDetections([]); 
                        }}
                      />
                    )}
                    
                    {/* Show UnifiedDocumentViewer for PDF page (unified viewer) */}
                    <UnifiedDocumentViewer
                      drawing={null}
                      pdfPageData={pdfPageData}
                      highlightedElement={selectedElementId}
                      activeViewMode={activeViewMode}
                      activeTool={activeTool}
                      selectedScale={selectedScale}
                      onElementClick={setSelectedElementId}
                      onMeasurement={() => { }}
                      analysisResults={analysisResults}
                      isAnalyzing={isAnalyzing}
                      isCalibrating={isCalibrating}
                      calibrationPoints={calibrationPoints}
                      isPanMode={isPanMode}
                      hiddenElements={hiddenElements}
                      measurementMode={measurementMode}
                      onMeasurementClick={(point) => {
                        if (isPanMode) {
                          return;
                        }
                        console.log('[Dashboard] Measurement click on PDF. Current points:', measurementPoints.length, 'Adding:', point);
                        const newPoints = [...measurementPoints, point];
                        setMeasurementPoints(newPoints);
                        updateCurrentMeasurement(newPoints);
                        console.log('[Dashboard] New points array:', newPoints.length);
                        
                        // Auto-complete distance measurement after 2 points
                        if (measurementMode === 'distance' && newPoints.length === 2) {
                          completeMeasurement(newPoints);
                        }
                      }}
                      onMeasurementComplete={() => {
                        // Complete area measurement
                        if (measurementMode === 'area' && measurementPoints.length >= 3) {
                          completeMeasurement(measurementPoints);
                        }
                      }}
                      onMeasurementRightClick={handleMeasurementRightClick}
                      onCalibrationClick={(x, y) => {
                        if (calibrationPoints.length < 2) {
                          setCalibrationPoints([...calibrationPoints, { x, y }]);
                        }
                      }}
                      onBack={() => {
                        setPdfData(null);
                        setPdfPageData(null);
                        setSelectedPdfPageNumber(null);
                        setAnalysisResults(null); 
                        setDetections([]); 
                      }}
                    />
                  </div>
                ) : !currentDrawing ? (
                  /* Show upload dialog only when no drawing and no PDF */
                  <FileUploadDialog 
                    onFileUpload={handleFileUpload} 
                    isUploading={isUploading}
                    onPDFPageSelected={(pageData: any) => {
                      // When PDF is processed, set the PDF data
                      if (pageData && pageData.pages) {
                        setPdfData(pageData);
                        setSelectedPdfPageNumber(pageData.pages[0]?.page_number || null);
                        setPdfPageData(pageData.pages[0] || null);
                      }
                    }}
                  />
                ) : null}
                
                {isUploading && uploadProgress && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-card p-6 rounded-lg shadow-lg border border-border">
                      <p className="text-sm text-muted-foreground">{uploadProgress}</p>
                    </div>
                  </div>
                )}
          </div>
        </main>

        <CollapsiblePanel
          side="right"
          expandedWidth={384}
          collapsedWidth={64}
          collapsed={isRightPanelCollapsed}
          onCollapsedChange={setIsRightPanelCollapsed}
          className="hidden md:flex flex-col"
        >

          <ElementListPanel
            analysisResults={analysisResults}
            onElementVisibilityToggle={handleElementVisibilityToggle}
            onElementSelect={setSelectedElementId}
            onElementDelete={handleElementDelete}
            onElementRename={handleElementRename}
            selectedElementId={selectedElementId}
            hiddenElements={hiddenElements}
          />
        </CollapsiblePanel>
      </div>

      {/* Takeoff Selection Modal */}
      <TakeoffSelectionModal
        open={showTakeoffModal}
        onOpenChange={setShowTakeoffModal}
        selectedTypes={selectedTakeoffTypes}
        onSelectionChange={setSelectedTakeoffTypes}
        onRunAnalysis={handleRunAnalysis}
        isAnalyzing={isAnalyzing}
      />

      {/* Measurement Category Dialog */}
      {pendingMeasurement && (
        <MeasurementCategoryDialog
          open={showCategoryDialog}
          onOpenChange={setShowCategoryDialog}
          measurementType={pendingMeasurement.type}
          measurementValue={pendingMeasurement.label}
          onConfirm={handleMeasurementConfirm}
          onCancel={handleMeasurementCancel}
        />
      )}

      {/* Settings Panel */}
      <SettingsPanel
        open={showSettingsPanel}
        onOpenChange={setShowSettingsPanel}
        onShowShortcuts={() => setShowShortcutsDialog(true)}
        onShowTakeoffSelection={() => setShowTakeoffModal(true)}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog 
        open={showShortcutsDialog} 
        onOpenChange={setShowShortcutsDialog} 
      />
    </Layout>
  );
}
