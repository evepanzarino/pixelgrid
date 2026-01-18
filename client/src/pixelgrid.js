import { useEffect, useState, useRef, useCallback, memo } from "react";
import { flushSync } from "react-dom";
import "./pixelgrid.css";

// Memoized pixel component to prevent unnecessary re-renders
const DrawingPixel = memo(({ 
  color, 
  index, 
  isHovered, 
  isLineStart, 
  isCurveEnd, 
  isInLinePreview,
  isSelected,
  isInSelectionRect,
  isSelectionStartPoint,
  isInDragPreview,
  isDrawing,
  zoomFactor,
  activeDrawingTool,
  onPointerDown,
  onPointerUp,
  onPointerEnter,
  onPointerMove,
  onPointerLeave
}) => {
  // Border and visual feedback logic
  let borderStyle = '';
  let borderColor = 'transparent';
  let borderWidth = `${0.1 * zoomFactor}vw`;
  let opacity = 1;
  let boxShadow = 'none';

  // Debug logging for white pixels
  if (color === '#ffffff' && (isSelectionStartPoint || isInSelectionRect || isSelected)) {
    console.log(`White pixel ${index}: isSelectionStartPoint=${isSelectionStartPoint}, isInSelectionRect=${isInSelectionRect}, isSelected=${isSelected}`);
  }
  
  // Dim original position during drag preview
  if (isSelected && isDrawing && activeDrawingTool === "select" && isInDragPreview === false) {
    opacity = 0.3;
  }
  
  // Show preview at new position with full opacity and purple border
  if (isInDragPreview) {
    borderColor = '#9C27B0';
    borderWidth = `${0.2 * zoomFactor}vw`;
    boxShadow = `0 0 ${0.5 * zoomFactor}vw ${0.2 * zoomFactor}vw #9C27B0`;
  } else if (isSelectionStartPoint) {
    // Use same contrast detection as line/curve previews
    const isLight = (() => {
      // If no color is set, pixel appears white, so treat as light
      if (!color || color.length < 7) return true;
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      const brightness = (r + g + b) / 3;
      return brightness > 127;
    })();
    borderColor = isLight ? '#000000' : '#CCCCCC';
    borderWidth = `${0.2 * zoomFactor}vw`;
    boxShadow = `0 0 ${0.6 * zoomFactor}vw ${0.3 * zoomFactor}vw ${borderColor}`;
  } else if (isInSelectionRect) {
    // Use same contrast detection as line/curve previews
    const isLight = (() => {
      // If no color is set, pixel appears white, so treat as light
      if (!color || color.length < 7) return true;
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      const brightness = (r + g + b) / 3;
      return brightness > 127;
    })();
    borderColor = isLight ? '#000000' : '#CCCCCC';
    borderWidth = `${0.2 * zoomFactor}vw`;
  } else if (isSelected && activeDrawingTool !== "select") {
    // Don't show borders for selected pixels when select tool is active - overlay handles it
    // Use same contrast detection as line/curve previews
    const isLight = (() => {
      // If no color is set, pixel appears white, so treat as light
      if (!color || color.length < 7) return true;
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      const brightness = (r + g + b) / 3;
      return brightness > 127;
    })();
    borderColor = isLight ? '#000000' : '#CCCCCC';
    borderWidth = `${0.2 * zoomFactor}vw`;
  } else if (isCurveEnd || isLineStart || isInLinePreview) {
    // Use proper contrast detection for line/curve previews
    const isLight = (() => {
      // If no color is set, pixel appears white, so treat as light
      if (!color || color.length < 7) return true;
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      const brightness = (r + g + b) / 3;
      return brightness > 127;
    })();
    borderColor = isLight ? '#000000' : '#CCCCCC';
    borderWidth = `${0.2 * zoomFactor}vw`;
  } else if (isHovered && !isDrawing) {
    // Use proper contrast detection for hover
    const isLight = (() => {
      // If no color is set, pixel appears white, so treat as light
      if (!color || color.length < 7) return true;
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      const brightness = (r + g + b) / 3;
      return brightness > 127;
    })();
    borderColor = isLight ? '#000000' : '#CCCCCC';
    borderWidth = `${0.15 * zoomFactor}vw`;
  }
  
  borderStyle = `${borderWidth} solid ${borderColor}`;
  
  // Debug final border for white pixels
  if (color === '#ffffff' && borderColor !== 'transparent') {
    console.log(`White pixel ${index} final border: ${borderStyle}`);
  }
  
  return (
    <div
      data-pixel-index={index}
      style={{ 
        background: color, 
        boxSizing: 'border-box',
        border: borderStyle,
        boxShadow,
        opacity,
        position: 'relative',
        touchAction: activeDrawingTool === "movegroup" ? "none" : "auto"
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onClick={() => {}}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    />
  );
});

export default function PixelGrid() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Load saved data from localStorage or use defaults
  const [primaryColor, setPrimaryColor] = useState(() => {
    try {
      return localStorage.getItem("pixelgrid_primaryColor") || "#000000";
    } catch { return "#000000"; }
  });
  const [secondaryColor, setSecondaryColor] = useState(() => {
    try {
      return localStorage.getItem("pixelgrid_secondaryColor") || "#ffffff";
    } catch { return "#ffffff"; }
  });
  
  const [activeTool, setActiveTool] = useState("primary"); // "primary" or "secondary"
  const [showColorMenu, setShowColorMenu] = useState(true);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [viewMode, setViewMode] = useState("drawing"); // "drawing" or "layers"
  const [showColorEditor, setShowColorEditor] = useState(false);
  const [editingColor, setEditingColor] = useState(null); // "primary" or "secondary"
  const [hoveredPixel, setHoveredPixel] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [verticalScrollPosition, setVerticalScrollPosition] = useState(0);
  const [isDraggingVerticalSlider, setIsDraggingVerticalSlider] = useState(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState("pencil"); // "pencil", "eraser", "line", "curve", "bucket", "select", "movegroup", "eyedropper"
  const [lineStartPixel, setLineStartPixel] = useState(null); // For line/curve tool: first click position
  const [lineEndPixel, setLineEndPixel] = useState(null); // For line tool apply/preview
  const [curveEndPixel, setCurveEndPixel] = useState(null); // For curve tool adjustment mode
  const [curveCurveAmount, setCurveCurveAmount] = useState(0); // Curve adjustment: -100 to 100%
  const [selectionStart, setSelectionStart] = useState(null); // Rectangle selection start
  const [selectionEnd, setSelectionEnd] = useState(null); // Rectangle selection end (during drag)
  const [selectedPixels, setSelectedPixels] = useState([]); // Array of selected pixel indices
  const [selectAllPixels, setSelectAllPixels] = useState(true); // Toggle: select all pixels vs only colored pixels (defaults to true)
  const [showLayersMenu, setShowLayersMenu] = useState(false); // Show layers menu
  
  // Background image state
  const [backgroundImage, setBackgroundImage] = useState(() => {
    try {
      return localStorage.getItem("pixelgrid_backgroundImage") || null;
    } catch { return null; }
  });
  const [backgroundOpacity, setBackgroundOpacity] = useState(() => {
    try {
      const saved = localStorage.getItem("pixelgrid_backgroundOpacity");
      return saved ? parseFloat(saved) : 0.5;
    } catch { return 0.5; }
  });
  const [backgroundScale, setBackgroundScale] = useState(() => {
    try {
      const saved = localStorage.getItem("pixelgrid_backgroundScale");
      return saved ? parseFloat(saved) : 1.0;
    } catch { return 1.0; }
  });
  const backgroundInputRef = useRef(null);
  
  // Image upload state
  const [uploadedImage, setUploadedImage] = useState(null); // Store the uploaded image for scaling
  const [imageScale, setImageScale] = useState(75); // Default scale width in pixels
  const [showImageScaleDialog, setShowImageScaleDialog] = useState(false);
  
  const [pixelGroups, setPixelGroups] = useState(() => {
    try {
      // Check if we should clear everything on this load
      const shouldClear = sessionStorage.getItem("pixelgrid_clearOnLoad");
      if (shouldClear) {
        return {};
      }
      const saved = localStorage.getItem("pixelgrid_pixelGroups");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  
  const [groups, setGroups] = useState(() => {
    try {
      // Check if we should clear everything on this load
      const shouldClear = sessionStorage.getItem("pixelgrid_clearOnLoad");
      if (shouldClear) {
        sessionStorage.removeItem("pixelgrid_clearOnLoad");
        localStorage.clear();
        return [{ name: "Background", zIndex: -1, pixels: {}, locked: true }];
      }
      
      const saved = localStorage.getItem("pixelgrid_groups");
      const savedGroups = saved ? JSON.parse(saved) : [];
      
      // Ensure background layer exists
      const hasBackground = savedGroups.some(g => g.name === "Background");
      if (!hasBackground) {
        // Create background layer with all current non-white pixels
        const backgroundPixels = {};
        const savedColors = localStorage.getItem("pixelgrid_pixelColors");
        if (savedColors) {
          const colors = JSON.parse(savedColors);
          colors.forEach((color, index) => {
            if (color && color !== null) {
              backgroundPixels[index] = color;
            }
          });
        }
        savedGroups.unshift({ name: "Background", zIndex: -1, pixels: backgroundPixels, locked: true });
      }
      
      return savedGroups;
    } catch { 
      // Create default background layer
      return [{ name: "Background", zIndex: -1, pixels: {}, locked: true }]; 
    }
  });
  
  const [activeGroup, setActiveGroup] = useState(null); // Currently selected group for moving
  const [groupDragStart, setGroupDragStart] = useState(null); // { pixelIndex, startRow, startCol }
  const [groupDragCurrent, setGroupDragCurrent] = useState(null); // Current hover position during drag
  const [selectionTransform, setSelectionTransform] = useState({ deltaRow: 0, deltaCol: 0, active: false }); // Dynamic CSS transform for selection movement
  // eslint-disable-next-line no-unused-vars
  const [renderTrigger, setRenderTrigger] = useState(0); // Force re-renders by incrementing
  
  // Layer drag-and-drop state
  const [draggedLayer, setDraggedLayer] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [dragOverLayer, setDragOverLayer] = useState(null);
  
  // Lazy-loaded tool modules
  const [loadedTools, setLoadedTools] = useState({});
  const [toolsLoading, setToolsLoading] = useState({});
  
  const color = activeTool === "primary" ? primaryColor : secondaryColor;
  const gridRef = useRef(null);
  
  // Refs to hold current values for event handlers without causing re-renders
  const dragStateRef = useRef({
    groupDragStart: null,
    activeGroup: null,
    groupDragCurrent: null,
    isDrawing: false,
    selectedPixels: [],
    lineStartPixel: null,
    lineEndPixel: null,
    curveEndPixel: null
  });
  
  // Update refs whenever state changes
  useEffect(() => {
    dragStateRef.current = {
      groupDragStart,
      activeGroup,
      groupDragCurrent,
      isDrawing,
      selectedPixels,
      lineStartPixel,
      lineEndPixel,
      curveEndPixel
    };
    
    // Debug: Log ref sync
    if (groupDragStart !== null || isDrawing) {
      console.log('>>> useEffect synced to ref:', {
        groupDragStart,
        activeGroup,
        groupDragCurrent,
        isDrawing,
        selectedPixelsLength: selectedPixels.length
      });
    }
  }, [groupDragStart, activeGroup, groupDragCurrent, isDrawing, selectedPixels, lineStartPixel, lineEndPixel, curveEndPixel]);
  
  // Lazy load tool module when needed
  const loadTool = useCallback(async (toolName) => {
    if (loadedTools[toolName] || toolsLoading[toolName]) return;
    
    setToolsLoading(prev => ({ ...prev, [toolName]: true }));
    
    try {
      const module = await import(`./tools/${toolName}Tool.js`);
      setLoadedTools(prev => ({ ...prev, [toolName]: module[`${toolName}Tool`] }));
    } catch (error) {
      console.error(`Failed to load ${toolName} tool:`, error);
    } finally {
      setToolsLoading(prev => ({ ...prev, [toolName]: false }));
    }
  }, [loadedTools, toolsLoading]);
  
  // Load tool when drawing tool changes
  useEffect(() => {
    const toolsNeedingLoad = ['line', 'curve', 'bucket', 'select'];
    if (activeDrawingTool && toolsNeedingLoad.includes(activeDrawingTool)) {
      loadTool(activeDrawingTool);
    }
  }, [activeDrawingTool, loadTool]);

  // Reset line/curve state when leaving those tools
  useEffect(() => {
    if (activeDrawingTool !== 'line' && activeDrawingTool !== 'curve') {
      setLineStartPixel(null);
      setLineEndPixel(null);
      setCurveEndPixel(null);
    }
    if (activeDrawingTool !== 'line') {
      setLineEndPixel(null);
    }
  }, [activeDrawingTool]);

  // Handle scrollbar slider dragging with global pointer move
  useEffect(() => {
    if (!isDraggingSlider) return;

    const handlePointerMove = (e) => {
      if (!gridRef.current) return;
      
      // Get the slider track bounds
      const scrollbarTrack = document.querySelector('[data-scrollbar-track="true"]');
      if (!scrollbarTrack) return;
      
      const rect = scrollbarTrack.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const maxScroll = gridRef.current.scrollWidth - gridRef.current.clientWidth;
      const newScrollLeft = percent * maxScroll;
      gridRef.current.scrollLeft = newScrollLeft;
      setScrollPosition(newScrollLeft);
    };

    const handlePointerUp = () => {
      setIsDraggingSlider(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false, capture: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      window.removeEventListener('pointerup', handlePointerUp, { capture: true });
    };
  }, [isDraggingSlider]);

  // Handle vertical scrollbar slider dragging with global pointer move
  useEffect(() => {
    if (!isDraggingVerticalSlider) return;

    const handlePointerMove = (e) => {
      const scrollbarTrack = document.querySelector('[data-mobile-layers-scrollbar-track="true"]');
      if (!scrollbarTrack) return;
      
      const scrollContainer = scrollbarTrack.previousSibling;
      if (!scrollContainer) return;
      
      const rect = scrollbarTrack.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const percent = Math.max(0, Math.min(1, y / rect.height));
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const newScrollTop = percent * maxScroll;
      scrollContainer.scrollTop = newScrollTop;
      setVerticalScrollPosition(newScrollTop);
    };

    const handlePointerUp = () => {
      setIsDraggingVerticalSlider(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false, capture: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      window.removeEventListener('pointerup', handlePointerUp, { capture: true });
    };
  }, [isDraggingVerticalSlider]);

  // Sync vertical scrollbar thumb position with scroll events
  useEffect(() => {
    const scrollContainer = document.querySelector('[data-mobile-layers-scroll-container="true"]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      setVerticalScrollPosition(scrollContainer.scrollTop);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle touch drawing on mobile - track finger position to find pixel under touch
  useEffect(() => {
    if (!isDrawing || (activeDrawingTool !== "pencil" && activeDrawingTool !== "eraser")) return;

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (element && element.hasAttribute('data-pixel-index')) {
          const pixelIndex = parseInt(element.getAttribute('data-pixel-index'), 10);
          if (!isNaN(pixelIndex) && pixelIndex !== hoveredPixel) {
            setHoveredPixel(pixelIndex);
            // Paint or erase directly by updating pixel colors
            if (activeDrawingTool === "pencil") {
              paintPixel(null, pixelIndex);
            } else if (activeDrawingTool === "eraser") {
              erasePixel(null, pixelIndex);
            }
          }
        }
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDrawing, activeDrawingTool, hoveredPixel, color]);

  // Ensure line/curve preview updates even when pointer is over overlays (desktop & mobile)
  // Also set hoveredPixel immediately on touch/pointer down so preview appears without holding/dragging
  useEffect(() => {
    if (lineStartPixel === null) return;
    if (!(activeDrawingTool === "line" || activeDrawingTool === "curve")) return;

    const updateHoverFromEvent = (e) => {
      const point = e.touches && e.touches.length ? e.touches[0] : e;
      const el = document.elementFromPoint(point.clientX, point.clientY);
      if (el && el.hasAttribute('data-pixel-index')) {
        const idx = parseInt(el.getAttribute('data-pixel-index'), 10);
        if (!Number.isNaN(idx) && idx !== hoveredPixel) {
          setHoveredPixel(idx);
        }
      }
    };

    window.addEventListener('pointermove', updateHoverFromEvent, { passive: true });
    window.addEventListener('touchmove', updateHoverFromEvent, { passive: true });
    window.addEventListener('pointerdown', updateHoverFromEvent, { passive: true });
    window.addEventListener('touchstart', updateHoverFromEvent, { passive: true });

    return () => {
      window.removeEventListener('pointermove', updateHoverFromEvent);
      window.removeEventListener('touchmove', updateHoverFromEvent);
      window.removeEventListener('pointerdown', updateHoverFromEvent);
      window.removeEventListener('touchstart', updateHoverFromEvent);
    };
  }, [lineStartPixel, activeDrawingTool, hoveredPixel]);

  // Zoom factor for drawing area based on screen size
  const getZoomFactor = () => {
    if (size.w <= 768) return  2.75; // Mobile
    if (size.w <= 1024) return 1.75; // Tablet
    if (size.w <= 1650) return 1.25;
    return 1; // Desktop
  };

  // Logo and title pixel size based on screen size
  const getLogoPixelSize = () => {
    if (size.w > 1650) return 1.075; // Desktop: 7vw / 7 = 1vw per cell
    if (size.w <= 1024) return 1.43; // Mobile/Tablet: 10vw / 7 = 1.43vw
    return 1; // Mid-range
  };

  const getTitlePixelSize = () => {
    if (size.w > 1650) return 0.75; // Desktop: scaled down
    return 0.75; // Same size on all screen sizes
  };

  const zoomFactor = getZoomFactor();
  const logoPixelSize = getLogoPixelSize();
  const titlePixelSize = getTitlePixelSize();
  const cols = 200; // Fixed 200 columns
  const basePixelSize = 0.75; // Base pixel size in vw
  const displayPixelSize = basePixelSize * zoomFactor;
  
  // Calculate rows needed to fill the screen height
  const pixelSizeInPx = (displayPixelSize / 100) * size.w; // Convert vw to px
  const rows = Math.ceil(size.h / pixelSizeInPx);
  const totalPixels = cols * rows;

  // Initialize pixelColors with saved data or defaults
  const [pixelColors, setPixelColors] = useState(() => {
    try {
      // Check if we should clear everything on this load
      const shouldClear = sessionStorage.getItem("pixelgrid_clearOnLoad");
      if (shouldClear) {
        return Array(totalPixels).fill(null);
      }
      const saved = localStorage.getItem("pixelgrid_pixelColors");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length === totalPixels) return parsed;
        // If size changed, extend or trim array
        const newArray = Array(totalPixels).fill(null);
        const copyLength = Math.min(parsed.length, totalPixels);
        for (let i = 0; i < copyLength; i++) {
          newArray[i] = parsed[i];
        }
        return newArray;
      }
    } catch { }
    return Array(totalPixels).fill(null);
  });

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const saveTimerRef = useRef(null);
  
  // Debounced save to localStorage (only save after 500ms of no changes)
  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem("pixelgrid_pixelColors", JSON.stringify(pixelColors));
      } catch (error) {
        console.error("Failed to save pixel colors:", error);
      }
    }, 500);
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [pixelColors]);
  
  // Save groups and pixelGroups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_groups", JSON.stringify(groups));
    } catch (error) {
      console.error("Failed to save groups:", error);
    }
  }, [groups]);
  
  // Normalize zIndex values on mount to ensure sequential ordering
  useEffect(() => {
    const normalLayers = groups.filter(g => g.name !== "Background" && g.name !== "__selected__");
    if (normalLayers.length === 0) return;
    
    // Check if normalization is needed
    const needsNormalization = normalLayers.some((layer, index) => layer.zIndex !== index);
    
    if (needsNormalization) {
      console.log("Normalizing layer zIndex values to sequential order");
      const normalized = normalizeZIndexes(groups);
      setGroups(normalized);
    }
  }, []); // Run only on mount
  
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_pixelGroups", JSON.stringify(pixelGroups));
    } catch (error) {
      console.error("Failed to save pixel groups:", error);
    }
  }, [pixelGroups]);
  
  // Save colors to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_primaryColor", primaryColor);
    } catch (error) {
      console.error("Failed to save primary color:", error);
    }
  }, [primaryColor]);
  
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_secondaryColor", secondaryColor);
    } catch (error) {
      console.error("Failed to save secondary color:", error);
    }
  }, [secondaryColor]);
  
  // Save background settings to localStorage
  useEffect(() => {
    try {
      if (backgroundImage) {
        localStorage.setItem("pixelgrid_backgroundImage", backgroundImage);
      } else {
        localStorage.removeItem("pixelgrid_backgroundImage");
      }
    } catch (error) {
      console.error("Failed to save background image:", error);
    }
  }, [backgroundImage]);
  
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_backgroundOpacity", backgroundOpacity.toString());
    } catch (error) {
      console.error("Failed to save background opacity:", error);
    }
  }, [backgroundOpacity]);
  
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_backgroundScale", backgroundScale.toString());
    } catch (error) {
      console.error("Failed to save background scale:", error);
    }
  }, [backgroundScale]);
  
  // Save groups (layers) to localStorage - ONLY when explicitly called, not automatically
  // This prevents moves from persisting until user draws with that layer selected
  // eslint-disable-next-line no-unused-vars
  const saveGroupsToLocalStorage = useCallback(() => {
    try {
      // Create frozen copies of layer data to prevent modification
      const frozenGroups = groups.map(g => {
        // Skip __selected__ temporary layer
        if (g.name === "__selected__") return null;
        
        // Create frozen copy of pixels object
        const frozenPixels = Object.freeze({ ...g.pixels });
        
        return Object.freeze({
          name: g.name,
          zIndex: g.zIndex,
          pixels: frozenPixels,
          locked: g.locked,
          originalSelectionArea: g.originalSelectionArea || []
        });
      }).filter(g => g !== null);
      
      localStorage.setItem("pixelgrid_groups", JSON.stringify(frozenGroups));
      console.log("Saved groups to localStorage");
    } catch (error) {
      console.error("Failed to save groups to localStorage:", error);
    }
  }, [groups]);
  
  // Update pixel array when totalPixels changes, preserving existing data
  useEffect(() => {
    setPixelColors((prev) => {
      if (prev.length === totalPixels) return prev;
      const newArray = Array(totalPixels).fill(null);
      // Copy over existing colors
      const copyLength = Math.min(prev.length, totalPixels);
      for (let i = 0; i < copyLength; i++) {
        newArray[i] = prev[i];
      }
      return newArray;
    });
  }, [totalPixels]);

  // Sync selectedPixels to __selected__ layer
  useEffect(() => {
    if (selectedPixels.length > 0) {
      // Create or update __selected__ layer
      setGroups(prevGroups => {
        const existingSelectedIndex = prevGroups.findIndex(g => g.name === "__selected__");
        
        // Store original pixel data with source layer information, including transparent pixels
        const originalPixelData = new Map(); // Map of pixelIndex -> { color, sourceLayer }
        const originalColors = new Map(); // Map of pixelIndex -> color (for restoration)
        
        selectedPixels.forEach(idx => {
          const pixelGroup = pixelGroups[idx];
          let color = null;
          let sourceLayer = null;
          
          if (pixelGroup && pixelGroup.group !== "__selected__") {
            // Get color from the layer the pixel belongs to
            const layer = prevGroups.find(g => g.name === pixelGroup.group);
            if (layer) {
              sourceLayer = pixelGroup.group;
              // Get color from layer pixels, or null for transparent
              color = layer.pixels[idx] !== undefined ? layer.pixels[idx] : null;
            }
          } else {
            // Pixel not in any layer - check Background layer
            const backgroundLayer = prevGroups.find(g => g.name === "Background");
            if (backgroundLayer) {
              sourceLayer = "Background";
              color = backgroundLayer.pixels[idx] !== undefined ? backgroundLayer.pixels[idx] : null;
            }
            // If not in Background either, check pixelColors as last resort
            else if (pixelColors[idx]) {
              sourceLayer = "Background";
              color = pixelColors[idx];
              console.warn("Selected pixel not in any layer, using pixelColors:", idx);
            }
          }
          
          // Store original data for restoration after move
          originalPixelData.set(idx, { color, sourceLayer });
          originalColors.set(idx, color);
        });
        
        // Calculate highest zIndex + 1 for __selected__ to ensure it's always on top
        const normalLayers = prevGroups.filter(g => g.name !== "Background" && g.name !== "__selected__");
        const highestZIndex = normalLayers.length > 0 ? Math.max(...normalLayers.map(g => g.zIndex || 0)) : -1;
        const selectedZIndex = highestZIndex + 1;
        
        const selectedLayer = {
          name: "__selected__",
          zIndex: selectedZIndex, // Always on top
          pixels: {},
          locked: false,
          originalPixelIndices: selectedPixels,
          originalSelectionArea: selectedPixels, // Used for transform preview
          originalPixelData: originalPixelData, // Store for restoration
          originalColors: originalColors // Store for move operation
        };
        
        // Add color data to pixels - include transparent pixels as null
        selectedPixels.forEach(idx => {
          const data = originalPixelData.get(idx);
          if (data) {
            selectedLayer.pixels[idx] = data.color;
          }
        });
        
        // Store selectedZIndex for use in pixelGroups update
        selectedLayer._calculatedZIndex = selectedZIndex;
        
        if (existingSelectedIndex >= 0) {
          // Update existing __selected__ layer
          const newGroups = [...prevGroups];
          newGroups[existingSelectedIndex] = selectedLayer;
          return newGroups;
        } else {
          // Add new __selected__ layer
          return [...prevGroups, selectedLayer];
        }
      });
      
      // Update pixelGroups to map selected pixels to __selected__ with calculated zIndex
      setPixelGroups(prevPixelGroups => {
        const newPixelGroups = { ...prevPixelGroups };
        // Get the calculated zIndex from the selectedLayer
        const selectedLayer = groups.find(g => g.name === "__selected__");
        const selectedZIndex = selectedLayer?._calculatedZIndex || getHighestZIndex() + 1;
        selectedPixels.forEach(idx => {
          newPixelGroups[idx] = { group: "__selected__", zIndex: selectedZIndex };
        });
        return newPixelGroups;
      });
      
      // Set __selected__ as active group when using move tool
      if (activeDrawingTool === "movegroup" && activeGroup === null) {
        setActiveGroup("__selected__");
      }
    } else {
      // Remove __selected__ layer when no pixels selected
      setGroups(prevGroups => prevGroups.filter(g => g.name !== "__selected__"));
      setPixelGroups(prevPixelGroups => {
        const newPixelGroups = { ...prevPixelGroups };
        Object.keys(newPixelGroups).forEach(idx => {
          if (newPixelGroups[idx].group === "__selected__") {
            delete newPixelGroups[idx];
          }
        });
        return newPixelGroups;
      });
    }
  }, [selectedPixels, pixelGroups, pixelColors, activeDrawingTool, activeGroup]);

  // Sync unassigned pixels from pixelColors to Background layer
  useEffect(() => {
    // Find pixels in pixelColors that aren't in any layer
    const unassignedPixels = [];
    pixelColors.forEach((color, idx) => {
      if (color && color !== null && !pixelGroups[idx]) {
        unassignedPixels.push(idx);
      }
    });
    
    if (unassignedPixels.length > 0) {
      console.log("Syncing unassigned pixels to Background layer:", unassignedPixels.length);
      
      // Add to Background layer
      setGroups(prevGroups => {
        return prevGroups.map(g => {
          if (g.name === "Background") {
            const newPixels = { ...g.pixels };
            unassignedPixels.forEach(idx => {
              newPixels[idx] = pixelColors[idx];
            });
            return { ...g, pixels: Object.freeze(newPixels) };
          }
          return g;
        });
      });
      
      // Update pixelGroups to track these pixels
      setPixelGroups(prevPixelGroups => {
        const newPixelGroups = { ...prevPixelGroups };
        unassignedPixels.forEach(idx => {
          newPixelGroups[idx] = { group: "Background", zIndex: -1 };
        });
        return newPixelGroups;
      });
    }
  }, [pixelColors, pixelGroups]);

  useEffect(() => {
    function handleResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    
    const handlePointerMove = (e) => {
      const state = dragStateRef.current;
      // Track drag position for any group move on mobile/desktop
      if (state.groupDragStart !== null && state.activeGroup !== null && state.isDrawing && gridRef.current) {
        e.preventDefault(); // Prevent scrolling on mobile
        
        const rect = gridRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + gridRef.current.scrollLeft;
        const y = e.clientY - rect.top + gridRef.current.scrollTop;
        
        // Calculate which pixel we're over
        const pixelSizeVw = displayPixelSize; // Already in vw units
        const pixelSizePx = (pixelSizeVw * window.innerWidth) / 100;
        const col = Math.floor(x / pixelSizePx);
        const row = Math.floor(y / pixelSizePx);
        
        const dragPos = { row, col };
        
        // Calculate delta for transform
        const deltaRow = row - state.groupDragStart.startRow;
        const deltaCol = col - state.groupDragStart.startCol;
        
        // Update ref immediately for instant preview
        dragStateRef.current.groupDragCurrent = dragPos;
        
        flushSync(() => {
          setGroupDragCurrent(dragPos);
          // Update transform for CSS preview
          setSelectionTransform({ deltaRow, deltaCol, active: true });
        });
      }
    };
    
    const handleTouchMove = (e) => {
      const state = dragStateRef.current;
      console.log("=== TOUCH MOVE ===", { 
        hasGroupDragStart: !!state.groupDragStart,
        activeGroup: state.activeGroup,
        isDrawing: state.isDrawing,
        touchCount: e.touches ? e.touches.length : 0
      });
      
      // Handle touch drag for any group move on mobile
      if (state.groupDragStart !== null && state.activeGroup !== null && state.isDrawing && gridRef.current) {
        e.preventDefault(); // Prevent scrolling
        
        const touch = e.touches[0];
        if (!touch) return;
        
        const rect = gridRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left + gridRef.current.scrollLeft;
        const y = touch.clientY - rect.top + gridRef.current.scrollTop;
        
        // Calculate which pixel we're over based on cursor position
        const pixelSizeVw = displayPixelSize;
        const pixelSizePx = (pixelSizeVw * window.innerWidth) / 100;
        const col = Math.floor(x / pixelSizePx);
        const row = Math.floor(y / pixelSizePx);
        
        const dragPos = { row, col };
        
        console.log("=== TOUCH DRAG POS ===", dragPos);
        
        // Calculate delta for transform
        const deltaRow = row - state.groupDragStart.startRow;
        const deltaCol = col - state.groupDragStart.startCol;
        
        // Update ref immediately for instant preview
        dragStateRef.current.groupDragCurrent = dragPos;
        
        flushSync(() => {
          setGroupDragCurrent(dragPos);
          // Update transform for CSS preview (enables live preview on mobile)
          setSelectionTransform({ deltaRow, deltaCol, active: true });
        });
      }
    };
    
    const stopDrawing = () => {
      const state = dragStateRef.current;
      
      console.log("=== STOP DRAWING ===", {
        hasGroupDragStart: !!state.groupDragStart,
        activeGroup: state.activeGroup,
        hasGroupDragCurrent: !!state.groupDragCurrent,
        selectedPixelsCount: state.selectedPixels?.length || 0
      });
      
      // Finalize selected pixels move if dragging
      if (state.groupDragStart !== null && state.activeGroup === "__selected__") {
        const currentDragPos = state.groupDragCurrent || { row: state.groupDragStart.startRow, col: state.groupDragStart.startCol };
        const deltaRow = currentDragPos.row - state.groupDragStart.startRow;
        const deltaCol = currentDragPos.col - state.groupDragStart.startCol;
        
        console.log("=== FINALIZING __selected__ MOVE ===", { deltaRow, deltaCol, pixelsCount: state.selectedPixels?.length });
        
        if (deltaRow !== 0 || deltaCol !== 0) {
          // Get the __selected__ layer to access original pixel data
          const selectedLayer = groups.find(g => g.name === "__selected__");
          if (selectedLayer && selectedLayer.originalPixelData) {
            // Restore original pixels to their source layers
            restoreOriginalPixelsToLayers(selectedLayer.originalPixelData);
          }
          
          moveSelectedPixels(deltaRow, deltaCol, state.selectedPixels);
        }
        
        // Clear drag state
        setGroupDragStart(null);
        setGroupDragCurrent(null);
        setActiveGroup(null);
      }
      // Finalize actual grouped layer move if dragging
      else if (state.groupDragStart !== null && state.activeGroup && state.activeGroup !== "__selected__") {
        const currentDragPos = state.groupDragCurrent || { row: state.groupDragStart.startRow, col: state.groupDragStart.startCol };
        const deltaRow = currentDragPos.row - state.groupDragStart.startRow;
        const deltaCol = currentDragPos.col - state.groupDragStart.startCol;
        
        if (deltaRow !== 0 || deltaCol !== 0) {
          moveGroup(state.activeGroup, deltaRow, deltaCol);
        }
        
        // Clear drag state
        setGroupDragStart(null);
        setGroupDragCurrent(null);
        setActiveGroup(null);
      }
      
      // Always clear preview and drag state when pointer up
      setSelectionTransform({ deltaRow: 0, deltaCol: 0, active: false });
      setIsDrawing(false);
      
      // Don't clear hoveredPixel if we're in line/curve mode with points selected
      const lineToolActive = activeDrawingTool === "line" && (state.lineStartPixel !== null || state.lineEndPixel !== null);
      const curveToolActive = activeDrawingTool === "curve" && (state.lineStartPixel !== null || state.curveEndPixel !== null);
      
      if (!(lineToolActive || curveToolActive)) {
        setHoveredPixel(null);
      }
    };

    const debugPointerDown = (e) => {
      const target = e.target;
      console.log("=== GLOBAL POINTER DOWN ===", {
        tagName: target.tagName,
        hasPixelIndex: target.hasAttribute('data-pixel-index'),
        pixelIndex: target.getAttribute('data-pixel-index'),
        classList: Array.from(target.classList),
        id: target.id,
        hasDataPixelGrid: target.hasAttribute('data-pixel-grid'),
        parentTagName: target.parentElement?.tagName,
        parentHasPixelIndex: target.parentElement?.hasAttribute('data-pixel-index'),
        computedPointerEvents: window.getComputedStyle(target).pointerEvents
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("pointerup", stopDrawing);
    window.addEventListener("touchend", stopDrawing);
    window.addEventListener("pointerdown", debugPointerDown, { capture: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("pointerup", stopDrawing);
      window.removeEventListener("touchend", stopDrawing);
      window.removeEventListener("pointerdown", debugPointerDown, { capture: true });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDrawingTool]);

  function erasePixel(e, index) {
    // If there's an active group, erase from the layer's pixels
    if (activeGroup && activeGroup !== "__selected__") {
      // Check if pixel is in the active layer - restrict erasing to layer pixels only
      const pixelGroup = pixelGroups[index];
      if (pixelGroup && pixelGroup.group !== activeGroup) {
        return; // Don't erase pixels from other layers
      }
      
      setGroups(prevGroups => {
        const updated = prevGroups.map(g => {
          if (g.name === activeGroup) {
            const newPixels = { ...g.pixels };
            delete newPixels[index]; // Remove the pixel
            return Object.freeze({ ...g, pixels: Object.freeze(newPixels) });
          }
          return g;
        });
        
        // Save to localStorage immediately
        try {
          const frozenGroups = updated.filter(g => g.name !== "__selected__").map(g => ({
            name: g.name,
            zIndex: g.zIndex,
            pixels: { ...g.pixels },
            locked: g.locked,
            originalSelectionArea: g.originalSelectionArea || []
          }));
          localStorage.setItem("pixelgrid_groups", JSON.stringify(frozenGroups));
        } catch (error) {
          console.error("Failed to save to localStorage:", error);
        }
        
        return updated;
      });
      
      // Remove from pixelGroups tracking
      setPixelGroups(prevPixelGroups => {
        const newPixelGroups = { ...prevPixelGroups };
        delete newPixelGroups[index];
        return newPixelGroups;
      });
    } else {
      // No active layer - erase from base pixelColors
      const pixelGroup = pixelGroups[index];
      if (pixelGroup) {
        // Pixel belongs to a layer - erase from that layer
        setGroups(prevGroups => {
          const updated = prevGroups.map(g => {
            if (g.name === pixelGroup.group) {
              const newPixels = { ...g.pixels };
              delete newPixels[index];
              return Object.freeze({ ...g, pixels: Object.freeze(newPixels) });
            }
            return g;
          });
          
          // Save to localStorage
          try {
            const frozenGroups = updated.filter(g => g.name !== "__selected__").map(g => ({
              name: g.name,
              zIndex: g.zIndex,
              pixels: { ...g.pixels },
              locked: g.locked,
              originalSelectionArea: g.originalSelectionArea || []
            }));
            localStorage.setItem("pixelgrid_groups", JSON.stringify(frozenGroups));
          } catch (error) {
            console.error("Failed to save to localStorage:", error);
          }
          
          return updated;
        });
        
        // Remove from pixelGroups tracking
        setPixelGroups(prevPixelGroups => {
          const newPixelGroups = { ...prevPixelGroups };
          delete newPixelGroups[index];
          return newPixelGroups;
        });
      } else {
        // Erase from base pixelColors
        setPixelColors((prev) => {
          if (prev[index] === null) return prev; // Already erased
          const copy = [...prev];
          copy[index] = null; // Clear the pixel
          return copy;
        });
      }
    }
  }

  function paintPixel(e, index) {
    // Only allow painting with drawing tools (pencil, bucket, line, curve)
    const isDrawingTool = ["pencil", "bucket", "line", "curve"].includes(activeDrawingTool);
    if (!isDrawingTool) {
      return; // Don't paint if using select/movegroup/eraser/eyedropper tools
    }
    
    // If there's an active group, paint into the layer's pixels
    if (activeGroup && activeGroup !== "__selected__") {
      // Check if pixel is in the active layer - restrict drawing to layer pixels only
      const pixelGroup = pixelGroups[index];
      if (pixelGroup && pixelGroup.group !== activeGroup) {
        return; // Don't draw on pixels from other layers
      }
      
      setGroups(prevGroups => {
        const updated = prevGroups.map(g => {
          if (g.name === activeGroup) {
            const newPixels = { ...g.pixels };
            newPixels[index] = color;
            return Object.freeze({ ...g, pixels: Object.freeze(newPixels) });
          }
          return g;
        });
        
        // Save to localStorage immediately
        try {
          const frozenGroups = updated.filter(g => g.name !== "__selected__").map(g => ({
            name: g.name,
            zIndex: g.zIndex,
            pixels: { ...g.pixels },
            locked: g.locked,
            originalSelectionArea: g.originalSelectionArea || []
          }));
          localStorage.setItem("pixelgrid_groups", JSON.stringify(frozenGroups));
        } catch (error) {
          console.error("Failed to save to localStorage:", error);
        }
        
        return updated;
      });
      
      // Also update pixelGroups to track this pixel belongs to the layer
      setPixelGroups(prevPixelGroups => {
        const group = groups.find(g => g.name === activeGroup);
        if (group) {
          return {
            ...prevPixelGroups,
            [index]: { group: activeGroup, zIndex: group.zIndex }
          };
        }
        return prevPixelGroups;
      });
      
      // Clear from base pixelColors if it was there
      setPixelColors((prev) => {
        if (prev[index] !== null) {
          const copy = [...prev];
          copy[index] = null;
          return copy;
        }
        return prev;
      });
    } else {
      // No active layer - paint to base pixelColors (drawing mode)
      setPixelColors((prev) => {
        // Skip if color is already the same
        if (prev[index] === color) return prev;
        const copy = [...prev];
        copy[index] = color;
        return copy;
      });
    }
  }

  function normalizeHexInput(raw) {
    if (!raw) return "#";
    const v = raw.startsWith("#") ? raw.slice(1) : raw;
    return "#" + v.slice(0, 6);
  }

  function isLightColor(hex) {
    if (!hex || hex.length < 7) return false;
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    // Simple brightness calculation - sum of RGB values
    // Higher threshold for better contrast detection
    const brightness = (r + g + b) / 3;
    return brightness > 127; // Mid-point of 0-255 range
  }

  function getContrastBorderColor(bgColor) {
    return isLightColor(bgColor) ? "#000000" : "#ffffff";
  }

  // Get the display color for a pixel based on highest z-index
  function getPixelDisplayColor(pixelIndex) {
    // Find the highest zIndex layer that has this pixel with a color
    let highestZIndex = -Infinity;
    let highestColor = null;
    
    // Check all groups to find highest zIndex with a color at this pixel
    groups.forEach(group => {
      if (group.pixels && group.pixels[pixelIndex]) {
        const color = group.pixels[pixelIndex];
        // Only count pixels with actual colors (not null/transparent)
        if (color !== null && color !== 'null' && group.zIndex > highestZIndex) {
          highestZIndex = group.zIndex;
          highestColor = color;
        }
      }
    });
    
    // If we found a colored pixel in layers, return it
    if (highestColor !== null) {
      return String(highestColor);
    }
    
    // Check for transparent pixels - return them but mark as lowest priority
    const pixelGroup = pixelGroups[pixelIndex];
    if (pixelGroup) {
      const group = groups.find(g => g.name === pixelGroup.group);
      if (group && group.pixels && group.pixels[pixelIndex] !== undefined) {
        // This includes transparent (null) pixels
        return group.pixels[pixelIndex];
      }
    }
    
    // Fall back to base pixelColors
    return pixelColors[pixelIndex] || null;
  }

  function getLinePixels(start, end) {
    // Bresenham's line algorithm
    const x0 = start % cols;
    const y0 = Math.floor(start / cols);
    const x1 = end % cols;
    const y1 = Math.floor(end / cols);
    
    const pixels = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    while (true) {
      const index = y * cols + x;
      if (index >= 0 && index < pixelColors.length) {
        pixels.push(index);
      }
      
      if (x === x1 && y === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    return pixels;
  }

  function getQuadraticBezierPixels(startIndex, endIndex, curvePercent) {
    const x0 = startIndex % cols;
    const y0 = Math.floor(startIndex / cols);
    const x2 = endIndex % cols;
    const y2 = Math.floor(endIndex / cols);
    
    // Calculate control point based on midpoint and curve percentage
    const midX = (x0 + x2) / 2;
    const midY = (y0 + y2) / 2;
    
    // Perpendicular offset based on curve amount
    const dx = x2 - x0;
    const dy = y2 - y0;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const offset = (distance * curvePercent) / 100;
    
    // Control point perpendicular to the line
    const x1 = midX - (dy / distance) * offset;
    const y1 = midY + (dx / distance) * offset;
    
    const pixels = [];
    const steps = 100;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      
      // Quadratic bezier formula: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const x = Math.round(u * u * x0 + 2 * u * t * x1 + t * t * x2);
      const y = Math.round(u * u * y0 + 2 * u * t * y1 + t * t * y2);
      
      const index = y * cols + x;
      if (!pixels.includes(index)) {
        pixels.push(index);
      }
    }
    
    return pixels;
  }

  function drawLine(startIndex, endIndex) {
    const linePixels = getLinePixels(startIndex, endIndex);
    
    if (activeGroup && activeGroup !== "__selected__") {
      // Drawing on a layer - only draw on pixels that belong to this layer
      setGroups(prevGroups => {
        const updated = prevGroups.map(g => {
          if (g.name === activeGroup) {
            const newPixels = { ...g.pixels };
            linePixels.forEach(i => {
              // Only draw if pixel is in this layer or unassigned
              const pixelGroup = pixelGroups[i];
              if (!pixelGroup || pixelGroup.group === activeGroup) {
                newPixels[i] = color;
              }
            });
            return Object.freeze({ ...g, pixels: Object.freeze(newPixels) });
          }
          return g;
        });
        
        // Save to localStorage
        try {
          const frozenGroups = updated.filter(g => g.name !== "__selected__").map(g => ({
            name: g.name,
            zIndex: g.zIndex,
            pixels: { ...g.pixels },
            locked: g.locked,
            originalSelectionArea: g.originalSelectionArea || []
          }));
          localStorage.setItem("pixelgrid_groups", JSON.stringify(frozenGroups));
        } catch (error) {
          console.error("Failed to save to localStorage:", error);
        }
        
        return updated;
      });
    } else {
      // No active layer - draw to base pixelColors
      setPixelColors((prev) => {
        const copy = [...prev];
        linePixels.forEach(i => {
          copy[i] = color;
        });
        return copy;
      });
    }
  }

  // Build regions map: which region does each pixel belong to
  function buildRegionsMap(colors) {
    const totalPixels = colors.length;
    const regionMap = new Array(totalPixels).fill(-1);
    let regionId = 0;
    
    for (let i = 0; i < totalPixels; i++) {
      if (regionMap[i] !== -1) continue; // Already assigned
      
      // Start a new region with BFS
      const color = colors[i];
      const queue = [i];
      regionMap[i] = regionId;
      
      while (queue.length > 0) {
        const idx = queue.shift();
        const row = Math.floor(idx / 200);
        const col = idx % 200;
        
        // Check 4-directional neighbors (not diagonal)
        const neighbors = [
          { idx: idx - 200, row: row - 1, col: col },     // up
          { idx: idx + 200, row: row + 1, col: col },     // down
          { idx: idx - 1, row: row, col: col - 1 },       // left
          { idx: idx + 1, row: row, col: col + 1 }        // right
        ];
        
        for (const n of neighbors) {
          if (n.row < 0 || n.row >= Math.floor(totalPixels / 200)) continue;
          if (n.col < 0 || n.col >= 200) continue;
          if (regionMap[n.idx] !== -1) continue; // Already assigned
          if (colors[n.idx] !== color) continue; // Different color
          
          regionMap[n.idx] = regionId;
          queue.push(n.idx);
        }
      }
      
      regionId++;
    }
    
    return regionMap;
  }

  function paintBucket(startIndex) {
    if (activeGroup && activeGroup !== "__selected__") {
      // Fill on a layer - only fill pixels that belong to this layer
      setGroups(prevGroups => {
        const activeLayerGroup = prevGroups.find(g => g.name === activeGroup);
        if (!activeLayerGroup) return prevGroups;
        
        const targetColor = activeLayerGroup.pixels[startIndex];
        const fillColor = color;
        
        // Don't fill if already the same color
        if (targetColor === fillColor) return prevGroups;
        
        const layerPixelsArray = Object.keys(activeLayerGroup.pixels).map(idx => parseInt(idx));
        const regionMap = {};
        let regionId = 0;
        
        // Build regions only for this layer's pixels
        layerPixelsArray.forEach(pixelIdx => {
          if (regionMap[pixelIdx] !== undefined) return;
          
          const pixelColor = activeLayerGroup.pixels[pixelIdx];
          const queue = [pixelIdx];
          regionMap[pixelIdx] = regionId;
          
          while (queue.length > 0) {
            const idx = queue.shift();
            // eslint-disable-next-line no-unused-vars
            const row = Math.floor(idx / 200);
            // eslint-disable-next-line no-unused-vars
            const col = idx % 200;
            
            const neighbors = [
              idx - 200, idx + 200, idx - 1, idx + 1
            ];
            
            // eslint-disable-next-line no-loop-func
            neighbors.forEach(nIdx => {
              if (regionMap[nIdx] === undefined && activeLayerGroup.pixels[nIdx] === pixelColor) {
                regionMap[nIdx] = regionId;
                queue.push(nIdx);
              }
            });
          }
          regionId++;
        });
        
        const targetRegion = regionMap[startIndex];
        const newPixels = { ...activeLayerGroup.pixels };
        
        // Fill all pixels in the same region
        Object.keys(regionMap).forEach(idx => {
          if (regionMap[idx] === targetRegion) {
            newPixels[idx] = fillColor;
          }
        });
        
        const updated = prevGroups.map(g => {
          if (g.name === activeGroup) {
            return Object.freeze({ ...g, pixels: Object.freeze(newPixels) });
          }
          return g;
        });
        
        // Save to localStorage
        try {
          const frozenGroups = updated.filter(g => g.name !== "__selected__").map(g => ({
            name: g.name,
            zIndex: g.zIndex,
            pixels: { ...g.pixels },
            locked: g.locked,
            originalSelectionArea: g.originalSelectionArea || []
          }));
          localStorage.setItem("pixelgrid_groups", JSON.stringify(frozenGroups));
        } catch (error) {
          console.error("Failed to save to localStorage:", error);
        }
        
        return updated;
      });
    } else {
      // No active layer - fill base pixelColors
      setPixelColors((prev) => {
        const targetColor = prev[startIndex];
        const fillColor = color;
        
        // Don't fill if already the same color
        if (targetColor === fillColor) return prev;
        
        const copy = [...prev];
        
        // Build region map to identify connected regions
        const regionMap = buildRegionsMap(copy);
        const targetRegion = regionMap[startIndex];
        
        // Fill all pixels in the same region
        for (let i = 0; i < copy.length; i++) {
          if (regionMap[i] === targetRegion) {
            copy[i] = fillColor;
          }
        }
        
        return copy;
      });
    }
  }

  // Get all pixels in selection rectangle (for preview)
  // eslint-disable-next-line no-unused-vars
  function getSelectionRectangle(start, end) {
    if (start === null || end === null) return [];
    
    const startRow = Math.floor(start / 200);
    const startCol = start % 200;
    const endRow = Math.floor(end / 200);
    const endCol = end % 200;
    
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const pixels = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        pixels.push(row * 200 + col);
      }
    }
    return pixels;
  }

  // Get pixels in selection rectangle (only colored pixels or grouped pixels)
  function getSelectionPixels(start, end) {
    if (start === null || end === null) return [];
    
    const startRow = Math.floor(start / 200);
    const startCol = start % 200;
    const endRow = Math.floor(end / 200);
    const endCol = end % 200;
    
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const pixels = [];
    
    // Get __selected__ layer if it exists to check originalPixelIndices
    const selectedLayer = groups.find(g => g.name === "__selected__");
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const pixelIndex = row * 200 + col;
        
        // If __selected__ is active, only select pixels from originalPixelIndices
        if (activeGroup === "__selected__") {
          // Check if pixel is in the originalPixelIndices array (not pixelGroups)
          // because __selected__ pixels are NOT mapped in pixelGroups during preview
          if (selectedLayer && selectedLayer.originalPixelIndices && 
              selectedLayer.originalPixelIndices.includes(pixelIndex)) {
            pixels.push(pixelIndex);
          }
        }
        // If a regular layer is selected, select from that layer
        else if (activeGroup) {
          if (selectAllPixels) {
            // Select all pixels in the layer's original selection area (including transparent)
            const layer = groups.find(g => g.name === activeGroup);
            if (layer && layer.originalSelectionArea && layer.originalSelectionArea.includes(pixelIndex)) {
              pixels.push(pixelIndex);
            } else if (pixelGroups[pixelIndex]?.group === activeGroup) {
              // Fallback to pixelGroups for layers without originalSelectionArea
              pixels.push(pixelIndex);
            }
          } else {
            // Only include pixels that have a color in the layer
            const layer = groups.find(g => g.name === activeGroup);
            if (layer && layer.pixels && layer.pixels[pixelIndex]) {
              pixels.push(pixelIndex);
            }
          }
        } else {
          // No layer selected - select from Background layer or all pixels in rectangle
          if (selectAllPixels) {
            // Select ALL pixels in rectangle (including transparent/blank ones)
            pixels.push(pixelIndex);
          } else {
            // Only select pixels that have a color in Background layer
            const pixelGroup = pixelGroups[pixelIndex];
            if (pixelGroup && pixelGroup.group === "Background") {
              const backgroundLayer = groups.find(g => g.name === "Background");
              if (backgroundLayer && backgroundLayer.pixels[pixelIndex]) {
                pixels.push(pixelIndex);
              }
            }
          }
        }
      }
    }
    return pixels;
  }

  // Get the highest zIndex from all non-Background, non-__selected__ layers
  function getHighestZIndex() {
    const normalLayers = groups.filter(g => g.name !== "Background" && g.name !== "__selected__");
    if (normalLayers.length === 0) return -1;
    return Math.max(...normalLayers.map(g => g.zIndex || 0));
  }

  // Get the next available zIndex for a new layer
  function getNextZIndex() {
    return getHighestZIndex() + 1;
  }

  // Normalize zIndex values to be sequential starting from 0
  function normalizeZIndexes(layersArray) {
    // Sort layers by current zIndex (excluding Background and __selected__)
    const normalLayers = layersArray.filter(g => g.name !== "Background" && g.name !== "__selected__");
    const backgroundLayer = layersArray.find(g => g.name === "Background");
    const selectedLayer = layersArray.find(g => g.name === "__selected__");
    
    // Sort by zIndex, then reassign sequential values
    normalLayers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    normalLayers.forEach((layer, index) => {
      layer.zIndex = index;
    });
    
    // Reconstruct array with Background first, then normal layers, then __selected__
    const result = [];
    if (backgroundLayer) result.push(backgroundLayer);
    result.push(...normalLayers);
    if (selectedLayer) result.push(selectedLayer);
    
    return result;
  }

  // Create group from selected pixels
  function createGroup(groupName) {
    if (selectedPixels.length === 0) return;
    
    const newGroups = [...groups];
    const existingGroup = newGroups.find(g => g.name === groupName);
    // Get next sequential zIndex for new layers
    const zIndex = existingGroup ? existingGroup.zIndex : getNextZIndex();
    
    // Get the __selected__ layer to extract pixel colors
    const selectedLayer = groups.find(g => g.name === "__selected__");
    
    // Store pixel colors in the layer's pixels property
    // Include ALL pixels in selection (both colored and transparent)
    const layerPixels = {};
    selectedPixels.forEach(pixelIndex => {
      // Try to get color from __selected__ layer first, then from base canvas
      if (selectedLayer && selectedLayer.pixels[pixelIndex] !== undefined) {
        layerPixels[pixelIndex] = selectedLayer.pixels[pixelIndex];
      } else {
        // Store null for transparent pixels to preserve selection area
        layerPixels[pixelIndex] = pixelColors[pixelIndex] || null;
      }
    });
    
    // Store the original selection area for this layer
    const originalSelectionArea = [...selectedPixels];
    
    if (!existingGroup) {
      // Create new group (exclude __selected__ from being saved)
      const filteredGroups = newGroups.filter(g => g.name !== "__selected__");
      filteredGroups.push({ 
        name: groupName, 
        zIndex, 
        pixels: layerPixels,
        originalSelectionArea: originalSelectionArea // Store original selection
      });
      setGroups(filteredGroups);
      // Select the newly created layer and switch to move tool
      setActiveGroup(groupName);
      setActiveDrawingTool("movegroup");
    } else {
      // Merge pixels into existing group
      setGroups(prevGroups => {
        return prevGroups.filter(g => g.name !== "__selected__").map(g => {
          if (g.name === groupName) {
            // Merge selection areas if merging pixels
            const mergedSelection = [...new Set([...(g.originalSelectionArea || []), ...originalSelectionArea])];
            return { 
              ...g, 
              pixels: { ...g.pixels, ...layerPixels },
              originalSelectionArea: mergedSelection
            };
          }
          return g;
        });
      });
      // Select the layer and switch to move tool even when merging
      setActiveGroup(groupName);
      setActiveDrawingTool("movegroup");
    }
    
    // Clear pixels from base pixelColors array (they now belong to the layer)
    setPixelColors(prevColors => {
      const newColors = [...prevColors];
      selectedPixels.forEach(pixelIndex => {
        newColors[pixelIndex] = null;
      });
      return newColors;
    });
    
    // Clear pixels from Background layer if they exist there
    setGroups(prevGroups => {
      return prevGroups.map(g => {
        if (g.name === "Background") {
          const newPixels = { ...g.pixels };
          selectedPixels.forEach(pixelIndex => {
            delete newPixels[pixelIndex]; // Remove pixel from Background layer
          });
          return { ...g, pixels: Object.freeze(newPixels) };
        }
        return g;
      });
    });
    
    // Remove pixels from pixelGroups if they were in Background
    setPixelGroups(prevPixelGroups => {
      const newPixelGroups = { ...prevPixelGroups };
      selectedPixels.forEach(pixelIndex => {
        if (newPixelGroups[pixelIndex]?.group === "Background") {
          delete newPixelGroups[pixelIndex];
        }
      });
      return newPixelGroups;
    });
    
    // Capture selectedPixels before clearing
    const pixelsToMap = [...selectedPixels];
    
    // Clear selection which will trigger useEffect to remove __selected__ layer
    setSelectedPixels([]);
    setSelectionStart(null);
    setSelectionEnd(null);
    
    // Update pixelGroups AFTER clearing selection to avoid race condition
    setTimeout(() => {
      setPixelGroups(prevPixelGroups => {
        const newPixelGroups = { ...prevPixelGroups };
        pixelsToMap.forEach(pixelIndex => {
          newPixelGroups[pixelIndex] = { group: groupName, zIndex };
        });
        return newPixelGroups;
      });
    }, 0);
    
    // Keep bottom bar open and activate the newly created group
    setActiveGroup(groupName);
  }

  // Calculate the bounding box of a selection
  function calculateSelectionBounds(pixelIndices) {
    if (pixelIndices.length === 0) return null;
    
    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;
    
    pixelIndices.forEach(idx => {
      const row = Math.floor(idx / 200);
      const col = idx % 200;
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    });
    
    return {
      minRow, maxRow, minCol, maxCol,
      width: maxCol - minCol + 1,
      height: maxRow - minRow + 1
    };
  }

  // Calculate rectangle selection area from pixel positions
  // Returns array of all pixel indices within the bounding rectangle
  function calculateRectangleFromPixels(pixelIndices) {
    if (!pixelIndices || pixelIndices.length === 0) return [];
    
    const bounds = calculateSelectionBounds(pixelIndices);
    if (!bounds) return [];
    
    const rectanglePixels = [];
    
    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
      for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
        rectanglePixels.push(row * 200 + col);
      }
    }
    
    return rectanglePixels;
  }

  // Validate that a selection area forms a proper rectangle/square
  // A valid rectangle must have exactly (width * height) pixels in consecutive rows/cols
  function isValidRectangle(selectionArea) {
    if (!selectionArea || selectionArea.length === 0) return false;
    
    const bounds = calculateSelectionBounds(selectionArea);
    if (!bounds) return false;
    
    const expectedCount = bounds.width * bounds.height;
    if (selectionArea.length !== expectedCount) return false;
    
    // Verify all pixels in the bounding box are present
    const pixelSet = new Set(selectionArea);
    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
      for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
        const idx = row * 200 + col;
        if (!pixelSet.has(idx)) return false;
      }
    }
    
    return true;
  }

  // Clean up corrupted layers by committing their data to background
  // eslint-disable-next-line no-unused-vars
  function cleanupCorruptedLayers() {
    console.log("=== VALIDATING LAYER SELECTION AREAS ===");
    
    const layersToRemove = [];
    const newPixelColors = [...pixelColors];
    
    groups.forEach(layer => {
      // Skip __selected__ temporary layer and layers without selection areas
      if (layer.name === "__selected__" || !layer.originalSelectionArea) {
        return;
      }
      
      const isValid = isValidRectangle(layer.originalSelectionArea);
      
      console.log(`Validating layer "${layer.name}":`, {
        hasSelectionArea: !!layer.originalSelectionArea,
        selectionAreaLength: layer.originalSelectionArea?.length,
        pixelsCount: Object.keys(layer.pixels || {}).length,
        isValid
      });
      
      if (!isValid) {
        console.warn(`Layer "${layer.name}" has corrupted selection area - committing to background`, {
          selectionAreaLength: layer.originalSelectionArea?.length,
          pixelsCount: Object.keys(layer.pixels || {}).length,
          bounds: calculateSelectionBounds(layer.originalSelectionArea)
        });
        
        layersToRemove.push(layer.name);
        
        // Restore pixel data from localStorage if available
        const storedGroups = JSON.parse(localStorage.getItem('pixelgrid_groups') || '[]');
        const storedLayer = storedGroups.find(g => g.name === layer.name);
        
        if (storedLayer && storedLayer.pixels) {
          console.log(`Committing ${Object.keys(storedLayer.pixels).length} pixels from layer "${layer.name}" to background`);
          
          // Copy all pixel data to background layer
          Object.entries(storedLayer.pixels).forEach(([pixelIndex, color]) => {
            const idx = parseInt(pixelIndex, 10);
            if (color && color !== null && color !== undefined) {
              newPixelColors[idx] = color;
            }
          });
        } else if (layer.pixels) {
          console.log(`Committing ${Object.keys(layer.pixels).length} pixels from layer "${layer.name}" to background (from memory)`);
          
          // Fallback to in-memory layer data
          Object.entries(layer.pixels).forEach(([pixelIndex, color]) => {
            const idx = parseInt(pixelIndex, 10);
            if (color && color !== null && color !== undefined) {
              newPixelColors[idx] = color;
            }
          });
        }
      }
    });
    
    if (layersToRemove.length > 0) {
      console.log(`Removing ${layersToRemove.length} corrupted layers:`, layersToRemove);
      
      // Update pixelColors with committed data
      setPixelColors(newPixelColors);
      
      // Remove corrupted layers from state
      const cleanedGroups = groups.filter(g => !layersToRemove.includes(g.name));
      setGroups(cleanedGroups);
      
      // Update localStorage
      const storedGroups = JSON.parse(localStorage.getItem('pixelgrid_groups') || '[]');
      const cleanedStoredGroups = storedGroups.filter(g => !layersToRemove.includes(g.name));
      localStorage.setItem('pixelgrid_groups', JSON.stringify(cleanedStoredGroups));
      
      // Update pixelGroups to remove references to deleted layers
      const newPixelGroups = { ...pixelGroups };
      Object.entries(newPixelGroups).forEach(([pixelIndex, groupInfo]) => {
        if (layersToRemove.includes(groupInfo.group)) {
          delete newPixelGroups[pixelIndex];
        }
      });
      setPixelGroups(newPixelGroups);
      
      console.log("=== CORRUPTED LAYERS CLEANED UP ===");
      return true;
    }
    
    console.log("All layer selection areas are valid rectangles");
    return false;
  }

  // Extract active layer to __selected__ for moving
  function extractLayerToSelected(layerName, onComplete) {
    // FIRST: Reload all layers from localStorage to ensure all pixels are restored
    // This is critical when a layer has been covered by another layer
    console.log("Reloading all layers from localStorage before extraction");
    let allLayersFromStorage = [];
    try {
      const storedGroups = localStorage.getItem("pixelgrid_groups");
      if (storedGroups) {
        allLayersFromStorage = JSON.parse(storedGroups);
        
        // Use flushSync to ensure state updates complete immediately
        flushSync(() => {
          // Reload groups from localStorage with frozen pixels
          setGroups(allLayersFromStorage.map(g => ({
            ...g,
            pixels: Object.freeze({ ...g.pixels }),
            originalSelectionArea: g.originalSelectionArea || []
          })));
          
          // Rebuild pixelGroups from localStorage layer data
          const newPixelGroups = {};
          allLayersFromStorage.forEach(layer => {
            if (layer.pixels) {
              Object.keys(layer.pixels).forEach(pixelIndex => {
                const idx = parseInt(pixelIndex, 10);
                newPixelGroups[idx] = {
                  group: layer.name,
                  zIndex: layer.zIndex || 0
                };
              });
            }
          });
          setPixelGroups(newPixelGroups);
        });
        
        console.log("Successfully reloaded all layers from localStorage", {
          layerCount: allLayersFromStorage.length,
          pixelGroupCount: Object.keys(allLayersFromStorage.reduce((acc, layer) => {
            if (layer.pixels) {
              Object.keys(layer.pixels).forEach(idx => acc[idx] = true);
            }
            return acc;
          }, {})).length
        });
      }
    } catch (error) {
      console.error("Failed to reload layers from localStorage", error);
    }
    
    // Don't extract if already extracted (check in freshly loaded data)
    const existingSelected = allLayersFromStorage.find(g => g.name === "__selected__");
    if (existingSelected) {
      console.log("extractLayerToSelected: __selected__ already exists in storage, aborting extraction", { 
        existing: existingSelected.originalLayerName 
      });
      return null;
    }
    
    // Use the freshly loaded data from localStorage
    const layer = allLayersFromStorage.find(g => g.name === layerName) || groups.find(g => g.name === layerName);
    if (!layer) {
      console.log("extractLayerToSelected: Layer not found", { layerName });
      return null;
    }

    // Get the layer data directly from localStorage (already loaded above)
    let restoredPixels = layer.pixels || {};
    let restoredSelectionArea = layer.originalSelectionArea || [];
    
    console.log("extractLayerToSelected: Using layer from localStorage", {
      layerName,
      pixelCount: Object.keys(restoredPixels).length,
      selectionAreaLength: restoredSelectionArea.length,
      hasOriginalData: true
    });

    // If we have restored data from localStorage, use those original pixel indices
    // Otherwise fall back to current pixelGroups positions
    let layerPixelIndices;
    let sourcePixels;
    
    if (restoredSelectionArea && restoredSelectionArea.length > 0) {
      // Use the original selection area from localStorage
      layerPixelIndices = restoredSelectionArea;
      sourcePixels = restoredPixels;
      console.log("extractLayerToSelected: Using original selection area from localStorage", {
        layerName,
        pixelCount: layerPixelIndices.length
      });
    } else {
      // Fall back to current positions from pixelGroups
      layerPixelIndices = Object.keys(pixelGroups)
        .filter(pixelIndex => pixelGroups[pixelIndex]?.group === layerName)
        .map(idx => parseInt(idx));
      sourcePixels = layer.pixels || {};
      console.log("extractLayerToSelected: Using current positions from pixelGroups", {
        layerName,
        pixelCount: layerPixelIndices.length
      });
    }

    if (layerPixelIndices.length === 0) {
      console.log("extractLayerToSelected: Layer has no pixels", { layerName });
      return null;
    }

    console.log("extractLayerToSelected: Extracting layer with original data", { 
      layerName, 
      pixelCount: layerPixelIndices.length,
      sampleIndices: layerPixelIndices.slice(0, 3)
    });

    // Store the pixel colors - use restored pixels from localStorage as source of truth
    const layerPixelColors = {};
    layerPixelIndices.forEach(pixelIndex => {
      layerPixelColors[pixelIndex] = sourcePixels[pixelIndex] || null;
    });
    
    console.log("extractLayerToSelected: Stored pixel colors", {
      layerName,
      pixelCount: Object.keys(layerPixelColors).length,
      sampleColors: layerPixelIndices.slice(0, 3).map(idx => ({
        index: idx,
        color: layerPixelColors[idx]
      }))
    });

    // Copy layer data to __selected__
    // Store BOTH the pixels object AND a frozen copy of original colors to prevent contamination
    const originalColors = new Map();
    const pixelIdentifiers = new Map(); // Map pixel index to HTML ID based on position
    
    layerPixelIndices.forEach(pixelIndex => {
      // Get color from restored localStorage data or layer's FROZEN pixels
      // NEVER use pixelColors to prevent contamination
      const color = (restoredPixels && restoredPixels[pixelIndex]) || 
                    (layer.pixels && layer.pixels[pixelIndex]) || 
                    null; // Use null if pixel has no color
      originalColors.set(pixelIndex, color);
      // Create unique identifier based on row/col position
      const row = Math.floor(pixelIndex / 200);
      const col = pixelIndex % 200;
      const pixelId = `pixel-r${row}-c${col}`;
      pixelIdentifiers.set(pixelIndex, pixelId);
    });
    
    // Freeze the originalColors Map to prevent modifications
    Object.freeze(originalColors);
    Object.freeze(pixelIdentifiers);
    
    // Commit the layer's pixel data to __selected__ immediately
    // This ensures ONLY this layer's data is in the selection
    const committedPixels = {};
    layerPixelIndices.forEach(pixelIndex => {
      committedPixels[pixelIndex] = originalColors.get(pixelIndex);
    });
    
    // Calculate the selection area as a rectangle from the current pixel positions
    // This ensures the selection is always a rectangle, not a scattered shape
    const currentSelectionArea = calculateRectangleFromPixels(layerPixelIndices);
    
    // Validate that the selection area is actually a valid rectangle
    if (!isValidRectangle(currentSelectionArea)) {
      console.error("extractLayerToSelected: Calculated selection area is not a valid rectangle!", {
        layerName,
        selectionAreaLength: currentSelectionArea.length,
        pixelIndicesLength: layerPixelIndices.length
      });
      // Abort extraction to prevent corruption
      return null;
    }
    
    // Create pixels object including ALL pixels (colored and transparent)
    // Include null values to preserve transparent pixels in selection area
    const completeRectanglePixels = {};
    currentSelectionArea.forEach(pixelIndex => {
      const color = originalColors.get(pixelIndex);
      // Include ALL pixels including transparent (null)
      if (color !== undefined) {
        completeRectanglePixels[pixelIndex] = color;
      }
    });
    
    console.log("extractLayerToSelected: Created complete rectangle", {
      layerName,
      originalPixelCount: layerPixelIndices.length,
      rectanglePixelCount: currentSelectionArea.length,
      completePixelCount: Object.keys(completeRectanglePixels).length,
      isValidRectangle: true
    });
    
    // Calculate highest zIndex + 1 for __selected__ to ensure it's always on top
    const highestZIndex = getHighestZIndex();
    const selectedZIndex = highestZIndex + 1;
    
    const selectedLayer = {
      name: "__selected__",
      zIndex: selectedZIndex, // Always highest z-index for moving
      pixels: Object.freeze(completeRectanglePixels), // Complete rectangle with all pixels
      originalLayerName: layerName,
      originalZIndex: layer.zIndex,
      originalPixelIndices: Object.freeze([...layerPixelIndices]), // Only actual pixels that existed
      originalColors: originalColors, // Frozen map of original colors to prevent contamination
      pixelIdentifiers: pixelIdentifiers, // HTML IDs for each pixel based on position
      originalSelectionArea: currentSelectionArea // Current rectangle selection area (full rectangle)
    };

    // Update groups: add __selected__ but KEEP original layer's pixels (don't clear them)
    // AND restore the original layer's complete pixel data from localStorage to force re-render
    // Use flushSync to ensure this completes before drag starts
    flushSync(() => {
      setGroups(prevGroups => {
        const updated = prevGroups
          .filter(g => g.name !== "__selected__")
          .map(g => {
            // If this is the layer being extracted, use its current pixel data
            if (g.name === layerName) {
              // Keep only the pixels that are in the current layer
              // This removes any pixels that were part of __selected__
              const layerPixels = restoredPixels || g.pixels || {};
              console.log("extractLayerToSelected: Using current pixel data for original layer", {
                layerName,
                pixelCount: Object.keys(layerPixels).length
              });
              return {
                ...g,
                pixels: Object.freeze({ ...layerPixels }),
                originalSelectionArea: currentSelectionArea
              };
            }
            return g;
          })
          .concat([selectedLayer]);
        console.log("extractLayerToSelected: Updated groups", { 
          groupCount: updated.length, 
          selectedPixels: layerPixelIndices.length,
          pixelIdentifiers: Array.from(pixelIdentifiers.entries()).slice(0, 5).map(([idx, id]) => ({ index: idx, id }))
        });
        return updated;
      });

      // Update pixelGroups to ensure all restored pixels from localStorage are properly mapped
      if (restoredPixels) {
        setPixelGroups(prevPixelGroups => {
          const updatedPixelGroups = { ...prevPixelGroups };
          // Add all pixels from localStorage that aren't currently in pixelGroups
          Object.keys(restoredPixels).forEach(pixelIndex => {
            const idx = parseInt(pixelIndex);
            if (!updatedPixelGroups[idx] || updatedPixelGroups[idx].group === layerName) {
              updatedPixelGroups[idx] = { group: layerName, zIndex: layer.zIndex };
            }
          });
          console.log("extractLayerToSelected: Updated pixelGroups with restored pixels", {
            layerName,
            restoredPixelCount: Object.keys(restoredPixels).length
          });
          return updatedPixelGroups;
        });
      }
    });

    // DON'T update pixelGroups during extraction - keep pixels pointing to original layer
    // This way the original layer's pixels remain visible at their original positions
    // pixelGroups will only be updated when the move is committed in restoreSelectedToLayer
    
    // Note: __selected__ layer exists but its pixels aren't in pixelGroups yet
    // They'll only be moved to the new positions when the move is committed
    
    // Call the completion callback if provided
    if (onComplete) {
      onComplete();
    }

    return {
      layerName,
      pixelIndices: layerPixelIndices,
      zIndex: layer.zIndex
    };
  }

  // Extract only selected pixels from a layer to __selected__ for moving
  function extractSelectionToSelected(layerName, selectedPixelIndices, onComplete) {
    // FIRST: Reload all layers from localStorage to ensure all pixels are restored
    // This is critical when a layer has been covered by another layer
    console.log("Reloading all layers from localStorage before selection extraction");
    let allLayersFromStorage = [];
    try {
      const storedGroups = localStorage.getItem("pixelgrid_groups");
      if (storedGroups) {
        allLayersFromStorage = JSON.parse(storedGroups);
        
        // Use flushSync to ensure state updates complete immediately
        flushSync(() => {
          // Reload groups from localStorage with frozen pixels
          setGroups(allLayersFromStorage.map(g => ({
            ...g,
            pixels: Object.freeze({ ...g.pixels }),
            originalSelectionArea: g.originalSelectionArea || []
          })));
          
          // Rebuild pixelGroups from localStorage layer data
          const newPixelGroups = {};
          allLayersFromStorage.forEach(layer => {
            if (layer.pixels) {
              Object.keys(layer.pixels).forEach(pixelIndex => {
                const idx = parseInt(pixelIndex, 10);
                newPixelGroups[idx] = {
                  group: layer.name,
                  zIndex: layer.zIndex || 0
                };
              });
            }
          });
          setPixelGroups(newPixelGroups);
        });
        
        console.log("Successfully reloaded all layers from localStorage", {
          layerCount: allLayersFromStorage.length,
          pixelGroupCount: Object.keys(allLayersFromStorage.reduce((acc, layer) => {
            if (layer.pixels) {
              Object.keys(layer.pixels).forEach(idx => acc[idx] = true);
            }
            return acc;
          }, {})).length
        });
      }
    } catch (error) {
      console.error("Failed to reload layers from localStorage", error);
    }
    
    // Don't extract if already extracted (check in freshly loaded data)
    const existingSelected = allLayersFromStorage.find(g => g.name === "__selected__");
    if (existingSelected) {
      console.log("extractSelectionToSelected: __selected__ already exists in storage, aborting extraction", { 
        existing: existingSelected.originalLayerName 
      });
      return null;
    }
    
    // Use the freshly loaded data from localStorage
    const layer = allLayersFromStorage.find(g => g.name === layerName) || groups.find(g => g.name === layerName);
    if (!layer) return null;

    // Filter selected pixels that actually belong to this layer
    const layerSelectedPixels = selectedPixelIndices.filter(
      pixelIndex => pixelGroups[pixelIndex]?.group === layerName
    );

    if (layerSelectedPixels.length === 0) {
      console.log("extractSelectionToSelected: No selected pixels in layer", { layerName });
      return null;
    }

    // Store the original pixel colors in a Map (for contamination prevention)
    const originalColors = new Map();
    const pixelIdentifiers = new Map(); // Map pixel index to HTML ID based on position
    
    layerSelectedPixels.forEach(pixelIndex => {
      // Get color from layer's FROZEN pixels ONLY - never from pixelColors
      const color = (layer.pixels && layer.pixels[pixelIndex]) || null;
      originalColors.set(pixelIndex, color);
      // Create unique identifier based on row/col position
      const row = Math.floor(pixelIndex / 200);
      const col = pixelIndex % 200;
      const pixelId = `pixel-r${row}-c${col}`;
      pixelIdentifiers.set(pixelIndex, pixelId);
    });
    
    // Freeze the collections to prevent modifications
    Object.freeze(originalColors);
    Object.freeze(pixelIdentifiers);

    console.log("extractSelectionToSelected: Extracting selection", { 
      layerName, 
      totalSelected: selectedPixelIndices.length,
      inThisLayer: layerSelectedPixels.length,
      pixelIdentifiers: Array.from(pixelIdentifiers.entries()).slice(0, 5).map(([idx, id]) => ({ index: idx, id }))
    });

    // Calculate selection bounds to prevent it from growing
    const selectionBounds = calculateSelectionBounds(layerSelectedPixels);

    // Commit the layer's pixel data for selected pixels to __selected__ immediately
    // This ensures ONLY this layer's selected data is in the selection
    const committedPixels = {};
    layerSelectedPixels.forEach(pixelIndex => {
      committedPixels[pixelIndex] = originalColors.get(pixelIndex);
    });

    // Calculate highest zIndex + 1 for __selected__ to ensure it's always on top
    const highestZIndex = getHighestZIndex();
    const selectedZIndex = highestZIndex + 1;

    // Create __selected__ layer metadata with committed pixel data
    const selectedLayer = {
      name: "__selected__",
      zIndex: selectedZIndex,
      pixels: Object.freeze(committedPixels), // Committed layer data - frozen to prevent changes
      originalPixelIndices: Object.freeze([...layerSelectedPixels]), // Frozen array - cannot be modified
      originalColors, // Store original colors to prevent contamination
      originalLayerName: layerName,
      originalZIndex: layer.zIndex,
      locked: false,
      selectionBounds, // Lock the selection area size
      pixelIdentifiers: pixelIdentifiers // HTML IDs for each pixel based on position
    };

    // Update groups: add __selected__ WITHOUT clearing original layer
    // Use flushSync to ensure this completes before drag starts
    flushSync(() => {
      setGroups(prevGroups => {
        return prevGroups
          .filter(g => g.name !== "__selected__")
          .concat([selectedLayer]);
      });
    });

    // DON'T update pixelGroups during extraction - keep pixels pointing to original layer
    // The CSS transform will handle the visual preview
    
    // Call the completion callback if provided
    if (onComplete) {
      onComplete();
    }

    return {
      layerName,
      pixelIndices: layerSelectedPixels,
      zIndex: layer.zIndex
    };
  }

  // Restore __selected__ back to original layer after move
  // movedPixelIndices: optional array of pixel indices (after move) to restore
  function restoreSelectedToLayer(movedPixelIndices = null) {
    console.log("=== RESTORE SELECTED TO LAYER START ===", { providedIndices: movedPixelIndices?.length });
    
    // FIRST: Reload the original layer from localStorage to get complete pixel data
    // This ensures we're restoring ALL pixels including those that may have been covered
    let originalLayerFromStorage = null;
    const selectedLayer = groups.find(g => g.name === "__selected__");
    if (!selectedLayer || !selectedLayer.originalLayerName) {
      console.log("restoreSelectedToLayer: No __selected__ layer found or missing originalLayerName", { selectedLayer });
      return;
    }

    const originalLayerName = selectedLayer.originalLayerName;
    const originalZIndex = selectedLayer.originalZIndex;
    
    // Reload the original layer from localStorage to ensure we have complete selection area
    try {
      const storedGroups = localStorage.getItem("pixelgrid_groups");
      if (storedGroups) {
        const parsedGroups = JSON.parse(storedGroups);
        originalLayerFromStorage = parsedGroups.find(g => g.name === originalLayerName);
        if (originalLayerFromStorage) {
          console.log("restoreSelectedToLayer: Loaded original layer from localStorage", {
            layerName: originalLayerName,
            storedPixelCount: Object.keys(originalLayerFromStorage.pixels || {}).length,
            storedSelectionAreaLength: (originalLayerFromStorage.originalSelectionArea || []).length
          });
        }
      }
    } catch (error) {
      console.error("restoreSelectedToLayer: Failed to load from localStorage", error);
    }
    
    // Use provided indices OR fall back to originalPixelIndices (NOT pixelGroups)
    // Because __selected__ pixels are NEVER in pixelGroups during preview
    setPixelGroups(prevPixelGroups => {
      const selectedPixelIndices = movedPixelIndices || selectedLayer.originalPixelIndices || [];
      const originalPixelIndices = selectedLayer.originalPixelIndices || [];

      console.log("restoreSelectedToLayer: Restoring pixels", { 
        originalLayerName, 
        pixelCount: selectedPixelIndices.length,
        originalPixelCount: originalPixelIndices.length,
        originalZIndex,
        usingProvidedIndices: !!movedPixelIndices,
        sampleNewPixels: selectedPixelIndices.slice(0, 5),
        sampleOldPixels: originalPixelIndices.slice(0, 5)
      });

      // Update pixelGroups: 
      // 1. REMOVE old pixel positions from pixelGroups (if moved)
      // 2. ADD new pixel positions to pixelGroups
      const updatedPixelGroups = { ...prevPixelGroups };
      
      // Remove old positions if this was a move
      if (movedPixelIndices && movedPixelIndices.length > 0) {
        originalPixelIndices.forEach(oldPixelIndex => {
          // Only remove if it still points to this layer
          if (updatedPixelGroups[oldPixelIndex]?.group === originalLayerName) {
            delete updatedPixelGroups[oldPixelIndex];
          }
        });
      }
      
      // Add new positions
      selectedPixelIndices.forEach(pixelIndex => {
        updatedPixelGroups[pixelIndex] = { group: originalLayerName, zIndex: originalZIndex };
      });
      
      console.log("restoreSelectedToLayer: Remapped pixels to original layer", { 
        originalLayerName,
        removedCount: movedPixelIndices ? originalPixelIndices.length : 0,
        addedCount: selectedPixelIndices.length 
      });
      
      return updatedPixelGroups;
    });

    // Transfer pixel colors from __selected__ back to original layer and remove __selected__
    // IMPORTANT: Get the CURRENT __selected__ pixels (after move) from groups state
    setGroups(prevGroups => {
      const selectedGroup = prevGroups.find(g => g.name === "__selected__");
      if (!selectedGroup) {
        console.log("restoreSelectedToLayer: Warning - __selected__ already removed from groups");
        return prevGroups;
      }
      
      // Get the UPDATED pixels from __selected__ (these have the NEW positions after move)
      const selectedGroupPixels = selectedGroup.pixels || {};
      
      console.log("restoreSelectedToLayer: Getting updated __selected__ pixels", {
        totalPixelsInSelected: Object.keys(selectedGroupPixels).length,
        movedPixelCount: movedPixelIndices ? movedPixelIndices.length : 0,
        samplePixels: Object.keys(selectedGroupPixels).slice(0, 3).map(idx => ({
          index: idx,
          color: selectedGroupPixels[idx]
        }))
      });
      
      // Restore pixels using the mapping from original to new positions
      // Use COMPLETE original selection area from localStorage if available
      // This ensures ALL pixels are moved, even those that were covered by other layers
      const filteredPixels = {};
      if (movedPixelIndices && movedPixelIndices.length > 0) {
        // Movement occurred - map original pixels to new positions
        // Calculate the delta from the move
        
        // Use the COMPLETE originalSelectionArea from localStorage if available
        // This includes ALL pixels that were originally in the layer
        let originalIndices = selectedGroup.originalSelectionArea || selectedGroup.originalPixelIndices || [];
        
        // If we have the layer from storage, use its complete selection area
        if (originalLayerFromStorage && originalLayerFromStorage.originalSelectionArea && 
            originalLayerFromStorage.originalSelectionArea.length > 0) {
          originalIndices = originalLayerFromStorage.originalSelectionArea;
          console.log("restoreSelectedToLayer: Using complete selection area from localStorage", {
            originalLayerName,
            completeSelectionAreaLength: originalIndices.length,
            selectedGroupIndicesLength: (selectedGroup.originalPixelIndices || []).length
          });
        }
        
        if (originalIndices.length > 0 && movedPixelIndices.length > 0) {
          // For each moved pixel, find its corresponding original pixel and use the original color
          const firstOriginalIdx = originalIndices[0];
          const firstMovedIdx = movedPixelIndices[0];
          const deltaRow = Math.floor(firstMovedIdx / 200) - Math.floor(firstOriginalIdx / 200);
          const deltaCol = (firstMovedIdx % 200) - (firstOriginalIdx % 200);
          
          console.log("restoreSelectedToLayer: Calculated delta", { deltaRow, deltaCol });
          
          // For each original pixel in the COMPLETE selection area, calculate new position
          // Use originalColors first, then fall back to localStorage data
          originalIndices.forEach(originalIdx => {
            // Try to get color from originalColors Map first
            let originalColor = selectedGroup.originalColors.get(originalIdx);
            
            // If not in originalColors, try to get from localStorage
            if (originalColor === undefined && originalLayerFromStorage && originalLayerFromStorage.pixels) {
              originalColor = originalLayerFromStorage.pixels[originalIdx];
              if (originalColor !== undefined) {
                console.log("restoreSelectedToLayer: Using color from localStorage for pixel", {
                  pixelIndex: originalIdx,
                  color: originalColor
                });
              }
            }
            
            // Skip pixels that don't exist in either source
            if (originalColor === undefined) {
              return;
            }
            
            const row = Math.floor(originalIdx / 200);
            const col = originalIdx % 200;
            const newRow = row + deltaRow;
            const newCol = col + deltaCol;
            
            // Bounds check
            if (newRow >= 0 && newRow < 200 && newCol >= 0 && newCol < 200) {
              const newIdx = newRow * 200 + newCol;
              // STRICT: Only store if we have a valid original color
              filteredPixels[newIdx] = originalColor;
            }
          });
        }
      } else {
        // No movement - restore from originalColors at original positions
        // This handles click-without-drag case
        if (selectedGroup.originalColors && selectedGroup.originalPixelIndices) {
          selectedGroup.originalPixelIndices.forEach(pixelIndex => {
            const color = selectedGroup.originalColors.get(pixelIndex);
            if (color !== undefined) {
              filteredPixels[pixelIndex] = color;
            }
          });
        }
      }
      
      console.log("restoreSelectedToLayer: Filtered to moved pixels only", {
        beforeFilter: Object.keys(selectedGroupPixels).length,
        afterFilter: Object.keys(filteredPixels).length,
        movedIndicesProvided: movedPixelIndices ? movedPixelIndices.length : 0
      });
      
      const updatedGroups = prevGroups
        .filter(g => g.name !== "__selected__")
        .map(g => {
          if (g.name === originalLayerName) {
            // Recalculate selection area as rectangle from the NEW pixel positions
            // This ensures the selection stays as a rectangle at the moved location
            const movedPixelIndices = Object.keys(filteredPixels).map(idx => parseInt(idx));
            
            if (movedPixelIndices.length === 0) {
              console.error("restoreSelectedToLayer: No pixels to restore!", { originalLayerName });
              // Return unchanged layer to prevent data loss
              return g;
            }
            
            const newSelectionArea = calculateRectangleFromPixels(movedPixelIndices);
            
            // Validate that the selection area is a valid rectangle before proceeding
            if (!isValidRectangle(newSelectionArea)) {
              console.error("restoreSelectedToLayer: New selection area is not a valid rectangle!", {
                layerName: originalLayerName,
                movedPixelCount: movedPixelIndices.length,
                selectionAreaLength: newSelectionArea.length
              });
              // Return unchanged layer to prevent corruption
              return g;
            }
            
            // Create pixels object including ALL pixels (colored and transparent)
            // Include null values to preserve transparent pixels in selection area
            // IMPORTANT: Use NEW indices as keys, not old ones
            const completeRectanglePixels = {};
            
            // Map from old indices to new indices based on the delta
            if (movedPixelIndices && movedPixelIndices.length > 0) {
              // Use complete selection area if available
              const originalIndices = (originalLayerFromStorage && originalLayerFromStorage.originalSelectionArea) || 
                                     selectedGroup.originalSelectionArea || 
                                     selectedGroup.originalPixelIndices || [];
              if (originalIndices.length > 0) {
                const firstOriginalIdx = originalIndices[0];
                const firstMovedIdx = movedPixelIndices[0];
                const deltaRow = Math.floor(firstMovedIdx / 200) - Math.floor(firstOriginalIdx / 200);
                const deltaCol = (firstMovedIdx % 200) - (firstOriginalIdx % 200);
                
                // For each pixel in the new selection area, map it to its color
                newSelectionArea.forEach(newPixelIndex => {
                  // Calculate what the original index was
                  const newRow = Math.floor(newPixelIndex / 200);
                  const newCol = newPixelIndex % 200;
                  const oldRow = newRow - deltaRow;
                  const oldCol = newCol - deltaCol;
                  const oldIndex = oldRow * 200 + oldCol;
                  
                  // Get the color from originalColors first, then from localStorage
                  let color = selectedGroup.originalColors.get(oldIndex);
                  
                  // If not in originalColors, try localStorage
                  if (color === undefined && originalLayerFromStorage && originalLayerFromStorage.pixels) {
                    color = originalLayerFromStorage.pixels[oldIndex];
                  }
                  
                  // Store using the NEW index
                  if (color !== undefined) {
                    completeRectanglePixels[newPixelIndex] = color;
                  }
                });
              }
            } else {
              // No movement - use original positions
              newSelectionArea.forEach(pixelIndex => {
                const color = filteredPixels[pixelIndex];
                if (color !== undefined) {
                  completeRectanglePixels[pixelIndex] = color;
                } else if (selectedGroup.originalColors.has(pixelIndex)) {
                  completeRectanglePixels[pixelIndex] = null;
                }
              });
            }
            
            console.log("restoreSelectedToLayer: Created complete rectangle at new position", {
              layerName: originalLayerName,
              movedPixelCount: Object.keys(filteredPixels).length,
              rectanglePixelCount: newSelectionArea.length,
              completePixelCount: Object.keys(completeRectanglePixels).length,
              isValidRectangle: true
            });
            
            // Use the complete rectangle (all pixels in bounding box)
            const basePixels = { ...completeRectanglePixels };
            
            console.log("restoreSelectedToLayer: Updating layer with moved pixels", {
              layerName: g.name,
              oldPixelCount: Object.keys(g.pixels || {}).length,
              addedCount: Object.keys(completeRectanglePixels).length,
              finalCount: Object.keys(basePixels).length
            });
            
            // Create updated layer with all preserved data
            const updatedLayer = { 
              ...g, 
              pixels: Object.freeze(basePixels),
              originalSelectionArea: newSelectionArea
            };
            
            // SAVE TO LOCALSTORAGE after move to persist the new state
            try {
              const currentStorage = localStorage.getItem("pixelgrid_groups");
              if (currentStorage) {
                const storedGroups = JSON.parse(currentStorage);
                const updatedStorage = storedGroups.map(sg => {
                  if (sg.name === originalLayerName) {
                    return {
                      ...sg,
                      pixels: basePixels,
                      originalSelectionArea: newSelectionArea
                    };
                  }
                  return sg;
                });
                localStorage.setItem("pixelgrid_groups", JSON.stringify(updatedStorage));
                console.log("restoreSelectedToLayer: Saved updated layer to localStorage", {
                  layerName: originalLayerName,
                  pixelCount: Object.keys(basePixels).length
                });
              }
            } catch (error) {
              console.error("restoreSelectedToLayer: Failed to save to localStorage", error);
            }
            
            // Return new immutable layer object with all data preserved
            return Object.freeze(updatedLayer);
          }
          // Return existing layers as frozen objects
          return Object.freeze({ ...g, pixels: Object.freeze({ ...g.pixels }) });
        });
      
      console.log("restoreSelectedToLayer: Removed __selected__ from groups", {
        remainingGroups: updatedGroups.map(g => g.name)
      });
      
      return updatedGroups;
    });

    // Keep layer active and clear __selected__ from activeGroup if needed
    setActiveGroup(prevActive => {
      if (prevActive === "__selected__") {
        return originalLayerName;
      }
      return prevActive;
    });
    
    console.log("=== RESTORE SELECTED TO LAYER COMPLETE ===");
  }

  // Move group pixels (works with __selected__ and regular layers)
  // Returns the new pixel indices after moving
  function moveGroup(groupName, deltaRow, deltaCol) {
    console.log("=== MOVE GROUP START ===", { groupName, deltaRow, deltaCol });
    const group = groups.find(g => g.name === groupName);
    if (!group) {
      console.log("moveGroup: Group not found", { groupName });
      return [];
    }
    
    // For __selected__, verify pixels match localStorage layer data
    if (groupName === "__selected__" && group.originalLayerName) {
      try {
        const storedGroups = localStorage.getItem("pixelgrid_groups");
        if (storedGroups) {
          const parsedGroups = JSON.parse(storedGroups);
          const storedLayer = parsedGroups.find(g => g.name === group.originalLayerName);
          
          if (storedLayer && group.originalColors) {
            // Verify each pixel color matches localStorage and enforce corrections
            const correctedColors = new Map();
            let correctionCount = 0;
            
            group.originalPixelIndices.forEach(pixelIndex => {
              const currentColor = group.originalColors.get(pixelIndex);
              const storedColor = storedLayer.pixels[pixelIndex];
              
              if (storedColor !== undefined) {
                if (storedColor !== currentColor) {
                  console.warn("moveGroup: Correcting pixel from localStorage", {
                    pixelIndex,
                    incorrectColor: currentColor,
                    correctColor: storedColor
                  });
                  correctionCount++;
                }
                // Always use localStorage as source of truth
                correctedColors.set(pixelIndex, storedColor);
              } else {
                // Pixel not in localStorage - keep current
                correctedColors.set(pixelIndex, currentColor);
              }
            });
            
            if (correctionCount > 0) {
              console.warn("moveGroup: Corrected pixels from localStorage", {
                total: group.originalColors.size,
                corrections: correctionCount
              });
              // Update the group's originalColors with corrected data
              group.originalColors = Object.freeze(correctedColors);
            } else {
              console.log("moveGroup: All pixels verified against localStorage ✓");
            }
          }
        }
      } catch (error) {
        console.error("moveGroup: Failed to verify against localStorage", error);
      }
    }
    
    // Get current pixel positions
    // For __selected__, use ONLY the originalPixelIndices to prevent contamination
    let currentPixels;
    if (groupName === "__selected__" && group.originalPixelIndices) {
      currentPixels = group.originalPixelIndices;
      console.log("moveGroup: Using originalPixelIndices for __selected__", { count: currentPixels.length });
    } else {
      // For regular layers, get from pixelGroups
      currentPixels = Object.keys(pixelGroups)
        .filter(pixelIndex => pixelGroups[pixelIndex]?.group === groupName)
        .map(idx => parseInt(idx));
    }
    
    if (currentPixels.length === 0) {
      console.log("moveGroup: No pixels to move", { groupName });
      return [];
    }
    
    console.log("moveGroup: Current pixels", { 
      groupName, 
      deltaRow, 
      deltaCol, 
      pixelCount: currentPixels.length,
      sampleOldPixels: currentPixels.slice(0, 5)
    });
    
    // Calculate new positions with bounds checking
    const pixelMoves = [];
    currentPixels.forEach(pixelIndex => {
      const row = Math.floor(pixelIndex / 200);
      const col = pixelIndex % 200;
      const newRow = row + deltaRow;
      const newCol = col + deltaCol;
      
      // Bounds check - only move pixels that stay within grid
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
        const newIndex = newRow * 200 + newCol;
        // For __selected__, verify the pixel is actually in originalPixelIndices
        if (groupName === "__selected__" && group.originalPixelIndices) {
          if (group.originalPixelIndices.includes(pixelIndex)) {
            pixelMoves.push({ oldIndex: pixelIndex, newIndex });
          }
        } else {
          pixelMoves.push({ oldIndex: pixelIndex, newIndex });
        }
      }
    });
    
    console.log("moveGroup: Calculated moves", { 
      moveCount: pixelMoves.length,
      sampleMoves: pixelMoves.slice(0, 5).map(m => `${m.oldIndex} -> ${m.newIndex}`)
    });
    
    // Store the pixel colors that are being moved
    // For __selected__ layer, use originalColors to prevent contamination
    const movedColors = new Map();
    pixelMoves.forEach(({ oldIndex, newIndex }) => {
      let color = null;
      
      // If this is __selected__ and we have originalColors, use those (prevents contamination)
      if (groupName === "__selected__" && group.originalColors) {
        // STRICT: Only get color from originalColors Map - never from pixelColors or other sources
        color = group.originalColors.get(oldIndex);
        // Verify the oldIndex was actually in our original selection
        if (color === undefined) {
          console.warn("moveGroup: Attempted to move pixel not in originalColors", { oldIndex, newIndex });
          return; // Skip this pixel
        }
      } else {
        // For regular layers, use pixels or fall back to pixelColors
        color = (group.pixels && group.pixels[oldIndex]) || pixelColors[oldIndex] || null;
      }
      
      movedColors.set(newIndex, color);
    });
    
    console.log("moveGroup: Storing colors for move", {
      groupName,
      sampleColors: pixelMoves.slice(0, 3).map(({ oldIndex, newIndex }) => ({
        oldIndex,
        newIndex,
        color: movedColors.get(newIndex)
      }))
    });
    
    // Update the group's pixels object with new positions
    setGroups(prevGroups => {
      return prevGroups.map(g => {
        if (g.name === groupName) {
          // Start fresh - only include the moved pixels, nothing else
          const newPixels = {};
          
          // ONLY add the pixels we're moving (with their original colors)
          movedColors.forEach((color, newIndex) => {
            newPixels[newIndex] = color;
          });
          
          // Calculate new selection area as rectangle from new positions
          const newPixelIndices = Array.from(movedColors.keys());
          const newSelectionArea = calculateRectangleFromPixels(newPixelIndices);
          
          console.log("moveGroup: Calculated new selection area", {
            groupName,
            movedPixelCount: newPixelIndices.length,
            newSelectionAreaCount: newSelectionArea.length
          });
          
          // Preserve originalColors, originalPixelIndices, and pixelIdentifiers if this is __selected__
          const updatedGroup = { 
            ...g, 
            pixels: newPixels,
            originalSelectionArea: newSelectionArea // Update selection area to new position
          };
          if (g.originalColors) {
            updatedGroup.originalColors = g.originalColors;
          }
          if (g.originalPixelIndices) {
            updatedGroup.originalPixelIndices = g.originalPixelIndices;
          }
          if (g.pixelIdentifiers) {
            updatedGroup.pixelIdentifiers = g.pixelIdentifiers;
          }
          
          return updatedGroup;
        }
        return g;
      });
    });
    
    // Update pixelGroups with new positions
    // IMPORTANT: When overlapping, preserve the underlying layer's pixel data in its pixels object
    setPixelGroups(prevPixelGroups => {
      const newPixelGroups = { ...prevPixelGroups };
      
      // Before removing old positions or adding new ones, preserve any underlying layer data
      const overlappedLayers = new Map(); // Map of layer name to array of pixel indices that will be covered
      pixelMoves.forEach(({ newIndex }) => {
        if (newPixelGroups[newIndex] && newPixelGroups[newIndex].group !== groupName) {
          const layerName = newPixelGroups[newIndex].group;
          if (!overlappedLayers.has(layerName)) {
            overlappedLayers.set(layerName, []);
          }
          overlappedLayers.get(layerName).push(newIndex);
        }
      });
      
      // Preserve underlying layer pixel data and restore from localStorage
      if (overlappedLayers.size > 0) {
        try {
          const storedGroups = localStorage.getItem("pixelgrid_groups");
          const parsedGroups = storedGroups ? JSON.parse(storedGroups) : null;
          
          setGroups(prevGroups => {
            return prevGroups.map(g => {
              if (overlappedLayers.has(g.name)) {
                // Get the stored layer data from localStorage
                const storedLayer = parsedGroups ? parsedGroups.find(sg => sg.name === g.name) : null;
                
                // Start with current pixels or restore from localStorage
                const preservedPixels = storedLayer ? { ...storedLayer.pixels } : { ...g.pixels };
                const coveredIndices = overlappedLayers.get(g.name);
                
                coveredIndices.forEach((pixelIndex) => {
                  // Ensure the pixel is preserved from localStorage or current state
                  if (!preservedPixels[pixelIndex]) {
                    preservedPixels[pixelIndex] = g.pixels[pixelIndex] || null;
                  }
                });
                
                console.log(`Preserving ${coveredIndices.length} pixels for layer ${g.name} before overlap`);
                
                // Restore originalSelectionArea from localStorage if available
                const originalSelectionArea = storedLayer?.originalSelectionArea || g.originalSelectionArea || [];
                
                return { 
                  ...g, 
                  pixels: Object.freeze(preservedPixels),
                  originalSelectionArea: originalSelectionArea
                };
              }
              return g;
            });
          });
        } catch (error) {
          console.error("Failed to restore layer data from localStorage:", error);
          // Fallback to current preservation logic
          setGroups(prevGroups => {
            return prevGroups.map(g => {
              if (overlappedLayers.has(g.name)) {
                const preservedPixels = { ...g.pixels };
                const coveredIndices = overlappedLayers.get(g.name);
                
                coveredIndices.forEach((pixelIndex) => {
                  if (!preservedPixels[pixelIndex]) {
                    preservedPixels[pixelIndex] = g.pixels[pixelIndex] || null;
                  }
                });
                
                return { ...g, pixels: Object.freeze(preservedPixels) };
              }
              return g;
            });
          });
        }
      }
      
      // Now remove pixels from old positions
      pixelMoves.forEach(({ oldIndex }) => {
        delete newPixelGroups[oldIndex];
      });
      
      // Then, add pixels at new positions (this may cover other layers)
      pixelMoves.forEach(({ newIndex }) => {
        newPixelGroups[newIndex] = { group: groupName, zIndex: group.zIndex };
      });
      
      console.log("moveGroup: Updated pixelGroups", {
        groupName,
        newPositionsCount: pixelMoves.length,
        overlappedLayers: Array.from(overlappedLayers.keys())
      });
      
      return newPixelGroups;
    });
    
    console.log("=== MOVE GROUP COMPLETE ===");
    
    // Return the new pixel indices
    return pixelMoves.map(m => m.newIndex);
  }

  // Restore original pixels to their source layers after selection move
  function restoreOriginalPixelsToLayers(originalPixelData) {
    console.log("Restoring original pixels to source layers", { count: originalPixelData.size });
    
    setGroups(prevGroups => {
      return prevGroups.map(group => {
        if (group.name === "__selected__") return group; // Skip __selected__ layer
        
        const newPixels = { ...group.pixels };
        let hasChanges = false;
        
        // Restore pixels that belong to this layer
        originalPixelData.forEach((data, pixelIndex) => {
          if (data.sourceLayer === group.name) {
            // Restore the original color (even if null/transparent)
            if (data.color !== null && data.color !== undefined) {
              newPixels[pixelIndex] = data.color;
            } else {
              // Restore transparent pixel
              newPixels[pixelIndex] = null;
            }
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          return { ...group, pixels: Object.freeze(newPixels) };
        }
        return group;
      });
    });
    
    // Update pixelGroups to restore original layer assignments
    setPixelGroups(prevPixelGroups => {
      const newPixelGroups = { ...prevPixelGroups };
      
      originalPixelData.forEach((data, pixelIndex) => {
        if (data.sourceLayer) {
          // Find the zIndex for this layer
          const layer = groups.find(g => g.name === data.sourceLayer);
          if (layer) {
            newPixelGroups[pixelIndex] = { group: data.sourceLayer, zIndex: layer.zIndex };
          }
        }
      });
      
      return newPixelGroups;
    });
  }
  
  // Move selected pixels (not in a group)
  function moveSelectedPixels(deltaRow, deltaCol, pixelsToMove = null) {
    const selectedPixelsArray = pixelsToMove || selectedPixels;
    console.log("moveSelectedPixels called:", { deltaRow, deltaCol, selectedPixelsCount: selectedPixelsArray.length });
    if (selectedPixelsArray.length === 0) {
      console.log("No selected pixels, returning early");
      return;
    }
    
    console.log("Setting pixel colors...");
    setPixelColors(prev => {
      console.log("Inside setPixelColors updater, prev length:", prev.length);
      const copy = [...prev];
      
      // Get colors and positions of selected pixels from current state
      const pixelData = selectedPixelsArray.map(idx => ({
        oldIndex: idx,
        color: prev[idx],
        row: Math.floor(idx / 200),
        col: idx % 200
      }));
      
      console.log("Moving pixels:", pixelData.slice(0, 3), "...");
      console.log("First pixel before:", { index: pixelData[0].oldIndex, color: copy[pixelData[0].oldIndex] });
      
      // Clear old positions
      pixelData.forEach(p => {
        copy[p.oldIndex] = "#ffffff";
      });
      
      console.log("First pixel after clear:", { index: pixelData[0].oldIndex, color: copy[pixelData[0].oldIndex] });
      
      // Set new positions
      pixelData.forEach(p => {
        const newRow = p.row + deltaRow;
        const newCol = p.col + deltaCol;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
          const newIndex = newRow * 200 + newCol;
          copy[newIndex] = p.color;
          console.log("Set pixel", newIndex, "to", p.color);
        }
      });
      
      console.log("Returning updated copy");
      return copy;
    });
    
    console.log("Updating selected pixels...");
    // Update selected pixels to new positions
    const newSelectedPixels = selectedPixelsArray.map(idx => {
      const row = Math.floor(idx / 200);
      const col = idx % 200;
      const newRow = row + deltaRow;
      const newCol = col + deltaCol;
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
        return newRow * 200 + newCol;
      }
      return null;
    }).filter(idx => idx !== null);
    
    console.log("New selected pixels:", newSelectedPixels.slice(0, 5));
    setSelectedPixels(newSelectedPixels);
    console.log("moveSelectedPixels complete");
  }

  function saveToPNG() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const pixelSize = 10; // Each pixel will be 10x10 in the exported image
    
    canvas.width = cols * pixelSize;
    canvas.height = rows * pixelSize;
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create a combined view of all pixels (layers + base)
    const finalPixels = new Array(pixelColors.length).fill(null);
    
    // First, add base pixels
    pixelColors.forEach((color, i) => {
      if (color && !pixelGroups[i]) {
        finalPixels[i] = color;
      }
    });
    
    // Then, layer pixels by zIndex (lowest to highest)
    const sortedGroups = [...groups]
      .filter(g => g.name !== "__selected__")
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    sortedGroups.forEach(group => {
      Object.entries(group.pixels || {}).forEach(([idx, color]) => {
        if (color) {
          finalPixels[parseInt(idx)] = color;
        }
      });
    });
    
    // Draw pixels
    finalPixels.forEach((color, i) => {
      if (color) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.fillStyle = color;
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      }
    });
    
    // Download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pixel-art.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function saveToJPG() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const pixelSize = 10; // Each pixel will be 10x10 in the exported image
    
    canvas.width = cols * pixelSize;
    canvas.height = rows * pixelSize;
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create a combined view of all pixels (layers + base)
    const finalPixels = new Array(pixelColors.length).fill(null);
    
    // First, add base pixels
    pixelColors.forEach((color, i) => {
      if (color && !pixelGroups[i]) {
        finalPixels[i] = color;
      }
    });
    
    // Then, layer pixels by zIndex (lowest to highest)
    const sortedGroups = [...groups]
      .filter(g => g.name !== "__selected__")
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    sortedGroups.forEach(group => {
      Object.entries(group.pixels || {}).forEach(([idx, color]) => {
        if (color) {
          finalPixels[parseInt(idx)] = color;
        }
      });
    });
    
    // Draw pixels
    finalPixels.forEach((color, i) => {
      if (color) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.fillStyle = color;
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      }
    });
    
    // Download as JPG
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pixel-art.jpg';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  }

  function saveToHTML() {
    const data = {
      pixelColors: pixelColors,
      pixelGroups: pixelGroups,
      groups: groups
    };
    const dataString = JSON.stringify(data);
    const html = `
<body style="margin:0; overflow-x:hidden;">
<div style="display:grid;grid-template-columns:repeat(200,0.75vw);grid-auto-rows:0.75vw;">
${pixelColors.map((c, i) => {
  const group = pixelGroups[i];
  const style = `width:0.75vw;height:0.75vw;background:${c};${group ? `position:relative;z-index:${group.zIndex}` : ''}`;
  return `<div style="${style}"${group ? ` id="${group.group}"` : ''}></div>`;
}).join("")}
</div>
<script>
const savedData = ${dataString};
// Data includes: pixelColors, pixelGroups, groups
</script>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixel-art.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadFromHTML(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Try new format first (with groups)
      const matchData = text.match(/const savedData = ({[^;]+})/);
      if (matchData) {
        try {
          const data = JSON.parse(matchData[1]);
          if (data.pixelColors) setPixelColors(data.pixelColors);
          if (data.pixelGroups) setPixelGroups(data.pixelGroups);
          if (data.groups) setGroups(data.groups);
          return;
        } catch (err) {
          console.error("Failed to parse new format:", err);
        }
      }
      // Fallback to old format (just colors)
      const matchColors = text.match(/const colors = (\[[^;]+\])/);
      if (matchColors) {
        try {
          const arr = JSON.parse(matchColors[1]);
          setPixelColors(arr);
        } catch (err) {
          console.error("Failed to parse old format:", err);
        }
      }
    };
    reader.readAsText(file);
  }
  
  // Handle background image upload
  function handleBackgroundUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }
  
  // Remove background image
  function removeBackgroundImage() {
    setBackgroundImage(null);
  }

  // Load image from PNG/JPG and convert to pixel art
  function loadImageAsPixelArt(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        setImageScale(75); // Default to 75px wide
        setShowImageScaleDialog(true);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  // Apply the scaled image to the canvas
  function applyImageToCanvas(targetWidth) {
    if (!uploadedImage) return;
    
    // Create canvas to read pixel data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate height based on aspect ratio
    const aspectRatio = uploadedImage.height / uploadedImage.width;
    const targetHeight = Math.round(targetWidth * aspectRatio);
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Draw image scaled
    ctx.drawImage(uploadedImage, 0, 0, targetWidth, targetHeight);
    
    // Get pixel data
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const pixels = imageData.data;
    
    // Convert to our pixel format
    const newPixelColors = [...pixelColors];
    for (let row = 0; row < targetHeight && row < rows; row++) {
      for (let col = 0; col < targetWidth && col < cols; col++) {
        const imageIndex = (row * targetWidth + col) * 4;
        const r = pixels[imageIndex];
        const g = pixels[imageIndex + 1];
        const b = pixels[imageIndex + 2];
        const a = pixels[imageIndex + 3];
        
        // Convert to hex color (skip transparent pixels)
        if (a > 128) {
          const hex = '#' + 
            r.toString(16).padStart(2, '0') +
            g.toString(16).padStart(2, '0') +
            b.toString(16).padStart(2, '0');
          
          const pixelIndex = row * cols + col;
          newPixelColors[pixelIndex] = hex;
        }
      }
    }
    
    setPixelColors(newPixelColors);
    
    // Save to localStorage
    try {
      localStorage.setItem("pixelgrid_pixelColors", JSON.stringify(newPixelColors));
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }
    
    // Close dialog
    setShowImageScaleDialog(false);
    setUploadedImage(null);
  }

  // Track selection overlay element for rendering border around entire selection
  const selectionOverlayRef = useRef(null);
  const selectionBorderColorRef = useRef('#000000');
  
  // Calculate border color only when selection is finalized (not during drag)
  useEffect(() => {
    if (!isDrawing && selectionStart !== null && selectionEnd !== null && activeDrawingTool === "select") {
      const startRow = Math.floor(selectionStart / 200);
      const startCol = selectionStart % 200;
      const endRow = Math.floor(selectionEnd / 200);
      const endCol = selectionEnd % 200;
      
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      
      // Sample a few pixels to determine border color (not all pixels for performance)
      let totalBrightness = 0;
      let sampleCount = 0;
      const maxSamples = 100; // Limit samples for performance
      const rowStep = Math.max(1, Math.floor((maxRow - minRow + 1) / 10));
      const colStep = Math.max(1, Math.floor((maxCol - minCol + 1) / 10));
      
      for (let row = minRow; row <= maxRow && sampleCount < maxSamples; row += rowStep) {
        for (let col = minCol; col <= maxCol && sampleCount < maxSamples; col += colStep) {
          const index = row * 200 + col;
          const color = pixelColors[index];
          if (color && color.length >= 7) {
            const r = parseInt(color.substring(1, 3), 16);
            const g = parseInt(color.substring(3, 5), 16);
            const b = parseInt(color.substring(5, 7), 16);
            totalBrightness += (r + g + b) / 3;
          } else {
            totalBrightness += 255; // White pixels
          }
          sampleCount++;
        }
      }
      
      if (sampleCount > 0) {
        const avgBrightness = totalBrightness / sampleCount;
        selectionBorderColorRef.current = avgBrightness > 127 ? '#000000' : '#CCCCCC';
      }
    }
  }, [isDrawing, selectionStart, selectionEnd, activeDrawingTool, pixelColors]);
  
  // Update selection overlay position when selection changes
  useEffect(() => {
    const overlayEl = selectionOverlayRef.current;
    const gridEl = gridRef.current;
    if (!overlayEl || !gridEl) return;
    
    // Use hoveredPixel if actively selecting, otherwise use selectionEnd
    let effectiveEnd = selectionEnd;
    if (activeDrawingTool === "select" && isDrawing && hoveredPixel !== null) {
      effectiveEnd = hoveredPixel;
    }
    
    if (activeDrawingTool === "select" && selectionStart !== null && effectiveEnd !== null) {
      const startRow = Math.floor(selectionStart / 200);
      const startCol = selectionStart % 200;
      const endRow = Math.floor(effectiveEnd / 200);
      const endCol = effectiveEnd % 200;
      
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      
      // Calculate pixel positions for absolute positioning
      const top = minRow * displayPixelSize;
      const left = minCol * displayPixelSize;
      const width = (maxCol - minCol + 1) * displayPixelSize;
      const height = (maxRow - minRow + 1) * displayPixelSize;
      
      // Position overlay using absolute positioning
      overlayEl.style.top = `${top}vw`;
      overlayEl.style.left = `${left}vw`;
      overlayEl.style.width = `${width}vw`;
      overlayEl.style.height = `${height}vw`;
      overlayEl.style.border = `${0.2 * zoomFactor}vw dashed ${selectionBorderColorRef.current}`;
      overlayEl.style.display = 'block';
    } else {
      overlayEl.style.display = 'none';
    }
  }, [selectionStart, selectionEnd, hoveredPixel, activeDrawingTool, isDrawing, zoomFactor, displayPixelSize]);

  return (
    <div className="pixelgrid-container" style={{ width: "100vw", overflow: "hidden" }}>

      {/* TOP BAR */}
      <div style={{
        top: 0,
        left: 0,
        width: "100vw",
        height: "auto",
        background: "rgb(255, 255, 255)",
        borderBottomWidth: "0.3vw",
        borderBottomStyle: "solid",
        borderBottomColor: "rgb(0, 0, 0)",
        display: "grid",
        alignItems: "center",
        gridTemplateColumns: size.w <= 1024 
          ? `${logoPixelSize * 7}vw ${titlePixelSize * 4}vw ${titlePixelSize * 2}vw ${titlePixelSize * 4}vw ${titlePixelSize * 4}vw ${titlePixelSize * 3}vw ${titlePixelSize * 5}vw ${titlePixelSize * 4}vw ${titlePixelSize * 2}vw ${titlePixelSize * 4}vw .75vw 10vw 10vw 10vw 10vw`
          : `${logoPixelSize * 7}vw ${titlePixelSize * 4}vw ${titlePixelSize * 2}vw ${titlePixelSize * 4}vw ${titlePixelSize * 4}vw ${titlePixelSize * 3}vw ${titlePixelSize * 5}vw ${titlePixelSize * 4}vw ${titlePixelSize * 2}vw ${titlePixelSize * 4}vw .75vw 7.525vw 7.525vw 7.525vw 7.525vw`,
        zIndex: 20
      }}>
        <div className="logo" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(7, ${logoPixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${logoPixelSize}vw)`,
        }}>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
          
        </div>

        <div className="title-letter-1" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          padding: 0,
          width: `${titlePixelSize * 4}vw`
        }}>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
          </div>

        <div className="title-letter-2" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(2, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 2}vw`
        }}>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
        </div>

                <div className="title-letter-3" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 4}vw`
        }}>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
        </div>

        <div className="title-letter-4" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 4}vw`
        }}>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
        </div>

<div className="title-letter-5" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(3, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 3}vw`
        }}>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l"></div>
        </div>

 <div className="title-letter-6" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(5, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 5}vw`
        }}>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
        </div>
 <div className="title-letter-7" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 4}vw`
        }}>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r"></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r" style={{backgroundColor: "#000000"}}></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
        </div>
