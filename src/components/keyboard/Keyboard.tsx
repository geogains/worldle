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
      {KEYBOARD_ROWS.map((row, r) => (
        <div key={r} className="flex h-[52px] w-full justify-center gap-[6px] sm:h-[56px]">
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
            return (
              <button
                key={key}
                type="button"
                className={`key key--${state} ${wide ? 'flex-[1.5] text-[0.72rem]' : 'flex-1'}`}
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
