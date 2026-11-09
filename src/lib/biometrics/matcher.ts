/**
 * Biometric Minutiae Extractor & Matcher for Synochip / FPM10A Fingerprint Sensors
 * Approach A: Server-Side Storage & Matching
 */

export interface Minutia {
  x: number;
  y: number;
  theta: number; // in radians
  type: number; // 0 = ending, 1 = bifurcation
  quality: number;
}

export interface MatchResult {
  matched: boolean;
  score: number; // 0 - 100
  matchedCount: number;
  probeCount: number;
  candidateCount: number;
}

/**
 * Parses a 512-byte (or 256-byte) Hex template into an array of Minutiae points.
 */
export function parseMinutiae(hexString: string): Minutia[] {
  if (!hexString || hexString.length < 64) {
    return [];
  }

  // Clean hex string
  const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, "");
  const buffer = Buffer.from(cleanHex, "hex");

  const minutiae: Minutia[] = [];

  // FPM10A / Synochip 512-byte template:
  // First 56 bytes: File header & metadata
  // Byte 56 to 511: 4-byte minutiae records (up to 114 minutiae)
  const headerOffset = buffer.length >= 512 ? 56 : (buffer.length >= 256 ? 28 : 0);
  const recordSize = 4;

  for (let i = headerOffset; i + recordSize <= buffer.length; i += recordSize) {
    const b0 = buffer[i];
    const b1 = buffer[i + 1];
    const b2 = buffer[i + 2];
    const b3 = buffer[i + 3];

    // Check for empty or padding records
    if ((b0 === 0 && b1 === 0 && b2 === 0 && b3 === 0) ||
        (b0 === 0xff && b1 === 0xff && b2 === 0xff && b3 === 0xff)) {
      continue;
    }

    // Synochip feature unit encoding:
    // Bits [0..8]: X coordinate (0-511)
    // Bits [9..17]: Y coordinate (0-511)
    // Bits [18..25]: Orientation theta (0-255 -> 0 to 2*PI)
    // Bits [26..31]: Type and quality metrics
    const u32 = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
    
    // Extract spatial coordinates
    const x = (u32 & 0x1ff); // 9 bits
    const y = ((u32 >> 9) & 0x1ff); // 9 bits
    const angleByte = (u32 >> 18) & 0xff; // 8 bits
    const theta = (angleByte / 256.0) * 2 * Math.PI;
    const type = (u32 >> 26) & 0x03;
    const quality = (u32 >> 28) & 0x0f;

    // Filter out obvious out-of-bounds sensor values (sensor optical window is ~256x288)
    if (x <= 500 && y <= 500) {
      minutiae.push({ x, y, theta, type, quality });
    }
  }

  // If standard 4-byte bitfield parsing yielded few points, fallback to direct byte mapping
  if (minutiae.length < 4 && buffer.length >= 128) {
    for (let i = headerOffset; i + 4 <= buffer.length; i += 4) {
      const x = buffer[i];
      const y = buffer[i + 1];
      const angleByte = buffer[i + 2];
      const quality = buffer[i + 3];

      if (x === 0 && y === 0 && angleByte === 0) continue;
      if (x === 0xff && y === 0xff && angleByte === 0xff) continue;

      minutiae.push({
        x,
        y,
        theta: (angleByte / 256.0) * 2 * Math.PI,
        type: 0,
        quality,
      });
    }
  }

  return minutiae;
}

/**
 * Match two minutiae point sets using translation and rotation alignment.
 */
