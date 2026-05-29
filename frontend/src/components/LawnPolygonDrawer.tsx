import { useEffect, useRef, useState } from 'react'
import { polygonArea, type PolygonPoint } from '../lib/polygon'

const M2_PER_PX2 = 0.0025
import { Button } from './ui'

type Props = {
  value: PolygonPoint[]
  onChange: (points: PolygonPoint[]) => void
  disabled?: boolean
}

export function LawnPolygonDrawer({ value, onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState<PolygonPoint[]>(value)

  useEffect(() => {
    setDrawing(value)
  }, [value])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#dcfce7'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = '#86efac'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    if (drawing.length > 0) {
      ctx.fillStyle = 'rgba(109, 40, 217, 0.25)'
      ctx.strokeStyle = '#6d28d9'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(drawing[0].x, drawing[0].y)
      drawing.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      drawing.forEach((p) => {
        ctx.fillStyle = '#6d28d9'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }, [drawing])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const point = {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    }
    const next = [...drawing, point]
    setDrawing(next)
    onChange(next)
  }

  const areaM2 = Math.round(polygonArea(drawing) * M2_PER_PX2)

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">
        Tap each corner of the lawn on the map. Add at least 3 points.
      </p>
      <canvas
        ref={canvasRef}
        width={320}
        height={220}
        onClick={handleClick}
        className="w-full max-w-full cursor-crosshair rounded-xl border border-zinc-200 bg-emerald-50 touch-none"
        aria-label="Draw lawn area"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-700">
          Area: <span className="text-violet-600">{areaM2 > 0 ? `${areaM2} m²` : '—'}</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          className="py-1 text-xs"
          disabled={disabled || drawing.length === 0}
          onClick={() => {
            setDrawing([])
            onChange([])
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
