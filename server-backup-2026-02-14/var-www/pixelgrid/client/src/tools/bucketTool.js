export const bucketTool = {
  name: 'bucket',
  icon: 'fa-fill-drip',
  
  onActivate: (context) => {
    context.setLineStartPixel(null);
  },
  
  onPointerDown: (context, pixelIndex) => {
    context.paintBucket(pixelIndex);
  }
};
