export function getDMRoomId(userIdA: string, userIdB: string): string {
  return `dm_${[userIdA, userIdB].sort().join("_")}`;
}