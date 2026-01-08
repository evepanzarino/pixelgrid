import { useEffect, useState, useRef, useCallback } from "react";
import "./pixelgrid.css";

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
  const [activeDrawingTool, setActiveDrawingTool] = useState("pencil"); // "pencil", "line", "curve", "bucket", "select", "movegroup"
  const [lineStartPixel, setLineStartPixel] = useState(null); // For line/curve tool: first click position
  const [curveEndPixel, setCurveEndPixel] = useState(null); // For curve tool adjustment mode
  const [curveCurveAmount, setCurveCurveAmount] = useState(0); // Curve adjustment: -100 to 100%
  const [selectionStart, setSelectionStart] = useState(null); // Rectangle selection start
  const [selectionEnd, setSelectionEnd] = useState(null); // Rectangle selection end (during drag)
  const [selectedPixels, setSelectedPixels] = useState([]); // Array of selected pixel indices
  const [showGroupDialog, setShowGroupDialog] = useState(false); // Show group assignment dialog
  
  const [pixelGroups, setPixelGroups] = useState(() => {
    try {
      const saved = localStorage.getItem("pixelgrid_pixelGroups");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  
  const [groups, setGroups] = useState(() => {
    try {
      const saved = localStorage.getItem("pixelgrid_groups");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [activeGroup, setActiveGroup] = useState(null); // Currently selected group for moving
  const [groupDragStart, setGroupDragStart] = useState(null); // { pixelIndex, startRow, startCol }
  const [groupDragCurrent, setGroupDragCurrent] = useState(null); // Current hover position during drag
  
  // Layer drag-and-drop state
  const [draggedLayer, setDraggedLayer] = useState(null);
  const [dragOverLayer, setDragOverLayer] = useState(null);
  
  // Lazy-loaded tool modules
  const [loadedTools, setLoadedTools] = useState({});
  const [toolsLoading, setToolsLoading] = useState({});
  
  const color = activeTool === "primary" ? primaryColor : secondaryColor;
  const gridRef = useRef(null);
  
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
    if (activeDrawingTool && activeDrawingTool !== 'pencil') {
      loadTool(activeDrawingTool);
    }
  }, [activeDrawingTool, loadTool]);

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
      const saved = localStorage.getItem("pixelgrid_pixelColors");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length === totalPixels) return parsed;
        // If size changed, extend or trim array
        const newArray = Array(totalPixels).fill("#ffffff");
        const copyLength = Math.min(parsed.length, totalPixels);
        for (let i = 0; i < copyLength; i++) {
          newArray[i] = parsed[i];
        }
        return newArray;
      }
    } catch { }
    return Array(totalPixels).fill("#ffffff");
  });

  const fileInputRef = useRef(null);
  
  // Save pixelColors to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_pixelColors", JSON.stringify(pixelColors));
    } catch (error) {
      console.error("Failed to save pixel colors:", error);
    }
  }, [pixelColors]);
  
  // Save groups and pixelGroups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_groups", JSON.stringify(groups));
    } catch (error) {
      console.error("Failed to save groups:", error);
    }
  }, [groups]);
  
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

  // Update pixel array when totalPixels changes, preserving existing data
  useEffect(() => {
    setPixelColors((prev) => {
      if (prev.length === totalPixels) return prev;
      const newArray = Array(totalPixels).fill("#ffffff");
      // Copy over existing colors
      const copyLength = Math.min(prev.length, totalPixels);
      for (let i = 0; i < copyLength; i++) {
        newArray[i] = prev[i];
      }
      return newArray;
    });
  }, [totalPixels]);

  useEffect(() => {
    function handleResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    const stopDrawing = () => {
      setIsDrawing(false);
      
      // Don't clear hoveredPixel if we're in line/curve mode waiting for second click
      if (!((activeDrawingTool === "line" || activeDrawingTool === "curve") && lineStartPixel !== null)) {
        setHoveredPixel(null);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointerup", stopDrawing);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointerup", stopDrawing);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDrawingTool]);

  function paintPixel(e, index) {
    setPixelColors((prev) => {
      const copy = [...prev];
      copy[index] = color;
      return copy;
    });
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
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  function getContrastBorderColor(bgColor) {
    return isLightColor(bgColor) ? "#000000" : "#ffffff";
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
    setPixelColors((prev) => {
      const copy = [...prev];
      linePixels.forEach(i => {
        copy[i] = color;
      });
      return copy;
    });
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

  // Get all pixels in selection rectangle (for preview)
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
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const pixelIndex = row * 200 + col;
        // Include pixels that:
        // 1. Are not white (have been painted with a color)
        // 2. OR are already part of a group (even if white)
        if (pixelColors[pixelIndex] !== "#ffffff" || pixelGroups[pixelIndex]) {
          pixels.push(pixelIndex);
        }
      }
    }
    return pixels;
  }

  // Create group from selected pixels
  function createGroup(groupName) {
    if (selectedPixels.length === 0) return;
    
    const newGroups = [...groups];
    const existingGroup = newGroups.find(g => g.name === groupName);
    const zIndex = existingGroup ? existingGroup.zIndex : groups.length;
    
    if (!existingGroup) {
      newGroups.push({ name: groupName, zIndex });
      setGroups(newGroups);
    }
    
    const newPixelGroups = { ...pixelGroups };
    selectedPixels.forEach(pixelIndex => {
      newPixelGroups[pixelIndex] = { group: groupName, zIndex };
    });
    setPixelGroups(newPixelGroups);
    
    setSelectedPixels([]);
    setSelectionStart(null);
    setSelectionEnd(null);
    // Keep bottom bar open and activate the newly created group
    setActiveGroup(groupName);
    setShowGroupDialog(true);
  }

  // Move group pixels
  function moveGroup(groupName, deltaRow, deltaCol) {
    const groupPixels = Object.keys(pixelGroups)
      .filter(idx => pixelGroups[idx].group === groupName)
      .map(idx => parseInt(idx));
    
    if (groupPixels.length === 0) return;
    
    // Get colors and clear old positions
    const pixelData = groupPixels.map(idx => ({
      oldIndex: idx,
      color: pixelColors[idx],
      row: Math.floor(idx / 200),
      col: idx % 200
    }));
    
    setPixelColors(prev => {
      const copy = [...prev];
      // Clear old positions
      pixelData.forEach(p => {
        copy[p.oldIndex] = "#ffffff";
      });
      // Set new positions
      pixelData.forEach(p => {
        const newRow = p.row + deltaRow;
        const newCol = p.col + deltaCol;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
          const newIndex = newRow * 200 + newCol;
          copy[newIndex] = p.color;
        }
      });
      return copy;
    });
    
    // Update pixel groups mapping
    const newPixelGroups = { ...pixelGroups };
    pixelData.forEach(p => {
      delete newPixelGroups[p.oldIndex];
      const newRow = p.row + deltaRow;
      const newCol = p.col + deltaCol;
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
        const newIndex = newRow * 200 + newCol;
        newPixelGroups[newIndex] = pixelGroups[p.oldIndex] || { group: groupName, zIndex: 0 };
      }
    });
    setPixelGroups(newPixelGroups);
  }

  // Move selected pixels (not in a group)
  function moveSelectedPixels(deltaRow, deltaCol) {
    if (selectedPixels.length === 0) return;
    
    // Get colors and positions of selected pixels
    const pixelData = selectedPixels.map(idx => ({
      oldIndex: idx,
      color: pixelColors[idx],
      row: Math.floor(idx / 200),
      col: idx % 200
    }));
    
    setPixelColors(prev => {
      const copy = [...prev];
      // Clear old positions
      pixelData.forEach(p => {
        copy[p.oldIndex] = "#ffffff";
      });
      // Set new positions
      pixelData.forEach(p => {
        const newRow = p.row + deltaRow;
        const newCol = p.col + deltaCol;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
          const newIndex = newRow * 200 + newCol;
          copy[newIndex] = p.color;
        }
      });
      return copy;
    });
    
    // Update selected pixels to new positions
    const newSelectedPixels = pixelData.map(p => {
      const newRow = p.row + deltaRow;
      const newCol = p.col + deltaCol;
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < 200) {
        return newRow * 200 + newCol;
      }
      return null;
    }).filter(idx => idx !== null);
    
    setSelectedPixels(newSelectedPixels);
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
        gridTemplateColumns: `${logoPixelSize * 7}vw ${titlePixelSize * 4}vw ${titlePixelSize * 2}vw ${titlePixelSize * 4}vw ${titlePixelSize * 4}vw ${titlePixelSize * 3}vw ${titlePixelSize * 5}vw ${titlePixelSize * 4}vw ${titlePixelSize * 2}vw ${titlePixelSize * 4}vw .75vw auto auto auto auto`,
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
              background: "#222",
              color: "white",
              width: "100%",
              cursor: "pointer",
              fontSize: "2vw"
            }}
          >
            File
          </button>

          {showFileMenu && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "#222",
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
                  fontSize: ".9vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw"
                }}
              >
                Save
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
                  fontSize: ".9vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw"
                }}
              >
                Load
              </div>

              <div
                onClick={() => {
                  if (window.confirm("Clear all pixels, groups, and layers? This will also clear localStorage.")) {
                    setPixelColors(Array(totalPixels).fill("#ffffff"));
                    setPixelGroups({});
                    setGroups([]);
                    setActiveGroup(null);
                    setSelectedPixels([]);
                    setSelectionStart(null);
                    setSelectionEnd(null);
                    setShowGroupDialog(false);
                    // Clear localStorage
                    try {
                      localStorage.removeItem("pixelgrid_pixelColors");
                      localStorage.removeItem("pixelgrid_pixelGroups");
                      localStorage.removeItem("pixelgrid_groups");
                    } catch (err) {
                      console.error("Failed to clear localStorage:", err);
                    }
                  }
                  setShowFileMenu(false);
                }}
                style={{
                  cursor: "pointer",
                  color: "#f44336",
                  textAlign: "center",
                  fontSize: ".9vw",
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
              background: "#222",
              color: "white",
              width: "100%",
              cursor: "pointer",
              fontSize: "2vw"
            }}
          >
            View
          </button>

          {showViewMenu && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "#222",
              display: "grid",
              width: "100%",
              boxShadow: "0 0.6vw 2vw rgba(0,0,0,0.5)",
              zIndex: 30
            }}>
              <div
                onClick={() => {
                  setViewMode("drawing");
                  setShowViewMenu(false);
                  setShowGroupDialog(false);
                  setActiveDrawingTool("pencil");
                }}
                style={{
                  cursor: "pointer",
                  color: viewMode === "drawing" ? "#4CAF50" : "white",
                  textAlign: "center",
                  fontSize: ".9vw",
                  borderBottom: "0.2vw solid #333",
                  padding: "0.5vw",
                  fontWeight: viewMode === "drawing" ? "bold" : "normal"
                }}
              >
                ✓ Drawing Mode
              </div>

              <div
                onClick={() => {
                  setViewMode("layers");
                  setShowViewMenu(false);
                  setActiveDrawingTool("select");
                  setShowGroupDialog(true);
                }}
                style={{
                  cursor: "pointer",
                  color: viewMode === "layers" ? "#4CAF50" : "white",
                  textAlign: "center",
                  fontSize: ".9vw",
                  padding: "0.5vw",
                  fontWeight: viewMode === "layers" ? "bold" : "normal"
                }}
              >
                ✓ Layers & Grouping
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
      </div>

      {/* SIDEBAR */}

