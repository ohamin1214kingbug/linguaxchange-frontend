'use client'
import { useState, useEffect } from 'react'
import { pushSupported, needsHomeScreen, serverKey, pushIsOn, turnPushOn, turnPushOff } from '../lib/push'

// Settings switch for notifications on this device. Saved immediately (it is
// a browser permission, not a profile field), so it sits outside the
// preferences Save button.
export default function PushToggle({ t }) {
  const [key, setKey] = useState(null)
  const [state, setState] = useState('loading') // loading | hidden | off | on | busy
  const [note, setNote] = useState('')

  useEffect(() => {
    (async () => {
      const k = await serverKey()
      if (!k) return setState('hidden')
      setKey(k)
      if (!pushSupported()) return setState(needsHomeScreen() ? 'ios' : 'hidden')
      setState((await pushIsOn()) ? 'on' : 'off')
    })()
  }, [])

  if (state === 'loading' || state === 'hidden') return null
  if (state === 'ios') {
    return <p className="text-navy/65 text-xs mt-4">📱 {t('settings.pushIosNote')}</p>
  }

  const toggle = async () => {
    setNote('')
    if (state === 'on') {
      setState('busy')
      await turnPushOff()
      return setState('off')
    }
    setState('busy')
    const result = await turnPushOn(key)
    setState(result === 'on' ? 'on' : 'off')
    if (result === 'denied') setNote(t('settings.pushDenied'))
    if (result === 'failed') setNote(t('settings.pushFailed'))
  }

  return (
    <div className="mt-4">
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" checked={state === 'on'} disabled={state === 'busy'} onChange={toggle}
          className="w-4 h-4 accent-brand-red"/>
        <span className="text-sm font-bold text-navy">{t('settings.pushLabel')}</span>
      </label>
      <p className="text-navy/65 text-xs mt-1">{note || t('settings.pushNote')}</p>
    </div>
  )
}
