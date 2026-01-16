import { useEffect, useState, useRef, useCallback, memo } from "react";
import { flushSync } from "react-dom";
import LayerCanvas from "./LayerCanvas";
import "./pixelgrid.css";

// Memoized pixel component for base canvas (unlayered pixels only)
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
  
  if (isSelectionStartPoint) {
    const isLight = (() => {
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
    const isLight = (() => {
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
    const isLight = (() => {
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
    const isLight = (() => {
      if (!color || color.length < 7) return true;
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      const brightness = (r + g + b) / 3;
      return brightness > 127;
    })();
    borderColor = isLight ? '#000000' : '#CCCCCC';
    borderWidth = `${0.2 * zoomFactor}vw`;
  } else if (isHovered) {
    const isLight = (() => {
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
  
  return (
    <div
      data-pixel-index={index}
      style={{ 
        background: color, 
        boxSizing: 'border-box',
        border: borderStyle,
        boxShadow,
        opacity,
        position: 'relative'
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

export default function PixelGridV2() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Grid configuration
  const gridRows = 150;
  const gridCols = 200;
  const totalPixels = gridRows * gridCols;
  
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
  
  const [activeTool, setActiveTool] = useState("primary");
  const [showColorMenu, setShowColorMenu] = useState(true);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [viewMode, setViewMode] = useState("drawing");
  const [showColorEditor, setShowColorEditor] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [hoveredPixel, setHoveredPixel] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [layersScrollPosition, setLayersScrollPosition] = useState(0);
  const [isDraggingLayersSlider, setIsDraggingLayersSlider] = useState(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState("pencil");
  const [lineStartPixel, setLineStartPixel] = useState(null);
  const [lineEndPixel, setLineEndPixel] = useState(null);
  const [curveEndPixel, setCurveEndPixel] = useState(null);
  const [curveCurveAmount, setCurveCurveAmount] = useState(0);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [selectedPixels, setSelectedPixels] = useState([]);
  const [selectAllPixels, setSelectAllPixels] = useState(true);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  
  // NEW: Layer system with absolute positioning
  // layers: Array of { id, name, pixels: {}, zIndex, visible, opacity, locked }
  const [layers, setLayers] = useState(() => {
    try {
      const saved = localStorage.getItem("pixelgrid_layers_v2");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  // Base canvas pixels (non-layered pixels)
  const [basePixels, setBasePixels] = useState(() => {
    try {
      const saved = localStorage.getItem("pixelgrid_basePixels");
      if (saved) return JSON.parse(saved);
    } catch {}
    return Array(totalPixels).fill("#ffffff");
  });
  
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [layerDragOffset, setLayerDragOffset] = useState(null);
  const [renderTrigger, setRenderTrigger] = useState(0);
  
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
  
  const color = activeTool === "primary" ? primaryColor : secondaryColor;
  const gridRef = useRef(null);
  const layersMenuRef = useRef(null);
  const backgroundInputRef = useRef(null);
  
  // Zoom factor based on screen size
  const zoomFactor = size.w <= 1024 ? 1 : 1;
  const displayPixelSize = size.w <= 1024 ? 4.5 * zoomFactor : 2.5 * zoomFactor;
  
  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_layers_v2", JSON.stringify(layers));
    } catch (e) {
      console.error("Failed to save layers:", e);
    }
  }, [layers]);
  
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_basePixels", JSON.stringify(basePixels));
    } catch (e) {
      console.error("Failed to save base pixels:", e);
    }
  }, [basePixels]);
  
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_primaryColor", primaryColor);
    } catch {}
  }, [primaryColor]);
  
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_secondaryColor", secondaryColor);
    } catch {}
  }, [secondaryColor]);
  
  useEffect(() => {
    try {
      if (backgroundImage) {
        localStorage.setItem("pixelgrid_backgroundImage", backgroundImage);
      } else {
        localStorage.removeItem("pixelgrid_backgroundImage");
      }
    } catch {}
  }, [backgroundImage]);
  
  useEffect(() => {
    try {
      localStorage.setItem("pixelgrid_backgroundOpacity", backgroundOpacity.toString());
    } catch {}
  }, [backgroundOpacity]);
  
  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  // Helper: Generate unique layer ID
  const generateLayerId = () => {
    return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // Helper: Create new layer from selected pixels
  const createLayerFromSelection = (layerName = null) => {
    if (selectedPixels.length === 0) {
      console.log("No pixels selected to create layer");
      return null;
    }
    
    const newLayerId = generateLayerId();
    const name = layerName || `Layer ${layers.length + 1}`;
    
    // Get highest z-index
    const maxZIndex = layers.reduce((max, layer) => Math.max(max, layer.zIndex || 0), 0);
    
    // Create pixels object from selection
    const layerPixels = {};
    selectedPixels.forEach(idx => {
      // Get pixel color from base canvas or existing layers
      const pixelColor = getPixelColorAtIndex(idx);
      if (pixelColor && pixelColor !== '#ffffff') {
        layerPixels[idx] = pixelColor;
      }
    });
    
    const newLayer = {
      id: newLayerId,
      name,
      pixels: layerPixels,
      zIndex: maxZIndex + 1,
      visible: true,
      opacity: 1,
      locked: false
    };
    
    setLayers(prev => [...prev, newLayer]);
    
    // Clear selected pixels from base canvas and other layers
    clearPixelsFromBaseAndLayers(selectedPixels);
    
    // Clear selection
    setSelectedPixels([]);
    setActiveLayerId(newLayerId);
    
    console.log(`Created layer "${name}" with ${Object.keys(layerPixels).length} pixels`);
    return newLayerId;
  };
  
  // Helper: Get pixel color at index (checks layers then base)
  const getPixelColorAtIndex = (index) => {
    // Check layers from top to bottom
    const sortedLayers = [...layers].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    for (const layer of sortedLayers) {
      if (layer.visible && layer.pixels[index]) {
        return layer.pixels[index];
      }
    }
    // Fall back to base canvas
    return basePixels[index];
  };
  
  // Helper: Clear pixels from base canvas and all layers
  const clearPixelsFromBaseAndLayers = (pixelIndices) => {
    // Clear from base
    setBasePixels(prev => {
      const newBase = [...prev];
      pixelIndices.forEach(idx => {
        newBase[idx] = '#ffffff';
      });
      return newBase;
    });
    
    // Clear from all layers
    setLayers(prev => prev.map(layer => {
      const newPixels = { ...layer.pixels };
      pixelIndices.forEach(idx => {
        delete newPixels[idx];
      });
      return { ...layer, pixels: newPixels };
    }));
  };
  
  // Helper: Paint pixel (to base canvas or active layer)
  const paintPixel = (e, index) => {
    if (activeLayerId) {
      // Paint to active layer
      setLayers(prev => prev.map(layer => {
        if (layer.id === activeLayerId && !layer.locked) {
          return {
            ...layer,
            pixels: { ...layer.pixels, [index]: color }
          };
        }
        return layer;
      }));
    } else {
      // Paint to base canvas
      setBasePixels(prev => {
        const newPixels = [...prev];
        newPixels[index] = color;
        return newPixels;
      });
    }
    setRenderTrigger(prev => prev + 1);
  };
  
  // Helper: Get selection rectangle pixels
  const getSelectionPixels = (start, end) => {
    if (start === null || end === null) return [];
    
    const startRow = Math.floor(start / gridCols);
    const startCol = start % gridCols;
    const endRow = Math.floor(end / gridCols);
    const endCol = end % gridCols;
    
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const pixels = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const idx = row * gridCols + col;
        if (selectAllPixels) {
          pixels.push(idx);
        } else {
          // Only select colored pixels
          const pixelColor = getPixelColorAtIndex(idx);
          if (pixelColor && pixelColor !== '#ffffff') {
            pixels.push(idx);
          }
        }
      }
    }
    return pixels;
  };
  
  // Helper: Delete layer
  const deleteLayer = (layerId) => {
    if (window.confirm("Delete this layer? This cannot be undone.")) {
      setLayers(prev => prev.filter(layer => layer.id !== layerId));
      if (activeLayerId === layerId) {
        setActiveLayerId(null);
      }
    }
  };
  
  // Helper: Toggle layer visibility
  const toggleLayerVisibility = (layerId) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
    setRenderTrigger(prev => prev + 1);
  };
  
  // Helper: Rename layer
  const renameLayer = (layerId, newName) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, name: newName } : layer
    ));
  };
  
  // Helper: Change layer z-index
  const moveLayerUp = (layerId) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (!layer) return prev;
      
      return prev.map(l => {
        if (l.id === layerId) {
          return { ...l, zIndex: l.zIndex + 1 };
        }
        return l;
      });
    });
    setRenderTrigger(prev => prev + 1);
  };
  
  const moveLayerDown = (layerId) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (!layer) return prev;
      
      return prev.map(l => {
        if (l.id === layerId) {
          return { ...l, zIndex: Math.max(0, l.zIndex - 1) };
        }
        return l;
      });
    });
    setRenderTrigger(prev => prev + 1);
  };
  
  // Helper: Merge layer down
  const mergeLayerDown = (layerId) => {
    setLayers(prev => {
      const layerIndex = prev.findIndex(l => l.id === layerId);
      if (layerIndex === -1 || layerIndex === prev.length - 1) return prev;
      
      const layer = prev[layerIndex];
      const lowerLayers = prev.filter(l => l.zIndex < layer.zIndex);
      if (lowerLayers.length === 0) {
        // Merge to base canvas
        setBasePixels(base => {
          const newBase = [...base];
          Object.entries(layer.pixels).forEach(([idx, color]) => {
            newBase[parseInt(idx)] = color;
          });
          return newBase;
        });
        return prev.filter(l => l.id !== layerId);
      }
      
      // Find layer with highest z-index below this one
      const targetLayer = lowerLayers.reduce((max, l) => 
        (l.zIndex > (max?.zIndex || -1)) ? l : max
      , null);
      
      if (!targetLayer) return prev;
      
      // Merge pixels
      const mergedPixels = { ...targetLayer.pixels, ...layer.pixels };
      
      return prev.map(l => {
        if (l.id === targetLayer.id) {
          return { ...l, pixels: mergedPixels };
        }
        return l;
      }).filter(l => l.id !== layerId);
    });
    
    if (activeLayerId === layerId) {
      setActiveLayerId(null);
    }
    setRenderTrigger(prev => prev + 1);
  };
  
  // Save/Load functions
  const saveToHTML = () => {
    // Flatten all layers and base canvas
    const flattenedPixels = Array(totalPixels).fill('#ffffff');
    
    // Start with base
    basePixels.forEach((color, idx) => {
      flattenedPixels[idx] = color;
    });
    
    // Apply layers from bottom to top
    const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    sortedLayers.forEach(layer => {
      if (layer.visible) {
        Object.entries(layer.pixels).forEach(([idx, color]) => {
          flattenedPixels[parseInt(idx)] = color;
        });
      }
    });
    
    const data = {
      basePixels,
      layers,
      version: 2
    };
    const dataString = JSON.stringify(data);
    const html = `
<body style="margin:0; overflow-x:hidden;">
<div style="display:grid;grid-template-columns:repeat(${gridCols},0.75vw);grid-auto-rows:0.75vw;">
${flattenedPixels.map(c => `<div style="width:0.75vw;height:0.75vw;background:${c}"></div>`).join("")}
</div>
<script>
const savedData = ${dataString};
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
  };
  
  const loadFromHTML = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const matchData = text.match(/const savedData = ({[^;]+})/);
      if (matchData) {
        try {
          const data = JSON.parse(matchData[1]);
          if (data.version === 2) {
            // New format
            if (data.basePixels) setBasePixels(data.basePixels);
            if (data.layers) setLayers(data.layers);
          } else {
            // Old format - convert to base pixels
            if (data.pixelColors) setBasePixels(data.pixelColors);
          }
          setRenderTrigger(prev => prev + 1);
        } catch (err) {
          console.error("Failed to parse file:", err);
        }
      }
    };
    reader.readAsText(file);
  };
  
  const handleBackgroundUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  const removeBackgroundImage = () => {
    setBackgroundImage(null);
  };
  
  // Event handlers for drawing
  const stopDrawing = () => {
    console.log("Stop drawing");
    setIsDrawing(false);
    
    // Finalize selection if in select mode
    if (activeDrawingTool === "select" && selectionStart !== null && selectionEnd !== null) {
      const selected = getSelectionPixels(selectionStart, selectionEnd);
      setSelectedPixels(selected);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };
  
  useEffect(() => {
    window.addEventListener("pointerup", stopDrawing);
    return () => window.removeEventListener("pointerup", stopDrawing);
  }, [activeDrawingTool, selectionStart, selectionEnd]);
  
  // Render
  return (
    <div style={{ 
      width: "100vw", 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Main Canvas Area */}
      <div 
        ref={gridRef}
        style={{
          flex: 1,
          position: "relative",
          overflow: "auto",
          background: backgroundImage 
            ? `url(${backgroundImage})` 
            : "#ffffff",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        {/* Base Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridCols}, ${displayPixelSize}vw)`,
          gridTemplateRows: `repeat(${gridRows}, ${displayPixelSize}vw)`,
          position: "relative",
          width: "fit-content",
          height: "fit-content"
        }}>
          {basePixels.map((pixelColor, i) => {
            const isHovered = hoveredPixel === i;
            const isLineStart = (activeDrawingTool === "line" || activeDrawingTool === "curve") && lineStartPixel === i;
            const isCurveEnd = activeDrawingTool === "curve" && curveEndPixel === i;
            const isSelected = selectedPixels.includes(i);
            const isInSelectionRect = false; // TODO: implement selection rectangle preview
            const isSelectionStartPoint = activeDrawingTool === "select" && selectionStart === i && selectionEnd === null && size.w <= 1024;
            const isInLinePreview = false; // TODO: implement line preview
            
            const displayColor = (backgroundImage && pixelColor === '#ffffff') ? 'transparent' : pixelColor;
            
            return (
              <DrawingPixel
                key={i}
                color={displayColor}
                index={i}
                isHovered={isHovered}
                isLineStart={isLineStart}
                isCurveEnd={isCurveEnd}
                isInLinePreview={isInLinePreview}
                isSelected={isSelected}
                isInSelectionRect={isInSelectionRect}
                isSelectionStartPoint={isSelectionStartPoint}
                zoomFactor={zoomFactor}
                activeDrawingTool={activeDrawingTool}
                onPointerDown={(e) => {
                  if (activeDrawingTool === "pencil") {
                    setIsDrawing(true);
                    paintPixel(e, i);
                  } else if (activeDrawingTool === "select") {
                    if (size.w <= 1024) {
                      // Mobile two-click mode
                      if (selectionStart === null) {
                        setSelectionStart(i);
                      } else {
                        setSelectionEnd(i);
                        const selected = getSelectionPixels(selectionStart, i);
                        setSelectedPixels(selected);
                        setSelectionStart(null);
                        setSelectionEnd(null);
                      }
                    } else {
                      // Desktop drag mode
                      setSelectionStart(i);
                      setSelectionEnd(i);
                      setIsDrawing(true);
                    }
                  }
                }}
                onPointerUp={() => {}}
                onPointerEnter={() => {
                  setHoveredPixel(i);
                  if (isDrawing && activeDrawingTool === "pencil") {
                    paintPixel(null, i);
                  } else if (isDrawing && activeDrawingTool === "select") {
                    setSelectionEnd(i);
                  }
                }}
                onPointerMove={() => {}}
                onPointerLeave={() => {}}
              />
            );
          })}
        </div>
        
        {/* Layer Canvases - Absolutely Positioned */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${gridCols * displayPixelSize}vw`,
          height: `${gridRows * displayPixelSize}vw`,
          pointerEvents: "none"
        }}>
          {layers.map(layer => (
            <LayerCanvas
              key={layer.id}
              layer={layer}
              gridRows={gridRows}
              gridCols={gridCols}
              zoomFactor={zoomFactor}
              isActive={activeLayerId === layer.id}
              isVisible={layer.visible}
              isDragging={draggingLayerId === layer.id}
              dragOffset={draggingLayerId === layer.id ? layerDragOffset : null}
              onLayerClick={() => {
                if (!layer.locked) {
                  setActiveLayerId(layer.id);
                }
              }}
              onLayerPointerDown={(e) => {
                // TODO: Implement layer dragging
              }}
              onLayerPointerMove={(e) => {
                // TODO: Implement layer dragging
              }}
              onLayerPointerUp={() => {
                // TODO: Implement layer dragging
              }}
              renderTrigger={renderTrigger}
            />
          ))}
        </div>
      </div>
      
      {/* Bottom Toolbar */}
      <div style={{
        height: "60px",
        background: "#f0f0f0",
        borderTop: "2px solid #000",
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        gap: "10px"
      }}>
        <button onClick={() => setActiveDrawingTool("pencil")}>
          Pencil {activeDrawingTool === "pencil" && "✓"}
        </button>
        <button onClick={() => setActiveDrawingTool("select")}>
          Select {activeDrawingTool === "select" && "✓"}
        </button>
        <button onClick={() => createLayerFromSelection()} disabled={selectedPixels.length === 0}>
          Create Layer ({selectedPixels.length})
        </button>
        <button onClick={() => setShowLayersMenu(!showLayersMenu)}>
          Layers ({layers.length})
        </button>
        <button onClick={saveToHTML}>Save</button>
        <input
          type="file"
          accept=".html"
          onChange={(e) => e.target.files[0] && loadFromHTML(e.target.files[0])}
          style={{ display: "none" }}
          ref={backgroundInputRef}
        />
        <button onClick={() => backgroundInputRef.current?.click()}>Load</button>
      </div>
      
      {/* Layers Menu */}
      {showLayersMenu && (
        <div style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: "60px",
          width: "300px",
          background: "#ffffff",
          borderLeft: "2px solid #000",
          display: "flex",
          flexDirection: "column",
          zIndex: 1000
        }}>
          <div style={{
            padding: "10px",
            borderBottom: "2px solid #000",
            fontWeight: "bold"
          }}>
            Layers
          </div>
          <div 
            ref={layersMenuRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px"
            }}
          >
            {layers.slice().reverse().map((layer) => (
              <div 
                key={layer.id}
                style={{
                  padding: "10px",
                  margin: "5px 0",
                  background: activeLayerId === layer.id ? "#e3f2fd" : "#f5f5f5",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
                onClick={() => setActiveLayerId(layer.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{layer.name}</span>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}>
                      {layer.visible ? "👁️" : "🚫"}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayerUp(layer.id); }}>
                      ▲
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayerDown(layer.id); }}>
                      ▼
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}>
                      ✕
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                  Z: {layer.zIndex} | Pixels: {Object.keys(layer.pixels).length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
