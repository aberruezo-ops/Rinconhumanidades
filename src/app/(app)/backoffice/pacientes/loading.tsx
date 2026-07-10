import { SkeletonBlock } from "@/app/(app)/_components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-4 w-full" />
      </div>
      <SkeletonBlock className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