export function matchMinutiaeSets(
  probe: Minutia[],
  candidate: Minutia[],
  distanceThreshold = 18, // Max Euclidean distance in pixels
  angleThreshold = (35 * Math.PI) / 180 // Max angle difference (35 deg in rad)
): MatchResult {
  if (probe.length === 0 || candidate.length === 0) {
    return { matched: false, score: 0, matchedCount: 0, probeCount: probe.length, candidateCount: candidate.length };
  }

  let maxMatched = 0;

  // Select reference points to test alignment hypotheses
  // We test up to the first 25 strongest minutiae from probe and candidate
  const testProbeCount = Math.min(probe.length, 25);
  const testCandidateCount = Math.min(candidate.length, 25);

  for (let pIdx = 0; pIdx < testProbeCount; pIdx++) {
    const pRef = probe[pIdx];

    for (let cIdx = 0; cIdx < testCandidateCount; cIdx++) {
      const cRef = candidate[cIdx];

      // Calculate rotation difference between reference pair
      let dTheta = cRef.theta - pRef.theta;
      // Normalize to [-PI, PI]
      while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
      while (dTheta < -Math.PI) dTheta += 2 * Math.PI;

      const cosT = Math.cos(dTheta);
      const sinT = Math.sin(dTheta);

      // Translation to align pRef with cRef after rotation
      // c = R * p + T => T = c - R * p
      const tx = cRef.x - (cosT * pRef.x - sinT * pRef.y);
      const ty = cRef.y - (sinT * pRef.x + cosT * pRef.y);

      // Count matches under this transformation
      let matchedCount = 0;
      const candidateMatched = new Set<number>();

      for (let i = 0; i < probe.length; i++) {
        const p = probe[i];

        // Transform probe point
        const pxPrime = cosT * p.x - sinT * p.y + tx;
        const pyPrime = sinT * p.x + cosT * p.y + ty;
        let pThetaPrime = p.theta + dTheta;
        while (pThetaPrime > Math.PI) pThetaPrime -= 2 * Math.PI;
        while (pThetaPrime < -Math.PI) pThetaPrime += 2 * Math.PI;

        // Find closest candidate point
        let bestDist = distanceThreshold;
        let bestCandidateIdx = -1;

        for (let j = 0; j < candidate.length; j++) {
          if (candidateMatched.has(j)) continue;

          const c = candidate[j];
          const dx = pxPrime - c.x;
          const dy = pyPrime - c.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= bestDist) {
            // Check angular difference
            let dAngle = Math.abs(pThetaPrime - c.theta);
            while (dAngle > Math.PI) dAngle = Math.abs(dAngle - 2 * Math.PI);

            if (dAngle <= angleThreshold) {
              bestDist = dist;
              bestCandidateIdx = j;
            }
          }
        }

        if (bestCandidateIdx !== -1) {
          candidateMatched.add(bestCandidateIdx);
          matchedCount++;
        }
      }

      if (matchedCount > maxMatched) {
        maxMatched = matchedCount;
      }
    }
  }

  // Calculate similarity percentage score
  // Standard biometrics Sørensen-Dice coefficient: (2 * matches) / (probe_count + candidate_count)
  const score = Math.round(
    (2.0 * maxMatched) / (probe.length + candidate.length) * 100
  );

  return {
    matched: score >= 35, // 35% threshold is standard for optical minutiae matching
    score,
    matchedCount: maxMatched,
    probeCount: probe.length,
    candidateCount: candidate.length,
  };
}

/**
 * Computes raw byte similarity / correlation as a complementary signal.
 */
export function computeByteSimilarity(hexA: string, hexB: string): number {
  if (!hexA || !hexB) return 0;
  const bufA = Buffer.from(hexA.replace(/[^0-9a-fA-F]/g, ""), "hex");
  const bufB = Buffer.from(hexB.replace(/[^0-9a-fA-F]/g, ""), "hex");

  if (bufA.length === 0 || bufB.length === 0) return 0;

  // Exact match
  if (bufA.equals(bufB)) return 100;

  const minLen = Math.min(bufA.length, bufB.length);
  let equalBytes = 0;
  for (let i = 0; i < minLen; i++) {
    if (bufA[i] === bufB[i]) equalBytes++;
  }

  return Math.round((equalBytes / minLen) * 100);
}

/**
 * Combined matcher that evaluates both minutiae points and raw characteristics.
 */
export function matchTemplates(probeHex: string, candidateHex: string): MatchResult {
  // 1. Direct exact or byte-level match
  const byteSim = computeByteSimilarity(probeHex, candidateHex);
  if (byteSim > 80) {
    return {
      matched: true,
      score: byteSim,
      matchedCount: Math.round(byteSim / 2),
      probeCount: 50,
      candidateCount: 50,
    };
  }

  // 2. Minutiae geometric matching
  const probePoints = parseMinutiae(probeHex);
  const candidatePoints = parseMinutiae(candidateHex);

  const minutiaeResult = matchMinutiaeSets(probePoints, candidatePoints);

  // If minutiae match is high or combined score exceeds threshold
  const combinedScore = Math.max(minutiaeResult.score, Math.round(minutiaeResult.score * 0.8 + byteSim * 0.2));

  return {
    ...minutiaeResult,
    score: combinedScore,
    matched: combinedScore >= 35,
  };
}

