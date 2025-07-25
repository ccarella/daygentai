import { useState, useCallback, useRef, useEffect } from 'react'

interface DragItem {
  id: string
  index: number
  originalIndex: number
}

interface UseSortableListOptions<T> {
  items: T[]
  getItemId: (item: T) => string
  onReorder: (updates: { id: string; position: number }[]) => Promise<void>
  onError?: (error: Error) => void
}

interface DragState {
  draggedItem: DragItem | null
  dragOverIndex: number | null
  isDragging: boolean
}

export function useSortableList<T>({
  items,
  getItemId,
  onReorder,
  onError
}: UseSortableListOptions<T>) {
  const [dragState, setDragState] = useState<DragState>({
    draggedItem: null,
    dragOverIndex: null,
    isDragging: false
  })

  const [optimisticItems, setOptimisticItems] = useState(items)
  const dragCounter = useRef(0)
  const isReordering = useRef(false)

  // Reset optimistic items when items prop changes
  useEffect(() => {
    if (!dragState.isDragging && !isReordering.current) {
      setOptimisticItems(items)
    }
  }, [items, dragState.isDragging])

  const handleDragStart = useCallback((e: React.DragEvent, item: T, index: number) => {
    const itemId = getItemId(item)
    
    // Store drag data
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
    
    // Add drag image styling
    if (e.dataTransfer.setDragImage && e.currentTarget instanceof HTMLElement) {
      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
      dragImage.style.opacity = '0.8'
      dragImage.style.transform = 'rotate(2deg)'
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, e.clientX - e.currentTarget.getBoundingClientRect().left, e.clientY - e.currentTarget.getBoundingClientRect().top)
      setTimeout(() => document.body.removeChild(dragImage), 0)
    }
    
    setDragState({
      draggedItem: { id: itemId, index, originalIndex: index },
      dragOverIndex: null,
      isDragging: true
    })
  }, [getItemId])

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragCounter.current++
    
    setDragState(prev => ({
      ...prev,
      dragOverIndex: index
    }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    
    if (dragCounter.current === 0) {
      setDragState(prev => ({
        ...prev,
        dragOverIndex: null
      }))
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const calculateNewPositions = useCallback((fromIndex: number, toIndex: number) => {
    const updates: { id: string; position: number }[] = []
    const itemsCopy = [...optimisticItems]
    
    // Remove dragged item and insert at new position
    const [draggedItem] = itemsCopy.splice(fromIndex, 1)
    if (draggedItem) {
      itemsCopy.splice(toIndex, 0, draggedItem)
    } else {
      return { updates: [], reorderedItems: optimisticItems }
    }
    
    // Calculate new positions using fractional indexing
    const getPosition = (index: number): number => {
      if (index === 0) {
        // First item
        const firstItem = items[0]
        return firstItem && typeof firstItem === 'object' && 'position' in firstItem 
          ? (firstItem as any).position / 2 
          : 512
      } else if (index === itemsCopy.length - 1) {
        // Last item
        const lastItem = items[items.length - 1]
        return lastItem && typeof lastItem === 'object' && 'position' in lastItem
          ? (lastItem as any).position + 1024
          : (index + 1) * 1024
      } else {
        // Middle items - calculate position between neighbors
        const prevItem = items[index - 1]
        const nextItem = items[index + 1]
        const prevPos = prevItem && typeof prevItem === 'object' && 'position' in prevItem
          ? (prevItem as any).position
          : index * 1024
        const nextPos = nextItem && typeof nextItem === 'object' && 'position' in nextItem
          ? (nextItem as any).position
          : (index + 2) * 1024
        return (prevPos + nextPos) / 2
      }
    }
    
    // Only update positions for affected items
    const startIndex = Math.min(fromIndex, toIndex)
    const endIndex = Math.max(fromIndex, toIndex)
    
    for (let i = startIndex; i <= endIndex; i++) {
      const item = itemsCopy[i]
      if (item) {
        const itemId = getItemId(item)
        updates.push({
          id: itemId,
          position: getPosition(i)
        })
      }
    }
    
    return { updates, reorderedItems: itemsCopy }
  }, [items, optimisticItems, getItemId])

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    dragCounter.current = 0
    
    const { draggedItem } = dragState
    if (!draggedItem || draggedItem.index === dropIndex) {
      setDragState({
        draggedItem: null,
        dragOverIndex: null,
        isDragging: false
      })
      return
    }
    
    // Calculate new positions and update optimistically
    const { updates, reorderedItems } = calculateNewPositions(draggedItem.index, dropIndex)
    
    // Apply optimistic update
    setOptimisticItems(reorderedItems)
    setDragState({
      draggedItem: null,
      dragOverIndex: null,
      isDragging: false
    })
    
    // Perform the actual reorder
    isReordering.current = true
    try {
      await onReorder(updates)
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticItems(items)
      if (onError) {
        onError(error as Error)
      } else {
        console.error('Failed to reorder items:', error)
      }
    } finally {
      isReordering.current = false
    }
  }, [dragState, calculateNewPositions, onReorder, onError, items])

  const handleDragEnd = useCallback(() => {
    dragCounter.current = 0
    setDragState({
      draggedItem: null,
      dragOverIndex: null,
      isDragging: false
    })
  }, [])

  const getDragHandleProps = useCallback((item: T, index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => handleDragStart(e, item, index),
    onDragEnd: handleDragEnd,
    'data-drag-handle': true,
    style: {
      cursor: dragState.isDragging ? 'grabbing' : 'grab'
    }
  }), [handleDragStart, handleDragEnd, dragState.isDragging])

  const getDropZoneProps = useCallback((index: number) => ({
    onDragEnter: (e: React.DragEvent) => handleDragEnter(e, index),
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: (e: React.DragEvent) => handleDrop(e, index),
    'data-drop-zone': true,
    'data-drag-over': dragState.dragOverIndex === index
  }), [handleDragEnter, handleDragLeave, handleDragOver, handleDrop, dragState.dragOverIndex])

  return {
    items: optimisticItems,
    dragState,
    getDragHandleProps,
    getDropZoneProps,
    isDragging: dragState.isDragging,
    draggedItemId: dragState.draggedItem?.id || null,
    dragOverIndex: dragState.dragOverIndex
  }
}