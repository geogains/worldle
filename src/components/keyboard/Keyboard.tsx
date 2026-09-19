import { memo, type MouseEvent } from 'react'
import { KEYBOARD_ROWS } from '../../lib/game/keyboard'
import type { KeyStatus } from '../../lib/game/types'
import { BackspaceIcon } from '../ui/icons'

export interface KeyboardProps {
  keyStates: Readonly<Record<string, KeyStatus>>
  onKey: (key: string) => void
  disabled?: boolean
}

const STATUS_LABEL: Record<KeyStatus, string> = {
  unused: '',
  absent: 'absent',
  present: 'present',
  correct: 'correct',
}

function KeyboardComponent({ keyStates, onKey, disabled }: KeyboardProps) {
  // Prevent mouse clicks from moving focus to the key so physical typing
  // keeps working afterwards; keyboard (Tab) focus is unaffected.
  const preventFocus = (e: MouseEvent) => e.preventDefault()

  return (
    <div
      className="no-select mx-auto flex w-full max-w-[500px] flex-col gap-[6px] px-1.5"
      data-onscreen-keyboard
      role="group"
      aria-label="On-screen keyboard"
    >
      {/* Key gap is slightly tighter on mobile (5px vs the base 6px) to make
          room for the wider mobile letter keys below, without touching the
          desktop keyboard. */}
      {KEYBOARD_ROWS.map((row, r) => (
        <div key={r} className="flex h-[52px] w-full justify-center gap-[5px] sm:h-[56px] sm:gap-[6px]">
          {r === 1 && <div className="flex-[0.5]" aria-hidden />}
          {row.map((key) => {
            const wide = key === 'ENTER' || key === 'BACKSPACE'
            const state = keyStates[key] ?? 'unused'
            const label =
              key === 'BACKSPACE'
                ? 'Backspace'
                : key === 'ENTER'
                  ? 'Enter'
                  : `${key}${state !== 'unused' ? `, ${STATUS_LABEL[state]}` : ''}`
            // Letter keys grow a little more eagerly than Enter/Backspace
            // (flex-[1.12] vs their unchanged flex-[1.5]) and read slightly
            // larger via .key--letter (see its own comment for why that's a
            // real CSS class and not another inline text-size utility),
            // but only below the `sm` breakpoint — desktop keeps the
            // original flex-1/0.85rem sizing untouched.
            return (
              <button
                key={key}
                type="button"
                className={`key key--${state} ${wide ? 'flex-[1.5] text-[0.72rem]' : 'key--letter flex-[1.12] sm:flex-1'}`}
                onMouseDown={preventFocus}
                onClick={() => onKey(key)}
                disabled={disabled}
                aria-label={label}
                data-key={key}
              >
                {key === 'BACKSPACE' ? <BackspaceIcon size={24} /> : key}
              </button>
            )
          })}
          {r === 1 && <div className="flex-[0.5]" aria-hidden />}
        </div>
      ))}
    </div>
  )
}

export const Keyboard = memo(KeyboardComponent)