<div className="title-letter-8" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(2, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 2}vw`
        }}>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
        </div>

<div className="title-letter-9" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 4}vw`
        }}>
          <div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
        </div>
        <div className="title-pixel-padding"></div>

        {/* FILE BUTTON */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowFileMenu(v => !v)}
            style={{
              background: showFileMenu ? "#000" : "#fff",
              color: showFileMenu ? "#fff" : "#000",
              border: "0.2vw solid #000",
              width: "100%",
              cursor: "pointer",
              height: size.w <= 1024 ? "10vw" : "7vw",
              fontSize: "3vw"
            }}
          >
            File
          </button>

          {showFileMenu && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "#000",
              display: "grid",
              width: "100%",
              boxShadow: "0 0.6vw 2vw rgba(0,0,0,0.5)",
              zIndex: 30
            }}>
              <div
                onClick={() => {
                  setShowFileMenu(false);
                  saveToHTML();
                }}
                style={{
                  cursor: "pointer",
                  color: "white",
                  textAlign: "center",
                  fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                  width: size.w <= 1024 ? "10vw" : "7.5vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw"
                }}
              >
                Save HTML
              </div>

              <div
                onClick={() => {
                  setShowFileMenu(false);
                  saveToPNG();
                }}
                style={{
                  cursor: "pointer",
                  color: "white",
                  textAlign: "center",
                  fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                  width: size.w <= 1024 ? "10vw" : "7.5vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw"
                }}
              >
                Save PNG
              </div>

              <div
                onClick={() => {
                  setShowFileMenu(false);
                  saveToJPG();
                }}
                style={{
                  cursor: "pointer",
                  color: "white",
                  textAlign: "center",
                  fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                  width: size.w <= 1024 ? "10vw" : "7.5vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw"
                }}
              >
                Save JPG
              </div>

              <div
                onClick={() => {
                  setShowFileMenu(false);
                  // trigger hidden file input to load HTML file
                  fileInputRef.current && fileInputRef.current.click();
                }}
                style={{
                  cursor: "pointer",
                  color: "white",
                  textAlign: "center",
                  fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                  width: size.w <= 1024 ? "10vw" : "7.5vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw"
                }}
              >
                Load HTML
              </div>
              
              <div
                onClick={() => {
                  setShowFileMenu(false);
                  // trigger hidden image input to load PNG/JPG
                  imageInputRef.current && imageInputRef.current.click();
                }}
                style={{
                  cursor: "pointer",
                  color: "white",
                  textAlign: "center",
                  fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                  width: size.w <= 1024 ? "10vw" : "7.5vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw"
                }}
              >
                Load Image (PNG/JPG)
              </div>
              
              <div
                onClick={() => {
                  setShowFileMenu(false);
                  // trigger hidden background image input
                  backgroundInputRef.current && backgroundInputRef.current.click();
                }}
                style={{
                  cursor: "pointer",
                  color: "white",
                  textAlign: "center",
                  fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                  width: size.w <= 1024 ? "10vw" : "7.5vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw"
                }}
              >
                {backgroundImage ? "Change Background" : "Upload Background"}
              </div>
              
              {backgroundImage && (
                <div
                  onClick={() => {
                    removeBackgroundImage();
                    setShowFileMenu(false);
                  }}
                  style={{
                    cursor: "pointer",
                    color: "#ff9800",
                    textAlign: "center",
                    fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                    width: size.w <= 1024 ? "10vw" : "7.5vw",
                    borderBottom: "0.2vw solid #333",
                    padding: "0.5vw"
                  }}
                >
                  Remove Background
                </div>
              )}

              <div
                onClick={() => {
                  if (window.confirm("Clear all pixels, groups, and layers? This will also clear localStorage.")) {
                    // Set a flag to clear everything on reload
                    sessionStorage.setItem("pixelgrid_clearOnLoad", "true");
                    // Reload page - initialization will detect flag and clear everything
                    window.location.reload();
                  }
                  setShowFileMenu(false);
                }}
                style={{
                  cursor: "pointer",
                  color: "#f44336",
                  textAlign: "center",
                  fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                  width: size.w <= 1024 ? "10vw" : "7.5vw",
                  padding: "0.5vw"
                }}
              >
                Clear All
              </div>
            </div>
          )}
        </div>
        
        {/* VIEW BUTTON */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowViewMenu(v => !v)}
            style={{
              background: showViewMenu ? "#000" : "#fff",
              color: showViewMenu ? "#fff" : "#000",
              border: "0.2vw solid #000",
              width: "100%",
              cursor: "pointer",
              height: size.w <= 1024 ? "10vw" : "7vw",
              fontSize: "3vw"
            }}
          >
            View
          </button>

          {showViewMenu && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "#000",
              display: "grid",
              width: "100%",
              boxShadow: "0 0.6vw 2vw rgba(0,0,0,0.5)",
              zIndex: 30
            }}>
              <div
                onClick={() => {
                  setViewMode("drawing");
                  setShowViewMenu(false);
                  setActiveDrawingTool("pencil");
                }}
                style={{
                  cursor: "pointer",
                  color: viewMode === "drawing" ? "#4CAF50" : "white",
                  textAlign: "center",
                  fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                  width: size.w <= 1024 ? "10vw" : "7.5vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw",
                  fontWeight: viewMode === "drawing" ? "bold" : "normal"
                }}
              >
                Draw Mode
              </div>

              <div
                onClick={() => {
                  setViewMode("layers");
                  setShowViewMenu(false);
                  setActiveDrawingTool("select");
                  // Clear drag state
                  setGroupDragStart(null);
                  setGroupDragCurrent(null);
                  setIsDrawing(false);
                  dragStateRef.current.groupDragStart = null;
                  dragStateRef.current.groupDragCurrent = null;
                  dragStateRef.current.isDrawing = false;
                  dragStateRef.current.activeGroup = null;
                }}
                style={{
                  cursor: "pointer",
                  color: viewMode === "layers" ? "#4CAF50" : "white",
                  textAlign: "center",
                  fontSize: size.w <= 1024 ? "1.5vw" : "1.05vw",
                  width: size.w <= 1024 ? "10vw" : "7.5vw",
                  padding: "0.5vw",
                  fontWeight: viewMode === "layers" ? "bold" : "normal"
                }}
              >
                Layer Mode
              </div>
            </div>
          )}
        </div>
        
        {/* hidden file input used by Load action */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".html"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) loadFromHTML(f);
            // clear selection so same file can be reloaded if needed
            e.target.value = null;
          }}
        />
        
        {/* hidden file input for background image */}
        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) handleBackgroundUpload(f);
            // clear selection so same file can be reloaded if needed
            e.target.value = null;
          }}
        />
        
        {/* hidden file input for loading images as pixel art */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) loadImageAsPixelArt(f);
            // clear selection so same file can be reloaded if needed
            e.target.value = null;
          }}
        />
      </div>

      {/* SIDEBAR */}

