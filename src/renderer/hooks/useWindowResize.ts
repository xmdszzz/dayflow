import { useCallback, useEffect, useRef } from 'react'

type Edge = 'left' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right'

export function useWindowResize() {
  const resizing = useRef(false)

  const onEdgeMouseDown = useCallback((edge: Edge) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = true
    window.api.invoke('window:startResize', edge)
  }, [])

  // Global mouseup — stops any active resize regardless of where the cursor is
  useEffect(() => {
    const onMouseUp = () => {
      if (resizing.current) {
        resizing.current = false
        window.api.invoke('window:stopResize')
      }
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [])

  const edgeClass = (edge: Edge): string => {
    const base = 'fixed z-[9999]'
    switch (edge) {
      case 'left':        return `${base} left-0 top-8 bottom-0 w-[6px] cursor-w-resize`
      case 'right':       return `${base} right-0 top-8 bottom-0 w-[6px] cursor-e-resize`
      case 'bottom':      return `${base} left-0 right-0 bottom-0 h-[6px] cursor-s-resize`
      case 'bottom-left': return `${base} left-0 bottom-0 w-[8px] h-[8px] cursor-sw-resize`
      case 'bottom-right':return `${base} right-0 bottom-0 w-[8px] h-[8px] cursor-se-resize`
    }
  }

  return { onEdgeMouseDown, edgeClass }
}
