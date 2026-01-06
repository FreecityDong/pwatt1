import { useEffect, useRef, useState } from 'react'
import './App.css'

type FaceBox = { x: number; y: number; width: number; height: number }

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [faces, setFaces] = useState<FaceBox[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [supportsFaceDetector, setSupportsFaceDetector] = useState(
    Boolean((window as any).FaceDetector),
  )

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持摄像头访问')
      return
    }

    setError(null)
    setIsStarting(true)
    setPhoto(null)
    setFaces([])

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }
    } catch (err) {
      console.error(err)
      setError('无法打开摄像头，请检查权限或设置')
    } finally {
      setIsStarting(false)
    }
  }

  const stopStream = () => {
    stream?.getTracks().forEach((track) => track.stop())
    setStream(null)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const width = video.videoWidth || 1080
    const height = video.videoHeight || 720
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, width, height)
    const imageData = canvas.toDataURL('image/jpeg', 0.92)
    setPhoto(imageData)
    detectFaces(imageData)
    stopStream()
  }

  const detectFaces = async (dataUrl: string) => {
    setIsDetecting(true)
    try {
      const img = await loadImage(dataUrl)
      if (!(window as any).FaceDetector) {
        setSupportsFaceDetector(false)
        setError('当前浏览器不支持人脸检测，请升级 Chrome 108+ 或使用支持 FaceDetector 的浏览器')
        setFaces([])
        return
      }
      const detected = await detectWithFaceDetector(img)
      setFaces(detected)
      setError(detected.length ? null : '未检测到人脸，效果按钮将被禁用')
    } catch (err) {
      console.error(err)
      setFaces([])
      setError('未检测到人脸，或当前浏览器不支持人脸检测')
    } finally {
      setIsDetecting(false)
    }
  }

  const applyBackgroundReplace = async (fillColor: string) => {
    if (!photo || !canvasRef.current || !faces.length) return
    setIsProcessing(true)
    try {
      const img = await loadImage(photo)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const original = ctx.getImageData(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = fillColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      faces.forEach((f) => {
        ctx.putImageData(original, 0, 0, f.x, f.y, f.width, f.height)
      })
      const updated = canvas.toDataURL('image/jpeg', 0.92)
      setPhoto(updated)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('替换背景失败，可能不支持人脸检测')
    } finally {
      setIsProcessing(false)
    }
  }

  const applyFaceMosaic = async (blockSize = 12) => {
    if (!photo || !canvasRef.current || !faces.length) return
    setIsProcessing(true)
    try {
      const img = await loadImage(photo)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const source = ctx.getImageData(0, 0, canvas.width, canvas.height)

      faces.forEach((face) => {
        const startX = Math.max(0, Math.floor(face.x))
        const startY = Math.max(0, Math.floor(face.y))
        const endX = Math.min(canvas.width, Math.ceil(face.x + face.width))
        const endY = Math.min(canvas.height, Math.ceil(face.y + face.height))

        for (let y = startY; y < endY; y += blockSize) {
          for (let x = startX; x < endX; x += blockSize) {
            const idx = (y * canvas.width + x) * 4
            const r = source.data[idx]
            const g = source.data[idx + 1]
            const b = source.data[idx + 2]
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
            ctx.fillRect(x, y, blockSize, blockSize)
          }
        }
      })

      const updated = canvas.toDataURL('image/jpeg', 0.92)
      setPhoto(updated)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('马赛克处理失败，可能不支持人脸检测')
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    return () => {
      // 离开页面时释放摄像头
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [stream])

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">PWA 摄像头示例</p>
          <h1>一键打开摄像头</h1>
          <p className="subtitle">点击按钮即可打开手机摄像头，拍照后立即在下方预览。</p>
        </div>
      </header>

      <section className="camera-card">
        <div className="preview">
          {photo ? (
            <img src={photo} alt="已拍摄照片" className="photo" />
          ) : (
            <video ref={videoRef} playsInline muted className="video" />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden-canvas" />

        {error && <p className="error">{error}</p>}

        <div className="actions">
          {!stream && !photo && (
            <button className="primary" onClick={startCamera} disabled={isStarting}>
              {isStarting ? '正在打开摄像头...' : '打开摄像头'}
            </button>
          )}

          {stream && (
            <>
              <button className="primary" onClick={takePhoto}>
                拍照
              </button>
              <button className="ghost" onClick={stopStream}>
                关闭摄像头
              </button>
            </>
          )}

          {!stream && photo && (
            <button className="primary" onClick={startCamera}>
              重新拍摄
            </button>
          )}
        </div>

        {photo && (
          <div className="actions secondary">
            <button
              className="ghost"
              onClick={() => applyBackgroundReplace('#111827')}
              disabled={!faces.length || isProcessing}
            >
              {isProcessing ? '处理中…' : '一键替换背景'}
            </button>
            <button
              className="ghost"
              onClick={() => applyFaceMosaic(12)}
              disabled={!faces.length || isProcessing}
            >
              {isProcessing ? '处理中…' : '人脸打马赛克'}
            </button>
            <span className="face-note">
              {isDetecting
                ? '正在检测人脸...'
                : !supportsFaceDetector
                  ? '当前浏览器不支持人脸检测，建议升级 Chrome 108+ 或使用支持 FaceDetector 的浏览器。'
                  : faces.length
                    ? `检测到 ${faces.length} 张人脸`
                    : '未检测到人脸，可能无法应用效果'}
            </span>
          </div>
        )}
      </section>
    </div>
  )
}

export default App

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function detectWithFaceDetector(img: HTMLImageElement): Promise<FaceBox[]> {
  if (!(window as any).FaceDetector) {
    throw new Error('当前环境不支持 FaceDetector API')
  }
  const detector = new (window as any).FaceDetector({ fastMode: true })
  const detections = await detector.detect(img)
  return detections.map((d: any) => ({
    x: d.boundingBox.x,
    y: d.boundingBox.y,
    width: d.boundingBox.width,
    height: d.boundingBox.height,
  }))
}
