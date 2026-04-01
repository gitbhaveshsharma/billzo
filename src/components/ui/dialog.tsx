'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMMON_SCROLLABLE_PATTERNS } from '@/lib/scrollbar'

const DIALOG_FOCUSABLE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const getFocusableInContainer = (container: HTMLElement) => {
  return Array.from(container.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR)).filter(
    (el) => {
      if (el.hidden) return false
      if (el.getAttribute('aria-hidden') === 'true') return false
      if (el.getAttribute('aria-disabled') === 'true') return false
      if ('disabled' in el && (el as HTMLInputElement).disabled) return false
      return el.offsetParent !== null
    }
  )
}

const handleDirectionalFocusNavigation = (
  e: React.KeyboardEvent<HTMLDivElement>
) => {
  if (e.defaultPrevented) return
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return

  const target = e.target as HTMLElement | null
  if (!target) return

  // Let Radix/listbox controls keep native arrow navigation.
  if (target.closest('[role="listbox"], [data-radix-select-content], [data-radix-dropdown-menu-content]')) {
    return
  }

  const tag = target.tagName.toLowerCase()
  if (tag === 'textarea' || tag === 'select' || target.isContentEditable) return

  // Allow caret movement in input fields; Input component handles boundary logic.
  if (tag === 'input') return

  // From focused tab trigger, ArrowDown enters active tab panel content.
  if (e.key === 'ArrowDown' && target.getAttribute('role') === 'tab') {
    const panelId = target.getAttribute('aria-controls')
    if (panelId) {
      const panel = document.getElementById(panelId)
      if (panel) {
        const firstFocusable = panel.querySelector<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR)
        if (firstFocusable) {
          firstFocusable.focus()
          e.preventDefault()
          return
        }
      }
    }
  }

  const container = e.currentTarget
  const focusable = getFocusableInContainer(container)
  const currentIndex = focusable.indexOf(target)
  if (currentIndex === -1) return

  const movePrev = e.key === 'ArrowUp' || e.key === 'ArrowLeft'
  const nextTarget = focusable[currentIndex + (movePrev ? -1 : 1)]
  if (!nextTarget) return

  nextTarget.focus()
  e.preventDefault()
}

// Base components
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

// Dialog Overlay - Enhanced with backdrop blur
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50',
      // Enhanced overlay with blur effect - using your color system
      'bg-black/50 backdrop-blur-sm',
      // Smooth animations
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      // Transition for smooth backdrop appearance
      'transition-all duration-200',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Dialog Content - Enhanced styling with card colors
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean
  }
>(({ className, children, showCloseButton = true, onKeyDown, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        handleDirectionalFocusNavigation(e)
      }}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0',
        // Use card colors for clean, professional look
        'bg-card border border-border shadow-lg',
        // Smooth transitions
        'duration-200 rounded-lg overflow-hidden',
        // Animations
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        // Layout
        'max-h-[85vh] flex flex-col',
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close
          className={cn(
            'absolute right-4 top-4 rounded-sm',
            // Using muted colors for subtle close button
            'text-muted-foreground opacity-70',
            'ring-offset-background transition-all',
            // Hover state with brand color hint
            'hover:opacity-100 hover:text-foreground',
            // Focus state with ring
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:pointer-events-none',
            // Enhanced close button background on hover
            'hover:bg-accent rounded-md p-1'
          )}
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

// Dialog Header - Fixed at top with card background
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 p-6 pb-4',
      // Use card background with subtle border
      'bg-card border-b border-border',
      'flex-shrink-0',
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

// Dialog Body - Scrollable content area with modern scrollbar
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      COMMON_SCROLLABLE_PATTERNS.DIALOG_BODY,
      // Background using card color for consistency
      'bg-card',
      'p-6 py-4',
      'max-h-full',
      className
    )}
    {...props}
  />
)
DialogBody.displayName = "DialogBody"

// Dialog Footer - Fixed at bottom with card background
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4',
      // Use card background with subtle border
      'bg-card border-t border-border',
      'flex-shrink-0',
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

// Dialog Title - Enhanced typography
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      // Use primary text color for emphasis
      'text-foreground',
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

// Dialog Description - Enhanced typography
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      'text-sm text-muted-foreground',
      className
    )}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
