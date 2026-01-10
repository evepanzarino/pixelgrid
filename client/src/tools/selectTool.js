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
    const { pixelGroups, activeGroup, selectionStart, size } = context;
    const isMobile = size.w <= 1024;
    
    // Check if clicking on a grouped pixel
    const clickedPixelGroup = pixelGroups[pixelIndex];
    
    if (clickedPixelGroup) {
      // Start dragging the group
      context.setActiveGroup(clickedPixelGroup);
      context.setGroupDragStart(pixelIndex);
      context.setIsDrawing(true);
      return;
    }
    
    // Mobile two-click selection mode
    if (isMobile && !activeGroup) {
      if (selectionStart === null) {
        // First click: set selection start
        context.setSelectionStart(pixelIndex);
        context.setSelectionEnd(null);
        context.setSelectedPixels([]);
        // Don't set drawing state for mobile mode
      } else {
        // Second click: finalize selection
        context.setSelectionEnd(pixelIndex);
        const selected = context.getSelectionPixels(context.selectionStart, pixelIndex);
        context.setSelectedPixels(selected);
        context.setSelectionStart(null);
        context.setSelectionEnd(null);
      }
      return;
    }
    
    // Desktop drag selection mode
    if (!activeGroup && !isMobile) {
      context.setSelectionStart(pixelIndex);
      context.setSelectionEnd(pixelIndex);
      context.setSelectedPixels([]);
      context.setIsDrawing(true);
    }
  },
  
  onPointerEnter: (context, pixelIndex) => {
    const { isDrawing, selectionStart, groupDragStart, activeGroup, size } = context;
    const isMobile = size.w <= 1024;
    
    if (!isDrawing) {
      // On mobile, show preview rectangle when hovering after first click
      if (isMobile && selectionStart !== null) {
        context.setSelectionEnd(pixelIndex);
      }
      return;
    }
    
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
    
    // Handle desktop selection rectangle during drag
    if (selectionStart !== null && !isMobile) {
      context.setSelectionEnd(pixelIndex);
    }
  },
  
  onPointerUp: (context) => {
    const { selectionStart, selectionEnd, size } = context;
    const isMobile = size.w <= 1024;
    
    // Desktop drag selection completion
    if (!isMobile && selectionStart !== null && selectionEnd !== null) {
      const selected = context.getSelectionPixels(selectionStart, selectionEnd);
      context.setSelectedPixels(selected);
      context.setSelectionStart(null);
      context.setSelectionEnd(null);
    }
    
    // Clear group drag
    context.setGroupDragStart(null);
  },
  
  // Get preview rectangle during selection
  getPreview: (context) => {
    const { selectionStart, selectionEnd, selectedPixels, size } = context;
    const isMobile = size.w <= 1024;
    
    // Show final selection if complete
    if (selectedPixels.length > 0) {
      return selectedPixels.map(index => ({ index, type: 'selection' }));
    }
    
    // Show preview rectangle during drag or mobile hover
    if (selectionStart !== null && selectionEnd !== null) {
      const rect = context.getSelectionRectangle(selectionStart, selectionEnd);
      return rect.map(index => ({ index, type: 'selection-preview' }));
    }
    
    // Show mobile first click indicator
    if (isMobile && selectionStart !== null && selectionEnd === null) {
      return [{ index: selectionStart, type: 'selection-start' }];
    }
    
    return [];
  }
};
