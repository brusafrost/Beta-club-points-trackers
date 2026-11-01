import { Member } from '../types';

/**
 * Deduplicates a member list by studentId.
 * Prioritizes records with higher totalPoints or more recent createdAt dates.
 * This is a defensive utility to handle legacy duplicates in the database.
 */
export function getUniqueMembers(members: Member[]): Member[] {
  const uniqueMap = new Map<string, Member>();

  members.forEach(member => {
    // Normalize Student ID for comparison
    const studentId = (member.studentId || '').trim().toUpperCase();
    
    // If no student ID, use the internal document ID as fallback
    const key = studentId || member.id;
    
    const existing = uniqueMap.get(key);

    if (!existing) {
      uniqueMap.set(key, member);
    } else {
      // Logic for picking the "better" record among duplicates:
      // 1. Prefer the one with more points (most likely the active one)
      // 2. If points are equal, prefer the one with a studentId field
      // 3. Finally, prefer the more recently created one
      const currentPoints = member.totalPoints || 0;
      const existingPoints = existing.totalPoints || 0;

      if (currentPoints > existingPoints) {
        uniqueMap.set(key, member);
      } else if (currentPoints === existingPoints) {
        const currentCreated = member.createdAt ? new Date(member.createdAt).getTime() : 0;
        const existingCreated = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        if (currentCreated > existingCreated) {
          uniqueMap.set(key, member);
        }
      }
    }
  });

  return Array.from(uniqueMap.values());
}
