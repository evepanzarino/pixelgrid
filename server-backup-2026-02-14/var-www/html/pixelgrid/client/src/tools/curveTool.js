export const curveTool = {
  name: 'curve',
  icon: 'fa-bezier-curve',
  
  onActivate: (context) => {
    context.setLineStartPixel(null);
    context.setCurveEndPixel(null);
    context.setCurveCurveAmount(0);
  },
  
  onPointerDown: (context, pixelIndex) => {
    const { lineStartPixel, setLineStartPixel, setCurveEndPixel } = context;
    
    if (lineStartPixel === null) {
      // First click: set start point
      setLineStartPixel(pixelIndex);
    } else if (lineStartPixel === pixelIndex) {
      // Clicking same pixel - cancel
      setLineStartPixel(null);
    } else {
      // Second click: enter adjustment mode
      setCurveEndPixel(pixelIndex);
    }
  },
  
  getPreview: (context, pixelIndex) => {
    const { 
      lineStartPixel, 
      curveEndPixel, 
      hoveredPixel, 
      curveCurveAmount,
      getLinePixels,
      getQuadraticBezierPixels 
    } = context;
    
    if (lineStartPixel !== null && curveEndPixel === null && hoveredPixel !== null) {
      // First click done, showing preview to hover
      return getLinePixels(lineStartPixel, hoveredPixel);
    } else if (lineStartPixel !== null && curveEndPixel !== null) {
      // Second click done, showing adjustable curve
      return getQuadraticBezierPixels(lineStartPixel, curveEndPixel, curveCurveAmount);
    }
    return [];
  },
  
  isStartPixel: (context, pixelIndex) => {
    return context.lineStartPixel === pixelIndex;
  },
  
  isCurveEnd: (context, pixelIndex) => {
    return context.curveEndPixel === pixelIndex;
  }
};
