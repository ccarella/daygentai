import { useEffect, useRef, useCallback } from 'react'

interface WorkspaceNavigationConfig {
  sidebarRef: React.RefObject<HTMLElement | null>
  mainContentRef: React.RefObject<HTMLElement | null>
  onItemSelect?: (element: HTMLElement, area: 'sidebar' | 'main') => void
}

export function useWorkspaceNavigation({
  sidebarRef,
  mainContentRef,
  onItemSelect,
}: WorkspaceNavigationConfig) {
  const currentAreaRef = useRef<'sidebar' | 'main'>('main')
  const currentIndexRef = useRef<number>(-1)
  const focusClass = 'shadow-[0_0_0_2px_rgba(0,0,0,1)]'

  // Get all navigable items from both areas
  const getAllItems = useCallback((): { element: HTMLElement; area: 'sidebar' | 'main' }[] => {
    const items: { element: HTMLElement; area: 'sidebar' | 'main' }[] = []
    
    // Get sidebar items
    if (sidebarRef.current) {
      const sidebarItems = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>('[data-sidebar-item]')
      ).filter(el => !el.hasAttribute('disabled'))
      
      sidebarItems.forEach(el => items.push({ element: el, area: 'sidebar' }))
    }
    
    // Get main content items
    if (mainContentRef.current) {
      const mainItems = Array.from(
        mainContentRef.current.querySelectorAll<HTMLElement>('[data-issue-row], [data-issue-card], [data-recipe-row]')
      ).filter(el => !el.hasAttribute('disabled'))
      
      mainItems.forEach(el => items.push({ element: el, area: 'main' }))
    }
    
    return items
  }, [sidebarRef, mainContentRef])

  // Get sidebar items
  const getSidebarItems = useCallback((): HTMLElement[] => {
    if (!sidebarRef.current) return []
    return Array.from(
      sidebarRef.current.querySelectorAll<HTMLElement>('[data-sidebar-item]')
    ).filter(el => !el.hasAttribute('disabled'))
  }, [sidebarRef])

  // Get items for current area only
  const getCurrentAreaItems = useCallback((): HTMLElement[] => {
    if (currentAreaRef.current === 'sidebar') {
      return getSidebarItems()
    } else if (currentAreaRef.current === 'main' && mainContentRef.current) {
      return Array.from(
        mainContentRef.current.querySelectorAll<HTMLElement>('[data-issue-row], [data-issue-card], [data-recipe-row]')
      ).filter(el => !el.hasAttribute('disabled'))
    }
    return []
  }, [getSidebarItems, mainContentRef])

  // Clear all focus styles
  const clearAllFocus = useCallback(() => {
    const allItems = getAllItems()
    allItems.forEach(({ element }) => {
      element.classList.remove(...focusClass.split(' '))
      element.removeAttribute('tabindex')
    })
  }, [getAllItems, focusClass])

  // Focus an item
  const focusItem = useCallback((index: number, items: HTMLElement[]) => {
    if (index < 0 || index >= items.length) return
    
    // Clear all existing focus first
    clearAllFocus()
    
    // Apply focus to new item
    currentIndexRef.current = index
    const item = items[index]
    if (item) {
      item.classList.add(...focusClass.split(' '))
      item.setAttribute('tabindex', '0')
      item.focus()
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [clearAllFocus, focusClass])

  // Find the active sidebar item based on current route
  const findActiveSidebarItem = useCallback((): number => {
    const sidebarItems = getSidebarItems()
    
    // Check each sidebar item to see if it's currently active
    for (let i = 0; i < sidebarItems.length; i++) {
      const item = sidebarItems[i]
      
      // Check if the item has the active class (bg-accent)
      if (item && item.classList.contains('bg-accent')) {
        return i
      }
    }
    
    return 0 // Default to first item if no active item found
  }, [getSidebarItems])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input/textarea or modal is open
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[role="dialog"]')
    ) {
      return
    }

    const currentItems = getCurrentAreaItems()
    
    switch (e.key) {
      case 'ArrowUp':
        if (currentItems.length > 0) {
          e.preventDefault()
          let newIndex = currentIndexRef.current - 1
          if (newIndex < 0) newIndex = 0
          focusItem(newIndex, currentItems)
        }
        break

      case 'ArrowDown':
        if (currentItems.length > 0) {
          e.preventDefault()
          let newIndex = currentIndexRef.current + 1
          if (newIndex >= currentItems.length) newIndex = currentItems.length - 1
          focusItem(newIndex, currentItems)
        }
        break

      case 'ArrowLeft':
        if (currentAreaRef.current === 'main') {
          e.preventDefault()
          currentAreaRef.current = 'sidebar'
          currentIndexRef.current = -1
          
          const sidebarItems = getCurrentAreaItems()
          if (sidebarItems.length > 0) {
            // Find and focus the active sidebar item based on current route
            const activeIndex = findActiveSidebarItem()
            focusItem(activeIndex, sidebarItems)
          }
        }
        break

      case 'ArrowRight':
        if (currentAreaRef.current === 'sidebar') {
          e.preventDefault()
          currentAreaRef.current = 'main'
          currentIndexRef.current = -1
          
          const mainItems = getCurrentAreaItems()
          if (mainItems.length > 0) {
            focusItem(0, mainItems)
          }
        }
        break

      case 'Enter':
        if (currentIndexRef.current >= 0 && currentIndexRef.current < currentItems.length) {
          e.preventDefault()
          const item = currentItems[currentIndexRef.current]
          if (item) {
            // For issue rows, cards, and recipe rows, trigger their click handlers
            if (item.hasAttribute('data-issue-row') || item.hasAttribute('data-issue-card') || item.hasAttribute('data-recipe-row')) {
              // Find and click the element to trigger the existing click handler
              item.click()
            } else {
              // For sidebar items, just click them
              item.click()
            }
            onItemSelect?.(item, currentAreaRef.current)
          }
        }
        break

      case 'Escape':
        // Let individual components handle escape
        break
    }
  }, [getCurrentAreaItems, focusItem, onItemSelect, findActiveSidebarItem])

  // Handle clicks to set active area and clear focus from other area
  const handleContainerClick = useCallback((area: 'sidebar' | 'main') => {
    if (currentAreaRef.current !== area) {
      currentAreaRef.current = area
      currentIndexRef.current = -1
      clearAllFocus()
    }
  }, [clearAllFocus])

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    
    const handleSidebarClick = () => handleContainerClick('sidebar')
    const handleMainClick = () => handleContainerClick('main')
    
    const sidebar = sidebarRef.current
    const mainContent = mainContentRef.current
    
    if (sidebar) {
      sidebar.addEventListener('click', handleSidebarClick)
    }
    
    if (mainContent) {
      mainContent.addEventListener('click', handleMainClick)
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      
      if (sidebar) {
        sidebar.removeEventListener('click', handleSidebarClick)
      }
      
      if (mainContent) {
        mainContent.removeEventListener('click', handleMainClick)
      }
      
      // Clean up any remaining focus
      clearAllFocus()
    }
  }, [handleKeyDown, handleContainerClick, sidebarRef, mainContentRef, clearAllFocus])

  return {
    currentArea: currentAreaRef.current,
    focusSidebar: () => {
      currentAreaRef.current = 'sidebar'
      currentIndexRef.current = -1
      const items = getCurrentAreaItems()
      if (items.length > 0) {
        focusItem(0, items)
      }
    },
    focusMain: () => {
      currentAreaRef.current = 'main'  
      currentIndexRef.current = -1
      const items = getCurrentAreaItems()
      if (items.length > 0) {
        focusItem(0, items)
      }
    },
    clearFocus: clearAllFocus,
  }
}