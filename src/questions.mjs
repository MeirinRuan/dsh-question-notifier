/** Pure projections of the existing Session UI status, never an answerer. */
export function pendingQuestions(statuses) {
  const result = [];
  for (const [sessionId, status] of statuses) {
    const pending = status.pendingInteraction;
    if (pending?.kind !== 'question' && pending?.kind !== 'plan-review') continue;
    result.push({sessionId, key: pending.key, kind: pending.kind, questions: pending.questions});
  }
  return result;
}

/** Acknowledgements expire with their exact request, bounding memory to pending questions. */
export function visibleQuestions(pending, acknowledged) {
  return pending.filter(item => acknowledged.get(item.sessionId) !== item.key);
}

/** Keep acknowledgements only while the identical pending request remains live. */
export function pruneAcknowledged(pending, acknowledged) {
  const active = new Map(pending.map(item => [item.sessionId, item.key]));
  return new Map([...acknowledged].filter(([id, key]) => active.get(id) === key));
}
