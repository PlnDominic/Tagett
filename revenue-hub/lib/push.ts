import webpush from 'web-push'
import { getSupabase } from '@/lib/supabase'

// The browser subscribes with NEXT_PUBLIC_VAPID_PUBLIC_KEY, and the push
// service rejects any send signed with a different key — so prefer that same
// var here and only fall back to VAPID_PUBLIC_KEY. Keeping them as two separate
// env vars that could drift apart was a silent way to break every notification.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:dominickudom1738@gmail.com'

export interface PushResult {
  ok: boolean
  sent: number
  failed: number
  pruned: number
  error?: string
  status: number
}

// The one real push implementation. Cron and internal routes (follow-up,
// proposal views, retainer billing, weekly report, agent runs, social nudges)
// call this directly instead of fetching /api/notify/send over HTTP — that
// route sits behind session middleware, and a server-to-server fetch carries
// no cookie and no bearer token, so middleware silently redirected every one
// of those calls to /login and the caller's .catch(() => {}) swallowed it.
// Nothing ever actually reached webpush.sendNotification.
export async function sendPush(payload: { title: string; body: string }): Promise<PushResult> {
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    return { ok: false, sent: 0, failed: 0, pruned: 0, status: 503, error: 'Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env vars.' }
  }

  let sb: ReturnType<typeof getSupabase>
  let subscriptions: { endpoint: string; subscription: unknown }[]
  try {
    sb = getSupabase()
    const { data, error } = await sb.from('push_subscriptions').select('endpoint, subscription')
    if (error) throw error
    subscriptions = data ?? []
  } catch {
    return { ok: false, sent: 0, failed: 0, pruned: 0, status: 500, error: 'Could not load subscriptions from Supabase.' }
  }

  if (subscriptions.length === 0) {
    return { ok: false, sent: 0, failed: 0, pruned: 0, status: 404, error: 'No push subscriptions saved. Open the app and tap the bell to enable notifications.' }
  }

  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)

  const results = await Promise.allSettled(
    subscriptions.map(row =>
      webpush.sendNotification(
        row.subscription as webpush.PushSubscription,
        JSON.stringify(payload),
        // urgency: high asks APNs/FCM to deliver immediately instead of
        // batching — matters on iPhones in low-power states.
        { TTL: 12 * 60 * 60, urgency: 'high' }
      )
    )
  )

  const failures: { statusCode?: number; message: string }[] = []
  const goneEndpoints: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') return
    const err = r.reason as { statusCode?: number; body?: string; message?: string }
    failures.push({ statusCode: err?.statusCode, message: err?.body?.trim() || err?.message || 'Unknown error' })
    // 404/410 mean the push service says this endpoint no longer exists
    // (uninstalled PWA, rotated iOS subscription) — drop the row so dead
    // devices stop counting as "sent to".
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      goneEndpoints.push(subscriptions[i].endpoint)
    }
  })

  if (goneEndpoints.length > 0) {
    await sb.from('push_subscriptions').delete().in('endpoint', goneEndpoints).then(() => {}, () => {})
  }

  const sent = results.length - failures.length

  // Every device failed — that's an error the caller must see, not a success.
  // A VAPID key mismatch (403/400) means existing subscriptions were created
  // with a different key pair and every device must re-subscribe.
  if (sent === 0) {
    const keyMismatch = failures.some(f => f.statusCode === 403 || f.statusCode === 400)
    const detail = failures.map(f => `${f.statusCode ?? '?'}: ${f.message}`).join(' | ')
    return {
      ok: false, sent: 0, failed: failures.length, pruned: goneEndpoints.length, status: 502,
      error: keyMismatch
        ? `Push rejected (VAPID key mismatch?). Turn notifications off and on again in the app to re-subscribe. Details: ${detail}`
        : `All ${results.length} push(es) failed. Details: ${detail}`,
    }
  }

  return { ok: true, sent, failed: failures.length, pruned: goneEndpoints.length, status: 200 }
}
