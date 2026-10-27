import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** Toasts (shadcn/ui + sonner) com a identidade do projeto; a região é aria-live. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: '!bg-card !text-card-foreground !border-border-soft !font-sans',
          description: '!text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
