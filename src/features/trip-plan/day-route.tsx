"use client";

import type { DayPlan } from "@/types/trip";

const mainTypes = new Set(["attraction", "shopping", "entertainment"]);
const methodLabels = {
  walk: "步行",
  public_transport: "公共交通",
  taxi: "打车",
  mixed: "步行与公共交通",
} as const;

function routeNodes(day: Pick<DayPlan, "activities">) {
  return day.activities
    .filter((activity) => mainTypes.has(activity.type))
    .slice(0, 6);
}

export function summarizeDayRoute(day: DayPlan) {
  const nodes = routeNodes(day);
  const areas = [...new Set(nodes.map((node) => node.area))].slice(0, 2);
  let methods = [
    ...new Set(
      nodes
        .slice(0, -1)
        .map((node) => node.transportToNext?.method)
        .filter(Boolean),
    ),
  ]
    .map((value) => methodLabels[value!])
    .filter(Boolean);
  if (methods.includes("步行与公共交通")) {
    methods = methods.filter(
      (method) => method !== "步行" && method !== "公共交通",
    );
  }
  return {
    route: `主要在${areas.join("、") || "相邻片区"}活动，以${methods.slice(0, 2).join("、") || "顺路游玩"}为主`,
    effort: `强度${({ easy: "轻松", moderate: "适中", intense: "充实" } as const)[day.intensity]}，预计步行约 ${day.estimatedWalkingKm} 公里`,
  };
}

export function DayRoute({ day }: { day: Pick<DayPlan, "dayNumber" | "activities"> }) {
  const nodes = routeNodes(day);
  if (nodes.length < 2) return null;
  const viewBoxHeight = 46;
  const points = nodes.map((_, index) => ({
    x: 10 + (index * 80) / (nodes.length - 1),
    y: index % 2 === 0 ? 13 : 33,
  }));
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    const horizontalControl = (point.x - previous.x) * 0.38;
    return `M ${previous.x} ${previous.y} C ${previous.x + horizontalControl} ${previous.y}, ${point.x - horizontalControl} ${point.y}, ${point.x} ${point.y}`;
  });

  return (
    <section
      className="mb-5 w-full bg-transparent py-2"
      aria-label={`第${day.dayNumber}天主要地点路线顺序`}
    >
      <div className="relative mx-auto aspect-[100/46] w-full max-w-[390px]">
        <svg aria-hidden="true" viewBox={`0 0 100 ${viewBoxHeight}`} className="absolute inset-0 h-full w-full overflow-visible text-[#8daf9a]">
          {segments.map((segment, index) => (
            <path key={index} d={segment} fill="none" stroke="currentColor" strokeWidth="0.72" strokeDasharray="1.8 2.2" strokeLinecap="round" />
          ))}
          {points.map((point, index) => (
            <circle key={nodes[index].id} cx={point.x} cy={point.y} r="1.65" fill="white" stroke="#6e9b82" strokeWidth="0.72" />
          ))}
        </svg>
        {nodes.map((node, index) => {
          const point = points[index];
          const upper = index % 2 === 0;
          return (
            <button
              key={node.id}
              type="button"
              aria-label={`查看${node.name}行程`}
              onClick={() => document.getElementById(`activity-${day.dayNumber}-${node.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
              style={{ left: `${point.x}%`, top: `${(point.y / viewBoxHeight) * 100}%` }}
              className={`focus-ring absolute z-10 w-[58px] -translate-x-1/2 text-center text-xs font-semibold leading-4 hover:text-[#245b46] sm:w-[72px] ${upper ? "-translate-y-[calc(100%+10px)]" : "translate-y-[10px]"}`}
            >
              <span className="line-clamp-2 block">{node.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
