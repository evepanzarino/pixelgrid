export const pencilTool = {
  name: 'pencil',
  icon: 'fa-paintbrush',
  
  onActivate: (context) => {
    context.setLineStartPixel(null);
  },
  
  onPointerDown: (context, pixelIndex, event) => {
    context.setIsDrawing(true);
    context.paintPixel(event, pixelIndex);
  },
  
  onPointerEnter: (context, pixelIndex) => {
    if (context.isDrawing) {
      context.paintPixel(null, pixelIndex);
    }
  }
};
