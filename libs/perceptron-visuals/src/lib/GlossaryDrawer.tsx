import React, { useEffect, useId, useRef } from 'react'
import { GlossaryPanel } from './GlossaryPanel'
import { usePersistentState } from './hooks/usePersistentState'

export const GlossaryDrawer: React.FC = () => {
  const [open, setOpen] = usePersistentState<boolean>('pl.glossaryOpen', false)
  const [pinned, setPinned] = usePersistentState<boolean>('pl.glossaryPinned', false)

  const isVisible = open || pinned
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)
  const wasVisibleRef = useRef<boolean>(false)
  const titleId = useId()

  useEffect(() => {
    const wasVisible = wasVisibleRef.current

    if (isVisible && !wasVisible && drawerRef.current) {
      drawerRef.current.focus()
    } else if (!isVisible && wasVisible && toggleButtonRef.current) {
      toggleButtonRef.current.focus()
    }

    wasVisibleRef.current = isVisible
  }, [isVisible])

  useEffect(() => {
    if (!isVisible || pinned) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pinned) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, pinned, setOpen])

  return (
    <>
      <button
        ref={toggleButtonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fixed right-3 bottom-3 z-40 rounded-full bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow"
        aria-expanded={isVisible}
      >
        Cheat sheet
      </button>

      {isVisible ? (
        <div
          className="fixed inset-0 z-30 bg-black/30"
          onClick={() => {
            if (!pinned) {
              setOpen(false)
            }
          }}
          aria-hidden="true"
        />
      ) : null}

      <aside
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={!pinned}
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key !== 'Tab' || pinned || !drawerRef.current) {
            return
          }

          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
          )
          const focusableElements = Array.from(focusable).filter(
            (element) => !element.hasAttribute('disabled'),
          )

          if (focusableElements.length === 0) {
            return
          }

          const first = focusableElements[0]
          const last = focusableElements[focusableElements.length - 1]

          if (!first || !last) {
            return
          }

          const active = document.activeElement as HTMLElement | null

          if (event.shiftKey) {
            if (!active || active === first) {
              last.focus()
              event.preventDefault()
            }
          } else if (!active || active === last) {
            first.focus()
            event.preventDefault()
          }
        }}
        className={`fixed top-0 right-0 z-40 h-screen w-[360px] max-w-[90vw] border-l bg-white shadow-xl transition-transform duration-200 ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div id={titleId} className="font-semibold">
            Cheat sheet
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(event) => setPinned(event.target.checked)}
              />
              Pin
            </label>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border px-2 py-1 text-sm"
            >
              Close
            </button>
          </div>
        </div>
        <div className="h-[calc(100vh-42px)] overflow-y-auto p-3">
          <GlossaryPanel compact={false} />
        </div>
      </aside>
    </>
  )
}
