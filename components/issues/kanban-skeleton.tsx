import { Skeleton } from "@/components/ui/skeleton"

export function KanbanCardSkeleton() {
  return (
    <div className="bg-white p-3 rounded-lg border shadow-sm">
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
      
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="bg-gray-100 rounded-t-lg p-3 border border-b-0">
        <div className="flex items-center">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-8 ml-2" />
        </div>
      </div>
      
      <div className="bg-gray-50 border border-t-0 rounded-b-lg min-h-[400px] max-h-[calc(100vh-300px)] p-2 space-y-2">
        <KanbanCardSkeleton />
        <KanbanCardSkeleton />
        <KanbanCardSkeleton />
      </div>
    </div>
  )
}

export function KanbanBoardSkeleton() {
  return (
    <div className="h-full flex flex-col mt-3">
      <div className="flex gap-4 h-full overflow-x-auto pb-4 px-4">
        <KanbanColumnSkeleton />
        <KanbanColumnSkeleton />
        <KanbanColumnSkeleton />
        <KanbanColumnSkeleton />
      </div>
    </div>
  )
}