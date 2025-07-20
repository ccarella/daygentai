import { Skeleton } from "@/components/ui/skeleton"

export function IssueCardSkeleton() {
  return (
    <div className="px-6 py-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-3/4" />
        </div>
        
        <Skeleton className="mt-1 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-2/3" />
        
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-md" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  )
}

export function IssueListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-auto bg-card">
      <div className="">
        {/* Header skeleton */}
        <div className="px-6 py-4 border-b border-border">
          <Skeleton className="h-4 w-32" />
        </div>
        
        {/* Issues skeleton */}
        <div className="divide-y divide-border">
          {Array.from({ length: count }).map((_, index) => (
            <IssueCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function IssueDetailsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32 w-full" />
      </div>
      
      {/* Meta info */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-36" />
      </div>
    </div>
  )
}