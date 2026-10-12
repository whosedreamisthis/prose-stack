"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmTrashDialogProps {
  /** What is being trashed (null closes the dialog). `kind` reads as "character", "place", "note", "scene"... */
  target: { kind: string; name: string; detail?: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** The confirmation every "Move to trash" asks for. The caller keeps the target in state and runs the action in `onConfirm`. */
export function ConfirmTrashDialog({ target, onCancel, onConfirm }: ConfirmTrashDialogProps) {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Move this {target?.kind} to the trash?</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.name ? `“${target.name}” ` : "It "}
            will be removed from your project{target?.detail ? `. ${target.detail}` : "."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Move to trash
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
