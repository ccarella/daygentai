import { useEffect, useRef, useCallback } from 'react'

interface CrossAreaNavigationConfig {
  sidebarRef: React.RefObject<HTMLElement | null>
  mainContentRef: React.RefObject<HTMLElement | null>
  onSidebarItemSelect?: (element: HTMLElement) => void
}

export function useCrossAreaNavigation({
  sidebarRef,
  mainContentRef,
  onSidebarItemSelect,
}: CrossAreaNavigationConfig) {
  const currentAreaRef = useRef<'sidebar' | 'main'>('main')
  const currentSidebarIndexRef = useRef<number>(-1)

  // Get navigable sidebar items
  const getSidebarItems = useCallback((): HTMLElement[] => {
    if (!sidebarRef.current) return []
    
    const items = Array.from(
      sidebarRef.current.querySelectorAll<HTMLElement>('[data-sidebar-item]')
    ).filter(
      (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-disabled')
    )
    
    return items
  }, [sidebarRef])

  // Focus a sidebar item
  const focusSidebarItem = useCallback((index: number) => {
    const items = getSidebarItems()
    if (items.length === 0) return

    // Remove focus from current item
    if (currentSidebarIndexRef.current >= 0 && currentSidebarIndexRef.current < items.length) {
      items[currentSidebarIndexRef.current]?.classList.remove('shadow-[0_0_0_2px_rgba(0,0,0,1)]')
    }

    // Apply focus to new item
    currentSidebarIndexRef.current = index
    const item = items[index]
    if (item) {
      item.classList.add('shadow-[0_0_0_2px_rgba(0,0,0,1)]')
      item.focus()
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [getSidebarItems])

  // Clear sidebar focus
  const clearSidebarFocus = useCallback(() => {
    const items = getSidebarItems()
    items.forEach((item) => {
      item.classList.remove('shadow-[0_0_0_2px_rgba(0,0,0,1)]')
    })
    currentSidebarIndexRef.current = -1
  }, [getSidebarItems])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if user is typing in an input/textarea
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[role="dialog"]')
    ) {
      return
    }

    const sidebarItems = getSidebarItems()

    // Handle navigation within sidebar
    if (currentAreaRef.current === 'sidebar') {
      switch (e.key) {
        case 'ArrowUp':
          if (sidebarItems.length > 0) {
            e.preventDefault()
            let newIndex = currentSidebarIndexRef.current - 1
            if (newIndex < 0) newIndex = 0
            focusSidebarItem(newIndex)
          }
          break

        case 'ArrowDown':
          if (sidebarItems.length > 0) {
            e.preventDefault()
            let newIndex = currentSidebarIndexRef.current + 1
            if (newIndex >= sidebarItems.length) newIndex = sidebarItems.length - 1
            focusSidebarItem(newIndex)
          }
          break

        case 'Enter':
          if (currentSidebarIndexRef.current >= 0 && currentSidebarIndexRef.current < sidebarItems.length) {
            e.preventDefault()
            const item = sidebarItems[currentSidebarIndexRef.current]
            if (item) {
              item.click()
              onSidebarItemSelect?.(item)
            }
          }
          break

        case 'ArrowRight':
          e.preventDefault()
          currentAreaRef.current = 'main'
          clearSidebarFocus()
          
          // Focus first item in main content
          if (mainContentRef.current) {
            const firstItem = mainContentRef.current.querySelector('[data-issue-row], [data-issue-card]') as HTMLElement
            if (firstItem) {
              firstItem.click()
            }
          }
          break
      }
    }
    
    // Handle switching from main to sidebar
    else if (currentAreaRef.current === 'main' && e.key === 'ArrowLeft') {
      // Check if we're already at the leftmost position in main content
      const activeElement = document.activeElement as HTMLElement
      const isInKanban = activeElement?.closest('[data-issue-card]')
      
      // In kanban view, only switch to sidebar if we're in the leftmost column
      if (isInKanban) {
        const kanbanContainer = mainContentRef.current?.querySelector('.flex.gap-4')
        if (kanbanContainer) {
          const firstColumn = kanbanContainer.firstElementChild
          if (!activeElement.closest('.flex-shrink-0')?.isSameNode(firstColumn)) {
            return // Let kanban handle its own left navigation
          }
        }
      }
      
      e.preventDefault()
      currentAreaRef.current = 'sidebar'
      
      // Focus first or previously focused item in sidebar
      if (currentSidebarIndexRef.current === -1 && sidebarItems.length > 0) {
        focusSidebarItem(0)
      } else if (currentSidebarIndexRef.current >= 0) {
        focusSidebarItem(currentSidebarIndexRef.current)
      }
    }
  }, [getSidebarItems, focusSidebarItem, clearSidebarFocus, mainContentRef, onSidebarItemSelect])

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    
    // Add click handlers to detect which area is active
    const handleSidebarClick = () => {
      currentAreaRef.current = 'sidebar'
    }
    
    const handleMainClick = () => {
      currentAreaRef.current = 'main'
      clearSidebarFocus()
    }
    
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
    }
  }, [handleKeyDown, sidebarRef, mainContentRef, clearSidebarFocus])

  return {
    currentArea: currentAreaRef.current,
    focusSidebar: () => {
      currentAreaRef.current = 'sidebar'
      const items = getSidebarItems()
      if (items.length > 0) {
        focusSidebarItem(0)
      }
    },
    focusMain: () => {
      currentAreaRef.current = 'main'
      clearSidebarFocus()
    },
  }
}