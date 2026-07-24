'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const JITSI_DOMAIN = 'meet.jit.si'

function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://${JITSI_DOMAIN}/external_api.js`
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load Jitsi'))
    document.body.appendChild(script)
  })
}

export default function Classroom() {
  const router = useRouter()
  const { sessionId } = useParams()
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState('')
  const [topic, setTopic] = useState('')

  const apiRef = useRef(null)
  const containerRef = useRef(null)

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
        const res = await fetch(`${API}/api/video/room`, {
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

        await loadJitsiScript()
        if (cancelled || !containerRef.current) return

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: data.roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: data.displayName },
          configOverwrite: {
            prejoinPageEnabled: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
          }
        })
        apiRef.current = api

        api.addEventListener('readyToClose', () => {
          router.push('/dashboard')
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
      apiRef.current?.dispose()
    }
  }, [sessionId])

  return (
    <main className="min-h-screen bg-navy-dark text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="font-display font-bold">{topic || 'Class'}</span>
        <a href="/dashboard" className="text-white/50 hover:text-white text-sm font-medium">
          ← Back to dashboard
        </a>
      </div>

      {status === 'connecting' && (
        <div className="flex-1 flex items-center justify-center text-white/40 font-medium">
          Connecting to class...
        </div>
      )}

      {status === 'error' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-brand-red/20 text-white border-2 border-brand-red/40 px-6 py-4 rounded-xl text-sm font-medium">{error}</div>
        </div>
      )}

      <div ref={containerRef} style={{ height: 'calc(100vh - 65px)' }} />
    </main>
  )
}
