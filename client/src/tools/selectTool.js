export const selectTool = {
  name: 'select',
  icon: 'fa-vector-square',
  
  onActivate: (context) => {
    context.setLineStartPixel(null);
    context.setSelectionStart(null);
    context.setSelectionEnd(null);
    context.setSelectedPixels([]);
  },
  
  onPointerDown: (context, pixelIndex) => {
    const { pixelGroups, activeGroup } = context;
    
    // Check if clicking on a grouped pixel
    const clickedPixelGroup = pixelGroups[pixelIndex];
    
    if (clickedPixelGroup) {
      // Start dragging the group
      context.setActiveGroup(clickedPixelGroup);
      context.setGroupDragStart(pixelIndex);
      return;
    }
    
    // Start new selection if not clicking on a group
    if (!activeGroup) {
      context.setSelectionStart(pixelIndex);
      context.setSelectionEnd(pixelIndex);
      context.setSelectedPixels([]);
    }
  },
  
  onPointerEnter: (context, pixelIndex) => {
    const { isDrawing, selectionStart, groupDragStart, activeGroup } = context;
    
    if (!isDrawing) return;
    
    // Handle group dragging
    if (groupDragStart !== null && activeGroup) {
      const startRow = Math.floor(groupDragStart / 200);
      const startCol = groupDragStart % 200;
      const currentRow = Math.floor(pixelIndex / 200);
      const currentCol = pixelIndex % 200;
      const deltaRow = currentRow - startRow;
      const deltaCol = currentCol - startCol;
      
      context.moveGroup(activeGroup, deltaRow, deltaCol);
      context.setGroupDragStart(pixelIndex);
      return;
    }
    
    // Handle selection rectangle
    if (selectionStart !== null) {
      context.setSelectionEnd(pixelIndex);
    }
  },
  
  onPointerUp: (context) => {
    const { selectionStart, selectionEnd } = context;
    
    // Finalize selection
    if (selectionStart !== null && selectionEnd !== null) {
      const selected = context.getSelectionPixels();
      context.setSelectedPixels(selected);
    }
    
    // Clear group drag
    context.setGroupDragStart(null);
  },
  
  // Get preview rectangle during selection
  getPreview: (context) => {
    const { selectionStart, selectionEnd, selectedPixels } = context;
    
    // Show final selection if complete
    if (selectedPixels.length > 0) {
      return selectedPixels.map(index => ({ index, type: 'selection' }));
    }
    
    // Show preview rectangle during drag
    if (selectionStart !== null && selectionEnd !== null) {
      const rect = context.getSelectionRectangle();
      return rect.map(index => ({ index, type: 'selection-preview' }));
    }
    
    return [];
  }
};
