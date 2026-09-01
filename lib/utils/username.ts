/**
 * Presentation-only display name derived from a verified commenter email.
 * Nothing is stripped or normalized beyond taking the local part of the
 * address (before the first `@`) — a `+` alias or mixed-case address is
 * shown exactly as the visitor typed it. Never stored; compute at render time.
 */
export function deriveUsernameFromEmail(email: string): string {
  return email.split('@')[0];
}
