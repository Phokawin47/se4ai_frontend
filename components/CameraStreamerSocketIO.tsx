'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface Detection {
  class: string
  conf: number | null
}
interface PredictionResult {
  detections: Detection[]
  imagedetect: string
  error?: string
}

type Props = {
  serverUrl: string // เช่น "http://localhost:2569"
  onPrediction: (data: PredictionResult) => void
  onError: (msg: string) => void
  onLoadingChange: (loading: boolean) => void
}

export default function CameraStreamerSocketIO({ serverUrl, onPrediction, onError, onLoadingChange }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const timerRef = useRef<number | null>(null)

  const [running, setRunning] = useState(false)

  const stop = async () => {
    setRunning(false)
    onLoadingChange(false)

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    const v = videoRef.current
    if (v?.srcObject) {
      const tracks = (v.srcObject as MediaStream).getTracks()
      tracks.forEach(t => t.stop())
      v.srcObject = null
    }
  }

  const start = async () => {
    try {
      onError('')
      onLoadingChange(true)

      // 1) เปิดกล้อง
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      const v = videoRef.current
      if (!v) throw new Error('video not ready')
      v.srcObject = stream
      await v.play()

      // 2) ต่อ socket.io
      const socket = io(serverUrl, {
        transports: ['websocket'], // บังคับใช้ websocket transport
      })
      socketRef.current = socket

      socket.on('connect', () => {
        onLoadingChange(false)
        setRunning(true)

        // 3) ส่งเฟรม 10fps
        timerRef.current = window.setInterval(() => {
          const video = videoRef.current
          const canvas = canvasRef.current
          if (!video || !canvas) return
          if (!socket.connected) return

          const vw = video.videoWidth
          const vh = video.videoHeight
          if (!vw || !vh) return

          const targetW = 128
          const targetH = Math.round((vh / vw) * targetW)

          canvas.width = targetW
          canvas.height = targetH

          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(video, 0, 0, targetW, targetH)

          const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
          const b64 = dataUrl.split(',')[1]

          socket.emit('frame', { image: b64 })
        }, 2000)
      })

      socket.on('pred', (data: PredictionResult) => {
        if (data?.error) {
          onError(data.error)
          return
        }
        onPrediction(data)
      })

      socket.on('connect_error', () => {
        onError('เชื่อมต่อ Socket.IO ไม่สำเร็จ')
        stop()
      })

      socket.on('disconnect', () => {
        setRunning(false)
      })
    } catch (e: any) {
      onLoadingChange(false)
      onError(e?.message || 'เปิดกล้องไม่สำเร็จ')
      await stop()
    }
  }

  useEffect(() => {
    return () => { stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {!running ? (
          <button onClick={start} className="px-4 py-2 rounded-lg bg-kku-maroon text-white font-semibold">
            เปิดกล้อง & เริ่มตรวจจับ
          </button>
        ) : (
          <button onClick={stop} className="px-4 py-2 rounded-lg bg-gray-800 text-white font-semibold">
            หยุด
          </button>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border bg-black">
        <video ref={videoRef} className="w-full h-auto" playsInline muted />
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <p className="text-xs text-gray-500">ส่งเฟรม 10fps กว้าง 240px (JPEG) ผ่าน Socket.IO</p>
    </div>
  )
}
