import { SkeletonBlock } from "@/app/(app)/_components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-9 w-40" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <SkeletonBlock className="h-80 w-full" />
    </div>
  );
}
