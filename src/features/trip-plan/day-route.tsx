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

  return (
    <section
      className="mb-5 overflow-x-auto rounded-2xl bg-[#eef4ef] px-3 py-3"
      aria-label={`第${day.dayNumber}天主要地点路线顺序`}
    >
      <div className="flex min-w-max items-start px-1 py-1">
        {nodes.map((node, index) => {
          const lower = index % 2 === 1;
          const nextLower = (index + 1) % 2 === 1;
          const startY = lower ? 15 : 5;
          const endY = nextLower ? 15 : 5;
          return (
            <div key={node.id} className="flex items-start">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(`activity-${day.dayNumber}-${node.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className={`group w-20 text-center sm:w-24 ${lower ? "pt-5" : "pt-1"}`}
              >
                <span className="mx-auto block h-3 w-3 rounded-full border-2 border-[#6e9b82] bg-white transition group-hover:bg-[#ffd45a] motion-reduce:transition-none" />
                <strong className="mt-2 block max-w-24 text-xs leading-4">
                  {node.name}
                </strong>
              </button>
              {index < nodes.length - 1 && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 72 24"
                  className="mt-1 h-6 w-10 shrink-0 text-[#7fa18d] sm:w-14"
                >
                  <path
                    d={`M1 ${startY} C20 ${startY}, 52 ${endY}, 71 ${endY}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    className="motion-safe:animate-[dash_7s_linear_infinite]"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
