// Splitting a ViralBot reply into its labelled posts ("X (take):",
// "LinkedIn (showcase):"), so each share button and Social Calendar draft
// gets only the post meant for it, not the whole reply with its notes.

export type ViralNetwork = 'x' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok'
export type ViralPostType = 'showcase' | 'take' | 'reel' | 'data'

export interface LabelledPost {
  network: ViralNetwork
  type?: ViralPostType
  content: string
}

const NETWORKS: Record<string, ViralNetwork> = {
  x: 'x', twitter: 'x', linkedin: 'linkedin', facebook: 'facebook', instagram: 'instagram', tiktok: 'tiktok',
}

/** Where the notes for Dominic start (pipeline and Council lines); never part of a post. */
export function notesStart(text: string): number {
  return text.search(/^\s*[-—*_ ]*(Council Check|This content targets:)/im)
}

/** Markdown the social networks would show literally. */
export function plainPostText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^\s*[-—_*]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function labelledPosts(text: string): LabelledPost[] {
  const at = notesStart(text)
  const body = at >= 0 ? text.slice(0, at) : text
  const posts: LabelledPost[] = []
  let current: { network: ViralNetwork; type?: ViralPostType; lines: string[] } | null = null
  const flush = () => {
    const content = current ? plainPostText(current.lines.join('\n')) : ''
    if (current && content) posts.push({ network: current.network, type: current.type, content })
  }
  for (const line of body.split('\n')) {
    const m = line.replace(/[*_#]/g, '').match(/^\s*(X|Twitter|LinkedIn|Facebook|Instagram|TikTok)\s*(?:\((showcase|take|reel|data)\))?\s*(?:post)?\s*:\s*(.*)$/i)
    if (m) {
      flush()
      current = { network: NETWORKS[m[1].toLowerCase()], type: m[2]?.toLowerCase() as ViralPostType | undefined, lines: m[3] ? [m[3]] : [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  flush()
  return posts
}
