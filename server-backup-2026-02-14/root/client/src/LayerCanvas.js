import React, { memo, useEffect, useRef, useState } from 'react';
import './LayerCanvas.css';

/**
 * LayerCanvas - Individual layer component with its own canvas
 * Each layer is absolutely positioned and manages its own pixel data
 */
const LayerCanvas = memo(({ 
  layer,
  gridRows,
  gridCols,
  zoomFactor,
  isActive,
  isVisible,
  isDragging,
  dragOffset,
  onLayerClick,
  onLayerPointerDown,
  onLayerPointerMove,
  onLayerPointerUp,
  renderTrigger // Force re-render when pixels change
}) => {
  const canvasRef = useRef(null);
  const [pixelSize, setPixelSize] = useState(0);

  // Calculate pixel size based on zoom
  useEffect(() => {
    const isMobile = window.innerWidth <= 1024;
    const baseSize = isMobile ? 4.5 : 2.5;
    setPixelSize(baseSize * zoomFactor);
  }, [zoomFactor]);

  // Draw layer pixels on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layer || !layer.pixels) return;

    const ctx = canvas.getContext('2d');
    const pixelSizeVw = pixelSize;
    const pixelSizePx = (pixelSizeVw / 100) * window.innerWidth;

    // Set canvas dimensions
    canvas.width = gridCols * pixelSizePx;
    canvas.height = gridRows * pixelSizePx;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each pixel
    Object.entries(layer.pixels).forEach(([index, color]) => {
      const idx = parseInt(index);
      const row = Math.floor(idx / gridCols);
      const col = idx % gridCols;
      
      ctx.fillStyle = color;
      ctx.fillRect(
        col * pixelSizePx,
        row * pixelSizePx,
        pixelSizePx,
        pixelSizePx
      );
    });
  }, [layer, gridRows, gridCols, pixelSize, renderTrigger]);

  if (!layer || !isVisible) return null;

  const containerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: isActive || isDragging ? 'auto' : 'none',
    zIndex: layer.zIndex,
    transform: isDragging && dragOffset 
      ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` 
      : 'none',
    transition: isDragging ? 'none' : 'transform 0.2s ease',
    opacity: layer.opacity !== undefined ? layer.opacity : 1
  };

  const canvasStyle = {
    display: 'block',
    width: '100%',
    height: '100%',
    imageRendering: 'pixelated',
    outline: isActive ? '2px dashed rgba(156, 39, 176, 0.8)' : 'none',
    outlineOffset: '-2px'
  };

  return (
    <div 
      className="layer-canvas-container"
      style={containerStyle}
      data-layer-id={layer.id}
      onClick={onLayerClick}
      onPointerDown={onLayerPointerDown}
      onPointerMove={onLayerPointerMove}
      onPointerUp={onLayerPointerUp}
    >
      <canvas 
        ref={canvasRef}
        style={canvasStyle}
        className="layer-canvas"
      />
    </div>
  );
});

LayerCanvas.displayName = 'LayerCanvas';

export default LayerCanvas;
