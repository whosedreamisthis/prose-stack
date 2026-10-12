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

interface ConfirmDeleteDialogProps {
  /** What is being deleted for good (null closes the dialog). */
  target: { name: string; detail?: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** The confirmation for deleting something permanently, from the Trash. Nothing can bring it back. */
export function ConfirmDeleteDialog({ target, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.name ? `“${target.name}” ` : "This item "}
            will be deleted for good{target?.detail ? `, ${target.detail}` : ""}. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
