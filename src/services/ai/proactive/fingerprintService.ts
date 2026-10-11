// ============================================================
// MODULE 11 PHASE 4 — FINGERPRINT SERVICE
// ============================================================
//
// Produces a deterministic SHA-256 fingerprint for a
// ProactiveCandidate. The fingerprint uniquely identifies the
// semantic intent of a candidate so the persistence layer can
// reject duplicates and honour dismissal cooldowns.
//
// Contract:
//   - Pure and synchronous-safe via the async API
//   - Same input → same output (referential transparency)
//   - Different signalType    → different fingerprint
//   - Different scopeType     → different fingerprint
//   - Different scopeId       → different fingerprint
//   - Different normalizedIntent → different fingerprint
//   - Does NOT hash by title alone (titles can be rephrased)
//   - Does NOT call AI, DB, or any provider
//   - Works in both browser (Web Crypto) and Node 18+ (globalThis.crypto)
//
// Input string composition:
//   `{signalType}|{scopeType}|{scopeId}|{normalizedIntent}`
//
// normalizedIntent is derived from the candidate's dedupeKey,
// which is already stable, lowercase, and structurally unique per
// (signalType × scopeId) pair. Using dedupeKey as the intent
// anchor means:
//   - Fingerprint is consistent with the deduplication key
//   - Intent changes only when the underlying signal changes
//   - Fingerprint is independent of generated prose (title/description)
//     which the AI layer may vary across runs
//
// Output: 64-character lowercase hex SHA-256 string.
// ============================================================

import { ProactiveCandidate } from '../../../types/recommendation.types';

// ─── SHA-256 implementation ──────────────────────────────────
//
// Uses the Web Crypto SubtleCrypto API (globalThis.crypto.subtle)
// which is available in:
//   - All modern browsers (Chrome 37+, Firefox 34+, Safari 7+)
//   - Node.js 15+ (globalThis.crypto) and Node.js 18+ (stable)
//
// The project's Node version is 24 (confirmed), so this is safe.
// No external dependency required.

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Normalised intent ────────────────────────────────────────
//
// The normalised intent string is derived from the candidate's
// dedupeKey. The dedupeKey is already:
//   - lowercase and stable (same candidate → same dedupeKey)
//   - scoped to (signalType × entityId) pair
//   - independent of AI-generated prose
//
// We further normalise by stripping leading/trailing whitespace
// and collapsing internal whitespace — defensive only, since
// dedupeKeys should never contain whitespace.

function normaliseIntent(candidate: ProactiveCandidate): string {
  return candidate.dedupeKey.trim().replace(/\s+/g, ' ').toLowerCase();
}

// ─── Fingerprint string builder ───────────────────────────────
//
// The four components are pipe-separated. Pipe is chosen because
// none of the components (signalType, scopeType, scopeId, dedupeKey)
// can contain a pipe character under the current schema.

function buildFingerprintInput(candidate: ProactiveCandidate): string {
  const intent = normaliseIntent(candidate);
  return `${candidate.signalType}|${candidate.scopeType}|${candidate.scopeId}|${intent}`;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Compute a deterministic SHA-256 fingerprint for a candidate.
 *
 * Returns a 64-character lowercase hex string.
 *
 * The fingerprint is stable across:
 *   - Multiple calls with identical input
 *   - Different runs of the signal engine producing the same signal
 *   - Environment restarts
 *
 * The fingerprint differs when:
 *   - signalType changes
 *   - scopeType changes
 *   - scopeId changes (different entity targeted)
 *   - dedupeKey changes (different semantic intent)
 */
export async function computeFingerprint(candidate: ProactiveCandidate): Promise<string> {
  const input = buildFingerprintInput(candidate);
  return sha256Hex(input);
}

/**
 * Compute fingerprints for a batch of candidates in parallel.
 * Returns an array of 64-char hex strings, index-aligned with
 * the input array.
 */
export async function computeFingerprints(
  candidates: ProactiveCandidate[]
): Promise<string[]> {
  return Promise.all(candidates.map(computeFingerprint));
}

/**
 * Attach a `fingerprint` field to each candidate by computing
 * SHA-256 in parallel and returning annotated records.
 *
 * The returned type is a plain intersection — the ranker output
 * carries the fingerprint so the persistence layer can use it
 * directly without a second round-trip to the fingerprint service.
 */
export async function annotateWithFingerprints(
  candidates: ProactiveCandidate[]
): Promise<Array<ProactiveCandidate & { fingerprint: string }>> {
  const fingerprints = await computeFingerprints(candidates);
  return candidates.map((c, i) => ({ ...c, fingerprint: fingerprints[i] }));
}

/**
 * Exposed for testing: the raw input string that gets hashed.
 * Allows tests to verify the composition without needing to
 * re-implement the string-building logic.
 */
export function buildFingerprintInputForTest(candidate: ProactiveCandidate): string {
  return buildFingerprintInput(candidate);
}
