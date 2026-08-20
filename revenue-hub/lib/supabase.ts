import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return createClient(url, key, { auth: { persistSession: false } })
}

export interface DbError { code?: string; message?: string; details?: string; hint?: string }

// PostgREST answers a write naming a column the table doesn't have with
// PGRST204, quoting the column: "Could not find the 'sequence_step' column of
// 'deals' in the schema cache".
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column/i

export function missingColumnOf(error: DbError | null | undefined): string | null {
  if (!error || error.code !== 'PGRST204') return null
  return error.message?.match(MISSING_COLUMN_RE)?.[1] ?? null
}

// Turn a Supabase error into something a log or an HTTP body can actually be
// debugged from. A bare "Save failed" costs an hour; "PGRST204: Could not find
// the 'sequence_step' column" names the fix.
export function describeDbError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as DbError
    if (e.message) return [e.code && `${e.code}:`, e.message, e.details, e.hint].filter(Boolean).join(' ')
  }
  return err instanceof Error ? err.message : String(err ?? 'Unknown error')
}

// Run a write, and if it fails only because the table is missing a column,
// drop that column and try again.
//
// Every deals write sends the full column list, so a single column that a
// missed migration never created fails the ENTIRE write — every deal, every
// save. That is how POST /api/deals came to return "Save failed" for all
// traffic while GET kept working: reads are select('*'), which asks for
// whatever exists, but writes name every column explicitly.
//
// Dropping the offending key loses nothing that could otherwise have been
// persisted — the column does not exist, so that field had nowhere to go
// either way — and the remaining fields still land. The dropped names are
// returned so the caller can log them: a write that silently degrades is how
// this class of bug hides, so it must be loud.
export async function writeToleratingSchemaDrift<T extends Record<string, unknown>>(
  rows: T[],
  // PromiseLike, not Promise: a Supabase query builder is thenable but is not
  // an actual Promise, so callers can hand the builder straight back.
  write: (rows: T[]) => PromiseLike<{ error: DbError | null }>,
): Promise<{ error: DbError | null; dropped: string[] }> {
  let current = rows
  const dropped: string[] = []

  for (;;) {
    const { error } = await write(current)
    if (!error) return { error: null, dropped }

    const column = missingColumnOf(error)
    // Not schema drift, or the same column came back after we dropped it —
    // either way retrying would loop, so surface the real error.
    if (!column || dropped.includes(column)) return { error, dropped }

    dropped.push(column)
    current = current.map(row => {
      const { [column]: _omitted, ...rest } = row
      return rest as unknown as T
    })
  }
}
