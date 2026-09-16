'use client'

import { useEffect, useRef } from 'react'

export type AvatarSelfViewField = {
  id: string
  label: string
  value: string
  provenance: string
  visibility: 'private' | 'user-approved-profile' | 'system-state'
}

export type AvatarSelfViewSection = {
  id: 'appearance' | 'identity' | 'embodiment' | 'journey' | 'accessibility' | 'privacy'
  title: string
  fields: readonly AvatarSelfViewField[]
}

type Props = {
  open: boolean
  sections: readonly AvatarSelfViewSection[]
  onClose: () => void
  title?: string
}

const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function AvatarSelfView({ open, sections, onClose, title = 'Your Avatar' }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      previouslyFocused.current?.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusables = Array.from(surfaceRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
        .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true')
      if (!focusables.length) {
        event.preventDefault()
        closeRef.current?.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !surfaceRef.current?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose, open])

  if (!open) return null

  return (
    <section
      className="urai-avatar-self-view"
      role="dialog"
      aria-modal="true"
      aria-labelledby="urai-avatar-self-view-title"
      data-home-layer="AVATAR_SELF_VIEW"
      data-personal-data-boundary="explicit-safe-fields-only"
    >
      <div ref={surfaceRef} className="urai-avatar-self-view__surface">
        <header>
          <div>
            <p className="eyebrow">Self view</p>
            <h2 id="urai-avatar-self-view-title">{title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Return to first-person Home">Close</button>
        </header>

        <div className="urai-avatar-self-view__sections">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`urai-avatar-self-${section.id}`}>
              <h3 id={`urai-avatar-self-${section.id}`}>{section.title}</h3>
              {section.fields.length ? (
                <dl>
                  {section.fields.map((field) => (
                    <div key={field.id} className="field">
                      <dt>{field.label}</dt>
                      <dd>
                        <span>{field.value}</span>
                        <small>{field.visibility.replaceAll('-', ' ')} · {field.provenance}</small>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="empty">Nothing to show here yet.</p>
              )}
            </section>
          ))}
        </div>
      </div>
      <style jsx>{`
        .urai-avatar-self-view{position:absolute;inset:0;z-index:60;display:grid;place-items:center;padding:max(18px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));background:radial-gradient(circle at 50% 46%,rgba(7,18,20,.42),rgba(2,7,9,.78));backdrop-filter:blur(10px)}
        .urai-avatar-self-view__surface{width:min(760px,100%);max-height:min(760px,calc(100dvh - 36px));overflow:auto;border:1px solid rgba(224,240,234,.2);border-radius:28px;background:linear-gradient(145deg,rgba(10,24,24,.9),rgba(5,13,16,.95));box-shadow:0 28px 90px rgba(0,0,0,.52);color:#eef6f2}
        header{position:sticky;top:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px 24px;border-bottom:1px solid rgba(224,240,234,.12);background:rgba(8,20,21,.9);backdrop-filter:blur(16px)}
        h2,h3,p{margin:0}h2{font:650 clamp(22px,4vw,34px)/1.08 ui-sans-serif,system-ui}h3{margin-bottom:12px;font:650 13px/1.2 ui-sans-serif,system-ui;letter-spacing:.06em;text-transform:uppercase;color:rgba(226,241,234,.74)}
        .eyebrow{margin-bottom:6px;font:650 11px/1 ui-sans-serif,system-ui;letter-spacing:.14em;text-transform:uppercase;color:rgba(184,214,202,.62)}
        button{min-width:48px;min-height:48px;padding:0 16px;border:1px solid rgba(225,242,235,.24);border-radius:999px;background:rgba(228,242,236,.07);color:#f4faf7;font:650 12px/1 ui-sans-serif,system-ui;cursor:pointer}button:focus-visible{outline:3px solid #fff;outline-offset:3px}
        .urai-avatar-self-view__sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:rgba(225,242,235,.09)}.urai-avatar-self-view__sections>section{min-width:0;padding:22px 24px;background:rgba(6,16,18,.92)}
        dl{display:grid;gap:12px;margin:0}.field{display:grid;grid-template-columns:minmax(100px,.7fr) minmax(0,1.3fr);gap:14px;padding-top:12px;border-top:1px solid rgba(225,242,235,.08)}.field:first-child{padding-top:0;border-top:0}dt{font:550 12px/1.35 ui-sans-serif,system-ui;color:rgba(224,239,233,.68)}dd{margin:0;display:grid;gap:4px;font:600 13px/1.35 ui-sans-serif,system-ui;overflow-wrap:anywhere}small{font:500 10px/1.4 ui-sans-serif,system-ui;color:rgba(177,207,196,.54);text-transform:capitalize}.empty{font:500 12px/1.5 ui-sans-serif,system-ui;color:rgba(204,225,216,.58)}
        @media(max-width:680px){.urai-avatar-self-view{place-items:end center;padding:0}.urai-avatar-self-view__surface{max-height:88dvh;border-radius:26px 26px 0 0;border-bottom:0}.urai-avatar-self-view__sections{grid-template-columns:1fr}header{padding:18px}.urai-avatar-self-view__sections>section{padding:20px 18px}}
        @media(prefers-reduced-motion:reduce){.urai-avatar-self-view{scroll-behavior:auto}}
      `}</style>
    </section>
  )
}
