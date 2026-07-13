import { TripForm } from "@/features/trip-input/trip-form";

export default function CreatePage() {
  return <main className="page-shell py-10 sm:py-16"><div className="mb-9"><p className="text-sm font-bold text-[#287057]">1分钟完成</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">这次，想怎么旅行？</h1><p className="mt-4 text-[#65706a]">填入几项简单偏好，我们会把它整理成一份清晰的旅行计划。</p></div><TripForm /></main>;
}
