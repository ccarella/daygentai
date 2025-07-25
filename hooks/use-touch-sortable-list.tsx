import { useState, useCallback, useRef, useEffect } from 'react'

interface DragItem {
  id: string
  index: number
  originalIndex: number
}

interface UseTouchSortableListOptions<T> {
  items: T[]
  getItemId: (item: T) => string
  onReorder: (updates: { id: string; position: number }[]) => Promise<void>
  onError?: (error: Error) => void
  scrollContainer?: HTMLElement | null
}

interface DragState {
  draggedItem: DragItem | null
  dragOverIndex: number | null
  isDragging: boolean
}

export function useTouchSortableList<T>({
  items,
  getItemId,
  onReorder,
  onError,
  scrollContainer
}: UseTouchSortableListOptions<T>) {
  const [dragState, setDragState] = useState<DragState>({
    draggedItem: null,
    dragOverIndex: null,
    isDragging: false
  })

  const [optimisticItems, setOptimisticItems] = useState(items)
  const isReordering = useRef(false)
  const dragElementRef = useRef<HTMLElement | null>(null)
  const cloneElementRef = useRef<HTMLElement | null>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const initialTouchRef = useRef<{ x: number; y: number } | null>(null)

  // Reset optimistic items when items prop changes
  useEffect(() => {
    if (!dragState.isDragging && !isReordering.current) {
      setOptimisticItems(items)
    }
  }, [items, dragState.isDragging])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
      }
      if (cloneElementRef.current) {
        cloneElementRef.current.remove()
      }
    }
  }, [])

  const findDropTarget = useCallback((x: number, y: number) => {
    const elements = document.elementsFromPoint(x, y)
    for (const element of elements) {
      if (element.hasAttribute('data-drop-zone') && element !== dragElementRef.current) {
        const index = parseInt(element.getAttribute('data-index') || '-1')
        if (index >= 0) {
          return index
        }
      }
    }
    return null
  }, [])

  const handleAutoScroll = useCallback((y: number) => {
    const container = scrollContainer
    const threshold = 50
    const scrollSpeed = 10

    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }

    const viewportHeight = window.innerHeight
    const distanceFromTop = y
    const distanceFromBottom = viewportHeight - y

    if (distanceFromTop < threshold) {
      // Scroll up
      scrollIntervalRef.current = setInterval(() => {
        if (!container) {
          window.scrollBy(0, -scrollSpeed)
        } else {
          container.scrollTop -= scrollSpeed
        }
      }, 16)
    } else if (distanceFromBottom < threshold) {
      // Scroll down
      scrollIntervalRef.current = setInterval(() => {
        if (!container) {
          window.scrollBy(0, scrollSpeed)
        } else {
          container.scrollTop += scrollSpeed
        }
      }, 16)
    }
  }, [scrollContainer])

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
        const firstItem = items[0]
        return firstItem && typeof firstItem === 'object' && 'position' in firstItem 
          ? (firstItem as any).position / 2 
          : 512
      } else if (index === itemsCopy.length - 1) {
        const lastItem = items[items.length - 1]
        return lastItem && typeof lastItem === 'object' && 'position' in lastItem
          ? (lastItem as any).position + 1024
          : (index + 1) * 1024
      } else {
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

  const handleTouchStart = useCallback((e: React.TouchEvent, item: T, index: number) => {
    e.preventDefault()
    const touch = e.touches[0]
    if (!touch) return
    
    const element = e.currentTarget as HTMLElement
    
    initialTouchRef.current = { x: touch.clientX, y: touch.clientY }
    dragElementRef.current = element
    
    // Create clone for visual feedback
    const clone = element.cloneNode(true) as HTMLElement
    clone.style.position = 'fixed'
    clone.style.zIndex = '9999'
    clone.style.opacity = '0.8'
    clone.style.transform = 'rotate(2deg) scale(1.05)'
    clone.style.pointerEvents = 'none'
    clone.style.transition = 'none'
    clone.style.left = `${element.getBoundingClientRect().left}px`
    clone.style.top = `${element.getBoundingClientRect().top}px`
    clone.style.width = `${element.offsetWidth}px`
    document.body.appendChild(clone)
    cloneElementRef.current = clone
    
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
    
    const itemId = getItemId(item)
    setDragState({
      draggedItem: { id: itemId, index, originalIndex: index },
      dragOverIndex: null,
      isDragging: true
    })
  }, [getItemId])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!dragState.isDragging || !cloneElementRef.current || !initialTouchRef.current) return
    
    const touch = e.touches[0]
    if (!touch) return
    
    const deltaX = touch.clientX - initialTouchRef.current.x
    const deltaY = touch.clientY - initialTouchRef.current.y
    
    // Update clone position
    if (cloneElementRef.current && dragElementRef.current) {
      const originalRect = dragElementRef.current.getBoundingClientRect()
      cloneElementRef.current.style.left = `${originalRect.left + deltaX}px`
      cloneElementRef.current.style.top = `${originalRect.top + deltaY}px`
    }
    
    // Find drop target
    const dropIndex = findDropTarget(touch.clientX, touch.clientY)
    if (dropIndex !== null && dropIndex !== dragState.dragOverIndex) {
      setDragState(prev => ({ ...prev, dragOverIndex: dropIndex }))
    }
    
    // Handle auto-scroll
    handleAutoScroll(touch.clientY)
  }, [dragState.isDragging, dragState.dragOverIndex, findDropTarget, handleAutoScroll])

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    e.preventDefault()
    
    // Clean up scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
    
    // Remove clone
    if (cloneElementRef.current) {
      cloneElementRef.current.remove()
      cloneElementRef.current = null
    }
    
    const { draggedItem, dragOverIndex } = dragState
    if (!draggedItem || dragOverIndex === null || draggedItem.index === dragOverIndex) {
      setDragState({
        draggedItem: null,
        dragOverIndex: null,
        isDragging: false
      })
      dragElementRef.current = null
      initialTouchRef.current = null
      return
    }
    
    // Calculate new positions and update optimistically
    const { updates, reorderedItems } = calculateNewPositions(draggedItem.index, dragOverIndex)
    
    // Apply optimistic update
    setOptimisticItems(reorderedItems)
    setDragState({
      draggedItem: null,
      dragOverIndex: null,
      isDragging: false
    })
    
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5)
    }
    
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
      dragElementRef.current = null
      initialTouchRef.current = null
    }
  }, [dragState, calculateNewPositions, onReorder, onError, items])

  const getTouchHandleProps = useCallback((item: T, index: number) => ({
    onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, item, index),
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    'data-drag-handle': true,
    'data-index': index.toString(),
    style: {
      cursor: dragState.isDragging ? 'grabbing' : 'grab',
      touchAction: 'none' as const,
      WebkitTouchCallout: 'none' as const,
      WebkitUserSelect: 'none' as const,
      userSelect: 'none' as const
    } as React.CSSProperties
  }), [handleTouchStart, handleTouchMove, handleTouchEnd, dragState.isDragging])

  const getDropZoneProps = useCallback((index: number) => ({
    'data-drop-zone': true,
    'data-index': index.toString(),
    'data-drag-over': dragState.dragOverIndex === index,
    style: {
      touchAction: 'none'
    }
  }), [dragState.dragOverIndex])

  return {
    items: optimisticItems,
    dragState,
    getTouchHandleProps,
    getDropZoneProps,
    isDragging: dragState.isDragging,
    draggedItemId: dragState.draggedItem?.id || null,
    dragOverIndex: dragState.dragOverIndex
  }
}