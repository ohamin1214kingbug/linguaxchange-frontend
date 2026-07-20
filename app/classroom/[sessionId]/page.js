'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function Classroom() {
  const router = useRouter()
  const { sessionId } = useParams()
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [videoOn, setVideoOn] = useState(false)
  const [topic, setTopic] = useState('')

  const clientRef = useRef(null)
  const streamRef = useRef(null)
  const videoContainerRef = useRef(null)
  const selfUserIdRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (!token || !user) {
      router.push('/auth/login')
      return
    }

    let cancelled = false

    const connect = async () => {
      try {
        const res = await fetch(`${API}/api/video/signature`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ class_session_id: sessionId })
        })
        const data = await res.json()

        if (!res.ok) {
          if (!cancelled) {
            setError(data.error || 'Could not join this class')
            setStatus('error')
          }
          return
        }
        if (cancelled) return
        setTopic(data.topic || '')

        const { default: ZoomVideo } = await import('@zoom/videosdk')
        const client = ZoomVideo.createClient()
        clientRef.current = client

        await client.init('en-US', 'Global', { patchJsMedia: true })
        await client.join(data.sessionName, data.signature, data.userIdentity)

        const stream = client.getMediaStream()
        streamRef.current = stream

        await stream.startAudio()
        await stream.startVideo()
        setVideoOn(true)

        const currentUser = client.getCurrentUserInfo()
        selfUserIdRef.current = currentUser.userId
        const selfVideo = await stream.attachVideo(currentUser.userId, 3)
        videoContainerRef.current?.appendChild(selfVideo)

        client.on('peer-video-state-change', async (payload) => {
          if (!videoContainerRef.current) return
          if (payload.action === 'Start') {
            const el = await stream.attachVideo(payload.userId, 3)
            videoContainerRef.current.appendChild(el)
          } else {
            const el = await stream.detachVideo(payload.userId)
            if (el && el.remove) el.remove()
          }
        })

        if (!cancelled) setStatus('connected')
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setError('Could not connect to the video call')
          setStatus('error')
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      clientRef.current?.leave().catch(() => {})
    }
  }, [sessionId])

  const toggleMute = async () => {
    const stream = streamRef.current
    if (!stream) return
    if (muted) {
      await stream.unmuteAudio()
    } else {
      await stream.muteAudio()
    }
    setMuted(!muted)
  }

  const toggleVideo = async () => {
    const stream = streamRef.current
    if (!stream || !selfUserIdRef.current) return
    if (videoOn) {
      await stream.stopVideo()
      const el = await stream.detachVideo(selfUserIdRef.current)
      if (el && el.remove) el.remove()
    } else {
      await stream.startVideo()
      const el = await stream.attachVideo(selfUserIdRef.current, 3)
      videoContainerRef.current?.appendChild(el)
    }
    setVideoOn(!videoOn)
  }

  const leaveCall = async () => {
    await clientRef.current?.leave()
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <span className="font-semibold">{topic || 'Class'}</span>
        <button onClick={leaveCall} className="text-gray-400 hover:text-white text-sm">
          ← Back to dashboard
        </button>
      </div>

      {status === 'connecting' && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Connecting to class...
        </div>
      )}

      {status === 'error' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-900/40 text-red-300 px-6 py-4 rounded-lg text-sm">{error}</div>
        </div>
      )}

      <div
        ref={videoContainerRef}
        className={`flex-1 flex flex-wrap items-center justify-center gap-4 p-4 ${status !== 'connected' ? 'hidden' : ''}`}
      />

      {status === 'connected' && (
        <div className="flex items-center justify-center gap-4 py-6 border-t border-gray-800">
          <button onClick={toggleMute}
            className={`px-5 py-3 rounded-full text-sm font-medium ${muted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
            {muted ? '🔇 Unmute' : '🎤 Mute'}
          </button>
          <button onClick={toggleVideo}
            className={`px-5 py-3 rounded-full text-sm font-medium ${!videoOn ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
            {videoOn ? '📹 Stop video' : '📷 Start video'}
          </button>
          <button onClick={leaveCall}
            className="px-5 py-3 rounded-full text-sm font-medium bg-red-600 hover:bg-red-700">
            Leave class
          </button>
        </div>
      )}
    </main>
  )
}
