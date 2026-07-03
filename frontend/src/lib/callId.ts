/** Deterministic, order-independent room id matching the backend's convention. */
export function deriveCallId(userA: string, userB: string): string {
  return [userA, userB].sort().join("::");
}
