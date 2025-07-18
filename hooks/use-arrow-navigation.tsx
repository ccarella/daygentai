import { useEffect, useRef, useCallback } from 'react';

interface NavigationConfig {
  containerRef: React.RefObject<HTMLElement | null>;
  itemSelector: string;
  onEnter?: (element: HTMLElement, index: number) => void;
  onEscape?: () => void;
  orientation?: 'vertical' | 'horizontal' | 'grid';
  columns?: number; // For grid navigation
  enableWrapAround?: boolean;
  scrollIntoView?: boolean | ScrollIntoViewOptions;
  focusClass?: string;
  disableWhenModalOpen?: boolean;
}

export function useArrowNavigation({
  containerRef,
  itemSelector,
  onEnter,
  onEscape,
  orientation = 'vertical',
  columns = 1,
  enableWrapAround = true,
  scrollIntoView = { behavior: 'smooth', block: 'nearest' },
  focusClass = 'shadow-[0_0_0_2px_rgba(0,0,0,1)]',
  disableWhenModalOpen = true,
}: NavigationConfig) {
  const currentIndexRef = useRef<number>(-1);

  const getNavigableItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    
    const items = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(itemSelector)
    ).filter(
      (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-disabled')
    );
    
    return items;
  }, [containerRef, itemSelector]);

  const focusItem = useCallback(
    (index: number) => {
      const items = getNavigableItems();
      if (items.length === 0) return;

      // Remove focus from current item
      if (currentIndexRef.current >= 0 && currentIndexRef.current < items.length) {
        items[currentIndexRef.current]?.classList.remove(...focusClass.split(' '));
        items[currentIndexRef.current]?.setAttribute('tabindex', '-1');
      }

      // Apply focus to new item
      currentIndexRef.current = index;
      const item = items[index];
      if (item) {
        item.classList.add(...focusClass.split(' '));
        item.setAttribute('tabindex', '0');
        item.focus();
        
        if (scrollIntoView) {
          item.scrollIntoView(
            typeof scrollIntoView === 'boolean' ? undefined : scrollIntoView
          );
        }
      }
    },
    [getNavigableItems, focusClass, scrollIntoView]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if modal is open and we should disable
      if (disableWhenModalOpen) {
        const modalOpen = document.querySelector('[role="dialog"]');
        if (modalOpen) return;
      }

      const items = getNavigableItems();
      if (items.length === 0) return;

      let newIndex = currentIndexRef.current;
      const maxIndex = items.length - 1;

      switch (event.key) {
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'grid') {
            event.preventDefault();
            if (orientation === 'grid' && columns > 1) {
              newIndex = newIndex - columns;
            } else {
              newIndex = newIndex - 1;
            }
            
            if (newIndex < 0) {
              newIndex = enableWrapAround ? maxIndex : 0;
            }
            focusItem(newIndex);
          }
          break;

        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'grid') {
            event.preventDefault();
            if (orientation === 'grid' && columns > 1) {
              newIndex = newIndex + columns;
            } else {
              newIndex = newIndex + 1;
            }
            
            if (newIndex > maxIndex) {
              newIndex = enableWrapAround ? 0 : maxIndex;
            }
            focusItem(newIndex);
          }
          break;

        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'grid') {
            event.preventDefault();
            newIndex = newIndex - 1;
            
            if (newIndex < 0) {
              newIndex = enableWrapAround ? maxIndex : 0;
            }
            focusItem(newIndex);
          }
          break;

        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'grid') {
            event.preventDefault();
            newIndex = newIndex + 1;
            
            if (newIndex > maxIndex) {
              newIndex = enableWrapAround ? 0 : maxIndex;
            }
            focusItem(newIndex);
          }
          break;

        case 'Enter':
          if (onEnter && currentIndexRef.current >= 0) {
            event.preventDefault();
            const currentItem = items[currentIndexRef.current];
            if (currentItem) {
              onEnter(currentItem, currentIndexRef.current);
            }
          }
          break;

        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;

        case 'Home':
          event.preventDefault();
          focusItem(0);
          break;

        case 'End':
          event.preventDefault();
          focusItem(maxIndex);
          break;
      }
    },
    [
      orientation,
      columns,
      enableWrapAround,
      focusItem,
      getNavigableItems,
      onEnter,
      onEscape,
      disableWhenModalOpen,
    ]
  );

  // Initialize navigation when container is clicked
  const handleContainerClick = useCallback(
    (event: MouseEvent) => {
      const items = getNavigableItems();
      const target = event.target as HTMLElement;
      
      // Find if clicked element is a navigable item or within one
      const clickedItem = target.closest(itemSelector) as HTMLElement;
      if (clickedItem && items.includes(clickedItem)) {
        const index = items.indexOf(clickedItem);
        if (index !== -1) {
          focusItem(index);
        }
      }
    },
    [getNavigableItems, itemSelector, focusItem]
  );

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Add click listener to container
    container.addEventListener('click', handleContainerClick);

    // Clean up focus classes when unmounting
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('click', handleContainerClick);
      
      // Clean up any remaining focus classes
      const items = getNavigableItems();
      items.forEach((item) => {
        item.classList.remove(...focusClass.split(' '));
        item.removeAttribute('tabindex');
      });
    };
  }, [handleKeyDown, handleContainerClick, getNavigableItems, focusClass]);

  // Public API
  return {
    focusItem,
    getCurrentIndex: () => currentIndexRef.current,
    resetFocus: () => {
      currentIndexRef.current = -1;
      const items = getNavigableItems();
      items.forEach((item) => {
        item.classList.remove(...focusClass.split(' '));
        item.removeAttribute('tabindex');
      });
    },
  };
}