<div className="grid-sidebar-wrapper" style={{display: "flex"}}>

      <div style={{
        background: "#fefefe",
        position: "relative",
        display: "grid",
        gridTemplateRows: "1fr auto",
        width: size.w <= 1024 ? "10vw" : "7vw",
        borderRight: "0.2vw solid #000000",
        height: "100vh"
      }}>
        {/* TOP SECTION - Tools and expandable menus */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1vw",
          alignItems: "center",
          overflowY: "auto",
          paddingBottom: "1vw",
          minHeight: "0"
        }}>
        {/* TOOLS SECTION */}
        <div style={{ width: "100%", textAlign: "center", paddingTop: "1vw" }}>
          <div style={{ color: "#000000", fontSize: "1.5vw", marginBottom: "0.5vw" }}><b>Tools</b></div>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: size.w <= 1024 ? "1fr" : "3.66vw 2.7vw",
            gap: size.w <= 1024 ? "0.2vw" : "0", 
            padding: "0",
            justifyItems: "center"
          }}>
            {/* Pencil Tool */}
            <button
              onClick={() => {
                setActiveDrawingTool("pencil");
                setViewMode("drawing");
                setLineStartPixel(null);
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "3vw",
                height: size.w <= 1024 ? "8vw" : "3vw",
                background: activeDrawingTool === "pencil" ? "#000" : "#fff",
                color: activeDrawingTool === "pencil" ? "white" : "black",
                border: "0.15vw solid #000000",
                padding: "0",
                cursor: "pointer",
                fontSize: size.w <= 1024 ? "4vw" : "1.2vw",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-paintbrush"></i>
            </button>
            
            {/* Eraser Tool */}
            <button
              onClick={() => {
                setActiveDrawingTool("eraser");
                setViewMode("drawing");
                setLineStartPixel(null);
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "3vw",
                height: size.w <= 1024 ? "8vw" : "3vw",
                background: activeDrawingTool === "eraser" ? "#000" : "#fff",
                color: activeDrawingTool === "eraser" ? "white" : "black",
                border: "0.15vw solid #000000",
                padding: "0",
                cursor: "pointer",
                fontSize: size.w <= 1024 ? "4vw" : "1.2vw",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-eraser"></i>
            </button>
            
            {/* Line Tool */}
            <button
              onClick={() => {
                setActiveDrawingTool("line");
                setViewMode("drawing");
                setLineStartPixel(null);
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "3vw",
                height: size.w <= 1024 ? "8vw" : "3vw",
                background: activeDrawingTool === "line" ? "#000" : "#fff",
                color: activeDrawingTool === "line" ? "white" : "black",
                border: "0.15vw solid #000000",
                padding: "0",
                cursor: "pointer",
                fontSize: size.w <= 1024 ? "4vw" : "1.2vw",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-slash"></i>
            </button>
            
            {/* Curve Tool */}
            <button
              onClick={() => {
                setActiveDrawingTool("curve");
                setViewMode("drawing");
                setLineStartPixel(null);
                setCurveEndPixel(null);
                setCurveCurveAmount(0);
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "3vw",
                height: size.w <= 1024 ? "8vw" : "3vw",
                background: activeDrawingTool === "curve" ? "#000" : "#fff",
                color: activeDrawingTool === "curve" ? "white" : "black",
                border: "0.15vw solid #000000",
                padding: "0",
                cursor: "pointer",
                fontSize: size.w <= 1024 ? "4vw" : "1.2vw",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-bezier-curve"></i>
            </button>
            
            {/* Bucket Tool */}
            <button
              onClick={() => {
                setActiveDrawingTool("bucket");
                setViewMode("drawing");
                setLineStartPixel(null);
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "3vw",
                height: size.w <= 1024 ? "8vw" : "3vw",
                background: activeDrawingTool === "bucket" ? "#000" : "#fff",
                color: activeDrawingTool === "bucket" ? "white" : "black",
                border: "0.15vw solid #000000",
                padding: "0",
                cursor: "pointer",
                fontSize: size.w <= 1024 ? "4vw" : "1.2vw",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-fill-drip"></i>
            </button>
            
            {/* Eyedropper Tool */}
            <button
              onClick={() => {
                setActiveDrawingTool("eyedropper");
                setViewMode("drawing");
                setLineStartPixel(null);
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "3vw",
                height: size.w <= 1024 ? "8vw" : "3vw",
                background: activeDrawingTool === "eyedropper" ? "#000" : "#fff",
                color: activeDrawingTool === "eyedropper" ? "white" : "black",
                border: "0.15vw solid #000000",
                padding: "0",
                cursor: "pointer",
                fontSize: size.w <= 1024 ? "4vw" : "1.2vw",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-eye-dropper"></i>
            </button>
            
            {/* Move Tool */}
            <button
              onClick={() => {
                setActiveDrawingTool("movegroup");
                setViewMode("layers");
                setLineStartPixel(null);
                setSelectionStart(null);
                setSelectionEnd(null);
                setShowLayersMenu(true);
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "3vw",
                height: size.w <= 1024 ? "8vw" : "3vw",
                background: activeDrawingTool === "movegroup" ? "#000" : "#fff",
                color: activeDrawingTool === "movegroup" ? "white" : "black",
                border: "0.15vw solid #000000",
                padding: "0",
                cursor: "pointer",
                fontSize: size.w <= 1024 ? "4vw" : "1.2vw",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-arrows-alt"></i>
            </button>
            
            {/* Select Tool */}
            <button
              onClick={() => {
                setActiveDrawingTool("select");
                setViewMode("layers");
                setLineStartPixel(null);
                setSelectionStart(null);
                setSelectionEnd(null);
                setShowLayersMenu(true);
                // Clear drag state
                setGroupDragStart(null);
                setGroupDragCurrent(null);
                setIsDrawing(false);
                dragStateRef.current.groupDragStart = null;
                dragStateRef.current.groupDragCurrent = null;
                dragStateRef.current.isDrawing = false;
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "3vw",
                height: size.w <= 1024 ? "8vw" : "3vw",
                background: activeDrawingTool === "select" ? "#000" : "#fff",
                color: activeDrawingTool === "select" ? "white" : "black",
                border: "0.15vw solid #000000",
                padding: "0",
                cursor: "pointer",
                fontSize: size.w <= 1024 ? "3vw" : "1.2vw",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-vector-square"></i>
            </button>
            
            {/* Layers Menu Toggle */}
            <button
              onClick={() => setShowLayersMenu(!showLayersMenu)}
              style={{
                width: size.w <= 1024 ? "8vw" : "3vw",
                height: size.w <= 1024 ? "8vw" : "3vw",
                background: showLayersMenu ? "#000" : "#fff",
                color: showLayersMenu ? "white" : "black",
                border: "0.15vw solid #000000",
                padding: "0",
                cursor: "pointer",
                fontSize: size.w <= 1024 ? "3vw" : "1.2vw",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-layer-group"></i>
            </button>
          </div>
        </div>
        
        {/* BACKGROUND OPACITY CONTROL */}
        {backgroundImage && (
          <div style={{
            width: "100%",
            padding: "1vw",
            borderTop: "0.2vw solid #ddd",
          }}>
            <div style={{ 
              color: "#000000", 
              fontSize: "1.5vw", 
              marginBottom: "0.5vw",
              textAlign: "center"
            }}>
              <b>Background Opacity</b>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={backgroundOpacity}
              onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
              style={{
                width: "100%",
                cursor: "pointer"
              }}
            />
            <div style={{
              textAlign: "center",
              fontSize: "1.2vw",
              color: "#666",
              marginTop: "0.3vw",
              marginBottom: "1vw"
            }}>
              {Math.round(backgroundOpacity * 100)}%
            </div>
            
            <div style={{ 
              color: "#000000", 
              fontSize: "1.5vw", 
              marginBottom: "0.5vw",
              textAlign: "center"
            }}>
              <b>Background Scale</b>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={backgroundScale}
              onChange={(e) => setBackgroundScale(parseFloat(e.target.value))}
              style={{
                width: "100%",
                cursor: "pointer"
              }}
            />
            <div style={{
              textAlign: "center",
              fontSize: "1.2vw",
              color: "#666",
              marginTop: "0.3vw"
            }}>
              {Math.round(backgroundScale * 100)}%
            </div>
          </div>
        )}
        </div>
        
        {/* BOTTOM SECTION - Primary and Secondary Colors (Always Visible) */}
        <div style={{
          display: "grid",
          gridTemplateRows: "auto auto",
          gridTemplateColumns: size.w <= 1024 ? "10vw" : "7vw",
          gap: "0",
          width: "100%",
          borderTop: "0.2vw solid #000000",
          marginBottom: size.w <= 1024 ? "21vw" : "8vw"
        }}>
          {/* PRIMARY COLOR */}
          <div style={{ 
            width: "100%", 
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.5vw",
            borderBottom: "0.1vw solid #ddd"
          }}>
            <div style={{ color: "#000000", fontSize: "1.2vw", marginBottom: "0.3vw" }}><b>Primary</b></div>
            <div
              onClick={() => {
                if (activeTool === "primary") {
                  setEditingColor("primary");
                  setShowColorEditor(true);
                } else {
                  setActiveTool("primary");
                }
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "5vw",
                height: size.w <= 1024 ? "8vw" : "5vw",
                background: primaryColor,
                border: activeTool === "primary" 
                  ? (isLightColor(primaryColor) ? "0.4vw solid #000000" : "0.4vw solid #ffffff")
                  : (isLightColor(primaryColor) ? "0.3vw solid #000000" : "0.3vw solid #ffffff"),
                cursor: "pointer",
                boxShadow: activeTool === "primary" 
                  ? "0 0 1vw rgba(0,0,0,1)"
                  : "none",
              }}
            />
          </div>

          {/* SECONDARY COLOR */}
          <div style={{ 
            width: "100%", 
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.5vw"
          }}>
            <div style={{ color: "#000000", fontSize: "1.2vw", marginBottom: "0.3vw" }}><b>Secondary</b></div>
            <div
              onClick={() => {
                if (activeTool === "secondary") {
                  setEditingColor("secondary");
                  setShowColorEditor(true);
                } else {
                  setActiveTool("secondary");
                }
              }}
              style={{
                width: size.w <= 1024 ? "8vw" : "5vw",
                height: size.w <= 1024 ? "8vw" : "5vw",
                background: secondaryColor,
                border: activeTool === "secondary" 
                  ? (isLightColor(secondaryColor) ? "0.4vw solid #000000" : "0.4vw solid #ffffff")
                  : (isLightColor(secondaryColor) ? "0.3vw solid #000000" : "0.3vw solid #ffffff"),
                cursor: "pointer",
                boxShadow: activeTool === "secondary" 
                  ? "0 0 1vw rgba(0,0,0,1)" 
                  : "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* GRID CONTAINER WITH BACKGROUND */}
      <div style={{
        position: "relative",
        flex: 1,
        overflow: "hidden"
      }}>
        {/* BACKGROUND IMAGE LAYER - Fixed to viewport */}
        {backgroundImage && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            pointerEvents: "none",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            overflow: "hidden",
            padding: 0
          }}>
            <img
              src={backgroundImage}
              alt="Background"
              style={{
                maxWidth: "none",
                maxHeight: "none",
                width: `${100 * backgroundScale}%`,
                height: "auto",
                objectFit: "contain",
                objectPosition: "top left",
                opacity: backgroundOpacity
              }}
            />
          </div>
        )}
        
        {/* GRID - Scrollable with transparent background */}
        <div 
          ref={gridRef}
          data-pixel-grid="true"
          onScroll={(e) => {
            if (size.w <= 1024) {
              setScrollPosition(e.target.scrollLeft);
            }
          }}
          onPointerDown={(e) => {
            // If click didn't hit a pixel directly (e.g., clicked on grid gap/border),
            // find the pixel at this location and trigger its handler
            if (!e.target.hasAttribute('data-pixel-index')) {
              console.log("=== GRID DELEGATION START ===", { 
                hasGridRef: !!gridRef.current, 
                target: e.target.tagName,
                targetHasIndex: e.target.hasAttribute('data-pixel-index')
              });
              
              if (!gridRef.current) {
                console.error("Grid ref is null!");
                return;
              }
              
              const rect = gridRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left + gridRef.current.scrollLeft;
              const y = e.clientY - rect.top + gridRef.current.scrollTop;
              
              // Convert viewport units to pixels
              const pixelSizeInPx = (displayPixelSize * window.innerWidth) / 100;
              const col = Math.floor(x / pixelSizeInPx);
              const row = Math.floor(y / pixelSizeInPx);
              
              console.log("Calculated position:", { row, col, x, y, pixelSizeInPx, displayPixelSize });
              
              if (row >= 0 && row < rows && col >= 0 && col < 200) {
                const pixelIndex = row * 200 + col;
                console.log("Grid click delegated to pixel:", pixelIndex, { row, col, x, y });
                
                // Instead of trying to find and click the DOM element, 
                // just execute the pixel's click logic directly
                if (activeDrawingTool === "select") {
                  console.log("=== DELEGATED PIXEL CLICK ===", { 
                    pixel: pixelIndex, 
                    tool: activeDrawingTool, 
                    width: size.w, 
                    isSelected: selectedPixels.includes(pixelIndex) 
                  });
                  
                  // Check for mobile two-click mode first
                  if (size.w <= 1024) {
                    if (selectedPixels.includes(pixelIndex)) {
                      // Clicking on already selected pixel - enable drag-to-move
                      e.preventDefault();
                      console.log("Mobile (delegated): Starting drag on selected pixel", pixelIndex);
                      const startRow = Math.floor(pixelIndex / 200);
                      const startCol = pixelIndex % 200;
                      const dragState = { pixelIndex, startRow, startCol };
                      
                      console.log("DRAG INIT DEBUG (delegated):", { 
                        clickedPixel: pixelIndex, 
                        startRow, 
                        startCol, 
                        selectedPixels: selectedPixels.slice(0, 5),
                        selectedPixelsLength: selectedPixels.length
                      });
                      
                      // Update ref immediately BEFORE flushSync
                      dragStateRef.current.activeGroup = "__selected__";
                      dragStateRef.current.groupDragStart = dragState;
                      dragStateRef.current.groupDragCurrent = null;
                      dragStateRef.current.isDrawing = true;
                      
                      // Set all drag state AND force render in single flushSync block
                      flushSync(() => {
                        setActiveGroup("__selected__");
                        setGroupDragStart(dragState);
                        setGroupDragCurrent(null);
                        setIsDrawing(true);
                        setRenderTrigger(prev => prev + 1); // Forces immediate render
                      });
                      
                      console.log("Mobile drag initialized (delegated):", { startRow, startCol, activeGroup: "__selected__" });
                      console.log(">>> IMMEDIATELY AFTER flushSync - ref state:", dragStateRef.current);
                      console.log(">>> IMMEDIATELY AFTER flushSync - ref state:", dragStateRef.current);
                    } else if (selectionStart === null) {
                      // First click: set selection start
                      console.log("Mobile first click (delegated) - setting selection start to", pixelIndex);
                      setSelectionStart(pixelIndex);
                      setSelectionEnd(null);
                      setSelectedPixels([]);
                    }
                  } else {
                    // Desktop mode
                    if (selectedPixels.includes(pixelIndex)) {
                      // Clicking on selected pixel - start drag
                      const startRow = Math.floor(pixelIndex / 200);
                      const startCol = pixelIndex % 200;
                      const dragState = { pixelIndex, startRow, startCol, clientX: e.clientX, clientY: e.clientY };
                      
                      console.log("DRAG INIT DEBUG (delegated, desktop):", { 
                        clickedPixel: pixelIndex, 
                        startRow, 
                        startCol, 
                        selectedPixels: selectedPixels.slice(0, 5),
                        selectedPixelsLength: selectedPixels.length
                      });
                      
                      // Update ref immediately BEFORE flushSync
                      dragStateRef.current.activeGroup = "__selected__";
                      dragStateRef.current.groupDragStart = dragState;
                      dragStateRef.current.groupDragCurrent = null;
                      dragStateRef.current.isDrawing = true;
                      
                      // Set all drag state AND force render in single flushSync block
                      flushSync(() => {
                        setActiveGroup("__selected__");
                        setGroupDragStart(dragState);
                        setGroupDragCurrent(null);
                        setIsDrawing(true);
                        setRenderTrigger(prev => prev + 1); // Forces immediate render
                      });
                      
                      console.log(">>> IMMEDIATELY AFTER flushSync (desktop) - ref state:", dragStateRef.current);
                      
                      console.log("Desktop drag initialized (delegated):", { startRow, startCol, activeGroup: "__selected__" });
                    } else {
                      // Start new selection
                      setSelectionStart(pixelIndex);
                      setSelectionEnd(pixelIndex);
                      setSelectedPixels([]);
                      setIsDrawing(true);
                    }
                  }
                }
                // MOVEGROUP TOOL DELEGATION - Handle move tool clicks that miss pixel directly
                else if (activeDrawingTool === "movegroup") {
                  console.log("=== DELEGATED MOVEGROUP CLICK ===", { 
                    pixel: pixelIndex, 
                    tool: activeDrawingTool, 
                    isSelected: selectedPixels.includes(pixelIndex),
                    hasPixelGroup: !!pixelGroups[pixelIndex]
                  });
                  
                  if (selectedPixels.includes(pixelIndex)) {
                    // Clicking on selected pixel - start drag to move
                    const startRow = Math.floor(pixelIndex / 200);
                    const startCol = pixelIndex % 200;
                    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                    const dragState = { pixelIndex, startRow, startCol, clientX, clientY };
                    
                    console.log("DELEGATED: Starting drag on selected pixels", { 
                      pixelIndex, 
                      startRow, 
                      startCol,
                      selectedCount: selectedPixels.length
                    });
                    
                    // Update ref immediately BEFORE state updates
                    dragStateRef.current.activeGroup = "__selected__";
                    dragStateRef.current.groupDragStart = dragState;
                    dragStateRef.current.groupDragCurrent = null;
                    dragStateRef.current.isDrawing = true;
                    dragStateRef.current.selectedPixels = selectedPixels;
                    
                    flushSync(() => {
                      setActiveGroup("__selected__");
                      setGroupDragStart(dragState);
                      setGroupDragCurrent(null);
                      setIsDrawing(true);
                      setRenderTrigger(prev => prev + 1);
                    });
                  } else if (pixelGroups[pixelIndex]) {
                    // Clicking on a grouped pixel - start drag to move that layer
                    const pixelGroup = pixelGroups[pixelIndex];
                    const startRow = Math.floor(pixelIndex / 200);
                    const startCol = pixelIndex % 200;
                    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                    
                    console.log("DELEGATED: Starting drag on layer", pixelGroup.group);
                    
                    setActiveGroup(pixelGroup.group);
                    setGroupDragStart({ pixelIndex, startRow, startCol, clientX, clientY });
                    setIsDrawing(true);
                  } else if (selectedPixels.length > 0) {
                    // Clicking on empty space but have selected pixels - move __selected__ layer
                    const startRow = Math.floor(pixelIndex / 200);
                    const startCol = pixelIndex % 200;
                    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                    const dragState = { pixelIndex, startRow, startCol, clientX, clientY };
                    
                    console.log("DELEGATED: Moving __selected__ from empty space", { 
                      pixelIndex, 
                      selectedCount: selectedPixels.length
                    });
                    
                    // Update ref immediately BEFORE state updates
                    dragStateRef.current.activeGroup = "__selected__";
                    dragStateRef.current.groupDragStart = dragState;
                    dragStateRef.current.groupDragCurrent = null;
                    dragStateRef.current.isDrawing = true;
                    dragStateRef.current.selectedPixels = selectedPixels;
                    
                    flushSync(() => {
                      setActiveGroup("__selected__");
                      setGroupDragStart(dragState);
                      setGroupDragCurrent(null);
                      setIsDrawing(true);
                      setRenderTrigger(prev => prev + 1);
                    });
                  }
                }
              } else {
                console.log("Click outside grid bounds:", { row, col, rows, maxRow: rows - 1 });
              }
            } else {
              console.log("Click hit pixel directly:", e.target.getAttribute('data-pixel-index'));
            }
          }}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(200, ${displayPixelSize}vw)`,
            gridTemplateRows: `repeat(${rows}, ${displayPixelSize}vw)`,
            userSelect: "none",
            position: "relative",
            zIndex: 1,
            overflow: "auto",
            scrollBehavior: "auto",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            willChange: "transform",
            height: "100%",
            width: "100%",
            background: "transparent",
            cursor: activeDrawingTool === "select" ? "crosshair" : "default",
            touchAction: activeDrawingTool === "movegroup" ? "none" : "auto"
          }}>
        
        {/* Selection overlay - absolute positioned inside grid to scroll with content */}
        <div 
          ref={selectionOverlayRef}
          style={{
            display: 'none',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            position: 'absolute',
            zIndex: 100,
            cursor: 'crosshair'
          }}
        />
        
        {(pixelColors || []).map((c, i) => {
          // Get the actual display color based on highest z-index from localStorage
          const displayC = getPixelDisplayColor(i);
          
          // Check if this pixel should be transformed (part of __selected__ layer being moved)
          const selectedLayer = groups.find(g => g.name === "__selected__");
          
          const isInSelectedLayer = selectedLayer && selectedLayer.originalSelectionArea && 
                                    selectedLayer.originalSelectionArea.includes(i);
          
          // Completely isolate drawing mode from layer calculations for performance
          if (viewMode === "drawing") {
            // DRAWING MODE - Minimal calculations for maximum performance
            
            const isHovered = hoveredPixel === i;
            const isLineStart = (activeDrawingTool === "line" || activeDrawingTool === "curve") && lineStartPixel === i;
            const isCurveEnd = activeDrawingTool === "curve" && curveEndPixel === i;
            const isSelected = selectedPixels.includes(i);
            // Don't show individual pixel borders for select tool - overlay handles it
            const isInSelectionRect = activeGroup !== null && activeGroup !== "__selected__" && 
                pixelGroups[i]?.group === activeGroup;
            const isSelectionStartPoint = activeDrawingTool === "select" && selectionStart === i && selectionEnd === null && size.w <= 1024;
            
            // Line/curve preview calculations - use fixed end when chosen, otherwise hover
            let isInLinePreview = false;
            if (activeDrawingTool === "line" && lineStartPixel !== null) {
              const previewTarget = lineEndPixel !== null ? lineEndPixel : hoveredPixel;
              if (previewTarget !== null && previewTarget !== lineStartPixel) {
                isInLinePreview = getLinePixels(lineStartPixel, previewTarget).includes(i);
              }
            } else if (activeDrawingTool === "curve" && lineStartPixel !== null) {
              if (curveEndPixel !== null) {
                // Curve adjustment mode - show bezier curve
                isInLinePreview = getQuadraticBezierPixels(lineStartPixel, curveEndPixel, curveCurveAmount).includes(i);
              } else {
                // Waiting for second point - show straight line preview
                const previewTarget = hoveredPixel;
                if (previewTarget !== null && previewTarget !== lineStartPixel) {
                  isInLinePreview = getLinePixels(lineStartPixel, previewTarget).includes(i);
                }
              }
            }
            
            // Calculate preview position during selected pixels drag
            // Use ref values to get immediate updates, not state (which updates async)
            const dragState = dragStateRef.current;
            let isInDragPreview = false;
            let dragPreviewColor = displayC;
            
            // Only show drag preview when using movegroup tool
            if (activeDrawingTool === "movegroup" && dragState.groupDragStart !== null && dragState.activeGroup === "__selected__" && dragState.isDrawing) {
              // Calculate which source pixel should appear at this position
              const currentDragPos = dragState.groupDragCurrent || { row: dragState.groupDragStart.startRow, col: dragState.groupDragStart.startCol };
              const deltaRow = currentDragPos.row - dragState.groupDragStart.startRow;
              const deltaCol = currentDragPos.col - dragState.groupDragStart.startCol;
              const currentRow = Math.floor(i / 200);
              const currentCol = i % 200;
              const sourceRow = currentRow - deltaRow;
              const sourceCol = currentCol - deltaCol;
              const sourceIndex = sourceRow * 200 + sourceCol;
              isInDragPreview = dragState.selectedPixels.includes(sourceIndex);
              
              if (isInDragPreview) {
                // Use source pixel display color
                dragPreviewColor = getPixelDisplayColor(sourceIndex);
              }
            }
            
            // Make white pixels transparent when background image is loaded
            // Also support transparent pixels in layers (null values)
            const displayColor = isInDragPreview ? dragPreviewColor : displayC;
            let pixelColor = displayColor;
            
            // Check if this pixel should be transparent due to background or layer transparency
            if (backgroundImage && displayColor === '#ffffff') {
              pixelColor = 'transparent';
            } else if (displayColor === null || displayColor === 'null') {
              // null in layer means transparent but still clickable
              pixelColor = 'transparent';
            }
            
            return (
              <DrawingPixel
                key={i}
                color={pixelColor}
                index={i}
                isHovered={isHovered}
                isLineStart={isLineStart}
                isCurveEnd={isCurveEnd}
                isInLinePreview={isInLinePreview}
                isSelected={isSelected}
                isInSelectionRect={isInSelectionRect}
                isSelectionStartPoint={isSelectionStartPoint}
                isInDragPreview={isInDragPreview}
                isDrawing={isDrawing}
                zoomFactor={zoomFactor}
                activeDrawingTool={activeDrawingTool}
                onPointerDown={(e) => {
                  console.log("=== POINTER DOWN ===", { pixel: i, tool: activeDrawingTool, width: size.w, isSelected: selectedPixels.includes(i) });
                  if (activeDrawingTool === "select") {
                    // Select tool only creates rectangular selections - no moving
                    if (size.w <= 1024) {
                      // Mobile two-click selection mode
                      if (selectionStart === null) {
                        // First click: set selection start
                        console.log("Mobile first click - setting selection start to", i);
                        setActiveGroup(null);
                        setSelectionStart(i);
                        setSelectionEnd(null);
                        setSelectedPixels([]);
                        setIsDrawing(true); // Enable drag preview
                      } else {
                        // Second click: finalize selection
                        console.log("Mobile second click - finalizing selection from", selectionStart, "to", i);
                        setSelectionEnd(i);
                        const selected = getSelectionPixels(selectionStart, i);
                        console.log("Selected pixels:", selected);
                        setSelectedPixels(selected);
                        setSelectionStart(null);
                        setSelectionEnd(null);
                        setIsDrawing(false); // Stop drawing after finalizing
                      }
                    } else {
                      // Desktop mode - drag to create rectangular selection
                      setActiveGroup(null);
                      setSelectionStart(i);
                      setSelectionEnd(i);
                      setSelectedPixels([]);
                      setIsDrawing(true);
                    }
                  } else if (activeDrawingTool === "movegroup") {
                    // Move tool: click and drag to move selected pixels or grouped layers
                    if (selectedPixels.includes(i)) {
                      console.log("=== MOVEGROUP START (selected pixel) ===", { 
                        pixel: i, 
                        isMobile: size.w <= 1024,
                        selectedPixelsCount: selectedPixels.length,
                        hasTouch: !!e.touches,
                        clientX: e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : undefined)
                      });
                      
                      // Clicking on selected pixel - start drag to move
                      const startRow = Math.floor(i / 200);
                      const startCol = i % 200;
                      // Handle both mouse and touch events
                      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                      const dragState = { pixelIndex: i, startRow, startCol, clientX, clientY };
                      
                      console.log("=== DRAG STATE CREATED ===", dragState);
                      
                      setActiveGroup("__selected__");
                      setGroupDragStart(dragState);
                      setGroupDragCurrent(null);
                      setIsDrawing(true);
                      
                      // Update ref for immediate access
                      dragStateRef.current.activeGroup = "__selected__";
                      dragStateRef.current.groupDragStart = dragState;
                      dragStateRef.current.groupDragCurrent = null;
                      dragStateRef.current.isDrawing = true;
                      dragStateRef.current.selectedPixels = selectedPixels;
                      
                      console.log("=== REF UPDATED ===", dragStateRef.current);
                    } else if (pixelGroups[i]) {
                      // Clicking on a grouped pixel - start drag to move that layer
                      const pixelGroup = pixelGroups[i];
                      const startRow = Math.floor(i / 200);
                      const startCol = i % 200;
                      // Handle both mouse and touch events
                      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                      
                      setActiveGroup(pixelGroup.group);
                      setGroupDragStart({ pixelIndex: i, startRow, startCol, clientX, clientY });
                      setIsDrawing(true);
                    } else if (selectedPixels.length > 0) {
                      // Clicking on empty space but have selected pixels - move __selected__ layer
                      const startRow = Math.floor(i / 200);
                      const startCol = i % 200;
                      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                      const dragState = { pixelIndex: i, startRow, startCol, clientX, clientY };
                      
                      console.log("=== MOVEGROUP START (empty space, moving __selected__) ===", { 
                        pixel: i, 
                        selectedPixelsCount: selectedPixels.length
                      });
                      
                      setActiveGroup("__selected__");
                      setGroupDragStart(dragState);
                      setGroupDragCurrent(null);
                      setIsDrawing(true);
                      
                      // Update ref for immediate access
                      dragStateRef.current.activeGroup = "__selected__";
                      dragStateRef.current.groupDragStart = dragState;
                      dragStateRef.current.groupDragCurrent = null;
                      dragStateRef.current.isDrawing = true;
                      dragStateRef.current.selectedPixels = selectedPixels;
                    }
                  } else if (activeDrawingTool === "pencil") {
                    setIsDrawing(true);
                    paintPixel(e, i);
                  } else if (activeDrawingTool === "eraser") {
                    setIsDrawing(true);
                    erasePixel(e, i);
                  } else if (activeDrawingTool === "eyedropper") {
                    // Pick color from clicked pixel
                    const pixelGroup = pixelGroups[i];
                    let pickedColor = null;
                    
                    if (pixelGroup) {
                      // Get color from layer
                      const layer = groups.find(g => g.name === pixelGroup.group);
                      if (layer && layer.pixels && layer.pixels[i]) {
                        pickedColor = layer.pixels[i];
                      }
                    } else {
                      // Get color from base pixels
                      pickedColor = pixelColors[i];
                    }
                    
                    if (pickedColor) {
                      // Set color based on active tool (primary or secondary)
                      if (activeTool === "secondary") {
                        setSecondaryColor(pickedColor);
                      } else {
                        setPrimaryColor(pickedColor);
                      }
                    }
                  } else if (activeDrawingTool === "bucket") {
                    paintBucket(i);
                  } else if (activeDrawingTool === "line") {
                    console.log("=== LINE TOOL CLICK ===", { 
                      pixelIndex: i, 
                      lineStartPixel, 
                      lineEndPixel,
                      hoveredPixel,
                      screenWidth: size.w 
                    });
                    if (lineStartPixel === null) {
                      // First click: set start point
                      console.log("Setting line start point:", i);
                      setLineStartPixel(i);
                      setLineEndPixel(null);
                      setHoveredPixel(i);
                    } else if (lineStartPixel === i) {
                      // Clicking same pixel - cancel
                      console.log("Canceling line (same pixel)");
                      setLineStartPixel(null);
                      setLineEndPixel(null);
                    } else {
                      // Second click: set endpoint and show apply menu (both mobile and desktop)
                      console.log("Setting line endpoint:", i, "- showing apply menu");
                      setLineEndPixel(i);
                      setHoveredPixel(i);
                    }
                  } else if (activeDrawingTool === "curve") {
                    console.log("=== CURVE TOOL CLICK ===", { 
                      pixelIndex: i, 
                      lineStartPixel, 
                      curveEndPixel,
                      hoveredPixel,
                      screenWidth: size.w 
                    });
                    if (lineStartPixel === null) {
                      // First click: set start point
                      console.log("Setting curve start point:", i);
                      setLineStartPixel(i);
                      setCurveEndPixel(null);
                      setHoveredPixel(i);
                    } else if (lineStartPixel === i) {
                      // Clicking same pixel - cancel
                      console.log("Canceling curve (same pixel)");
                      setLineStartPixel(null);
                      setCurveEndPixel(null);
                    } else {
                      // Second click: enter adjustment mode (both mobile and desktop)
                      console.log("Setting curve endpoint:", i);
                      setCurveEndPixel(i);
                      setHoveredPixel(i);
                    }
                  }
                }}
                onPointerUp={() => {
                  if (activeDrawingTool === "select") {
                    // Desktop mode - finalize drag selection
                    if (size.w > 1024 && selectionStart !== null && selectionEnd !== null) {
                      const selected = getSelectionPixels(selectionStart, selectionEnd);
                      setSelectedPixels(selected);
                      setSelectionStart(null);
                      setSelectionEnd(null);
                      setIsDrawing(false);
                    }
                  } else if (activeDrawingTool === "movegroup" && groupDragStart !== null && activeGroup !== null) {
                    // Finalize movegroup tool drag
                    // Use groupDragCurrent if available, otherwise use current pixel position
                    let deltaRow, deltaCol;
                    if (groupDragCurrent) {
                      deltaRow = groupDragCurrent.row - groupDragStart.startRow;
                      deltaCol = groupDragCurrent.col - groupDragStart.startCol;
                    } else {
                      const currentRow = Math.floor(i / 200);
                      const currentCol = i % 200;
                      deltaRow = currentRow - groupDragStart.startRow;
                      deltaCol = currentCol - groupDragStart.startCol;
                    }
                    
                    if (deltaRow !== 0 || deltaCol !== 0) {
                      if (activeGroup === "__selected__") {
                        // Move selected pixels
                        moveSelectedPixels(deltaRow, deltaCol, selectedPixels);
                      } else {
                        // Move grouped layer
                        moveGroup(activeGroup, deltaRow, deltaCol);
                      }
                    }
                    
                    setGroupDragStart(null);
                    setGroupDragCurrent(null);
                    setIsDrawing(false);
                    // Keep layer selected after move
                  }
                }}
                onPointerEnter={() => {
                  if (activeDrawingTool === "select") {
                    // Mobile preview - show rectangle when hovering after first click
                    if (size.w <= 1024 && selectionStart !== null && selectionEnd === null) {
                      setSelectionEnd(i);
                    }
                    // Desktop drag selection
                    else if (size.w > 1024 && isDrawing && selectionStart !== null) {
                      setSelectionEnd(i);
                    }
                  } else if (activeDrawingTool === "movegroup" && groupDragStart !== null && activeGroup !== null && isDrawing) {
                    // Track current drag position for visual feedback (only in ref, no re-render)
                    const currentRow = Math.floor(i / 200);
                    const currentCol = i % 200;
                    let deltaRow = currentRow - groupDragStart.startRow;
                    let deltaCol = currentCol - groupDragStart.startCol;
                    
                    // Clamp delta to prevent moving outside bounds
                    const selectedLayer = groups.find(g => g.name === "__selected__");
                    if (selectedLayer && selectedLayer.originalPixelIndices) {
                      // Calculate min/max row/col from originalPixelIndices
                      let minRow = rows, maxRow = 0, minCol = 200, maxCol = 0;
                      selectedLayer.originalPixelIndices.forEach(idx => {
                        const r = Math.floor(idx / 200);
                        const c = idx % 200;
                        minRow = Math.min(minRow, r);
                        maxRow = Math.max(maxRow, r);
                        minCol = Math.min(minCol, c);
                        maxCol = Math.max(maxCol, c);
                      });
                      
                      // Clamp deltaRow and deltaCol to keep selection within bounds
                      const maxDeltaRowUp = -minRow;
                      const maxDeltaRowDown = rows - 1 - maxRow;
                      const maxDeltaColLeft = -minCol;
                      const maxDeltaColRight = 200 - 1 - maxCol;
                      
                      deltaRow = Math.max(maxDeltaRowUp, Math.min(maxDeltaRowDown, deltaRow));
                      deltaCol = Math.max(maxDeltaColLeft, Math.min(maxDeltaColRight, deltaCol));
                    }
                    
                    // Update ref for onPointerUp
                    dragStateRef.current.groupDragCurrent = { row: currentRow, col: currentCol };
                    
                    // Update transform for CSS preview
                    setSelectionTransform({ deltaRow, deltaCol, active: true });
                  } else if (isDrawing && activeDrawingTool === "pencil") {
                    paintPixel(null, i);
                  } else if (isDrawing && activeDrawingTool === "eraser") {
                    erasePixel(null, i);
                  } else if (activeDrawingTool === "eyedropper") {
                    // Pick color on pointer move when drawing (dragging)
                    if (isDrawing) {
                      const pixelGroup = pixelGroups[i];
                      let pickedColor = null;
                      
                      if (pixelGroup) {
                        const layer = groups.find(g => g.name === pixelGroup.group);
                        if (layer && layer.pixels && layer.pixels[i]) {
                          pickedColor = layer.pixels[i];
                        }
                      } else {
                        pickedColor = pixelColors[i];
                      }
                      
                      if (pickedColor) {
                        // Set color based on active tool (primary or secondary)
                        if (activeTool === "secondary") {
                          setSecondaryColor(pickedColor);
                        } else {
                          setPrimaryColor(pickedColor);
                        }
                      }
                    }
                  }
                  
                  // Note: groupDragCurrent for selected pixels move is now handled by global pointermove handler
                  // for more accurate cursor-to-pixel mapping
                  
                  setHoveredPixel(i);
                }}
                onPointerMove={() => {
                  if (hoveredPixel !== i) {
                    setHoveredPixel(i);
                  }
                  
                  // Track current drag position for movegroup tool (only in ref, no re-render)
                  if (activeDrawingTool === "movegroup" && groupDragStart !== null && activeGroup !== null && isDrawing) {
                    const currentRow = Math.floor(i / 200);
                    const currentCol = i % 200;
                    const deltaRow = currentRow - groupDragStart.startRow;
                    const deltaCol = currentCol - groupDragStart.startCol;
                    
                    // Update ref for onPointerUp
                    dragStateRef.current.groupDragCurrent = { row: currentRow, col: currentCol };
                    
                    // Update transform for CSS preview
                    setSelectionTransform({ deltaRow, deltaCol, active: true });
                  }
                  
                  // Mobile-specific: update selection rectangle during drag (select tool only)
                  if (activeDrawingTool === "select" && size.w <= 1024 && isDrawing && selectionStart !== null) {
                    setSelectionEnd(i);
                  }
                }}
                onPointerLeave={() => {
                  // Clear mobile selection preview when leaving pixel (but not during active drag)
                  if (activeDrawingTool === "select" && size.w <= 1024 && selectionStart !== null && selectedPixels.length === 0 && !isDrawing) {
                    setSelectionEnd(null);
                  }
                  
                  // For line/curve preview, keep hover when endpoints are selected
                  const lineToolActive = activeDrawingTool === "line" && (lineStartPixel !== null || lineEndPixel !== null);
                  const curveToolActive = activeDrawingTool === "curve" && (lineStartPixel !== null || curveEndPixel !== null);
                  
                  if (!(lineToolActive || curveToolActive)) {
                    setHoveredPixel(null);
                  }
                }}
              />
            );
          }
          
          // LAYERS MODE - Full layer functionality
          const pixelGroup = pixelGroups[i];
          const isLineStart = (activeDrawingTool === "line" || activeDrawingTool === "curve") && lineStartPixel === i;
          const isCurveEnd = activeDrawingTool === "curve" && curveEndPixel === i;
          
          // Only calculate these in layers mode
          const isSelected = selectedPixels.includes(i);
          const isInSelectionRect = (() => {
            // Don't show individual pixel borders for select tool - overlay handles it
            // Only show active group highlight for other tools
            return activeGroup !== null && activeGroup !== "__selected__" && 
              pixelGroup?.group === activeGroup;
          })();
          const isSelectionStartPoint = activeDrawingTool === "select" && selectionStart === i && selectionEnd === null && size.w <= 1024;
          const isInActiveGroup = (pixelGroup && pixelGroup.group === activeGroup) || (activeGroup === "__selected__" && selectedPixels.includes(i));
          
          // Hover styles - ONLY for move tool (select tool should not show hover on pixels)
          const isMoveGroupHover = activeDrawingTool === "movegroup" && !isDrawing && (pixelGroup || selectedPixels.includes(i)) && hoveredPixel === i;
          
          // Select tool should NOT show any hover effects on individual pixels
          
          // Calculate preview position during group drag (only for non-__selected__ layers or when transform is not active)
          let isInDragPreview = false;
          if (activeDrawingTool === "movegroup" && groupDragStart !== null && groupDragCurrent !== null && activeGroup !== null && isDrawing && !selectionTransform.active) {
            // Legacy preview for layers that don't use dynamic CSS transforms
            const deltaRow = groupDragCurrent.row - groupDragStart.startRow;
            const deltaCol = groupDragCurrent.col - groupDragStart.startCol;
            const currentRow = Math.floor(i / 200);
            const currentCol = i % 200;
            const sourceRow = currentRow - deltaRow;
            const sourceCol = currentCol - deltaCol;
            const sourceIndex = sourceRow * 200 + sourceCol;
            if (activeGroup === "__selected__") {
              isInDragPreview = selectedPixels.includes(sourceIndex);
            } else {
              isInDragPreview = pixelGroups[sourceIndex]?.group === activeGroup;
            }
          }
          
          // Show straight line preview or curve preview (only in drawing mode for performance)
          let isInLinePreview = false;
          if (activeDrawingTool === "line" && lineStartPixel !== null) {
            const previewTarget = lineEndPixel !== null ? lineEndPixel : hoveredPixel;
            if (previewTarget !== null && previewTarget !== lineStartPixel) {
              isInLinePreview = getLinePixels(lineStartPixel, previewTarget).includes(i);
            }
          } else if (activeDrawingTool === "curve" && lineStartPixel !== null) {
            if (curveEndPixel !== null) {
              isInLinePreview = getQuadraticBezierPixels(lineStartPixel, curveEndPixel, curveCurveAmount).includes(i);
            } else {
              const previewTarget = hoveredPixel;
              if (previewTarget !== null && previewTarget !== lineStartPixel) {
                isInLinePreview = getLinePixels(lineStartPixel, previewTarget).includes(i);
              }
            }
          }
          
          let borderColor = 'transparent';
          let borderWidth = `${0.1 * zoomFactor}vw`;
          let boxShadow = 'none';
          let opacity = 1;
          
          // Highlight active layer area when movegroup tool is active (shows clickable area)
          const shouldHighlightActiveLayer = activeDrawingTool === "movegroup" && 
                                             activeGroup && 
                                             activeGroup !== "__selected__" && 
                                             pixelGroup?.group === activeGroup &&
                                             !isDrawing;
          
          // Dim original position during drag preview
          if (isInActiveGroup && groupDragStart !== null && groupDragCurrent !== null && isDrawing && !selectionTransform.active) {
            // Legacy dimming for non-dynamic transforms
            opacity = 0.3;
          }
          // Don't dim __selected__ pixels - they move dynamically with CSS transform
          // Other layer pixels that are in the source area of a drag should dim
          
          // Show preview at new position
          if (isInDragPreview) {
            borderColor = '#9C27B0';
            borderWidth = `${0.2 * zoomFactor}vw`;
            boxShadow = `0 0 ${0.5 * zoomFactor}vw ${0.2 * zoomFactor}vw #9C27B0`;
          } 
          // __selected__ layer pixels being moved with CSS transform get purple highlighting (only when actually moving)
          else if (selectionTransform.active && isInSelectedLayer && (selectionTransform.deltaRow !== 0 || selectionTransform.deltaCol !== 0)) {
            borderColor = '#9C27B0';
            borderWidth = `${0.2 * zoomFactor}vw`;
            boxShadow = `0 0 ${0.5 * zoomFactor}vw ${0.2 * zoomFactor}vw #9C27B0`;
          }
          // Highlight active layer area to show clickable region
          else if (shouldHighlightActiveLayer) {
            borderColor = 'rgba(76, 175, 80, 0.5)'; // Green tint
            borderWidth = `${0.15 * zoomFactor}vw`;
            boxShadow = `0 0 ${0.3 * zoomFactor}vw rgba(76, 175, 80, 0.3)`;
          }
          // __selected__ pixels at rest (clicked but not yet dragged) - show as active group
          else if (isInSelectedLayer && activeGroup === "__selected__") {
            const isLight = (() => {
              if (!displayC || displayC.length < 7) return true;
              const r = parseInt(displayC.substring(1, 3), 16);
              const g = parseInt(displayC.substring(3, 5), 16);
              const b = parseInt(displayC.substring(5, 7), 16);
              const brightness = (r + g + b) / 3;
              return brightness > 127;
            })();
            borderColor = isLight ? '#000000' : '#CCCCCC';
            borderWidth = `${0.2 * zoomFactor}vw`;
            boxShadow = `0 0 0.5vw ${borderColor}`;
          }
          else if (isSelectionStartPoint) {
            // Use same contrast detection as line/curve previews
            const isLight = (() => {
              // If no color is set, pixel appears white, so treat as light
              if (!displayC || displayC.length < 7) return true;
              const r = parseInt(displayC.substring(1, 3), 16);
              const g = parseInt(displayC.substring(3, 5), 16);
              const b = parseInt(displayC.substring(5, 7), 16);
              const brightness = (r + g + b) / 3;
              return brightness > 127;
            })();
            borderColor = isLight ? '#000000' : '#CCCCCC';
            borderWidth = `${0.2 * zoomFactor}vw`;
            boxShadow = `0 0 ${0.6 * zoomFactor}vw ${0.3 * zoomFactor}vw ${borderColor}`;
          } else if (isMoveGroupHover) {
            // Move tool hover - purple glow on layers and selections
            borderColor = '#9C27B0';
            borderWidth = `${0.2 * zoomFactor}vw`;
            boxShadow = `0 0 ${0.5 * zoomFactor}vw ${0.2 * zoomFactor}vw #9C27B0`;
          } else if (isInActiveGroup) {
            // Use same contrast detection as line/curve previews
            const isLight = (() => {
              // If no color is set, pixel appears white, so treat as light
              if (!displayC || displayC.length < 7) return true;
              const r = parseInt(displayC.substring(1, 3), 16);
              const g = parseInt(displayC.substring(3, 5), 16);
              const b = parseInt(displayC.substring(5, 7), 16);
              const brightness = (r + g + b) / 3;
              return brightness > 127;
            })();
            borderColor = isLight ? '#000000' : '#CCCCCC';
            borderWidth = `${0.2 * zoomFactor}vw`;
            boxShadow = `0 0 0.5vw ${borderColor}`;
          } else if (isSelected || isInSelectionRect) {
            // Use same contrast detection as line/curve previews
            const isLight = (() => {
              // If no color is set, pixel appears white, so treat as light
              if (!displayC || displayC.length < 7) return true;
              const r = parseInt(displayC.substring(1, 3), 16);
              const g = parseInt(displayC.substring(3, 5), 16);
              const b = parseInt(displayC.substring(5, 7), 16);
              const brightness = (r + g + b) / 3;
              return brightness > 127;
            })();
            borderColor = isLight ? '#000000' : '#CCCCCC';
            borderWidth = `${0.2 * zoomFactor}vw`;
          } else if (isCurveEnd) {
            borderColor = getContrastBorderColor(displayC);
            borderWidth = `${0.2 * zoomFactor}vw`;
          } else if (isLineStart || isInLinePreview) {
            borderColor = getContrastBorderColor(displayC);
            borderWidth = `${0.2 * zoomFactor}vw`;
          }
          
          // Get the display color (either current pixel or preview from dragged group)
          let displayColor = displayC;
          let dynamicTransform = '';
          let isDynamicTransformed = false;
          
          // Apply dynamic CSS transform to __selected__ layer pixels during drag
          if (isInSelectedLayer) {
            if (selectionTransform.active && (selectionTransform.deltaRow !== 0 || selectionTransform.deltaCol !== 0)) {
              const translateX = selectionTransform.deltaCol * displayPixelSize;
              const translateY = selectionTransform.deltaRow * displayPixelSize;
              dynamicTransform = `translate(${translateX}vw, ${translateY}vw)`;
              isDynamicTransformed = true;
            }
          }
          
          // Legacy preview for non-__selected__ layer moves (if any)
          if (isInDragPreview && !isDynamicTransformed) {
            const deltaRow = groupDragCurrent.row - groupDragStart.startRow;
            const deltaCol = groupDragCurrent.col - groupDragStart.startCol;
            const currentRow = Math.floor(i / 200);
            const currentCol = i % 200;
            const sourceRow = currentRow - deltaRow;
            const sourceCol = currentCol - deltaCol;
            const sourceIndex = sourceRow * 200 + sourceCol;
            displayColor = getPixelDisplayColor(sourceIndex);
          }
          
          // Make transparent pixels when there's no color (null) or when background image is loaded with white
          const pixelBackground = (!displayColor || displayColor === null) ? 'transparent' : 
                                  (backgroundImage && displayColor === '#ffffff') ? 'transparent' : displayColor;
          
          // Get HTML ID if this pixel is in the selected layer
          let pixelHtmlId = undefined;
          if (isInSelectedLayer && selectedLayer.pixelIdentifiers) {
            pixelHtmlId = selectedLayer.pixelIdentifiers.get(i);
          }
          
          // Calculate zIndex - transparent pixels always get minimum zIndex
          let pixelZIndex;
          if (isInSelectedLayer) {
            // Use the actual zIndex from the __selected__ layer (always highest)
            const selectedLayerGroup = groups.find(g => g.name === "__selected__");
            pixelZIndex = selectedLayerGroup ? selectedLayerGroup.zIndex : getHighestZIndex() + 1;
          } else if (pixelBackground === 'transparent' && (!displayColor || displayColor === null)) {
            // Blank/transparent pixels always at lowest zIndex to not block other layers
            pixelZIndex = -999;
          } else if (pixelGroup) {
            pixelZIndex = pixelGroup.zIndex;
          } else {
            pixelZIndex = 0;
          }
          
          return (
            <div
              key={i}
              id={pixelHtmlId}
              style={{ 
                background: pixelBackground, 
                boxSizing: 'border-box',
                border: `${borderWidth} solid ${borderColor}`,
                boxShadow,
                position: 'relative',
                zIndex: pixelZIndex,
                opacity,
                transform: dynamicTransform,
                transition: isDynamicTransformed ? 'none' : 'transform 0.1s ease-out',
                willChange: isDynamicTransformed ? 'transform' : 'auto',
                pointerEvents: isDynamicTransformed ? 'none' : 'auto'
              }}
              onPointerDown={(e) => {
                // SELECT TOOL - Only creates rectangular selections (no movement)
                if (activeDrawingTool === "select") {
                  if (size.w <= 1024) {
                    // Mobile: two-click selection mode
                    if (selectionStart === null) {
                      // First click: set selection start
                      console.log("Mobile first click - setting selection start to", i);
                      setActiveGroup(null);
                      setSelectionStart(i);
                      setSelectionEnd(null);
                      setSelectedPixels([]);
                    } else {
                      // Second click: finalize selection
                      console.log("Mobile second click - finalizing selection from", selectionStart, "to", i);
                      setSelectionEnd(i);
                      const selected = getSelectionPixels(selectionStart, i);
                      console.log("Selected pixels:", selected);
                      setSelectedPixels(selected);
                      setSelectionStart(null);
                      setSelectionEnd(null);
                    }
                  } else {
                    // Desktop: drag to create rectangular selection
                    setActiveGroup(null);
                    setSelectionStart(i);
                    setSelectionEnd(i);
                    setSelectedPixels([]);
                    setIsDrawing(true);
                  }
                }
                // MOVE TOOL - Only handles dragging layers/selections (no selection creation)
                else if (activeDrawingTool === "movegroup") {
                  // Priority 1: If there's an active selection, move only those pixels
                  if (selectedPixels.length > 0 && selectedPixels.includes(i)) {
                    // Clicking on a selected pixel - extract selection to __selected__
                    const clickedPixelGroup = pixelGroups[i];
                    if (clickedPixelGroup && clickedPixelGroup.group !== "__selected__") {
                      // Extract only the selected pixels from the layer
                      // Wait for extraction to complete before setting drag state
                      extractSelectionToSelected(clickedPixelGroup.group, selectedPixels, () => {
                        const dragState = { pixelIndex: i, startRow: Math.floor(i / 200), startCol: i % 200, clientX: e.clientX, clientY: e.clientY };
                        setActiveGroup("__selected__");
                        setGroupDragStart(dragState);
                        setGroupDragCurrent(null);
                        setSelectionTransform({ deltaRow: 0, deltaCol: 0, active: true });
                        setIsDrawing(true);
                        
                        // Update ref for immediate access
                        dragStateRef.current.activeGroup = "__selected__";
                        dragStateRef.current.groupDragStart = dragState;
                        dragStateRef.current.groupDragCurrent = null;
                        dragStateRef.current.isDrawing = true;
                      });
                    } else {
                      const dragState = { pixelIndex: i, startRow: Math.floor(i / 200), startCol: i % 200, clientX: e.clientX, clientY: e.clientY };
                      setActiveGroup("__selected__");
                      setGroupDragStart(dragState);
                      setGroupDragCurrent(null);
                      setSelectionTransform({ deltaRow: 0, deltaCol: 0, active: true });
                      setIsDrawing(true);
                      
                      // Update ref for immediate access
                      dragStateRef.current.activeGroup = "__selected__";
                      dragStateRef.current.groupDragStart = dragState;
                      dragStateRef.current.groupDragCurrent = null;
                      dragStateRef.current.isDrawing = true;
                    }
                  }
                  // Priority 2: No selection - move entire layer
                  else if (pixelGroup) {
                    // Clicking on a layer pixel - extract entire layer to __selected__
                    // Wait for extraction to complete before setting drag state
                    extractLayerToSelected(pixelGroup.group, () => {
                      const dragState = { pixelIndex: i, startRow: Math.floor(i / 200), startCol: i % 200, clientX: e.clientX, clientY: e.clientY };
                      setActiveGroup("__selected__");
                      setSelectedPixels([]); // Clear any rectangular selection
                      setGroupDragStart(dragState);
                      setGroupDragCurrent(null);
                      setSelectionTransform({ deltaRow: 0, deltaCol: 0, active: true });
                      setIsDrawing(true);
                      
                      // Update ref for immediate access
                      dragStateRef.current.activeGroup = "__selected__";
                      dragStateRef.current.groupDragStart = dragState;
                      dragStateRef.current.groupDragCurrent = null;
                      dragStateRef.current.isDrawing = true;
                    });
                  }
                  // Priority 3: __selected__ layer exists (from previous operation)
                  else if (activeGroup === "__selected__") {
                    // Clicking on __selected__ layer - enable drag
                    const dragState = { pixelIndex: i, startRow: Math.floor(i / 200), startCol: i % 200, clientX: e.clientX, clientY: e.clientY };
                    setGroupDragStart(dragState);
                    setGroupDragCurrent(null);
                    setSelectionTransform({ deltaRow: 0, deltaCol: 0, active: true });
                    setIsDrawing(true);
                    
                    // Update ref for immediate access
                    dragStateRef.current.activeGroup = "__selected__";
                    dragStateRef.current.groupDragStart = dragState;
                    dragStateRef.current.groupDragCurrent = null;
                    dragStateRef.current.isDrawing = true;
                  }
                }
                // LINE TOOL
                else if (activeDrawingTool === "line") {
                  console.log("=== LINE TOOL CLICK (LAYERS) ===", { 
                    pixelIndex: i, 
                    lineStartPixel, 
                    lineEndPixel,
                    hoveredPixel,
                    screenWidth: size.w 
                  });
                  if (lineStartPixel === null) {
                    // First click: set start point
                    console.log("Setting line start point:", i);
                    setLineStartPixel(i);
                    setHoveredPixel(i);
                  } else if (lineStartPixel === i) {
                    // Clicking same pixel - cancel
                    console.log("Canceling line (same pixel)");
                    setLineStartPixel(null);
                  } else {
                    // Second click: set endpoint and show apply menu (both mobile and desktop)
                    console.log("Setting line endpoint:", i, "- showing apply menu");
                    setLineEndPixel(i);
                    setHoveredPixel(i);
                  }
                } else if (activeDrawingTool === "curve") {
                  console.log("=== CURVE TOOL CLICK (LAYERS) ===", { 
                    pixelIndex: i, 
                    lineStartPixel, 
                    curveEndPixel,
                    hoveredPixel,
                    screenWidth: size.w 
                  });
                  if (lineStartPixel === null) {
                    // First click: set start point
                    console.log("Setting curve start point:", i);
                    setLineStartPixel(i);
                    setHoveredPixel(i);
                  } else if (lineStartPixel === i) {
                    // Clicking same pixel - cancel
                    console.log("Canceling curve (same pixel)");
                    setLineStartPixel(null);
                  } else {
                    // Second click: enter adjustment mode
                    console.log("Setting curve endpoint:", i);
                    setCurveEndPixel(i);
                  }
                }
              }}
              onPointerUp={(e) => {
                // SELECT TOOL - Finalize rectangular selection
                if (activeDrawingTool === "select") {
                  if (size.w > 1024 && selectionStart !== null) {
                    // Desktop: finalize drag selection
                    const selected = getSelectionPixels(selectionStart, selectionEnd || selectionStart);
                    setSelectedPixels(selected);
                    setSelectionStart(null);
                    setSelectionEnd(null);
                    setIsDrawing(false);
                  }
                  // Mobile: selection finalized in onPointerDown
                }
                // MOVE TOOL - Finalize layer/selection movement
                else if (activeDrawingTool === "movegroup" && groupDragStart !== null && activeGroup !== null) {
                  console.log("=== POINTER UP: MOVE TOOL ===");
                  // Check if __selected__ layer exists
                  const selectedLayer = groups.find(g => g.name === "__selected__");
                  
                  // Calculate movement delta from ref (works for both desktop and mobile)
                  let deltaRow = 0;
                  let deltaCol = 0;
                  
                  if (dragStateRef.current.groupDragCurrent && dragStateRef.current.groupDragStart) {
                    deltaRow = dragStateRef.current.groupDragCurrent.row - dragStateRef.current.groupDragStart.startRow;
                    deltaCol = dragStateRef.current.groupDragCurrent.col - dragStateRef.current.groupDragStart.startCol;
                  }
                  
                  console.log("onPointerUp: Movement delta", { 
                    deltaRow, 
                    deltaCol, 
                    hasSelectedLayer: !!selectedLayer,
                    activeGroup,
                    selectionTransform,
                    refDragStart: dragStateRef.current.groupDragStart,
                    refDragCurrent: dragStateRef.current.groupDragCurrent
                  });
                  
                  // Detect overlaps before moving
                  let overlappedLayerNames = [];
                  if (deltaRow !== 0 || deltaCol !== 0) {
                    if (selectedLayer && selectedLayer.originalPixelIndices) {
                      // Calculate new positions
                      const newPositions = selectedLayer.originalPixelIndices.map(idx => {
                        const row = Math.floor(idx / 200);
                        const col = idx % 200;
                        const newRow = row + deltaRow;
                        const newCol = col + deltaCol;
                        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
                          return newRow * 200 + newCol;
                        }
                        return null;
                      }).filter(idx => idx !== null);
                      
                      // Check for overlaps
                      const overlappedLayers = new Set();
                      newPositions.forEach(newIdx => {
                        const pixelGroup = pixelGroups[newIdx];
                        if (pixelGroup && pixelGroup.group !== "__selected__" && pixelGroup.group !== selectedLayer.originalLayerName) {
                          overlappedLayers.add(pixelGroup.group);
                        }
                      });
                      
                      overlappedLayerNames = Array.from(overlappedLayers);
                      
                      if (overlappedLayerNames.length > 0) {
                        const layerList = overlappedLayerNames.join(", ");
                        const confirmed = window.confirm(
                          `This layer will move on top of: ${layerList}\n\n` +
                          `The underlying layer pixels will be preserved but hidden.\n\n` +
                          `Continue with move?`
                        );
                        
                        if (!confirmed) {
                          console.log("onPointerUp: Move cancelled by user");
                          setGroupDragStart(null);
                          dragStateRef.current.groupDragCurrent = null;
                          setSelectionTransform({ deltaRow: 0, deltaCol: 0, active: false });
                          setIsDrawing(false);
                          return;
                        }
                      }
                    }
                  }
                  
                  // Apply movement if there was a delta
                  let movedPixelIndices = null;
                  if (deltaRow !== 0 || deltaCol !== 0) {
                    console.log("onPointerUp: Applying movement", { deltaRow, deltaCol });
                    if (selectedLayer) {
                      movedPixelIndices = moveGroup("__selected__", deltaRow, deltaCol);
                      console.log("onPointerUp: Got moved pixel indices", { count: movedPixelIndices?.length });
                    } else if (activeGroup === "__selected__") {
                      movedPixelIndices = moveGroup("__selected__", deltaRow, deltaCol);
                      console.log("onPointerUp: Got moved pixel indices", { count: movedPixelIndices?.length });
                    } else {
                      moveGroup(activeGroup, deltaRow, deltaCol);
                    }
                  } else {
                    console.log("onPointerUp: No movement delta, skipping moveGroup");
                  }
                  
                  // Handle __selected__ layer: commit to base canvas instead of restoring to layer
                  let shouldReloadFromStorage = false;
                  if (selectedLayer && activeGroup === "__selected__") {
                    console.log("onPointerUp: Committing __selected__ pixels to base canvas");
                    
                    if (deltaRow !== 0 || deltaCol !== 0) {
                      // Clear original positions from base canvas
                      const newPixelColors = [...pixelColors];
                      selectedLayer.originalPixelIndices.forEach(idx => {
                        newPixelColors[idx] = null;
                      });
                      
                      // Write to new positions on base canvas
                      selectedLayer.originalPixelIndices.forEach(idx => {
                        const row = Math.floor(idx / 200);
                        const col = idx % 200;
                        const newRow = row + deltaRow;
                        const newCol = col + deltaCol;
                        
                        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
                          const newIdx = newRow * 200 + newCol;
                          const color = selectedLayer.pixels[idx];
                          if (color) {
                            newPixelColors[newIdx] = color;
                          }
                        }
                      });
                      
                      setPixelColors(newPixelColors);
                      console.log("onPointerUp: Committed pixels to base canvas");
                      
                      // Update selectedPixels to new positions
                      const newSelectedPixels = selectedLayer.originalPixelIndices.map(idx => {
                        const row = Math.floor(idx / 200);
                        const col = idx % 200;
                        const newRow = row + deltaRow;
                        const newCol = col + deltaCol;
                        
                        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
                          return newRow * 200 + newCol;
                        }
                        return null;
                      }).filter(idx => idx !== null);
                      
                      setSelectedPixels(newSelectedPixels);
                      shouldReloadFromStorage = true; // Reload after committing to base canvas
                    } else {
                      // No movement - just remove __selected__ layer without changing anything
                      console.log("onPointerUp: No movement, removing __selected__ layer only");
                      setGroups(prevGroups => prevGroups.filter(g => g.name !== "__selected__"));
                      setActiveGroup(selectedLayer.originalLayerName);
                    }
                  } else if (selectedLayer) {
                    console.log("onPointerUp: Restoring __selected__ to original layer");
                    restoreSelectedToLayer(movedPixelIndices);
                    // Reload all layers from localStorage after move to ensure data consistency
                    shouldReloadFromStorage = true;
                  } else {
                    console.log("onPointerUp: No __selected__ layer to restore");
                  }
                  
                  // Clear drag state and transform
                  console.log("onPointerUp: Clearing drag state");
                  setGroupDragStart(null);
                  dragStateRef.current.groupDragCurrent = null;
                  setSelectionTransform({ deltaRow: 0, deltaCol: 0, active: false });
                  setIsDrawing(false);
                  // Keep layer selected after move
                  
                  // Force a complete UI refresh after move completes
                  setTimeout(() => {
                    setRenderTrigger(prev => prev + 1);
                    setSelectionTransform({ deltaRow: 0, deltaCol: 0, active: false }); // Double-clear to ensure preview is gone
                    console.log("onPointerUp: Forced render refresh and preview clear");
                    
                    // Only reload from localStorage if we actually moved pixels to base canvas
                    if (shouldReloadFromStorage) {
                      setTimeout(() => {
                        console.log("Reloading all layers from localStorage");
                        try {
                          const storedGroups = localStorage.getItem("pixelgrid_groups");
                          if (storedGroups) {
                            const parsedGroups = JSON.parse(storedGroups);
                            
                            // Reload groups from localStorage
                            setGroups(parsedGroups.map(g => ({
                              ...g,
                              pixels: Object.freeze({ ...g.pixels }),
                              originalSelectionArea: g.originalSelectionArea || []
                            })));
                            
                            // Rebuild pixelGroups from localStorage layer data
                            const newPixelGroups = {};
                            parsedGroups.forEach(layer => {
                              if (layer.pixels) {
                                Object.keys(layer.pixels).forEach(pixelIndex => {
                                  const idx = parseInt(pixelIndex, 10);
                                  newPixelGroups[idx] = {
                                    group: layer.name,
                                    zIndex: layer.zIndex || 0
                                  };
                                });
                              }
                            });
                            setPixelGroups(newPixelGroups);
                            
                            console.log("Layers reloaded from localStorage");
                          }
                        } catch (error) {
                          console.error("Failed to reload layers from localStorage:", error);
                        }
                      }, 100);
                    } else {
                      console.log("Skipping localStorage reload - no base canvas commit");
                    }
                  }, 0);
                  
                  console.log("=== POINTER UP: MOVE TOOL COMPLETE ===");
                }
              }}
              onClick={(e) => {
                if (activeDrawingTool === "pencil") {
                  // Pencil tool handled by onPointerDown
                }
              }}
              onPointerEnter={() => {
                // SELECT TOOL - Update selection rectangle preview
                if (activeDrawingTool === "select") {
                  if (size.w <= 1024 && selectionStart !== null && selectionEnd === null) {
                    // Mobile: show preview rectangle while hovering
                    setSelectionEnd(i);
                  } else if (size.w > 1024 && isDrawing && selectionStart !== null) {
                    // Desktop: update selection during drag
                    setSelectionEnd(i);
                  }
                }
                // LINE TOOL - Update line preview on hover
                else if (activeDrawingTool === "line" && lineStartPixel !== null) {
                  // Both mobile and desktop: update hover for line preview
                  console.log("LINE PREVIEW HOVER:", { from: lineStartPixel, to: i });
                  setHoveredPixel(i);
                }
                // CURVE TOOL - Update curve preview on hover
                else if (activeDrawingTool === "curve" && lineStartPixel !== null && curveEndPixel === null) {
                  // Both mobile and desktop: update hover for curve endpoint preview
                  console.log("CURVE PREVIEW HOVER:", { from: lineStartPixel, to: i });
                  setHoveredPixel(i);
                }
                // MOVE TOOL - Update drag preview position
                else if (activeDrawingTool === "movegroup" && groupDragStart !== null && activeGroup !== null && isDrawing) {
                  const currentRow = Math.floor(i / 200);
                  const currentCol = i % 200;
                  let deltaRow = currentRow - groupDragStart.startRow;
                  let deltaCol = currentCol - groupDragStart.startCol;
                  
                  // Clamp delta to prevent moving outside bounds
                  const selectedLayer = groups.find(g => g.name === "__selected__");
                  if (selectedLayer && selectedLayer.originalPixelIndices) {
                    // Calculate min/max row/col from originalPixelIndices
                    let minRow = rows, maxRow = 0, minCol = 200, maxCol = 0;
                    selectedLayer.originalPixelIndices.forEach(idx => {
                      const r = Math.floor(idx / 200);
                      const c = idx % 200;
                      minRow = Math.min(minRow, r);
                      maxRow = Math.max(maxRow, r);
                      minCol = Math.min(minCol, c);
                      maxCol = Math.max(maxCol, c);
                    });
                    
                    // Clamp deltaRow and deltaCol to keep selection within bounds
                    const maxDeltaRowUp = -minRow;
                    const maxDeltaRowDown = rows - 1 - maxRow;
                    const maxDeltaColLeft = -minCol;
                    const maxDeltaColRight = 200 - 1 - maxCol;
                    
                    deltaRow = Math.max(maxDeltaRowUp, Math.min(maxDeltaRowDown, deltaRow));
                    deltaCol = Math.max(maxDeltaColLeft, Math.min(maxDeltaColRight, deltaCol));
                  }
                  
                  setSelectionTransform({ deltaRow, deltaCol, active: true });
                  // Store current position in ref for onPointerUp (no re-render)
                  dragStateRef.current.groupDragCurrent = { row: currentRow, col: currentCol };
                }
                setHoveredPixel(i);
              }}
              onPointerMove={(e) => {
                setHoveredPixel(i);
                
                // SELECT TOOL - Update selection rectangle during desktop drag
                if (activeDrawingTool === "select" && size.w > 1024 && isDrawing && selectionStart !== null) {
                  setSelectionEnd(i);
                }
                // MOVE TOOL - Track drag position for visual preview
                else if (activeDrawingTool === "movegroup" && groupDragStart !== null && activeGroup !== null && isDrawing) {
                  const currentRow = Math.floor(i / 200);
                  const currentCol = i % 200;
                  let deltaRow = currentRow - groupDragStart.startRow;
                  let deltaCol = currentCol - groupDragStart.startCol;
                  
                  // Clamp delta to prevent moving outside bounds
                  const selectedLayer = groups.find(g => g.name === "__selected__");
                  if (selectedLayer && selectedLayer.originalPixelIndices) {
                    // Calculate min/max row/col from originalPixelIndices
                    let minRow = rows, maxRow = 0, minCol = 200, maxCol = 0;
                    selectedLayer.originalPixelIndices.forEach(idx => {
                      const r = Math.floor(idx / 200);
                      const c = idx % 200;
                      minRow = Math.min(minRow, r);
                      maxRow = Math.max(maxRow, r);
                      minCol = Math.min(minCol, c);
                      maxCol = Math.max(maxCol, c);
                    });
                    
                    // Clamp deltaRow and deltaCol to keep selection within bounds
                    const maxDeltaRowUp = -minRow;
                    const maxDeltaRowDown = rows - 1 - maxRow;
                    const maxDeltaColLeft = -minCol;
                    const maxDeltaColRight = 200 - 1 - maxCol;
                    
                    deltaRow = Math.max(maxDeltaRowUp, Math.min(maxDeltaRowDown, deltaRow));
                    deltaCol = Math.max(maxDeltaColLeft, Math.min(maxDeltaColRight, deltaCol));
                  }
                  
                  setSelectionTransform({ deltaRow, deltaCol, active: true });
                  // Store current position in ref for onPointerUp (no re-render)
                  dragStateRef.current.groupDragCurrent = { row: currentRow, col: currentCol };
                }
              }}
              onPointerLeave={() => {
                // SELECT TOOL - Clear mobile preview when leaving pixel
                if (activeDrawingTool === "select" && size.w <= 1024 && selectionStart !== null && selectedPixels.length === 0) {
                  setSelectionEnd(null);
                }
                setHoveredPixel(null);
              }}
            />
          );
        })}
      </div>
      
      {/* SELECTION MOVE PREVIEW OVERLAY */}
      {selectionTransform.active && (selectionTransform.deltaRow !== 0 || selectionTransform.deltaCol !== 0) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10000
        }}>
          {(() => {
            const selectedLayer = groups.find(g => g.name === "__selected__");
            if (!selectedLayer || !selectedLayer.pixels) return null;
            
            return Object.keys(selectedLayer.pixels).map(idx => {
              const pixelIndex = parseInt(idx);
              const originalRow = Math.floor(pixelIndex / 200);
              const originalCol = pixelIndex % 200;
              const newRow = originalRow + selectionTransform.deltaRow;
              const newCol = originalCol + selectionTransform.deltaCol;
              
              // Only render if within bounds
              if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= 200) return null;
              
              const color = selectedLayer.pixels[pixelIndex];
              if (!color || color === null) return null;
              
              return (
                <div
                  key={`preview-${pixelIndex}`}
                  style={{
                    position: 'absolute',
                    left: `${newCol * displayPixelSize}vw`,
                    top: `${newRow * displayPixelSize}vw`,
                    width: `${displayPixelSize}vw`,
                    height: `${displayPixelSize}vw`,
                    background: color,
                    opacity: 0.5,
                    border: `${0.15 * zoomFactor}vw solid rgba(156, 39, 176, 0.8)`,
                    boxShadow: `0 0 ${0.5 * zoomFactor}vw rgba(156, 39, 176, 0.6)`,
                    boxSizing: 'border-box'
                  }}
                />
              );
            });
          })()}
        </div>
      )}
      </div>
      {/* End of GRID CONTAINER WITH BACKGROUND */}
      
      </div>
      {/* End of grid-sidebar-wrapper */}
      
      {/* MOBILE/TABLET BOTTOM SCROLLBAR */}
      {size.w <= 1024 && (
        <div 
          onWheel={(e) => {
            // Allow wheel scrolling when over the scrollbar
            e.stopPropagation();
            if (gridRef.current) {
              const newScrollLeft = Math.max(0, Math.min(
                gridRef.current.scrollWidth - gridRef.current.clientWidth,
                scrollPosition + e.deltaY
              ));
              gridRef.current.scrollLeft = newScrollLeft;
              setScrollPosition(newScrollLeft);
            }
          }}
          style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "10vw",
          display: "grid",
          gridTemplateColumns: "10vw 1fr 10vw",
          background: "#fefefe",
          borderTop: "0.2vw solid #000000",
          zIndex: 100
        }}>
          {/* Left scroll button */}
          <div 
            onPointerDown={() => {
              if (gridRef.current) {
                const newScrollLeft = Math.max(0, scrollPosition - 100);
                gridRef.current.scrollLeft = newScrollLeft;
                setScrollPosition(newScrollLeft);
              }
            }}
            style={{
              width: "10vw",
              height: "10vw",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fefefe",
              borderRight: "0.2vw solid #000000",
              cursor: "pointer",
              fontSize: "5vw",
              userSelect: "none"
            }}
          >
            ◀
          </div>

          {/* Slider track */}
          <div 
            data-scrollbar-track="true"
            style={{
              width: "100%",
              height: "10vw",
              background: "#fefefe",
              position: "relative",
              padding: "1vw",
              display: "flex",
              alignItems: "center"
            }}
          >
            <div
              onPointerDown={(e) => {
                setIsDraggingSlider(true);
                const rect = e.currentTarget.parentElement.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = x / rect.width;
                const maxScroll = gridRef.current ? gridRef.current.scrollWidth - gridRef.current.clientWidth : 0;
                if (gridRef.current) {
                  const newScrollLeft = percent * maxScroll;
                  gridRef.current.scrollLeft = newScrollLeft;
                  setScrollPosition(newScrollLeft);
                }
              }}
              style={{
                width: "100%",
                height: "8vw",
                background: "#ffffff",
                border: "0.2vw solid #000000",
                position: "relative",
                cursor: "pointer",
                touchAction: "none"
              }}
            >
              {/* Slider thumb */}
              <div style={{
                position: "absolute",
                left: `calc(${gridRef.current ? Math.min(74.5, Math.max(0, (scrollPosition / (gridRef.current.scrollWidth - gridRef.current.clientWidth)) * 100)) : 0}% - 0px)`,
                top: "0",
                width: "20vw",
                height: "8vw",
                background: "#000000",
                pointerEvents: "none"
              }} />
            </div>
          </div>

          {/* Right scroll button */}
          <div 
            onPointerDown={() => {
              if (gridRef.current) {
                const newScrollLeft = Math.min(
                  gridRef.current.scrollWidth - gridRef.current.clientWidth,
                  scrollPosition + 100
                );
                gridRef.current.scrollLeft = newScrollLeft;
                setScrollPosition(newScrollLeft);
              }
            }}
            style={{
              width: "10vw",
              height: "10vw",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fefefe",
              borderLeft: "0.2vw solid #000000",
              cursor: "pointer",
              fontSize: "5vw",
              userSelect: "none"
            }}
          >
            ▶
          </div>
        </div>
      )}

      {/* IMAGE SCALE DIALOG */}
      {showImageScaleDialog && uploadedImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "25vw",
            height: "100vh",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            zIndex: 2000,
            borderLeft: "0.3vw solid #000",
            overflowY: "auto"
          }}
        >
          <div
            style={{
              padding: "2vw",
              display: "flex",
              flexDirection: "column",
              gap: "2vw"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#000", fontSize: "2vw", fontWeight: "bold" }}>
                Scale Image
              </div>
              <button
                onClick={() => {
                  setShowImageScaleDialog(false);
                  setUploadedImage(null);
                }}
                style={{
                  background: "#000",
                  color: "white",
                  border: "0.2vw solid #000",
                  cursor: "pointer",
                  fontSize: "2.5vw",
                  fontWeight: "bold",
                  width: "5vw",
                  height: "5vw",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "0.5vw"
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Preview */}
            <div style={{ 
              border: "0.2vw solid #000", 
              borderRadius: "0.5vw",
              padding: "1vw",
              background: "#f5f5f5",
              display: "flex",
              flexDirection: "column",
              gap: "1vw"
            }}>
              <div style={{ color: "#000", fontSize: "1.2vw", fontWeight: "bold" }}>
                Preview
              </div>
              <div style={{ 
                width: "100%", 
                display: "flex", 
                justifyContent: "center",
                alignItems: "center",
                minHeight: "15vw",
                background: "#fff",
                border: "0.1vw solid #ccc",
                borderRadius: "0.3vw",
                overflow: "hidden"
              }}>
                <canvas
                  ref={(canvas) => {
                    if (canvas && uploadedImage) {
                      const ctx = canvas.getContext('2d');
                      const aspectRatio = uploadedImage.height / uploadedImage.width;
                      const previewWidth = imageScale;
                      const previewHeight = Math.round(previewWidth * aspectRatio);
                      
                      canvas.width = previewWidth;
                      canvas.height = previewHeight;
                      
                      ctx.imageSmoothingEnabled = false;
                      ctx.drawImage(uploadedImage, 0, 0, previewWidth, previewHeight);
                    }
                  }}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "20vw",
                    imageRendering: "pixelated"
                  }}
                />
              </div>
              <div style={{ color: "#666", fontSize: "1vw", textAlign: "center" }}>
                Scaled: {imageScale} × {Math.round(imageScale * (uploadedImage.height / uploadedImage.width))}px
              </div>
            </div>
            
            {/* Original Info */}
            <div style={{ 
              color: "#000", 
              fontSize: "1.2vw", 
              padding: "1vw",
              background: "#f9f9f9",
              border: "0.1vw solid #ddd",
              borderRadius: "0.5vw"
            }}>
              <div><strong>Original:</strong> {uploadedImage.width} × {uploadedImage.height}px</div>
            </div>
            
            {/* Scale Control */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "1vw",
              padding: "1vw",
              background: "#f9f9f9",
              border: "0.1vw solid #ddd",
              borderRadius: "0.5vw"
            }}>
              <label style={{ color: "#000", fontSize: "1.5vw", fontWeight: "bold" }}>
                Width: {imageScale}px
              </label>
              <input
                type="range"
                min="10"
                max="200"
                value={imageScale}
                onChange={(e) => setImageScale(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  cursor: "pointer",
                  accentColor: "#4CAF50"
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9vw", color: "#666" }}>
                <span>10px</span>
                <span>75px</span>
                <span>200px</span>
              </div>
              
              {/* Quick preset buttons */}
              <div style={{ display: "flex", gap: "0.5vw", marginTop: "0.5vw" }}>
                <button
                  onClick={() => setImageScale(50)}
                  style={{
                    flex: 1,
                    background: imageScale === 50 ? "#4CAF50" : "#fff",
                    color: imageScale === 50 ? "#fff" : "#000",
                    border: "0.15vw solid #000",
                    padding: "0.5vw",
                    cursor: "pointer",
                    fontSize: "1vw",
                    borderRadius: "0.3vw"
                  }}
                >
                  50px
                </button>
                <button
                  onClick={() => setImageScale(75)}
                  style={{
                    flex: 1,
                    background: imageScale === 75 ? "#4CAF50" : "#fff",
                    color: imageScale === 75 ? "#fff" : "#000",
                    border: "0.15vw solid #000",
                    padding: "0.5vw",
                    cursor: "pointer",
                    fontSize: "1vw",
                    borderRadius: "0.3vw"
                  }}
                >
                  75px
                </button>
                <button
                  onClick={() => setImageScale(100)}
                  style={{
                    flex: 1,
                    background: imageScale === 100 ? "#4CAF50" : "#fff",
                    color: imageScale === 100 ? "#fff" : "#000",
                    border: "0.15vw solid #000",
                    padding: "0.5vw",
                    cursor: "pointer",
                    fontSize: "1vw",
                    borderRadius: "0.3vw"
                  }}
                >
                  100px
                </button>
                <button
                  onClick={() => setImageScale(200)}
                  style={{
                    flex: 1,
                    background: imageScale === 200 ? "#4CAF50" : "#fff",
                    color: imageScale === 200 ? "#fff" : "#000",
                    border: "0.15vw solid #000",
                    padding: "0.5vw",
                    cursor: "pointer",
                    fontSize: "1vw",
                    borderRadius: "0.3vw"
                  }}
                >
                  200px
                </button>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => applyImageToCanvas(imageScale)}
              style={{
                background: "#4CAF50",
                color: "white",
                fontSize: "1.8vw",
                padding: "1.5vw",
                cursor: "pointer",
                border: "0.2vw solid #000",
                borderRadius: "0.5vw",
                fontWeight: "bold",
                marginTop: "1vw"
              }}
            >
              Apply to Canvas
            </button>
          </div>
        </div>
      )}

      {/* COLOR EDITOR OVERLAY */}
      {showColorEditor && (
        <div
          onClick={() => setShowColorEditor(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: "2vw",
              minWidth: "5vw",
              display: "flex",
              flexDirection: "column",
              gap: "1vw",
            }}
          >
            <div style={{ color: "white", fontSize: "2vw", textAlign: "center" }}>
              Edit {editingColor === "primary" ? "Primary" : "Secondary"} Color
            </div>
            
            <div style={{ display: "flex", justifyContent: "center" }}>
              <input
                type="color"
                value={editingColor === "primary" ? primaryColor : secondaryColor}
                onChange={(e) => {
                  if (editingColor === "primary") {
                    setPrimaryColor(e.target.value);
                  } else {
                    setSecondaryColor(e.target.value);
                  }
                }}
                style={{
                  width: "2.5vw",
                  height: "2.5vw",
                  border: "0.3vw solid #000000",
                  cursor: "pointer",
                }}
              />
            </div>

            <input
              type="text"
              value={editingColor === "primary" ? primaryColor : secondaryColor}
              onChange={(e) => {
                const val = normalizeHexInput(e.target.value);
                if (editingColor === "primary") {
                  setPrimaryColor(val);
                } else {
                  setSecondaryColor(val);
                }
              }}
              maxLength={7}
              style={{
                width: "100%",
                background: "#111",
                border: "0.2vw solid #000000",
                color: "white",
                textAlign: "center",
                borderRadius: "0.5vw",
                fontSize: "1.5vw",
                padding: "1vw",
              }}
            />

            <button
              onClick={() => setShowColorEditor(false)}
              style={{
                color: "white",
                fontSize: "1.3vw",
                padding: "1vw",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* LINE APPLY OVERLAY */}
      {activeDrawingTool === "line" && lineStartPixel !== null && lineEndPixel !== null && (
        <div
          style={{
            position: "fixed",
            top: "auto",
            bottom: size.w <= 1024 ? (showLayersMenu ? "45vw" : "10vw") : "0",
            left: size.w <= 1024 ? "10vw" : "7vw",
            right: size.w > 1024 && showLayersMenu ? "35vw" : "0",
            background: "#ffffff",
            padding: "1vw",
            borderTop: "0.3vw solid #000000",
            borderBottom: "none",
            borderLeft: size.w > 1024 && showLayersMenu ? "0.3vw solid #000000" : "none",
            zIndex: 1001,
            display: "flex",
            justifyContent: "center",
            gap: "1vw"
          }}
        >
          <button
            onClick={() => {
              setLineStartPixel(null);
              setLineEndPixel(null);
              setHoveredPixel(null);
            }}
            style={{
              background: "#fff",
              color: "#000",
              border: "0.2vw solid #000",
              padding: "1vw 3vw",
              cursor: "pointer",
              fontSize: "1.3vw",
              fontWeight: "bold"
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (lineStartPixel !== null && lineEndPixel !== null) {
                drawLine(lineStartPixel, lineEndPixel);
              }
              setLineStartPixel(null);
              setLineEndPixel(null);
              setHoveredPixel(null);
            }}
            style={{
              background: "#000",
              color: "#fff",
              border: "0.2vw solid #000",
              padding: "1vw 3vw",
              cursor: "pointer",
              fontSize: "1.3vw",
              fontWeight: "bold"
            }}
          >
            Apply
          </button>
        </div>
      )}

      {/* CURVE ADJUSTMENT OVERLAY */}
      {activeDrawingTool === "curve" && lineStartPixel !== null && curveEndPixel !== null && (
        <div
          style={{
            position: "fixed",
            inset: size.w <= 1024 
              ? (showLayersMenu ? "auto 0px 45vw 10vw" : "auto 0px 10vw 10vw") 
              : (showLayersMenu ? "auto 35vw 0px 7vw" : "auto 0vw 0px 7vw"),
            background: "#ffffff",
            padding: "1vw",
            borderTop: "0.3vw solid #000000",
            borderBottom: "none",
            borderLeft: "none",
            zIndex: 1001,
            display: "flex",
            flexDirection: "column",
            gap: "1vw",
            alignItems: "center"
          }}
        >
          <input
            type="number"
            min="-100"
            max="100"
            value={curveCurveAmount}
            onChange={(e) => setCurveCurveAmount(Math.min(100, Math.max(-100, Number(e.target.value))))}
            style={{
              width: "12vw",
              padding: "1vw",
              fontSize: "1.5vw",
              border: "0.2vw solid #000000",
              textAlign: "center"
            }}
          />
          
          <input
            type="range"
            min="-100"
            max="100"
            value={curveCurveAmount}
            onChange={(e) => setCurveCurveAmount(Number(e.target.value))}
            style={{
              width: "80%",
              accentColor: "#000"
            }}
          />
          
          <div style={{ display: "flex", gap: "1vw" }}>
            <button
              onClick={() => {
                setLineStartPixel(null);
                setCurveEndPixel(null);
                setCurveCurveAmount(0);
                setHoveredPixel(null);
              }}
              style={{
                background: "#fff",
                color: "#000",
                border: "0.2vw solid #000",
                padding: "1vw 3vw",
                cursor: "pointer",
                fontSize: "1.3vw",
                fontWeight: "bold"
              }}
            >
              Cancel
            </button>
            
            <button
              onClick={() => {
                if (curveCurveAmount === 0) {
                  drawLine(lineStartPixel, curveEndPixel);
                } else {
                  const curvePixels = getQuadraticBezierPixels(lineStartPixel, curveEndPixel, curveCurveAmount);
                  
                  if (activeGroup && activeGroup !== "__selected__") {
                    // Draw curve on layer
                    setGroups(prevGroups => {
                      const updated = prevGroups.map(g => {
                        if (g.name === activeGroup) {
                          const newPixels = { ...g.pixels };
                          curvePixels.forEach(idx => {
                            const pixelGroup = pixelGroups[idx];
                            if (!pixelGroup || pixelGroup.group === activeGroup) {
                              newPixels[idx] = color;
                            }
                          });
                          return Object.freeze({ ...g, pixels: Object.freeze(newPixels) });
                        }
                        return g;
                      });
                      
                      // Save to localStorage
                      try {
                        const frozenGroups = updated.filter(g => g.name !== "__selected__").map(g => ({
                          name: g.name,
                          zIndex: g.zIndex,
                          pixels: { ...g.pixels },
                          locked: g.locked,
                          originalSelectionArea: g.originalSelectionArea || []
                        }));
                        localStorage.setItem("pixelgrid_groups", JSON.stringify(frozenGroups));
                      } catch (error) {
                        console.error("Failed to save to localStorage:", error);
                      }
                      
                      return updated;
                    });
                  } else {
                    // Draw curve on base pixelColors
                    setPixelColors((prev) => {
                      const copy = [...prev];
                      curvePixels.forEach(idx => {
                        copy[idx] = color;
                      });
                      return copy;
                    });
                  }
                }
                setLineStartPixel(null);
                setCurveEndPixel(null);
                setCurveCurveAmount(0);
                setHoveredPixel(null);
              }}
              style={{
                background: "#000",
                color: "#fff",
                border: "0.2vw solid #000",
                padding: "1vw 3vw",
                cursor: "pointer",
                fontSize: "1.3vw",
                fontWeight: "bold"
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* RIGHT SIDEBAR CONTAINER - Desktop Grid Layout */}
      {size.w > 1024 && (activeDrawingTool === "select" || showLayersMenu) && (
        <div style={{
          position: "fixed",
          top: size.w <= 1650 ? "7.2vw" : "7.8vw",
          right: 0,
          width: "35vw",
          height: "100vh",
          display: "grid",
          gridTemplateRows: (activeDrawingTool === "select" && showLayersMenu) ? "auto 1fr" : showLayersMenu ? "1fr" : "1fr",
          zIndex: 1000
        }}>
          {/* SELECT MENU - Row 1 */}
          {activeDrawingTool === "select" && (
            <div style={{
              background: "#ffffff",
              color: "#000000",
              padding: "0px",
              display: "flex",
              flexDirection: "column",
              gap: "0px",
              borderLeft: "0.3vw solid #000000",
              borderBottom: showLayersMenu ? "0.3vw solid #000000" : "none",
              overflowY: "auto"
            }}>
              
              {/* Select Menu Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0px" }}>
                <div style={{ display: "flex", gap: "0px", alignItems: "center" }}>
                  <div style={{ fontSize: "1.5vw", fontWeight: "bold" }}>
                    Select Mode
                  </div>
                  {/* Selection Mode Toggle - Two Buttons */}
                  <button
                    onClick={() => setSelectAllPixels(true)}
                    style={{
                      background: selectAllPixels ? "#000000" : "#ffffff",
                      color: selectAllPixels ? "#ffffff" : "#000000",
                      padding: "0",
                      cursor: "pointer",
                      fontSize: "1.5vw",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      border: "0.2vw solid #000000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "5vw",
                      height: "5vw"
                    }}
                    title="Select all pixels in box"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectAllPixels(false)}
                    style={{
                      background: !selectAllPixels ? "#000000" : "#ffffff",
                      color: !selectAllPixels ? "#ffffff" : "#000000",
                      padding: "0",
                      cursor: "pointer",
                      fontSize: "1.5vw",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                      border: "0.2vw solid #000000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "5vw",
                      height: "5vw"
                    }}
                    title="Select only colored pixels"
                  >
                    Color
                  </button>
                </div>
                <div style={{ display: "flex", gap: "0px" }}>
                  <button
                    onClick={() => setShowLayersMenu(!showLayersMenu)}
                    style={{
                      background: showLayersMenu ? "#000" : "#fff",
                      color: showLayersMenu ? "#fff" : "#000",
                      border: "0.15vw solid #000",
                      padding: "0",
                      cursor: "pointer",
                      fontSize: "1.2vw",
                      fontWeight: "bold",
                      width: "5vw",
                      height: "5vw",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <i className="fas fa-layer-group"></i>
                  </button>
                  <button
                    onClick={() => {
                      setActiveDrawingTool("pencil");
                      setSelectedPixels([]);
                      setSelectionStart(null);
                      setSelectionEnd(null);
                    }}
                    style={{
                      background: "#000",
                      color: "white",
                      border: "0.15vw solid #000",
                      padding: "0",
                      cursor: "pointer",
                      fontSize: "2.5vw",
                      fontWeight: "bold",
                      width: "5vw",
                      height: "5vw",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* Selected Pixels Count */}
              {selectedPixels.length > 0 && (
                <div style={{ fontSize: "0.7vw", color: "#4CAF50", fontWeight: "bold", whiteSpace: "nowrap", textAlign: "center" }}>
                  ({selectedPixels.length} selected)
                </div>
              )}
            </div>
          )}

          {/* LAYERS MENU - Row 2 */}
          {showLayersMenu && (
            <div style={{
              background: "#ffffff",
              color: "#000000",
              padding: "0px",
              display: "flex",
              flexDirection: "column",
              gap: "0px",
              borderLeft: "0.3vw solid #000000",
              overflow: "hidden",
              position: "relative"
            }}>
              
              {/* Scrollable Content Container */}
              <div 
                ref={(el) => {
                  if (el) {
                    el.layersScrollContainer = true;
                  }
                }}
                style={{
                  padding: "0px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  scrollbarWidth: "none", // Hide default scrollbar for Firefox
                  msOverflowStyle: "none", // Hide default scrollbar for IE/Edge
                  flex: 1,
                  position: "relative"
                }}
                onScroll={(e) => {
                  const container = e.target;
                  const scrollbar = container.parentElement?.querySelector('[data-vertical-scrollbar="true"]');
                  if (scrollbar) {
                    const maxScroll = container.scrollHeight - container.clientHeight;
                    const scrollPercent = maxScroll > 0 ? container.scrollTop / maxScroll : 0;
                    const trackHeight = scrollbar.offsetHeight;
                    const thumbHeight = Math.max(20, (container.clientHeight / container.scrollHeight) * trackHeight);
                    const maxThumbTop = trackHeight - thumbHeight;
                    const thumbTop = scrollPercent * maxThumbTop;
                    const thumb = scrollbar.querySelector('[data-vertical-scrollbar-thumb="true"]');
                    if (thumb) {
                      thumb.style.top = `${thumbTop}px`;
                    }
                  }
                }}
              >
                {/* Add CSS to hide webkit scrollbar */}
                <style>{`
                  [ref*="layersScrollContainer"]::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
              
              {/* Layers Menu Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0px" }}>
                <div style={{ fontSize: "2vw", fontWeight: "bold", color: "#000000" }}>
                  Layers
                </div>
                <button
                  onClick={() => setShowLayersMenu(false)}
                  style={{
                    background: "#000",
                    color: "white",
                    border: "0.2vw solid #000",
                    padding: "0px",
                    cursor: "pointer",
                    fontSize: "2.5vw",
                    fontWeight: "bold",
                    width: "5vw",
                    height: "5vw",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ✕
                </button>
              </div>
              
              {/* Group Creation Section */}
              <div style={{ display: "flex", gap: "0px", alignItems: "center", marginBottom: "0px" }}>
                <input
                  type="text"
                  placeholder="Layer Name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      createGroup(e.target.value.trim());
                      e.target.value = "";
                    }
                  }}
                  style={{
                    padding: "0px",
                    fontSize: "1.5vw",
                    border: "0.2vw solid #000",
                    textAlign: "center",
                    background: "#fff",
                    color: "#000",
                    flex: 1,
                    width: "0vw",
                    lineHeight: "5vw"
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Layer Name"]');
                    if (input && input.value.trim()) {
                      createGroup(input.value.trim());
                      input.value = "";
                    }
                  }}
                  style={{
                    background: "#fff",
                    color: "#000",
                    border: "0.2vw solid #000",
                    cursor: "pointer",
                    fontSize: "1.05vw",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "5vw",
                    height: "5vw",
                    borderRadius: "0"
                  }}
                >
                  Create +
                </button>
              </div>
              
              
              {/* Layers Grid - Desktop */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto auto",
                gap: "0px",
                alignItems: "center",
                background: "#1a1a1a",
                padding: "0px",
                borderRadius: "0",
                fontSize: "0.7vw"
              }}>
                {/* Header Row */}
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Z</div>
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Name</div>
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Up</div>
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Down</div>
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Del</div>
                
                {/* Layer Rows - Sorted by z-index descending */}
                {groups.filter(g => g.name !== "__selected__").sort((a, b) => b.zIndex - a.zIndex).map((group, index) => (
                  <div
                    key={group.name}
                    draggable
                    onDragStart={(e) => {
                      setDraggedLayer(group.name);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverLayer(group.name);
                    }}
                    onDragLeave={() => {
                      setDragOverLayer(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedLayer && draggedLayer !== group.name) {
                        // Swap z-indices
                        const draggedGroup = groups.find(g => g.name === draggedLayer);
                        const targetGroup = groups.find(g => g.name === group.name);
                        
                        if (draggedGroup && targetGroup) {
                          const tempZ = draggedGroup.zIndex;
                          const newGroups = groups.map(g => {
                            if (g.name === draggedLayer) return { ...g, zIndex: targetGroup.zIndex };
                            if (g.name === group.name) return { ...g, zIndex: tempZ };
                            return g;
                          });
                          setGroups(newGroups);
                          
                          // Update pixelGroups
                          const newPixelGroups = {};
                          Object.keys(pixelGroups).forEach(idx => {
                            const pg = pixelGroups[idx];
                            if (pg.group === draggedLayer) {
                              newPixelGroups[idx] = { ...pg, zIndex: targetGroup.zIndex };
                            } else if (pg.group === group.name) {
                              newPixelGroups[idx] = { ...pg, zIndex: tempZ };
                            } else {
                              newPixelGroups[idx] = pg;
                            }
                          });
                          setPixelGroups(newPixelGroups);
                        }
                      }
                      setDraggedLayer(null);
                      setDragOverLayer(null);
                    }}
                    style={{
                      display: "contents",
                      cursor: "grab"
                    }}
                  >
                    {/* Z-Index */}
                    <div style={{
                      fontSize: "1.5vw",
                      fontWeight: "bold",
                      padding: "0px",
                      background: "#000",
                      color: "#fff",
                      borderRadius: "0",
                      textAlign: "center",
                      border: "0.15vw solid #fff",
                      cursor: "grab",
                      width: "5vw",
                      height: "5vw",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {group.zIndex}
                    </div>
                    
                    {/* Layer Name */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0px", flex: 1 }}>
                      <div style={{ position: "relative", display: "flex" }}>
                        <div
                          onClick={() => {
                            const isActivating = activeGroup !== group.name;
                            setActiveGroup(activeGroup === group.name ? null : group.name);
                            setSelectedPixels([]); // Clear green selection preview
                            setSelectionStart(null); // Clear selection state
                            setSelectionEnd(null);
                            // If activating this layer, restore original selection from localStorage
                            if (isActivating) {
                              try {
                                const storedGroups = localStorage.getItem("pixelgrid_groups");
                                if (storedGroups) {
                                  const parsedGroups = JSON.parse(storedGroups);
                                  const storedLayer = parsedGroups.find(g => g.name === group.name);
                                  if (storedLayer && storedLayer.originalSelectionArea && storedLayer.originalSelectionArea.length > 0) {
                                    setSelectedPixels(storedLayer.originalSelectionArea);
                                  }
                                }
                              } catch (error) {
                                console.error("Failed to restore selection from localStorage:", error);
                              }
                            }
                          }}
                          style={{
                            fontSize: "1.5vw",
                            padding: "0px",
                            background: "#000",
                            borderRadius: "0",
                            color: "#fff",
                            cursor: "pointer",
                            border: "0.15vw solid #fff",
                            fontWeight: "normal",
                            overflow: "hidden",
                            lineHeight: "5vw",
                            height: "5vw",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1
                          }}
                        >
                          {group.name}
                        </div>
                        <button
                          onClick={() => {
                            const newName = prompt("Enter new name for layer:", group.name);
                            if (newName && newName.trim() && newName !== group.name) {
                              const newGroups = groups.map(g => 
                                g.name === group.name ? { ...g, name: newName.trim() } : g
                              );
                              setGroups(newGroups);
                              const newPixelGroups = {};
                              Object.keys(pixelGroups).forEach(idx => {
                                const pg = pixelGroups[idx];
                                newPixelGroups[idx] = pg.group === group.name 
                                  ? { ...pg, group: newName.trim() }
                                  : pg;
                              });
                              setPixelGroups(newPixelGroups);
                              if (activeGroup === group.name) {
                                setActiveGroup(newName.trim());
                              }
                            }
                          }}
                          style={{
                            width: "5vw",
                            height: "5vw",
                            background: "#000",
                            color: "white",
                            border: "0.2vw solid #000",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "2.5vw",
                            fontWeight: "bold",
                            borderRadius: "0",
                            padding: "0px"
                          }}
                        >
                          ✎
                        </button>
                      </div>
                      
                      {/* Directional Movement Buttons - Show when movegroup tool is active and this layer is active */}
                      {activeDrawingTool === "movegroup" && activeGroup === group.name && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.2vw" }}>
                          {/* Left Button */}
                          <button
                            onClick={() => moveGroup(group.name, 0, -1)}
                            style={{
                              background: "#9C27B0",
                              color: "white",
                              border: "0.15vw solid #000",
                              width: "2.5vw",
                              height: "2.5vw",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              fontSize: "1vw",
                              fontWeight: "900",
                              borderRadius: "0"
                            }}
                            title="Move left"
                          >
                            ←
                          </button>
                          
                          {/* Up Button */}
                          <button
                            onClick={() => moveGroup(group.name, -1, 0)}
                            style={{
                              background: "#9C27B0",
                              color: "white",
                              border: "0.15vw solid #000",
                              width: "2.5vw",
                              height: "2.5vw",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              fontSize: "1vw",
                              fontWeight: "900",
                              borderRadius: "0"
                            }}
                            title="Move up"
                          >
                            ↑
                          </button>
                          
                          {/* Down Button */}
                          <button
                            onClick={() => moveGroup(group.name, 1, 0)}
                            style={{
                              background: "#9C27B0",
                              color: "white",
                              border: "0.15vw solid #000",
                              width: "2.5vw",
                              height: "2.5vw",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              fontSize: "1vw",
                              fontWeight: "900",
                              borderRadius: "0"
                            }}
                            title="Move down"
                          >
                            ↓
                          </button>
                          
                          {/* Right Button */}
                          <button
                            onClick={() => moveGroup(group.name, 0, 1)}
                            style={{
                              background: "#9C27B0",
                              color: "white",
                              border: "0.15vw solid #000",
                              width: "2.5vw",
                              height: "2.5vw",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              fontSize: "1vw",
                              fontWeight: "900",
                              borderRadius: "0"
                            }}
                            title="Move right"
                          >
                            →
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Move Up Button */}
                    <button
                      onClick={() => {
                        const newGroups = groups.map(g => 
                          g.name === group.name ? { ...g, zIndex: g.zIndex + 1 } : g
                        );
                        setGroups(newGroups);
                        const newPixelGroups = {};
                        Object.keys(pixelGroups).forEach(idx => {
                          const pg = pixelGroups[idx];
                          newPixelGroups[idx] = pg.group === group.name 
                            ? { ...pg, zIndex: pg.zIndex + 1 }
                            : pg;
                        });
                        setPixelGroups(newPixelGroups);
                      }}
                      style={{
                        background: "#000",
                        color: "white",
                        border: "0.2vw solid #000",
                        width: "5vw",
                        height: "5vw",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "2.5vw",
                        fontWeight: "bold",
                        borderRadius: "0",
                        padding: "0px"
                      }}
                    >
                      ▲
                    </button>
                    
                    {/* Move Down Button */}
                    <button
                      onClick={() => {
                        const newGroups = groups.map(g => 
                          g.name === group.name ? { ...g, zIndex: g.zIndex - 1 } : g
                        );
                        setGroups(newGroups);
                        const newPixelGroups = {};
                        Object.keys(pixelGroups).forEach(idx => {
                          const pg = pixelGroups[idx];
                          newPixelGroups[idx] = pg.group === group.name 
                            ? { ...pg, zIndex: pg.zIndex - 1 }
                            : pg;
                        });
                        setPixelGroups(newPixelGroups);
                      }}
                      style={{
                        background: "#000",
                        color: "white",
                        border: "0.2vw solid #000",
                        width: "5vw",
                        height: "5vw",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "2.5vw",
                        fontWeight: "bold",
                        borderRadius: "0",
                        padding: "0px"
                      }}
                    >
                      ▼
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (group.locked) {
                          alert("Background layer is locked and cannot be deleted.");
                          return;
                        }
                        if (window.confirm(`Delete layer "${group.name}"? This will ungroup all pixels.`)) {
                          // Remove group
                          setGroups(groups.filter(g => g.name !== group.name));
                          
                          // Remove pixels from group
                          const newPixelGroups = {};
                          Object.keys(pixelGroups).forEach(idx => {
                            if (pixelGroups[idx].group !== group.name) {
                              newPixelGroups[idx] = pixelGroups[idx];
                            }
                          });
                          setPixelGroups(newPixelGroups);
                          
                          // Clear active group if this was it
                          if (activeGroup === group.name) {
                            setActiveGroup(null);
                          }
                        }
                      }}
                      style={{
                        background: "#000",
                        color: "white",
                        border: "0.2vw solid #000",
                        width: "5vw",
                        height: "5vw",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "2.5vw",
                        fontWeight: "bold",
                        borderRadius: "0",
                        padding: "0px"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              </div>
              
              {/* Custom Vertical Scrollbar - Mobile Only */}
              {size.w <= 1024 && (
              <div
                data-vertical-scrollbar="true"
                style={{
                  position: "absolute",
                  right: "0",
                  top: "0",
                  bottom: "0",
                  width: "2vw",
                  background: "#ddd",
                  borderLeft: "0.2vw solid #000",
                  pointerEvents: "auto"
                }}
                onPointerDown={(e) => {
                  const scrollbar = e.currentTarget;
                  const container = scrollbar.parentElement?.querySelector('[ref*="layersScrollContainer"]');
                  if (!container) return;
                  
                  const rect = scrollbar.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const percent = y / rect.height;
                  const maxScroll = container.scrollHeight - container.clientHeight;
                  container.scrollTop = percent * maxScroll;
                }}
              >
                <div
                  data-vertical-scrollbar-thumb="true"
                  style={{
                    position: "absolute",
                    left: "0",
                    right: "0",
                    top: "0",
                    height: "20px",
                    background: "#000",
                    border: "0.1vw solid #fff",
                    cursor: "pointer",
                    minHeight: "20px"
                  }}
                />
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SELECT MENU - Mobile Only */}
      {viewMode === "layers" && activeDrawingTool === "select" && size.w <= 1024 && (
        <div style={{
          position: "fixed",
          bottom: showLayersMenu ? "45vw" : "10vw",
          left: "10vw",
          right: 0,
          background: "#ffffff",
          color: "#000000",
          padding: "0px",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          gap: "0px",
          borderTop: "0.3vw solid #000000",
          maxHeight: "35vw",
          overflowY: "auto"
        }}>
          
          {/* Select Menu Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0px" }}>
            <div style={{ display: "flex", gap: "0px", alignItems: "center" }}>
              <div style={{ fontSize: "2vw", fontWeight: "bold" }}>
                Select
              </div>
              {/* Selection Mode Toggle */}
              <button
                onClick={() => setSelectAllPixels(!selectAllPixels)}
                style={{
                  background: "#000000",
                  color: "#ffffff",
                  padding: "0",
                  cursor: "pointer",
                  fontSize: "1.5vw",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3vw",
                  width: "10vw",
                  height: "10vw"
                }}
                title={selectAllPixels ? "Selecting all pixels in box" : "Selecting only colored pixels"}
              >
                <i className={selectAllPixels ? "fas fa-check-square" : "fas fa-square"}></i>
                {selectAllPixels ? "All" : "Color"}
              </button>
            </div>
            <div style={{ display: "flex", gap: "0px" }}>
              <button
                onClick={() => setShowLayersMenu(!showLayersMenu)}
                style={{
                  background: showLayersMenu ? "#000" : "#fff",
                  color: showLayersMenu ? "#fff" : "#000",
                  border: "0.15vw solid #000",
                  padding: "0",
                  cursor: "pointer",
                  fontSize: "1.2vw",
                  fontWeight: "bold",
                  width: "10vw",
                  height: "10vw",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <i className="fas fa-layer-group"></i>
              </button>
              <button
                onClick={() => {
                  setActiveDrawingTool("pencil");
                  setSelectedPixels([]);
                  setSelectionStart(null);
                  setSelectionEnd(null);
                }}
                style={{
                  background: "#000",
                  color: "white",
                  border: "0.15vw solid #000",
                  padding: "0",
                  cursor: "pointer",
                  fontSize: "2.5vw",
                  fontWeight: "bold",
                  width: "10vw",
                  height: "10vw",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Selected Pixels Count */}
          {selectedPixels.length > 0 && (
            <div style={{ fontSize: "0.7vw", color: "#4CAF50", fontWeight: "bold", whiteSpace: "nowrap", textAlign: "center" }}>
              ({selectedPixels.length} selected)
            </div>
          )}
        </div>
      )}

      {/* LAYERS MENU - Mobile Only */}
      {showLayersMenu && size.w <= 1024 && (
        <div style={{
          position: "fixed",
          bottom: "10vw",
          left: "10vw",
          right: 0,
          background: "#ffffff",
          color: "#ffffff",
          zIndex: 1000,
          display: "grid",
          gridTemplateColumns: "1fr 10vw",
          gap: "0px",
          borderTop: "0.3vw solid #000000",
          height: "35vw"
        }}>
          {/* Main Content Area */}
          <div 
            data-mobile-layers-scroll-container="true"
            onScroll={(e) => setVerticalScrollPosition(e.target.scrollTop)}
            style={{
            padding: "0px",
            display: "flex",
            flexDirection: "column",
            gap: "0px",
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}>
          
          {/* Layers Menu Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0px" }}>
            <div style={{ fontSize: "2vw", fontWeight: "bold", color: "#000000" }}>
              Layers
            </div>
            <button
              onClick={() => setShowLayersMenu(false)}
              style={{
                background: "#000",
                color: "white",
                border: "0.2vw solid #000",
                padding: "0px",
                cursor: "pointer",
                fontSize: "2.5vw",
                fontWeight: "bold",
                width: "10vw",
                height: "10vw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ✕
            </button>
          </div>
          
          {/* Group Creation Section */}
          <div style={{ display: "flex", gap: "0px", alignItems: "center", marginBottom: "0px" }}>
            <input
              type="text"
              placeholder="Layer Name"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.value.trim()) {
                  createGroup(e.target.value.trim());
                  e.target.value = "";
                }
              }}
              style={{
                padding: "0px",
                fontSize: "1.5vw",
                border: "0.2vw solid #000",
                textAlign: "center",
                background: "#fff",
                color: "#000",
                flex: 1,
                lineHeight: "10vw"
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="Layer Name"]');
                if (input && input.value.trim()) {
                  createGroup(input.value.trim());
                  input.value = "";
                }
              }}
              style={{
                background: "#fff",
                color: "#000",
                border: "0.2vw solid #000",
                cursor: "pointer",
                fontSize: "1.5vw",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "10vw",
                height: "10vw",
                borderRadius: "0"
              }}
            >
              Create +
            </button>
          </div>
          
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto auto",
                gap: "0px",
                alignItems: "center",
                background: "#1a1a1a",
                padding: "0px",
                borderRadius: "0",
                fontSize: "0.7vw"
              }}>
                {/* Header Row */}
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Z</div>
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Name</div>
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Up</div>
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Down</div>
                <div style={{ fontWeight: "bold", padding: "0px", color: "white" }}>Del</div>
                
                {/* Layer Rows - Sorted by z-index descending */}
                {groups.filter(g => g.name !== "__selected__").sort((a, b) => b.zIndex - a.zIndex).map((group, index) => (
                  <div
                    key={group.name}
                    draggable
                    onDragStart={(e) => {
                      setDraggedLayer(group.name);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverLayer(group.name);
                    }}
                    onDragLeave={() => {
                      setDragOverLayer(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedLayer && draggedLayer !== group.name) {
                        // Swap z-indices
                        const draggedGroup = groups.find(g => g.name === draggedLayer);
                        const targetGroup = groups.find(g => g.name === group.name);
                        
                        if (draggedGroup && targetGroup) {
                          const tempZ = draggedGroup.zIndex;
                          const newGroups = groups.map(g => {
                            if (g.name === draggedLayer) return { ...g, zIndex: targetGroup.zIndex };
                            if (g.name === group.name) return { ...g, zIndex: tempZ };
                            return g;
                          });
                          setGroups(newGroups);
                          
                          // Update pixelGroups
                          const newPixelGroups = {};
                          Object.keys(pixelGroups).forEach(idx => {
                            const pg = pixelGroups[idx];
                            if (pg.group === draggedLayer) {
                              newPixelGroups[idx] = { ...pg, zIndex: targetGroup.zIndex };
                            } else if (pg.group === group.name) {
                              newPixelGroups[idx] = { ...pg, zIndex: tempZ };
                            } else {
                              newPixelGroups[idx] = pg;
                            }
                          });
                          setPixelGroups(newPixelGroups);
                        }
                      }
                      setDraggedLayer(null);
                      setDragOverLayer(null);
                    }}
                    style={{
                      display: "contents",
                      cursor: "grab"
                    }}
                  >
                    {/* Z-Index */}
                    <div style={{
                      fontSize: "3vw",
                      fontWeight: "bold",
                      padding: "0px",
                      background: "#000",
                      color: "#fff",
                      borderRadius: "0",
                      textAlign: "center",
                      border: "0.15vw solid #fff",
                      cursor: "grab",
                      width: "10vw",
                      height: "10vw",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {group.zIndex}
                    </div>
                    
                    {/* Layer Name with Edit Button */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0px", flex: 1 }}>
                      <div style={{ position: "relative", display: "flex" }}>
                        <div
                          onClick={() => {
                            setActiveGroup(activeGroup === group.name ? null : group.name);
                            setSelectedPixels([]);
                            setSelectionStart(null);
                            setSelectionEnd(null);
                          }}
                          style={{
                            fontSize: "3vw",
                            padding: "0px",
                            background: "#000",
                            borderRadius: "0",
                            color: "#fff",
                            cursor: "pointer",
                            border: "0.15vw solid #fff",
                            fontWeight: "normal",
                            overflow: "hidden",
                            lineHeight: "10vw",
                            height: "10vw",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1
                          }}
                        >
                          {group.name}
                        </div>
                        <button
                          onClick={() => {
                            const newName = prompt("Enter new name:", group.name);
                            if (newName && newName.trim() && newName !== group.name) {
                              const newGroups = groups.map(g => 
                                g.name === group.name ? { ...g, name: newName.trim() } : g
                              );
                              setGroups(newGroups);
                              
                              const newPixelGroups = {};
                              Object.keys(pixelGroups).forEach(idx => {
                                const pg = pixelGroups[idx];
                                newPixelGroups[idx] = pg.group === group.name 
                                  ? { ...pg, group: newName.trim() }
                                  : pg;
                              });
                              setPixelGroups(newPixelGroups);
                              if (activeGroup === group.name) {
                                setActiveGroup(newName.trim());
                              }
                            }
                          }}
                          style={{
                            width: "5vw",
                            height: "10vw",
                            background: "#000",
                            color: "#fff",
                            border: "0.15vw solid #fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "2.5vw",
                            fontWeight: "bold",
                            borderRadius: "0"
                          }}
                        >
                          ✎
                        </button>
                      </div>
                    </div>
                    
                    {/* Up Button */}
                    <button
                      onClick={() => {
                        const newGroups = groups.map(g => 
                          g.name === group.name ? { ...g, zIndex: g.zIndex + 1 } : g
                        );
                        setGroups(newGroups);
                        const newPixelGroups = {};
                        Object.keys(pixelGroups).forEach(idx => {
                          const pg = pixelGroups[idx];
                          newPixelGroups[idx] = pg.group === group.name 
                            ? { ...pg, zIndex: pg.zIndex + 1 }
                            : pg;
                        });
                        setPixelGroups(newPixelGroups);
                      }}
                      style={{
                        background: "#fff",
                        color: "#000",
                        border: "0.2vw solid #000",
                        width: "10vw",
                        height: "10vw",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "2.5vw",
                        fontWeight: "bold",
                        borderRadius: "0"
                      }}
                    >
                      ▲
                    </button>
                    
                    {/* Down Button */}
                    <button
                      onClick={() => {
                        const newGroups = groups.map(g => 
                          g.name === group.name ? { ...g, zIndex: g.zIndex - 1 } : g
                        );
                        setGroups(newGroups);
                        const newPixelGroups = {};
                        Object.keys(pixelGroups).forEach(idx => {
                          const pg = pixelGroups[idx];
                          newPixelGroups[idx] = pg.group === group.name 
                            ? { ...pg, zIndex: pg.zIndex - 1 }
                            : pg;
                        });
                        setPixelGroups(newPixelGroups);
                      }}
                      style={{
                        background: "#fff",
                        color: "#000",
                        border: "0.2vw solid #000",
                        width: "10vw",
                        height: "10vw",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "2.5vw",
                        fontWeight: "bold",
                        borderRadius: "0"
                      }}
                    >
                      ▼
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete layer "${group.name}"?`)) {
                          setGroups(groups.filter(g => g.name !== group.name));
                          const newPixelGroups = {};
                          Object.keys(pixelGroups).forEach(idx => {
                            if (pixelGroups[idx].group !== group.name) {
                              newPixelGroups[idx] = pixelGroups[idx];
                            }
                          });
                          setPixelGroups(newPixelGroups);
                          if (activeGroup === group.name) {
                            setActiveGroup(null);
                          }
                        }
                      }}
                      style={{
                        background: "#fff",
                        color: "#000",
                        border: "0.2vw solid #000",
                        width: "10vw",
                        height: "10vw",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "2.5vw",
                        fontWeight: "bold",
                        borderRadius: "0"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
          </div>
          
          {/* Custom Scrollbar Column */}
          {(() => {
            const scrollContainer = document.querySelector('[data-mobile-layers-scroll-container="true"]');
            const needsScroll = scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight;
            return needsScroll ? (
          <div style={{
            width: "10vw",
            background: "#fefefe",
            borderLeft: "0.2vw solid #000",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Up Arrow */}
            <div 
              onClick={() => {
                const scrollContainer = document.querySelector('[data-mobile-layers-scroll-container="true"]');
                if (scrollContainer) {
                  scrollContainer.scrollTop -= 100;
                  setVerticalScrollPosition(scrollContainer.scrollTop);
                }
              }}
              style={{
                width: "10vw",
                height: "10vw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fefefe",
                borderBottom: "0.2vw solid #000",
                cursor: "pointer",
                fontSize: "5vw",
                color: "#000"
              }}
            >
              ▲
            </div>
            
            {/* Scrollbar Track */}
            <div 
              data-mobile-layers-scrollbar-track="true"
              style={{
                width: "10vw",
                flex: 1,
                background: "#fefefe",
                position: "relative",
                padding: "1vw",
                display: "flex",
                alignItems: "center"
              }}
            >
              <div 
                onPointerDown={(e) => {
                  setIsDraggingVerticalSlider(true);
                  const scrollContainer = document.querySelector('[data-mobile-layers-scroll-container="true"]');
                  if (!scrollContainer) return;
                  
                  const rect = e.currentTarget.parentElement.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const percent = y / rect.height;
                  const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
                  const newScrollTop = percent * maxScroll;
                  scrollContainer.scrollTop = newScrollTop;
                  setVerticalScrollPosition(newScrollTop);
                }}
                style={{
                width: "8vw",
                height: "100%",
                background: "#fff",
                border: "0.2vw solid #000",
                position: "relative",
                cursor: "pointer",
                touchAction: "none"
              }}>
                {/* Scrollbar thumb */}
                <div style={{
                  position: "absolute",
                  top: (() => {
                    const scrollContainer = document.querySelector('[data-mobile-layers-scroll-container="true"]');
                    if (!scrollContainer) return "0%";
                    const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
                    if (maxScroll <= 0) return "0%";
                    const scrollPercent = verticalScrollPosition / maxScroll;
                    const trackElement = document.querySelector('[data-mobile-layers-scrollbar-track="true"]');
                    if (!trackElement) return "0%";
                    const trackInnerDiv = trackElement.querySelector('div');
                    if (!trackInnerDiv) return "0%";
                    const trackHeight = trackInnerDiv.offsetHeight;
                    const thumbHeight = (8 / 100) * window.innerWidth; // 8vw to pixels
                    const maxThumbTop = trackHeight - thumbHeight;
                    const thumbTop = Math.min(scrollPercent * maxThumbTop, maxThumbTop);
                    return `${thumbTop}px`;
                  })(),
                  left: 0,
                  width: "8vw",
                  height: "8vw",
                  background: "#000",
                  pointerEvents: "none"
                }}></div>
              </div>
            </div>
            
            {/* Down Arrow */}
            <div
              onClick={() => {
                const scrollContainer = document.querySelector('[data-mobile-layers-scroll-container="true"]');
                if (scrollContainer) {
                  scrollContainer.scrollTop += 100;
                  setVerticalScrollPosition(scrollContainer.scrollTop);
                }
              }}
              style={{
                width: "10vw",
                height: "10vw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fefefe",
                borderTop: "0.2vw solid #000",
                cursor: "pointer",
                fontSize: "5vw",
                color: "#000"
              }}
            >
              ▼
            </div>
          </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
