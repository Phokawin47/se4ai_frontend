'use client'

import { useEffect, useRef, useState } from 'react'

interface Detection {
  class: string
  conf: number | null
}
interface PredictionResult {
  detections: Detection[]
  imagedetect: string // base64 jpeg (ไม่มี prefix) ตาม backend เดิม
}

type Props = {
  wsUrl: string // เช่น "ws://localhost:8000/ws"
  onPrediction: (data: PredictionResult) => void
  onError: (msg: string) => void
  onLoadingChange: (loading: boolean) => void
}

export default function CameraStreamer({ wsUrl, onPrediction, onError, onLoadingChange }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<number | null>(null)

  const [isRunning, setIsRunning] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)

  const stopAll = async () => {
    setIsRunning(false)
    onLoadingChange(false)

    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const v = videoRef.current
    if (v && v.srcObject) {
      const tracks = (v.srcObject as MediaStream).getTracks()
      tracks.forEach((t) => t.stop())
      v.srcObject = null
    }
  }

  const start = async () => {
    try {
      onError('')
      onLoadingChange(true)

      // 1) เปิดกล้อง
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // ถ้าต้องการกล้องหลังให้ใช้ 'environment'
        },
        audio: false,
      })

      setHasCamera(true)

      const v = videoRef.current
      if (!v) throw new Error('videoRef not ready')
      v.srcObject = stream
      await v.play()

      // 2) ต่อ WebSocket
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsRunning(true)
        onLoadingChange(false)

        // 3) ส่งเฟรมทุก 100ms (10fps)
        timerRef.current = window.setInterval(() => {
          try {
            const video = videoRef.current
            const canvas = canvasRef.current
            if (!video || !canvas) return
            if (ws.readyState !== WebSocket.OPEN) return

            // รอจน video มีขนาดจริง
            const vw = video.videoWidth
            const vh = video.videoHeight
            if (!vw || !vh) return

            // resize กว้าง 240px สูงตามสัดส่วน
            const targetW = 240
            const targetH = Math.round((vh / vw) * targetW)

            canvas.width = targetW
            canvas.height = targetH

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.drawImage(video, 0, 0, targetW, targetH)

            // แปลงเป็น jpeg base64 (ตัด prefix ออก)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
            const base64 = dataUrl.split(',')[1]

            // ส่ง JSON message
            ws.send(JSON.stringify({ image: base64 }))
          } catch (e) {
            // เงียบไว้ ป้องกัน spam
          }
        }, 100)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as PredictionResult
          onPrediction(data)
        } catch (e) {
          onError('รูปแบบข้อมูลจาก WebSocket ไม่ถูกต้อง')
        }
      }

      ws.onerror = () => {
        onError('เชื่อมต่อ WebSocket ไม่สำเร็จ')
        stopAll()
      }

      ws.onclose = () => {
        // ถ้าปิดเองจะไม่ต้อง error ก็ได้
        setIsRunning(false)
      }
    } catch (err: any) {
      onLoadingChange(false)
      setHasCamera(false)
      onError(err?.message || 'เปิดกล้องไม่สำเร็จ')
      await stopAll()
    }
  }

  useEffect(() => {
    return () => {
      // cleanup ตอนออกหน้า
      stopAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {!isRunning ? (
          <button
            onClick={start}
            className="px-4 py-2 rounded-lg bg-kku-maroon text-white font-semibold"
          >
            เปิดกล้อง & เริ่มตรวจจับ
          </button>
        ) : (
          <button
            onClick={stopAll}
            className="px-4 py-2 rounded-lg bg-gray-800 text-white font-semibold"
          >
            หยุด
          </button>
        )}

        <span className="text-sm text-gray-600 self-center">
          {hasCamera ? '📷 Camera ready' : '📷 ยังไม่เปิดกล้อง'}
        </span>
      </div>

      {/* video อาจซ่อนก็ได้ แต่แนะนำให้โชว์เพื่อ debug */}
      <div className="rounded-xl overflow-hidden border bg-black">
        <video ref={videoRef} className="w-full h-auto" playsInline muted />
      </div>

      {/* canvas ใช้เพื่อ resize (ซ่อน) */}
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-xs text-gray-500">
        ส่งเฟรมผ่าน WebSocket ที่ 10fps ขนาดกว้าง 240px (JPEG)
      </p>
    </div>
  )
}
