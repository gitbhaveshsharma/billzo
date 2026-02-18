/**
 * Modern Scrollbar Utility
 * 
 * Provides TypeScript utilities and constants for modern scrollbar styling
 * Ensures consistent scrollbar design across the application
 */

export const SCROLLBAR_CLASSES = {
  /**
   * Modern thin scrollbar - Default choice for most components
   * Features: 6px width, smooth transitions, brand color on active
   */
  MODERN: 'scrollbar-modern',
  
  /**
   * Ghost scrollbar - Appears only on hover, premium feel
   * Features: 8px width, transparent by default, appears on hover
   * Best for: Main content areas, non-critical scrolling
   */
  GHOST: 'scrollbar-ghost',
  
  /**
   * Accent scrollbar - Uses brand colors throughout
   * Features: 6px width, brand primary color, prominent visibility
   * Best for: Important lists, featured content
   */
  ACCENT: 'scrollbar-accent',
  
  /**
   * Ultra-thin scrollbar - Minimal footprint
   * Features: 4px width, very subtle, space-efficient
   * Best for: Compact spaces, sidebars, narrow containers
   */
  THIN: 'scrollbar-thin',
  
  /**
   * Hidden scrollbar - Completely invisible but functional
   * Features: Scrolling works but no visual indicator
   * Best for: Custom scroll implementations, clean designs
   */
  HIDDEN: 'scrollbar-hide'
} as const;

export type ScrollbarClass = typeof SCROLLBAR_CLASSES[keyof typeof SCROLLBAR_CLASSES];

/**
 * Scrollbar configuration for different component types
 */
export const SCROLLBAR_CONFIGS = {
  // Dialog and modal components
  DIALOG: SCROLLBAR_CLASSES.MODERN,
  MODAL: SCROLLBAR_CLASSES.MODERN,
  
  // List components
  DROPDOWN: SCROLLBAR_CLASSES.MODERN,
  SELECT: SCROLLBAR_CLASSES.MODERN,
  COMMAND: SCROLLBAR_CLASSES.MODERN,
  
  // Content areas
  MAIN_CONTENT: SCROLLBAR_CLASSES.GHOST,
  SIDEBAR: SCROLLBAR_CLASSES.THIN,
  
  // Special components
  AVATAR_GRID: SCROLLBAR_CLASSES.MODERN,
  FORM_AREA: SCROLLBAR_CLASSES.MODERN,
  
  // Data displays
  TABLE: SCROLLBAR_CLASSES.MODERN,
  CARD_LIST: SCROLLBAR_CLASSES.GHOST,
  
  // Navigation
  NAV_MENU: SCROLLBAR_CLASSES.THIN,
  BREADCRUMB: SCROLLBAR_CLASSES.HIDDEN
} as const;

/**
 * Get the appropriate scrollbar class for a component type
 * @param componentType - The type of component
 * @returns The scrollbar class to use
 */
export function getScrollbarClass(componentType: keyof typeof SCROLLBAR_CONFIGS): ScrollbarClass {
  return SCROLLBAR_CONFIGS[componentType];
}

/**
 * Combine scrollbar class with other Tailwind classes
 * @param baseClasses - Base Tailwind classes
 * @param scrollbarType - Type of scrollbar to apply
 * @returns Combined class string
 */
export function withScrollbar(baseClasses: string, scrollbarType: ScrollbarClass): string {
  return `${baseClasses} ${scrollbarType}`;
}

/**
 * Get scrollbar classes for common overflow patterns
 */
export const OVERFLOW_WITH_SCROLLBAR = {
  /**
   * Vertical scrolling with modern scrollbar
   */
  Y_MODERN: `overflow-y-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Vertical scrolling with ghost scrollbar
   */
  Y_GHOST: `overflow-y-auto ${SCROLLBAR_CLASSES.GHOST}`,
  
  /**
   * Vertical scrolling with accent scrollbar
   */
  Y_ACCENT: `overflow-y-auto ${SCROLLBAR_CLASSES.ACCENT}`,
  
  /**
   * Vertical scrolling with thin scrollbar
   */
  Y_THIN: `overflow-y-auto ${SCROLLBAR_CLASSES.THIN}`,
  
  /**
   * Vertical scrolling with hidden scrollbar
   */
  Y_HIDDEN: `overflow-y-auto ${SCROLLBAR_CLASSES.HIDDEN}`,
  
  /**
   * Horizontal scrolling with modern scrollbar
   */
  X_MODERN: `overflow-x-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Both directions with modern scrollbar
   */
  BOTH_MODERN: `overflow-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Both directions with ghost scrollbar
   */
  BOTH_GHOST: `overflow-auto ${SCROLLBAR_CLASSES.GHOST}`
} as const;

/**
 * Predefined class combinations for common use cases
 */
export const COMMON_SCROLLABLE_PATTERNS = {
  /**
   * Dialog body - Flexible height with modern scrollbar
   */
  DIALOG_BODY: `flex-1 overflow-y-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Modal content - Max height with modern scrollbar
   */
  MODAL_CONTENT: `max-h-[70vh] overflow-y-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Dropdown list - Max height with modern scrollbar
   */
  DROPDOWN_LIST: `max-h-[200px] overflow-y-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Large dropdown list - More height with modern scrollbar
   */
  DROPDOWN_LIST_LARGE: `max-h-[300px] overflow-y-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Avatar grid - Fixed max height with modern scrollbar
   */
  AVATAR_GRID: `max-h-[500px] overflow-y-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Sidebar content - Full height with thin scrollbar
   */
  SIDEBAR_CONTENT: `h-full overflow-y-auto ${SCROLLBAR_CLASSES.THIN}`,
  
  /**
   * Main content area - Auto height with ghost scrollbar
   */
  MAIN_CONTENT: `overflow-y-auto ${SCROLLBAR_CLASSES.GHOST}`,
  
  /**
   * Form container - Max height with modern scrollbar
   */
  FORM_CONTAINER: `max-h-[60vh] overflow-y-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Table wrapper - Auto size with modern scrollbar
   */
  TABLE_WRAPPER: `overflow-auto ${SCROLLBAR_CLASSES.MODERN}`,
  
  /**
   * Code block - Auto with thin scrollbar
   */
  CODE_BLOCK: `overflow-auto ${SCROLLBAR_CLASSES.THIN}`
} as const;

/**
 * Get responsive scrollbar pattern
 * @param mobilePattern - Pattern for mobile screens
 * @param desktopPattern - Pattern for desktop screens
 * @returns Responsive class string
 */
export function getResponsiveScrollbar(
  mobilePattern: string,
  desktopPattern: string
): string {
  return `${mobilePattern} md:${desktopPattern}`;
}

export default {
  SCROLLBAR_CLASSES,
  SCROLLBAR_CONFIGS,
  OVERFLOW_WITH_SCROLLBAR,
  COMMON_SCROLLABLE_PATTERNS,
  getScrollbarClass,
  withScrollbar,
  getResponsiveScrollbar
};