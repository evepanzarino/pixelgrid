export const lineTool = {
  name: 'line',
  icon: 'fa-slash',
  
  onActivate: (context) => {
    context.setLineStartPixel(null);
  },
  
  onPointerDown: (context, pixelIndex) => {
    const { lineStartPixel, setLineStartPixel, drawLine } = context;
    
    if (lineStartPixel === null) {
      // First click: set start point
      setLineStartPixel(pixelIndex);
    } else if (lineStartPixel === pixelIndex) {
      // Clicking same pixel - cancel
      setLineStartPixel(null);
    } else {
      // Second click: draw straight line immediately
      drawLine(lineStartPixel, pixelIndex);
      setLineStartPixel(null);
    }
  },
  
  getPreview: (context, pixelIndex) => {
    const { lineStartPixel, hoveredPixel, getLinePixels } = context;
    
    if (lineStartPixel !== null && hoveredPixel !== null) {
      return getLinePixels(lineStartPixel, hoveredPixel);
    }
    return [];
  },
  
  isStartPixel: (context, pixelIndex) => {
    return context.lineStartPixel === pixelIndex;
  }
};
