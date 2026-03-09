import { Skeleton } from "./ui/skeleton";
import { Card } from "./ui/card";

export function ReviewCardSkeleton() {
  return (
    <Card className="p-4 md:p-6 bg-card border-border">
      <div className="flex gap-4">
        <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function AlbumCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-card border-border">
      <Skeleton className="w-full aspect-square" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </Card>
  );
}

export function PlaylistCardSkeleton() {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex gap-4">
        <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </Card>
  );
}

export function UserCardSkeleton() {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </Card>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      <ReviewCardSkeleton />
      <ReviewCardSkeleton />
      <ReviewCardSkeleton />
    </div>
  );
}
