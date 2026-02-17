'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import DetectionResults from '@/components/DetectionResults'
import CameraStreamer from '@/components/CameraStreamer'
import CameraStreamerSocketIO from '@/components/CameraStreamerSocketIO'
import ClientOnly from '@/components/ClientOnly'
interface Detection {
  class: string
  conf: number | null
}
interface PredictionResult {
  detections: Detection[]
  imagedetect: string
}

export default function Home() {
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePrediction = (data: PredictionResult) => {
    setResult(data)
    setError(null)
  }

  const handleError = (errorMessage: string) => {
    if (!errorMessage) return
    setError(errorMessage)
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setLoading(false)
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-kku-maroon mb-3">
            ระบบตรวจจับวัตถุด้วย YOLO (Realtime)
          </h1>
          <p className="text-gray-600 text-lg">
            663380043-5 นายโภควินท์ ทรัพย์สมบูรณ์ Section 1
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <span className="inline-block bg-kku-gold text-gray-900 px-4 py-2 rounded-full text-sm font-semibold">
              Next.js Frontend
            </span>
            <span className="inline-block bg-kku-maroon text-white px-4 py-2 rounded-full text-sm font-semibold">
              FastAPI WebSocket Backend
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Camera Section */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="bg-kku-maroon text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">
                1
              </span>
              เปิดกล้อง (Realtime)
            </h2>

            <CameraStreamerSocketIO
                serverUrl={process.env.NEXT_PUBLIC_SOCKET_SERVER || 'http://localhost:2569'}
                onPrediction={handlePrediction}
                onError={handleError}
                onLoadingChange={setLoading}
              />

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  <strong>❌ เกิดข้อผิดพลาด:</strong> {error}
                </p>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="bg-kku-gold text-gray-900 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                2
              </span>
              ผลการตรวจจับ
            </h2>
            <DetectionResults result={result} loading={loading} onReset={handleReset} />
          </div>
        </div>
      </main>
    </div>
  )
}
