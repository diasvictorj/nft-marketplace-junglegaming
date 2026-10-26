import { cn } from "@/lib/utils"

/** Skeleton com shimmer (classe `.skeleton` em index.css, respeita reduced-motion). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton", className)}
      {...props}
    />
  )
}

export { Skeleton }
