// The newest chat message this browser has shown, per thread, so the
// dashboard can mark chats with something new. Per device on purpose: no
// read-receipt table for a hint. localStorage can throw (private mode,
// blocked storage); then every chat just looks read.
const KEY = 'chatSeen'

function all() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

export function seenId(type, id) {
  return all()[`${type}:${id}`] || 0
}

export function markSeen(type, id, messageId) {
  if (!messageId) return
  const seen = all()
  const key = `${type}:${id}`
  if ((seen[key] || 0) >= messageId) return
  seen[key] = messageId
  try { localStorage.setItem(KEY, JSON.stringify(seen)) } catch {}
}

// Unread when the newest message is someone else's and newer than the last
// one this browser showed.
export function isUnread(chat) {
  return Boolean(chat.last && !chat.last.mine && chat.last.id > seenId(chat.type, chat.id))
}
