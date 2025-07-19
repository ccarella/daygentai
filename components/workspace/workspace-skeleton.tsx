import { Skeleton } from "@/components/ui/skeleton"

export function WorkspacePageSkeleton() {
  return (
    <div className="flex h-screen">
      {/* Header skeleton */}
      <div className="fixed top-0 left-0 right-0 h-11 border-b bg-white z-50">
        <div className="flex items-center h-full px-4">
          <Skeleton className="h-6 w-6 rounded md:hidden" />
          <Skeleton className="h-5 w-32 ml-4" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Main layout with sidebar and content */}
      <div className="pt-11 flex w-full">
        {/* Sidebar skeleton */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-11">
          <div className="flex-1 flex flex-col border-r bg-gray-50 px-4 py-4">
            {/* Workspace info */}
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
            
            {/* Navigation items */}
            <div className="space-y-2">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            
            {/* Create button */}
            <Skeleton className="h-10 w-full rounded-md mt-4" />
          </div>
        </div>
        
        {/* Content area skeleton */}
        <div className="flex-1 md:pl-64">
          <div className="p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeaderSkeleton() {
  return (
    <div className="fixed top-0 left-0 right-0 h-11 border-b bg-white z-50">
      <div className="flex items-center h-full px-4">
        <Skeleton className="h-6 w-6 rounded md:hidden" />
        <Skeleton className="h-5 w-32 ml-4" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function SidebarSkeleton() {
  return (
    <div className="flex-1 flex flex-col border-r bg-gray-50 px-4 py-4">
      {/* Workspace info */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-5 w-32" />
      </div>
      
      {/* Navigation items */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      
      {/* Create button */}
      <Skeleton className="h-10 w-full rounded-md mt-4" />
    </div>
  )
}