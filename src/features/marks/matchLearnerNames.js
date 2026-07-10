function normalise(name = '') {
  return name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return matrix[a.length][b.length];
}

function similarity(a, b) {
  const na = normalise(a);
  const nb = normalise(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const tokensA = na.split(' ');
  const tokensB = nb.split(' ');
  const sharedTokens = tokensA.filter((token) => tokensB.includes(token)).length;
  const tokenScore = sharedTokens / Math.max(tokensA.length, tokensB.length);

  const distance = levenshtein(na, nb);
  const editScore = 1 - distance / Math.max(na.length, nb.length);

  return Math.max(tokenScore, editScore);
}

// Returns { learnerId, confidence } for the best match, or null if nothing scores reasonably.
export function matchLearnerName(extractedName, learners) {
  let best = null;

  for (const learner of learners) {
    const score = Math.max(
      similarity(extractedName, learner.full_name),
      similarity(extractedName, learner.preferred_name || '')
    );
    if (!best || score > best.confidence) {
      best = { learnerId: learner.id, confidence: score };
    }
  }

  if (!best || best.confidence < 0.55) return null;
  return best;
}
