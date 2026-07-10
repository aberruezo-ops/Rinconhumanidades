import { SkeletonBlock } from "@/app/(app)/_components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-6 w-48" />
      </div>
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-10 w-40" />
      <SkeletonBlock className="h-32 w-full" />
    </div>
  );
}
