import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function ActivityTicker() {
  const activities = useQuery(api.activityFeed.getRecentActivity, { limit: 10 });

  if (!activities || activities.length === 0) return null;

  const doubled = [...activities, ...activities];

  return (
    <div className="relative overflow-hidden border-y border-gold/30 bg-cream/10">
      <div className="flex animate-[marquee_30s_linear_infinite] gap-12 py-2">
        {doubled.map((activity, i) => (
          <span
            key={`${activity._id}-${i}`}
            className="shrink-0 text-sm whitespace-nowrap text-cream/50"
          >
            {activity.displayText}
          </span>
        ))}
      </div>
    </div>
  );
}
