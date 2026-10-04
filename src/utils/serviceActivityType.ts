import type { EventItem, ServiceActivityType, Submission } from '../types';

export function resolveServiceActivityType(
  submission: Submission,
  events: EventItem[]
): ServiceActivityType | null {
  if (submission.activityType) return submission.activityType;

  const category = submission.category.trim().toLowerCase();
  const matches = events.filter(event => event.name.trim().toLowerCase() === category);
  return matches.length === 1 ? matches[0].type : null;
}