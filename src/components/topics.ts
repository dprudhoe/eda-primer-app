/**
 * Solace-style topic matching.
 *  *  matches exactly one level
 *  >  matches one or more trailing levels (must be last)
 */
export function topicMatches(sub: string, topic: string): boolean {
  const s = sub.split("/");
  const t = topic.split("/");
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ">") {
      // matches one or more remaining levels
      return t.length > i;
    }
    if (i >= t.length) return false;
    if (s[i] === "*") continue; // matches exactly one level
    if (s[i] !== t[i]) return false;
  }
  return s.length === t.length;
}

export function anySubMatches(subs: string[], topic: string): boolean {
  return subs.some((sub) => topicMatches(sub, topic));
}
