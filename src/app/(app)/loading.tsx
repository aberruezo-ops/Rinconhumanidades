import { SkeletonBlock } from "@/app/(app)/_components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-64" />
        <SkeletonBlock className="h-4 w-48" />
      </div>
      <SkeletonBlock className="h-20 w-full" />
      <div className="grid gap-3 sm:grid-cols-3">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
      <SkeletonBlock className="h-64 w-full" />
    </div>
  );
}
