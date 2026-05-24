import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function LegalNoticeDialog({
  open,
  onAccept,
}: {
  open: boolean
  onAccept: () => void
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Before you begin</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                This app runs locally on your machine. It does not host,
                distribute, or publish your videos.
              </p>
              <p>
                You are solely responsible for how you use it. Use only material
                you have rights or permission to use, and follow copyright law
                and platform terms (including YouTube&apos;s Terms of Service).
              </p>
              <p>
                The authors provide software only. They are not affiliated with
                your output and are not liable for compilations you create.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onAccept}>I understand</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
