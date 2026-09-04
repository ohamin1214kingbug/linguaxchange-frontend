'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '../../../lib/i18n/LanguageContext'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// Domain comes from the backend alongside the room token, so the video
// provider is swappable without touching this page.
function loadJitsiScript(domain) {
  if (window.JitsiMeetExternalAPI) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://${domain}/external_api.js`
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load Jitsi'))
    document.body.appendChild(script)
  })
}

export default function Classroom() {
  const router = useRouter()
  const { sessionId } = useParams()
  const { t } = useLanguage()
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState('')
  const [topic, setTopic] = useState('')
  const [participants, setParticipants] = useState([])
  const [reporting, setReporting] = useState(false)
  const [reportTarget, setReportTarget] = useState('')
  const [reportCategory, setReportCategory] = useState('harassment')
  const [reportReason, setReportReason] = useState('')
  const [reportState, setReportState] = useState('')

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
            setError(data.error || 'classroom.errorJoin')
            setStatus('error')
          }
          return
        }
        if (cancelled) return
        setTopic(data.topic || '')
        setParticipants(data.participants || [])
        // One other person in the room is the common case — a private class,
        // or a student reporting the teacher. Preselect them so reporting is
        // two taps, not four.
        if (data.participants?.length) setReportTarget(String(data.participants[0].id))

        await loadJitsiScript(data.domain)
        if (cancelled || !containerRef.current) return

        const api = new window.JitsiMeetExternalAPI(data.domain, {
          roomName: data.roomName,
          // Authenticates this user to JaaS and grants the teacher moderator
          // rights, so the room starts without anyone logging in.
          jwt: data.jwt,
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
          setError('classroom.errorConnect')
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

  const submitReport = async () => {
    const token = localStorage.getItem('token')
    if (!token || !reportTarget || !reportReason.trim()) return
    setReportState('sending')
    try {
      const res = await fetch(`${API}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          report_type: 'user',
          reported_id: parseInt(reportTarget),
          category: reportCategory,
          // The class and session are stamped in automatically. Someone
          // reporting mid-call should not have to remember which session
          // they were in, and it is the detail that makes the report
          // checkable afterwards.
          reason: `[During class: ${topic || 'untitled'}, session ${sessionId}] ${reportReason.trim()}`
        })
      })
      if (res.ok) {
        setReportState('sent')
        setReportReason('')
        setTimeout(() => setReporting(false), 1500)
        return
      }
      const data = await res.json().catch(() => ({}))
      setReportState(data.error || t('teacher.reportFailed'))
    } catch (e) {
      setReportState(t('teacher.reportFailed'))
    }
  }

  return (
    <main className="min-h-screen bg-navy-dark text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="font-display font-bold">{topic || t('classroom.title')}</span>
        <div className="flex items-center gap-5">
          {participants.length > 0 && (
            <button onClick={() => { setReporting(o => !o); setReportState('') }}
              className="text-white/50 hover:text-brand-red text-sm font-medium transition-colors">
              🚩 {t('teacher.report')}
            </button>
          )}
          <a href="/dashboard" className="text-white/50 hover:text-white text-sm font-medium">
            ← {t('classroom.backToDashboard')}
          </a>
        </div>
      </div>

      {reporting && (
        <div className="bg-navy border-b border-white/10 px-6 py-4">
          <div className="max-w-xl space-y-3">
            {reportState === 'sent' ? (
              <p className="text-brand-teal text-sm font-bold">✅ {t('teacher.reportSent')}</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/50 mb-1">{t('classroom.reportWho')}</label>
                    <select value={reportTarget} onChange={e => setReportTarget(e.target.value)}
                      className="w-full bg-navy-dark border-2 border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-red focus:outline-none">
                      {participants.map(p => (
                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/50 mb-1">{t('teacher.reportCategory')}</label>
                    <select value={reportCategory} onChange={e => setReportCategory(e.target.value)}
                      className="w-full bg-navy-dark border-2 border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-red focus:outline-none">
                      <option value="harassment">{t('teacher.reportCatHarassment')}</option>
                      <option value="inappropriate_content">{t('teacher.reportCatInappropriate')}</option>
                      <option value="spam_or_scam">{t('teacher.reportCatSpam')}</option>
                      <option value="no_show">{t('teacher.reportCatNoShow')}</option>
                      <option value="other">{t('teacher.reportCatOther')}</option>
                    </select>
                  </div>
                </div>
                <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} rows={2} maxLength={400}
                  placeholder={t('teacher.reportReasonPlaceholder')}
                  className="w-full bg-navy-dark border-2 border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-red focus:outline-none"/>
                <p className="text-white/40 text-xs">{t('classroom.reportEvidenceNote')}</p>
                {reportState && reportState !== 'sending' && (
                  <p className="text-brand-red text-xs font-bold">{reportState}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setReporting(false)} className="text-white/50 text-sm font-bold px-3 py-1.5">
                    {t('teacher.reportCancel')}
                  </button>
                  <button onClick={submitReport} disabled={!reportReason.trim() || reportState === 'sending'}
                    className="bg-brand-red text-white px-4 py-1.5 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-40">
                    {t('teacher.reportSubmit')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {status === 'connecting' && (
        <div className="flex-1 flex items-center justify-center text-white/40 font-medium">
          {t('classroom.connecting')}
        </div>
      )}

      {status === 'error' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-brand-red/20 text-white border-2 border-brand-red/40 px-6 py-4 rounded-xl text-sm font-medium">{t(error)}</div>
        </div>
      )}

      <div ref={containerRef} style={{ height: 'calc(100vh - 65px)' }} />
    </main>
  )
}