<div className="grid-sidebar-wrapper" style={{display: "flex"}}>

      <div style={{
        background: "#fefefe",
        position: "relative",
        display: "inline-flex",
        width: size.w <= 1024 ? "10vw" : "7vw",
        flexDirection: "column",
        gap: "1vw",
        alignItems: "center",
        borderRight: "0.2vw solid #000000",
      }}>
        {/* TOOLS SECTION */}
        <div style={{ width: "100%", textAlign: "center", paddingTop: "1vw" }}>
          <div style={{ color: "#000000", fontSize: "1.5vw", marginBottom: "0.5vw" }}><b>Tools</b></div>
          <div style={{ display: "flex", gap: "0.5vw", justifyContent: "center", flexWrap: "wrap", padding: "0 0.5vw" }}>
            {viewMode === "drawing" && (
              <>
                <button
                  onClick={() => {
                    setActiveDrawingTool("pencil");
                    setLineStartPixel(null);
                  }}
                  style={{
                    width: size.w <= 1024 ? "8vw" : "6vw",
                    height: size.w <= 1024 ? "8vw" : "6vw",
                    background: activeDrawingTool === "pencil" ? "#333" : "#fefefe",
                    color: activeDrawingTool === "pencil" ? "#fff" : "#000",
                    border: "0.3vw solid #000000",
                    cursor: "pointer",
                    fontSize: size.w <= 1024 ? "4vw" : "3vw",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: activeDrawingTool === "pencil" ? "0px 0px .2vw .2vw #000000" : "none",
                  }}
                >
                  <i className="fas fa-paintbrush"></i>
                </button>
                <button
                  onClick={async () => {
                    await loadTool("line");
                    setActiveDrawingTool("line");
                    setLineStartPixel(null);
                  }}
                  style={{
                    width: size.w <= 1024 ? "8vw" : "6vw",
                    height: size.w <= 1024 ? "8vw" : "6vw",
                    background: activeDrawingTool === "line" ? "#333" : "#fefefe",
                    color: activeDrawingTool === "line" ? "#fff" : "#000",
                    border: "0.3vw solid #000000",
                    cursor: "pointer",
                    fontSize: size.w <= 1024 ? "4vw" : "3vw",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: activeDrawingTool === "line" ? "0px 0px .2vw .2vw #000000" : "none",
                  }}
                >
                  <i className="fas fa-slash"></i>
                </button>
                <button
                  onClick={async () => {
                    await loadTool("curve");
                    setActiveDrawingTool("curve");
                    setLineStartPixel(null);
                    setCurveEndPixel(null);
                    setCurveCurveAmount(0);
                  }}
                  style={{
                    width: size.w <= 1024 ? "8vw" : "6vw",
                    height: size.w <= 1024 ? "8vw" : "6vw",
                    background: activeDrawingTool === "curve" ? "#333" : "#fefefe",
                    color: activeDrawingTool === "curve" ? "#fff" : "#000",
                    border: "0.3vw solid #000000",
                    cursor: "pointer",
                    fontSize: size.w <= 1024 ? "4vw" : "3vw",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: activeDrawingTool === "curve" ? "0px 0px .2vw .2vw #000000" : "none",
                  }}
                >
                  <i className="fas fa-bezier-curve"></i>
                </button>
                <button
                  onClick={async () => {
                    await loadTool("bucket");
                    setActiveDrawingTool("bucket");
                    setLineStartPixel(null);
                  }}
                  style={{
                    width: size.w <= 1024 ? "8vw" : "6vw",
                    height: size.w <= 1024 ? "8vw" : "6vw",
                    background: activeDrawingTool === "bucket" ? "#333" : "#fefefe",
                    color: activeDrawingTool === "bucket" ? "#fff" : "#000",
                    border: "0.3vw solid #000000",
                    cursor: "pointer",
                    fontSize: size.w <= 1024 ? "4vw" : "3vw",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: activeDrawingTool === "bucket" ? "0px 0px .2vw .2vw #000000" : "none",
                  }}
                >
                  <i className="fas fa-fill-drip"></i>
                </button>
              </>
            )}
            {viewMode === "layers" && (
              <button
                onClick={async () => {
                  await loadTool("select");
                  setActiveDrawingTool("select");
                  setLineStartPixel(null);
                  setSelectionStart(null);
                  setSelectionEnd(null);
                  setShowGroupDialog(true);
                }}
                style={{
                  width: size.w <= 1024 ? "8vw" : "6vw",
                  height: size.w <= 1024 ? "8vw" : "6vw",
                  background: activeDrawingTool === "select" ? "#333" : "#fefefe",
                  color: activeDrawingTool === "select" ? "#fff" : "#000",
                  border: "0.3vw solid #000000",
                  cursor: "pointer",
                  fontSize: size.w <= 1024 ? "4vw" : "3vw",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: activeDrawingTool === "select" ? "0px 0px .2vw .2vw #000000" : "none",
                }}
              >
                <i className="fas fa-vector-square"></i>
              </button>
            )}
            {viewMode === "layers" && (
              <button
                onClick={() => {
                  setActiveDrawingTool("movegroup");
                  setLineStartPixel(null);
                  setSelectionStart(null);
                  setSelectionEnd(null);
                  setActiveGroup(null);
                  setGroupDragStart(null);
                }}
                style={{
                  width: size.w <= 1024 ? "8vw" : "6vw",
                  height: size.w <= 1024 ? "8vw" : "6vw",
                  background: activeDrawingTool === "movegroup" ? "#333" : "#fefefe",
                  color: activeDrawingTool === "movegroup" ? "#fff" : "#000",
                  border: "0.3vw solid #000000",
                  cursor: "pointer",
                  fontSize: size.w <= 1024 ? "3vw" : "2vw",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: activeDrawingTool === "movegroup" ? "0px 0px .2vw .2vw #000000" : "none",
                  position: "relative",
                  zIndex: 10,
                  pointerEvents: "auto",
                }}
                title="Click and drag to move a group"
              >
                ☩
              </button>
            )}
          </div>
        </div>

        {/* GROUP SELECTED PIXELS BUTTON */}
        {viewMode === "layers" && selectedPixels.length > 0 && (
          <div style={{ width: "100%", padding: "1vw" }}>
            <button
              onClick={() => setShowGroupDialog(true)}
              style={{
                width: "100%",
                background: "#4CAF50",
                color: "white",
                border: "0.2vw solid #000",
                cursor: "pointer",
                padding: "1vw",
                fontSize: "1.2vw",
                fontWeight: "bold"
              }}
            >
              Create Group ({selectedPixels.length} pixels)
            </button>
          </div>
        )}

        {/* COLOR MENU HEADER */}
        <div style={{ width: "100%", position: "relative" }}>
          <button
            onClick={() => setShowColorMenu(prev => !prev)}
            style={{
              background: "#333",
              color: "white",
              width: "100%",
              cursor: "pointer",
              paddingTop:".75vw",
              paddingBottom:".75vw",
              fontSize: "1.75vw",
            }}
          >
            {showColorMenu ? "▼ Color" : "► Color"}
          </button>
        </div>

        {/* COLOR MENU CONTENT */}
        {showColorMenu && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1vw",
            width: "100%",
            transition: "max-height 0.3s ease",
          }}>
            {/* PRIMARY COLOR */}
            <div style={{ width: "100%", textAlign: "center" }}>
              <div style={{ color: "#0000000", fontSize: "1.5vw", marginBottom: "0.5vw" }}><b>Primary</b></div>
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
                  width: size.w <= 1024 ? "8vw" : "6vw",
                  height: size.w <= 1024 ? "8vw" : "6vw",
                  background: primaryColor,
                  border: activeTool === "primary" 
                    ? (isLightColor(primaryColor) ? "0.4vw solid #000000" : "0.4vw solid #ffffff")
                    : (isLightColor(primaryColor) ? "0.3vw solid #000000" : "0.3vw solid #ffffff"),
                  cursor: "pointer",
                  margin: "0 auto",
                  boxShadow: activeTool === "primary" 
                    ? "0px 0px .2vw .2vw #000000"
                    : "none",
                }}
              />
            </div>

            {/* SECONDARY COLOR */}
            <div style={{ width: "100%", textAlign: "center" }}>
              <div style={{ color: "#000000", fontSize: "1.5vw", marginBottom: "0.5vw" }}><b>Secondary</b></div>
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
                  width: size.w <= 1024 ? "8vw" : "6vw",
                  height: size.w <= 1024 ? "8vw" : "6vw",
                  background: secondaryColor,
                  border: activeTool === "secondary" 
                    ? (isLightColor(secondaryColor) ? "0.4vw solid #000000" : "0.4vw solid #ffffff")
                    : (isLightColor(secondaryColor) ? "0.3vw solid #000000" : "0.3vw solid #ffffff"),
                  cursor: "pointer",
                  margin: "0 auto",
                  boxShadow: activeTool === "secondary" 
                    ? (isLightColor(secondaryColor) ? "0 0 1vw rgba(0,0,0,0.5)" : "0 0 1vw rgba(255,255,255,0.5)") 
                    : "none",
                }}
              />

            </div>
          </div>
        )}
      </div>

      {/* GRID */}
      <div 
        ref={gridRef}
        onScroll={(e) => {
          if (size.w <= 1024) {
            setScrollPosition(e.target.scrollLeft);
          }
        }}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(200, ${displayPixelSize}vw)`,
          gridTemplateRows: `repeat(${rows}, ${displayPixelSize}vw)`,
          userSelect: "none",
          touchAction: "none",
          flex: 1,
          overflow: "auto"
        }}>
        {(pixelColors || []).map((c, i) => {
          // In drawing mode, skip expensive layer calculations
          const pixelGroup = viewMode === "layers" ? pixelGroups[i] : null;
          const isHovered = !isDrawing && hoveredPixel === i;
          const isLineStart = (activeDrawingTool === "line" || activeDrawingTool === "curve") && lineStartPixel === i;
          const isCurveEnd = activeDrawingTool === "curve" && curveEndPixel === i;
          
          // Only calculate these in layers mode
          const isSelected = viewMode === "layers" ? selectedPixels.includes(i) : false;
          const isInSelectionRect = viewMode === "layers" && activeDrawingTool === "select" && selectionStart !== null && selectionEnd !== null && isDrawing && getSelectionRectangle(selectionStart, selectionEnd).includes(i);
          const isInActiveGroup = viewMode === "layers" && ((pixelGroup && pixelGroup.group === activeGroup) || (activeGroup === "__selected__" && selectedPixels.includes(i)));
          const isMoveGroupHover = viewMode === "layers" && activeDrawingTool === "movegroup" && (pixelGroup || selectedPixels.includes(i)) && hoveredPixel === i;
          
          // Calculate preview position during group drag
          let isInDragPreview = false;
          if (viewMode === "layers" && groupDragStart !== null && groupDragCurrent !== null && activeGroup !== null && isDrawing) {
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
          if (viewMode === "drawing") {
            if (activeDrawingTool === "line" && lineStartPixel !== null && hoveredPixel !== null) {
              isInLinePreview = getLinePixels(lineStartPixel, hoveredPixel).includes(i);
            } else if (activeDrawingTool === "curve" && lineStartPixel !== null && curveEndPixel === null && hoveredPixel !== null) {
              isInLinePreview = getLinePixels(lineStartPixel, hoveredPixel).includes(i);
            } else if (activeDrawingTool === "curve" && lineStartPixel !== null && curveEndPixel !== null) {
              isInLinePreview = getQuadraticBezierPixels(lineStartPixel, curveEndPixel, curveCurveAmount).includes(i);
            }
          }
          
          let borderColor = 'transparent';
          let borderWidth = `${0.1 * zoomFactor}vw`;
          let boxShadow = 'none';
          let opacity = 1;
          
          // Dim original position during drag preview
          if (isInActiveGroup && groupDragStart !== null && groupDragCurrent !== null && isDrawing) {
            opacity = 0.3;
          }
          
          // Show preview at new position
          if (isInDragPreview) {
            borderColor = '#9C27B0';
            borderWidth = `${0.3 * zoomFactor}vw`;
            boxShadow = `0 0 ${0.5 * zoomFactor}vw ${0.2 * zoomFactor}vw #9C27B0`;
          } else if (isMoveGroupHover) {
            borderColor = '#9C27B0';
            borderWidth = `${0.3 * zoomFactor}vw`;
            boxShadow = `0 0 ${0.5 * zoomFactor}vw ${0.2 * zoomFactor}vw #9C27B0`;
          } else if (isInActiveGroup) {
            borderColor = '#2196F3';
            borderWidth = `${0.3 * zoomFactor}vw`;
            boxShadow = '0 0 0.5vw #2196F3';
          } else if (isSelected || isInSelectionRect) {
            borderColor = '#4CAF50';
            borderWidth = `${0.3 * zoomFactor}vw`;
          } else if (isCurveEnd) {
            borderColor = getContrastBorderColor(c);
            borderWidth = `${0.3 * zoomFactor}vw`;
          } else if (isLineStart || isInLinePreview) {
            borderColor = getContrastBorderColor(c);
            borderWidth = `${0.2 * zoomFactor}vw`;
          } else if (isHovered && viewMode === "drawing") {
            borderColor = getContrastBorderColor(c);
            borderWidth = `${0.2 * zoomFactor}vw`;
          }
          
          // Get the display color (either current pixel or preview from dragged group)
          let displayColor = c;
          if (isInDragPreview) {
            const deltaRow = groupDragCurrent.row - groupDragStart.startRow;
            const deltaCol = groupDragCurrent.col - groupDragStart.startCol;
            const currentRow = Math.floor(i / 200);
            const currentCol = i % 200;
            const sourceRow = currentRow - deltaRow;
            const sourceCol = currentCol - deltaCol;
            const sourceIndex = sourceRow * 200 + sourceCol;
            displayColor = pixelColors[sourceIndex] || c;
          }
          
          return (
            <div
              key={i}
              style={{ 
                background: displayColor, 
                boxSizing: 'border-box',
                border: `${borderWidth} solid ${borderColor}`,
                boxShadow,
                position: 'relative',
                zIndex: pixelGroup ? pixelGroup.zIndex : 0,
                opacity
              }}
              onPointerDown={(e) => {
                // Check if clicking on a grouped pixel with movegroup tool
                if (viewMode === "layers" && activeDrawingTool === "movegroup" && pixelGroup) {
                  setActiveGroup(pixelGroup.group);
                  setGroupDragStart({ pixelIndex: i, startRow: Math.floor(i / 200), startCol: i % 200 });
                  setIsDrawing(true);
                } else if (viewMode === "layers" && activeDrawingTool === "movegroup" && selectedPixels.includes(i)) {
                  // Moving selected pixels (not in a group yet)
                  setActiveGroup("__selected__");
                  setGroupDragStart({ pixelIndex: i, startRow: Math.floor(i / 200), startCol: i % 200 });
                  setIsDrawing(true);
                } else if (viewMode === "layers" && pixelGroup && !activeDrawingTool.match(/select|movegroup/)) {
                  setActiveGroup(pixelGroup.group);
                  setGroupDragStart({ pixelIndex: i, startRow: Math.floor(i / 200), startCol: i % 200 });
                  setIsDrawing(true);
                } else if (activeDrawingTool === "pencil") {
                  setIsDrawing(true);
                  paintPixel(e, i);
                } else if (activeDrawingTool === "bucket") {
                  paintBucket(i);
                } else if (activeDrawingTool === "select") {
                  // Start rectangle selection
                  setSelectionStart(i);
                  setSelectionEnd(i);
                  setIsDrawing(true);
                } else if (activeDrawingTool === "line") {
                  if (lineStartPixel === null) {
                    // First click: set start point
                    setLineStartPixel(i);
                  } else if (lineStartPixel === i) {
                    // Clicking same pixel - cancel
                    setLineStartPixel(null);
                  } else {
                    // Second click: draw straight line immediately
                    drawLine(lineStartPixel, i);
                    setLineStartPixel(null);
                  }
                } else if (activeDrawingTool === "curve") {
                  if (lineStartPixel === null) {
                    // First click: set start point
                    setLineStartPixel(i);
                  } else if (lineStartPixel === i) {
                    // Clicking same pixel - cancel
                    setLineStartPixel(null);
                  } else {
                    // Second click: enter adjustment mode
                    setCurveEndPixel(i);
                  }
                }
              }}
              onPointerUp={(e) => {
                if (activeDrawingTool === "select" && selectionStart !== null) {
                  // Finalize selection
                  const selected = getSelectionPixels(selectionStart, selectionEnd || selectionStart);
                  setSelectedPixels(selected);
                  setSelectionStart(null);
                  setSelectionEnd(null);
                  setIsDrawing(false);
                } else if (groupDragStart !== null && activeGroup !== null) {
                  // Finalize group move
                  const currentRow = Math.floor(i / 200);
                  const currentCol = i % 200;
                  const deltaRow = currentRow - groupDragStart.startRow;
                  const deltaCol = currentCol - groupDragStart.startCol;
                  
                  if (deltaRow !== 0 || deltaCol !== 0) {
                    if (activeGroup === "__selected__") {
                      moveSelectedPixels(deltaRow, deltaCol);
                    } else {
                      moveGroup(activeGroup, deltaRow, deltaCol);
                    }
                  }
                  
                  setGroupDragStart(null);
                  setGroupDragCurrent(null);
                  setActiveGroup(null);
                  setIsDrawing(false);
                }
              }}
              onClick={(e) => {
                if (activeDrawingTool === "pencil") {
                  // Pencil tool handled by onPointerDown
                }
              }}
              onPointerEnter={() => {
                if (isDrawing && activeDrawingTool === "pencil") {
                  paintPixel(null, i);
                } else if (isDrawing && activeDrawingTool === "select") {
                  setSelectionEnd(i);
                }
                // Update hover in drawing mode for performance, or in layers mode for movegroup tool
                if (viewMode === "drawing") {
                  setHoveredPixel(i);
                } else if (viewMode === "layers" && activeDrawingTool === "movegroup") {
                  setHoveredPixel(i);
                }
              }}
              onPointerMove={(e) => {
                // Update hovered pixel for line preview only when needed
                if (viewMode === "drawing" && (activeDrawingTool === "line" || activeDrawingTool === "curve")) {
                  setHoveredPixel(i);
                }
                
                // Update hover for movegroup tool in layers mode
                if (viewMode === "layers" && activeDrawingTool === "movegroup") {
                  setHoveredPixel(i);
                }
                
                // Track current drag position for visual feedback (no actual move yet)
                if (viewMode === "layers" && groupDragStart !== null && activeGroup !== null && isDrawing) {
                  const currentRow = Math.floor(i / 200);
                  const currentCol = i % 200;
                  setGroupDragCurrent({ row: currentRow, col: currentCol });
                  setHoveredPixel(i);
                }
              }}
              onPointerLeave={() => {
                // Only clear hover in drawing mode
                if (viewMode === "drawing" && !isDrawing && !(activeDrawingTool === "line" && lineStartPixel !== null)) {
                  setHoveredPixel(null);
                }
              }}
            />
          );
        })}
      </div>
      </div>
      
      {/* MOBILE/TABLET BOTTOM SCROLLBAR */}
      {size.w <= 1024 && (
        <div style={{
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
                gridRef.current.scrollLeft = Math.max(0, scrollPosition - 100);
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
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = x / rect.width;
                const maxScroll = gridRef.current ? gridRef.current.scrollWidth - gridRef.current.clientWidth : 0;
                if (gridRef.current) {
                  gridRef.current.scrollLeft = percent * maxScroll;
                }
              }}
              onPointerMove={(e) => {
                if (isDraggingSlider && gridRef.current) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = Math.max(0, Math.min(1, x / rect.width));
                  const maxScroll = gridRef.current.scrollWidth - gridRef.current.clientWidth;
                  gridRef.current.scrollLeft = percent * maxScroll;
                }
              }}
              onPointerUp={() => setIsDraggingSlider(false)}
              onPointerLeave={() => setIsDraggingSlider(false)}
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
                gridRef.current.scrollLeft = scrollPosition + 100;
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

      {/* CURVE ADJUSTMENT OVERLAY */}
      {activeDrawingTool === "curve" && lineStartPixel !== null && curveEndPixel !== null && (
        <div
          style={{
            position: "fixed",
            bottom: size.w <= 1024 ? "10vw" : "0",
            left: size.w <= 1024 ? "10vw" : "7vw",
            right: 0,
            background: "#ffffff",
            padding: "1vw",
            borderTop: "0.3vw solid #000000",
            zIndex: 1000,
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
            autoFocus
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
            style={{ width: "80%" }}
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
                background: "#f44336",
                color: "white",
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
                  setPixelColors((prev) => {
                    const copy = [...prev];
                    curvePixels.forEach(idx => {
                      copy[idx] = color;
                    });
                    return copy;
                  });
                }
                setLineStartPixel(null);
                setCurveEndPixel(null);
                setCurveCurveAmount(0);
                setHoveredPixel(null);
              }}
              style={{
                background: "#4CAF50",
                color: "white",
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

      {/* GROUP DIALOG AND LAYERS PANEL IN BOTTOM BAR - Only in Layers Mode */}
      {viewMode === "layers" && showGroupDialog && (
        <div style={{
          position: "fixed",
          bottom: "5vh",
          left: size.w <= 1024 ? "10vw" : "7vw",
          right: 0,
          background: "rgba(0,0,0,0.95)",
          color: "white",
          padding: "2vw",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "1.5vw",
          borderTop: "0.3vw solid #ffffff",
          maxHeight: "40vh",
          overflowY: "auto"
        }}>
          
          {/* Top Row: Group Creation + Close */}
          <div style={{ display: "flex", flexDirection: "row", gap: "2vw", alignItems: "center", justifyContent: "space-between" }}>
            
            {/* Group Creation Section - Always Visible */}
            <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", flex: 1 }}>
              <div style={{ fontSize: "1.3vw", fontWeight: "bold" }}>
                Create Group:
              </div>
              <input
                type="text"
                placeholder="Enter group name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    createGroup(e.target.value.trim());
                    e.target.value = "";
                  }
                }}
                style={{
                  padding: "1vw",
                  fontSize: "1.5vw",
                  width: "15vw",
                  border: "0.2vw solid #4CAF50",
                  textAlign: "center",
                  background: "#222",
                  color: "white"
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Enter group name"]');
                  if (input && input.value.trim()) {
                    createGroup(input.value.trim());
                    input.value = "";
                  }
                }}
                style={{
                  background: "#4CAF50",
                  color: "white",
                  border: "0.2vw solid #000",
                  padding: "1vw 3vw",
                  cursor: "pointer",
                  fontSize: "1.3vw",
                  fontWeight: "bold"
                }}
              >
                + Create
              </button>
              {selectedPixels.length > 0 && (
                <div style={{ fontSize: "1.2vw", color: "#4CAF50", fontWeight: "bold" }}>
                  ({selectedPixels.length} pixels selected)
                </div>
              )}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => {
                setShowGroupDialog(false);
                setActiveGroup(null);
                setSelectedPixels([]);
                setSelectionStart(null);
                setSelectionEnd(null);
                setActiveDrawingTool("pencil");
              }}
              style={{
                background: "#666",
                color: "white",
                border: "0.2vw solid #000",
                padding: "1vw 2vw",
                cursor: "pointer",
                fontSize: "1.3vw",
                fontWeight: "bold"
              }}
            >
              ✕
            </button>
          </div>
          
          {/* Layers Grid - Only show if groups exist */}
          {groups.length > 0 && (
            <>
              <div style={{ borderTop: "0.2vw solid #666", margin: "0.5vw 0" }} />
              
              <div style={{ fontSize: "1.4vw", fontWeight: "bold", color: "#FFD700" }}>
                Layers ({groups.length}) - Drag to Reorder Z-Index
              </div>
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto auto auto auto",
                gap: "0.5vw",
                alignItems: "center",
                background: "#1a1a1a",
                padding: "1vw",
                borderRadius: "0.5vw"
              }}>
                {/* Header Row */}
                <div style={{ fontSize: "1.1vw", fontWeight: "bold", padding: "0.5vw" }}>Z</div>
                <div style={{ fontSize: "1.1vw", fontWeight: "bold", padding: "0.5vw" }}>Layer Name</div>
                <div style={{ fontSize: "1.1vw", fontWeight: "bold", padding: "0.5vw" }}>Edit</div>
                <div style={{ fontSize: "1.1vw", fontWeight: "bold", padding: "0.5vw" }}>Move</div>
                <div style={{ fontSize: "1.1vw", fontWeight: "bold", padding: "0.5vw" }}>Up</div>
                <div style={{ fontSize: "1.1vw", fontWeight: "bold", padding: "0.5vw" }}>Down</div>
                <div style={{ fontSize: "1.1vw", fontWeight: "bold", padding: "0.5vw" }}>Del</div>
                
                {/* Layer Rows - Sorted by z-index descending */}
                {groups.sort((a, b) => b.zIndex - a.zIndex).map((group, index) => (
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
                      fontSize: "1.3vw",
                      fontWeight: "bold",
                      padding: "0.8vw",
                      background: dragOverLayer === group.name ? "#333" : (activeGroup === group.name ? "#2196F3" : "#222"),
                      borderRadius: "0.3vw",
                      textAlign: "center",
                      border: dragOverLayer === group.name ? "0.2vw dashed #FFD700" : "0.2vw solid #444",
                      cursor: "grab"
                    }}>
                      {group.zIndex}
                    </div>
                    
                    {/* Layer Name */}
                    <div
                      onClick={() => setActiveGroup(group.name)}
                      style={{
                        fontSize: "1.2vw",
                        padding: "0.8vw",
                        background: activeGroup === group.name ? "#2196F3" : "#222",
                        borderRadius: "0.3vw",
                        cursor: "pointer",
                        border: activeGroup === group.name ? "0.2vw solid #FFD700" : "0.2vw solid #444",
                        fontWeight: activeGroup === group.name ? "bold" : "normal",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {group.name}
                    </div>
                    
                    {/* Edit Button */}
                    <button
                      onClick={() => setActiveGroup(group.name)}
                      style={{
                        background: activeGroup === group.name ? "#FFD700" : "#444",
                        color: activeGroup === group.name ? "#000" : "white",
                        border: "0.2vw solid #000",
                        padding: "0.5vw 1vw",
                        cursor: "pointer",
                        fontSize: "1vw",
                        fontWeight: "bold",
                        borderRadius: "0.3vw"
                      }}
                    >
                      {activeGroup === group.name ? "✓" : "✎"}
                    </button>
                    
                    {/* Move Layer Button */}
                    <button
                      onClick={() => {
                        setActiveGroup(group.name);
                        setActiveDrawingTool("select");
                      }}
                      style={{
                        background: activeGroup === group.name && activeDrawingTool === "select" ? "#9C27B0" : "#555",
                        color: "white",
                        border: "0.2vw solid #000",
                        padding: "0.5vw 1vw",
                        cursor: "pointer",
                        fontSize: "1.2vw",
                        fontWeight: "bold",
                        borderRadius: "0.3vw"
                      }}
                      title="Click to enable move mode, then drag pixels on canvas"
                    >
                      ☩
                    </button>
                    
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
                        background: "#444",
                        color: "white",
                        border: "0.2vw solid #000",
                        padding: "0.5vw 1vw",
                        cursor: "pointer",
                        fontSize: "1vw",
                        fontWeight: "bold",
                        borderRadius: "0.3vw"
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
                        background: "#444",
                        color: "white",
                        border: "0.2vw solid #000",
                        padding: "0.5vw 1vw",
                        cursor: "pointer",
                        fontSize: "1vw",
                        fontWeight: "bold",
                        borderRadius: "0.3vw"
                      }}
                    >
                      ▼
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => {
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
                        background: "#f44336",
                        color: "white",
                        border: "0.2vw solid #000",
                        padding: "0.5vw 1vw",
                        cursor: "pointer",
                        fontSize: "1vw",
                        fontWeight: "bold",
                        borderRadius: "0.3vw"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Active Layer Editing Section */}
              {activeGroup && (
                <>
                  <div style={{ borderTop: "0.2vw solid #666", margin: "0.5vw 0" }} />
                  <div style={{ display: "flex", gap: "2vw", alignItems: "center", justifyContent: "flex-start" }}>
                    <div style={{ fontSize: "1.3vw", fontWeight: "bold", color: "#FFD700" }}>
                      Editing: {activeGroup}
                    </div>
                    <input
                      type="text"
                      value={groups.find(g => g.name === activeGroup)?.name || activeGroup}
                      onChange={(e) => {
                        if (e.target.value.trim()) {
                          const newGroups = groups.map(g => 
                            g.name === activeGroup ? { ...g, name: e.target.value.trim() } : g
                          );
                          setGroups(newGroups);
                          
                          const newPixelGroups = {};
                          Object.keys(pixelGroups).forEach(idx => {
                            const pg = pixelGroups[idx];
                            newPixelGroups[idx] = pg.group === activeGroup 
                              ? { ...pg, group: e.target.value.trim() }
                              : pg;
                          });
                          setPixelGroups(newPixelGroups);
                          setActiveGroup(e.target.value.trim());
                        }
                      }}
                      placeholder="Rename layer"
                      style={{
                        padding: "1vw",
                        fontSize: "1.5vw",
                        width: "15vw",
                        border: "0.2vw solid #FFD700",
                        textAlign: "center",
                        background: "#222",
                        color: "white"
                      }}
                    />
                    <button
                      onClick={() => setActiveGroup(null)}
                      style={{
                        background: "#666",
                        color: "white",
                        border: "0.2vw solid #000",
                        padding: "1vw 2vw",
                        cursor: "pointer",
                        fontSize: "1.3vw",
                        fontWeight: "bold"
                      }}
                    >
                      Done Editing
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
