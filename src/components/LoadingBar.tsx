import { useMemo } from 'react'

interface I_Props {
  progress: number
  show?: boolean
}
export function LoadingBar({ progress, show }: I_Props) {
  const pa = useMemo(() => {
    return progress
  }, [progress])
  return (
    <div
      id="LoadingBar"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: 'white', //'#00ff00
        height: '5px',
        width: `${pa}%`,
        display: show ? 'block' : 'none',
        zIndex: 999,
      }}
    ></div>
  )
}
