/**
 * High-Performance Virtual Scrolling Component
 * Optimized for large legal document lists with smooth animations
 * 
 * Features:
 * - Virtual scrolling for 10k+ items
 * - Smooth scrolling with momentum
 * - Dynamic item heights
 * - Memory efficient rendering
 * - Intersection Observer optimization
 * - Touch/gesture support
 * - Accessibility compliant
 * 
 * @version 3.0.0
 * @author BEAR AI UI Team
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
  useImperativeHandle,
  ReactElement,
  CSSProperties
} from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

export interface VirtualScrollItem {
  id: string;
  height?: number;
  data: any;
}

export interface VirtualScrollProps {
  items: VirtualScrollItem[];
  itemHeight?: number; // Default height for items
  containerHeight: number;
  renderItem: (item: VirtualScrollItem, index: number, isVisible: boolean) => ReactElement;
  overscan?: number; // Number of items to render outside viewport
  threshold?: number; // Intersection threshold
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  className?: string;
  style?: CSSProperties;
  loading?: boolean;
  loadingComponent?: ReactElement;
  emptyComponent?: ReactElement;
  smoothScrolling?: boolean;
  maintainScrollPosition?: boolean;
}

export interface VirtualScrollHandle {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToItem: (itemId: string, align?: 'start' | 'center' | 'end') => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getScrollPosition: () => number;
  forceUpdate: () => void;
}

interface ItemPosition {
  index: number;
  top: number;
  height: number;
  bottom: number;
}

interface VisibleRange {
  startIndex: number;
  endIndex: number;
  visibleItems: ItemPosition[];
}

export const VirtualScrollList = React.forwardRef<VirtualScrollHandle, VirtualScrollProps>(({
  items,
  itemHeight = 60,
  containerHeight,
  renderItem,
  overscan = 5,
  threshold = 0.1,
  onScroll,
  onEndReached,
  endReachedThreshold = 0.8,
  className = '',
  style = {},
  loading = false,
  loadingComponent,
  emptyComponent,
  smoothScrolling = true,
  maintainScrollPosition = true
}, forwardedRef) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const measurementsRef = useRef<Map<number, number>>(new Map());
  
  // State
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({ 
    startIndex: 0, 
    endIndex: 0, 
    visibleItems: [] 
  });
  
  // Debounced scroll end detection
  const debouncedScrollEnd = useDebounce(() => {
    setIsScrolling(false);
  }, 150);
  
  // Memoized calculations
  const itemPositions = useMemo(() => {
    const positions: ItemPosition[] = [];
    let currentTop = 0;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      const measuredHeight = measurementsRef.current.get(i);
      const height = measuredHeight || item.height || itemHeight;
      
      positions.push({
        index: i,
        top: currentTop,
        height,
        bottom: currentTop + height
      });
      
      currentTop += height;
    }
    
    return positions;
  }, [items, itemHeight, measurementsRef.current.size]);
  
  const totalHeight = useMemo(() => {
    const lastPosition = itemPositions[itemPositions.length - 1];
    return lastPosition ? lastPosition.bottom : 0;
  }, [itemPositions]);
  
  // Calculate visible range
  const calculateVisibleRange = useCallback((currentScrollTop: number): VisibleRange => {
    if (itemPositions.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] };
    }
    
    const viewportTop = currentScrollTop;
    const viewportBottom = viewportTop + containerHeight;
    
    // Binary search for start index
    let startIndex = 0;
    let endIndex = itemPositions.length - 1;
    
    while (startIndex <= endIndex) {
      const mid = Math.floor((startIndex + endIndex) / 2);
      const position = itemPositions[mid];

      if (!position) {
        break;
      }

      if (position.bottom <= viewportTop) {
        startIndex = mid + 1;
      } else if (position.top >= viewportTop) {
        endIndex = mid - 1;
      } else {
        startIndex = mid;
        break;
      }
    }

    // Find end index
    let visibleEndIndex = startIndex;
    while (visibleEndIndex < itemPositions.length) {
      const candidate = itemPositions[visibleEndIndex];
      if (!candidate || candidate.top >= viewportBottom) {
        break;
      }
      visibleEndIndex++;
    }
    
    // Apply overscan
    const baseStartIndex = Math.max(0, Math.min(startIndex, itemPositions.length - 1));
    const lastVisibleIndex = Math.max(baseStartIndex, Math.min(itemPositions.length - 1, visibleEndIndex - 1));
    const overscanStart = Math.max(0, baseStartIndex - overscan);
    const overscanEnd = Math.min(itemPositions.length - 1, lastVisibleIndex + overscan);

    // Get visible items
    const visibleItems = overscanEnd >= overscanStart
      ? itemPositions.slice(overscanStart, overscanEnd + 1)
      : [];

    return {
      startIndex: overscanStart,
      endIndex: overscanEnd,
      visibleItems
    };
  }, [itemPositions, containerHeight, overscan]);
  
  // Update visible range when scroll position changes
  useEffect(() => {
    const newVisibleRange = calculateVisibleRange(scrollTop);
    setVisibleRange(newVisibleRange);
  }, [scrollTop, calculateVisibleRange]);
  
  // Scroll handler with performance optimizations
  type ScrollHandler = NonNullable<JSX.IntrinsicElements['div']['onScroll']>

  const handleScroll = useCallback<ScrollHandler>((event) => {
    const target = event.currentTarget as HTMLDivElement;
    const newScrollTop = target.scrollTop;

    setScrollTop(newScrollTop);
    setIsScrolling(true);
    debouncedScrollEnd();

    // Call external scroll handler
    onScroll?.(newScrollTop);

    // Check for end reached
    if (onEndReached && !loading) {
      const scrollRatio = (newScrollTop + containerHeight) / totalHeight;
      if (scrollRatio >= endReachedThreshold) {
        onEndReached();
      }
    }
  }, [debouncedScrollEnd, onScroll, onEndReached, loading, containerHeight, totalHeight, endReachedThreshold]);
  
  // Measure item height after render
  const measureItem = useCallback((index: number, element: HTMLElement) => {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const height = rect.height;
    
    // Only update if height changed significantly
    const existingHeight = measurementsRef.current.get(index);
    if (!existingHeight || Math.abs(existingHeight - height) > 1) {
      measurementsRef.current.set(index, height);
      
      // Trigger re-calculation of positions
      // This will cause a re-render with updated positions
      setVisibleRange(prev => ({ ...prev }));
    }
  }, []);
  
  // Intersection Observer for lazy loading
  const { observe, unobserve } = useIntersectionObserver({
    threshold,
    rootMargin: `${overscan * itemHeight}px`,
    onIntersect: useCallback((entries) => {
      entries.forEach(entry => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0');
        const element = entry.target as HTMLElement;
        
        if (entry.isIntersecting) {
          // Item is visible, measure it
          measureItem(index, element);
        }
      });
    }, [measureItem])
  });
  
  // Scroll to specific item
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current || index < 0 || index >= itemPositions.length) return;

    const position = itemPositions[index];
    if (!position) return;
    let scrollTop = position.top;
    
    switch (align) {
      case 'center':
        scrollTop = position.top - (containerHeight - position.height) / 2;
        break;
      case 'end':
        scrollTop = position.bottom - containerHeight;
        break;
    }
    
    scrollTop = Math.max(0, Math.min(scrollTop, totalHeight - containerHeight));
    
    if (smoothScrolling) {
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    } else {
      containerRef.current.scrollTop = scrollTop;
    }
  }, [itemPositions, containerHeight, totalHeight, smoothScrolling]);
  
  // Scroll to item by ID
  const scrollToItem = useCallback((itemId: string, align?: 'start' | 'center' | 'end') => {
    const index = items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      scrollToIndex(index, align);
    }
  }, [items, scrollToIndex]);
  
  // Expose methods via ref
  useImperativeHandle(forwardedRef, () => ({
    scrollToIndex,
    scrollToItem,
    scrollToTop: () => scrollToIndex(0),
    scrollToBottom: () => scrollToIndex(items.length - 1, 'end'),
    getScrollPosition: () => scrollTop,
    forceUpdate: () => {
      measurementsRef.current.clear();
      setVisibleRange(calculateVisibleRange(scrollTop));
    }
  }), [
    scrollToIndex,
    scrollToItem,
    items.length,
    scrollTop,
    calculateVisibleRange
  ]);
  
  // Maintain scroll position when items change
  useLayoutEffect(() => {
    if (!maintainScrollPosition || !containerRef.current) return;
    
    const savedScrollTop = scrollTop;
    
    // Restore scroll position after items change
    requestAnimationFrame(() => {
      if (containerRef.current && Math.abs(containerRef.current.scrollTop - savedScrollTop) > 1) {
        containerRef.current.scrollTop = savedScrollTop;
      }
    });
  }, [items.length, maintainScrollPosition, scrollTop]);
  
  // Render visible items
  const renderVisibleItems = () => {
    if (items.length === 0) {
      return emptyComponent || (
        <div className="flex items-center justify-center h-32 text-gray-500">
          No items to display
        </div>
      );
    }
    
    return visibleRange.visibleItems.map(position => {
      const item = items[position.index];
      if (!item) return null;
      
      return (
        <div
          key={item.id}
          data-index={position.index}
          ref={(el) => {
            if (el) {
              observe(el);
              measureItem(position.index, el);
            } else {
              // Element is being unmounted
              const element = document.querySelector(`[data-index="${position.index}"]`);
              if (element) unobserve(element as HTMLElement);
            }
          }}
          style={{
            position: 'absolute',
            top: position.top,
            left: 0,
            right: 0,
            height: position.height,
            willChange: isScrolling ? 'transform' : 'auto'
          }}
          className="virtual-scroll-item"
        >
          {renderItem(item, position.index, true)}
        </div>
      );
    });
  };
  
  // CSS classes for smooth scrolling
  const containerClasses = [
    'relative overflow-auto',
    smoothScrolling ? 'scroll-smooth' : '',
    isScrolling ? 'scrolling' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{
        height: containerHeight,
        ...style
      }}
      onScroll={handleScroll}
      role="list"
      aria-label="Virtual scrolling list"
      aria-rowcount={items.length}
    >
      {/* Virtual spacer to maintain scroll height */}
      <div
        ref={scrollElementRef}
        style={{ 
          height: totalHeight,
          position: 'relative',
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      />
      
      {/* Rendered items */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          pointerEvents: 'auto'
        }}
      >
        {renderVisibleItems()}
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-4">
          {loadingComponent || (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm text-gray-600">Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Custom hook for using VirtualScrollList
export const useVirtualScroll = () => {
  const ref = useRef<VirtualScrollHandle | null>(null);

  return {
    ref,
    scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') =>
      ref.current?.scrollToIndex(index, align),
    scrollToItem: (itemId: string, align?: 'start' | 'center' | 'end') => 
      ref.current?.scrollToItem(itemId, align),
    scrollToTop: () => ref.current?.scrollToTop(),
    scrollToBottom: () => ref.current?.scrollToBottom(),
    getScrollPosition: () => ref.current?.getScrollPosition(),
    forceUpdate: () => ref.current?.forceUpdate()
  };
};

// Performance-optimized list item wrapper
export const VirtualScrollItemWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  onDoubleClick?: () => void;
}> = React.memo(({ 
  children, 
  className = '',
  style = {},
  onClick,
  onDoubleClick
}) => {
  return (
    <div
      className={`virtual-scroll-item-wrapper ${className}`}
      style={{
        willChange: 'transform',
        contain: 'layout',
        ...style
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="listitem"
    >
      {children}
    </div>
  );
});

VirtualScrollItemWrapper.displayName = 'VirtualScrollItemWrapper';

VirtualScrollList.displayName = 'VirtualScrollList';

export default VirtualScrollList;
