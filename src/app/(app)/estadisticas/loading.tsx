import { SkeletonBlock } from "@/app/(app)/_components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-6 w-48" />
      <SkeletonBlock className="h-9 w-full" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-20 w-full" />
        ))}
      </div>
      <SkeletonBlock className="h-40 w-full" />
      <SkeletonBlock className="h-40 w-full" />
    </div>
  );
}
