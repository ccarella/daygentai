import { Skeleton } from "@/components/ui/skeleton"

export function ContentSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="p-6 space-y-6">
      {title && (
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
      )}
      
      <div className="space-y-4">
        <div className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
        </div>
        
        <div className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
        </div>
        
        <div className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}