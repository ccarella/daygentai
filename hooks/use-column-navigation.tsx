import { useEffect, useRef, useCallback } from 'react';

interface ColumnNavigationConfig {
  columns: Array<{
    containerRef: React.RefObject<HTMLElement | null>;
    itemSelector: string;
  }>;
  onEnter?: (element: HTMLElement, columnIndex: number, itemIndex: number) => void;
  onEscape?: () => void;
  enableWrapAround?: boolean;
  scrollIntoView?: boolean | ScrollIntoViewOptions;
  focusClass?: string;
  disableWhenModalOpen?: boolean;
}

export function useColumnNavigation({
  columns,
  onEnter,
  onEscape,
  enableWrapAround = true,
  scrollIntoView = { behavior: 'smooth', block: 'nearest' },
  focusClass = 'ring-2 ring-primary ring-offset-2',
  disableWhenModalOpen = true,
}: ColumnNavigationConfig) {
  const currentColumnRef = useRef<number>(-1);
  const currentItemRef = useRef<number>(-1);

  const getNavigableItems = useCallback((columnIndex: number): HTMLElement[] => {
    const column = columns[columnIndex];
    if (!column?.containerRef.current) return [];
    
    const items = Array.from(
      column.containerRef.current.querySelectorAll<HTMLElement>(column.itemSelector)
    ).filter(
      (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-disabled')
    );
    
    return items;
  }, [columns]);

  const focusItem = useCallback(
    (columnIndex: number, itemIndex: number) => {
      // Remove focus from current item
      if (currentColumnRef.current >= 0 && currentItemRef.current >= 0) {
        const currentItems = getNavigableItems(currentColumnRef.current);
        const currentItem = currentItems[currentItemRef.current];
        if (currentItem) {
          currentItem.classList.remove(...focusClass.split(' '));
          currentItem.setAttribute('tabindex', '-1');
        }
      }

      // Apply focus to new item
      const items = getNavigableItems(columnIndex);
      if (items.length === 0) return;

      currentColumnRef.current = columnIndex;
      currentItemRef.current = itemIndex;
      
      const item = items[itemIndex];
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

      if (columns.length === 0) return;

      let newColumnIndex = currentColumnRef.current;
      let newItemIndex = currentItemRef.current;

      // Initialize if no selection
      if (newColumnIndex === -1) {
        newColumnIndex = 0;
        newItemIndex = 0;
      }

      const currentItems = getNavigableItems(newColumnIndex);

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (currentItems.length > 0) {
            newItemIndex = newItemIndex - 1;
            if (newItemIndex < 0) {
              newItemIndex = enableWrapAround ? currentItems.length - 1 : 0;
            }
            focusItem(newColumnIndex, newItemIndex);
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (currentItems.length > 0) {
            newItemIndex = newItemIndex + 1;
            if (newItemIndex >= currentItems.length) {
              newItemIndex = enableWrapAround ? 0 : currentItems.length - 1;
            }
            focusItem(newColumnIndex, newItemIndex);
          }
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (columns.length > 1) {
            newColumnIndex = newColumnIndex - 1;
            if (newColumnIndex < 0) {
              newColumnIndex = enableWrapAround ? columns.length - 1 : 0;
            }
            // Try to maintain item index, or select first item in new column
            const newColumnItems = getNavigableItems(newColumnIndex);
            if (newColumnItems.length > 0) {
              newItemIndex = Math.min(newItemIndex, newColumnItems.length - 1);
              if (newItemIndex < 0) newItemIndex = 0;
              focusItem(newColumnIndex, newItemIndex);
            }
          }
          break;

        case 'ArrowRight':
          event.preventDefault();
          if (columns.length > 1) {
            newColumnIndex = newColumnIndex + 1;
            if (newColumnIndex >= columns.length) {
              newColumnIndex = enableWrapAround ? 0 : columns.length - 1;
            }
            // Try to maintain item index, or select first item in new column
            const newColumnItems = getNavigableItems(newColumnIndex);
            if (newColumnItems.length > 0) {
              newItemIndex = Math.min(newItemIndex, newColumnItems.length - 1);
              if (newItemIndex < 0) newItemIndex = 0;
              focusItem(newColumnIndex, newItemIndex);
            }
          }
          break;

        case 'Enter':
          if (onEnter && currentColumnRef.current >= 0 && currentItemRef.current >= 0) {
            event.preventDefault();
            const items = getNavigableItems(currentColumnRef.current);
            const currentItem = items[currentItemRef.current];
            if (currentItem) {
              onEnter(currentItem, currentColumnRef.current, currentItemRef.current);
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
          if (currentItems.length > 0) {
            focusItem(newColumnIndex, 0);
          }
          break;

        case 'End':
          event.preventDefault();
          if (currentItems.length > 0) {
            focusItem(newColumnIndex, currentItems.length - 1);
          }
          break;
      }
    },
    [
      columns,
      enableWrapAround,
      focusItem,
      getNavigableItems,
      onEnter,
      onEscape,
      disableWhenModalOpen,
    ]
  );

  // Initialize navigation when a container is clicked
  const handleContainerClick = useCallback(
    (columnIndex: number) => (event: MouseEvent) => {
      const column = columns[columnIndex];
      if (!column) return;

      const items = getNavigableItems(columnIndex);
      const target = event.target as HTMLElement;
      
      // Find if clicked element is a navigable item or within one
      const clickedItem = target.closest(column.itemSelector) as HTMLElement;
      if (clickedItem && items.includes(clickedItem)) {
        const itemIndex = items.indexOf(clickedItem);
        if (itemIndex !== -1) {
          focusItem(columnIndex, itemIndex);
        }
      }
    },
    [columns, getNavigableItems, focusItem]
  );

  // Set up event listeners
  useEffect(() => {
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Add click listeners to containers
    const clickHandlers: Array<{ element: HTMLElement; handler: (e: MouseEvent) => void }> = [];
    
    columns.forEach((column, index) => {
      const container = column.containerRef.current;
      if (container) {
        const handler = handleContainerClick(index);
        container.addEventListener('click', handler);
        clickHandlers.push({ element: container, handler });
      }
    });

    // Clean up
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Remove click handlers
      clickHandlers.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
      
      // Clean up any remaining focus classes
      columns.forEach((_, columnIndex) => {
        const items = getNavigableItems(columnIndex);
        items.forEach((item) => {
          item.classList.remove(...focusClass.split(' '));
          item.removeAttribute('tabindex');
        });
      });
    };
  }, [handleKeyDown, handleContainerClick, columns, getNavigableItems, focusClass]);

  // Public API
  return {
    focusItem,
    getCurrentPosition: () => ({
      column: currentColumnRef.current,
      item: currentItemRef.current,
    }),
    resetFocus: () => {
      currentColumnRef.current = -1;
      currentItemRef.current = -1;
      columns.forEach((_, columnIndex) => {
        const items = getNavigableItems(columnIndex);
        items.forEach((item) => {
          item.classList.remove(...focusClass.split(' '));
          item.removeAttribute('tabindex');
        });
      });
    },
  };
}