import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function CardSkeleton() {
  return (
    <>
    <div className="h-60 mt-4 mb-10 relative">
    <Card className="h-4/5">

<Skeleton className="absolute bottom-0 left-0 right-0 mx-auto h-28 w-28 rounded-full" />
    </Card>
    </div>
    <Skeleton className="h-10 w-60 mx-auto "/>
    <Skeleton className="h-8 w-40 mx-auto mt-4"/>
    
    <div className="flex flex-row flex-wrap justify-evenly gap-4 mt-10">
    <Skeleton className="h-10 w-28 sm:h-10 sm:w-32 rounded-full "/>
    <Skeleton className="h-10 w-28 sm:h-10 sm:w-32 rounded-full "/>
    <Skeleton className="h-10 w-28 sm:h-10 sm:w-32 rounded-full "/>
    <Skeleton className="h-10 w-28 sm:h-10 sm:w-32 rounded-full "/>
    <Skeleton className="h-10 w-28 sm:h-10 sm:w-32 rounded-full "/>
    </div>
    <div className="flex flex-row flex-wrap justify-evenly gap-4 mt-10">
    <Skeleton className="sm:h-32 sm:w-32 h-28 w-28 rounded-3xl"/>
    <Skeleton className="sm:h-32 sm:w-32 h-28 w-28 rounded-3xl"/>
    <Skeleton className="sm:h-32 sm:w-32 h-28 w-28 rounded-3xl"/>
    <Skeleton className="sm:h-32 sm:w-32 h-28 w-28 rounded-3xl"/>
    <Skeleton className="sm:h-32 sm:w-32 h-28 w-28 rounded-3xl"/>
    <Skeleton className="sm:h-32 sm:w-32 h-28 w-28 rounded-3xl"/>
    </div>
    </>

  )
}
