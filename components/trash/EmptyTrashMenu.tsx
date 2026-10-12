"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { emptyTrash } from "@/actions/trash";
import { Hint } from "@/components/layout/Hint";
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
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** The "…" on the Trash row, shown while the trash has something in it: one option, to delete everything in it for good. */
export function EmptyTrashMenu({ projectId, count }: { projectId: string; count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const items = `${count} ${count === 1 ? "item" : "items"}`;

  const empty = () =>
    startTransition(async () => {
      const result = await emptyTrash({ projectId });
      if (!result.success) return void toast.error(result.error);
      toast.success("The trash is empty.");
      // An item open from the trash is gone now.
      if (pathname.startsWith(`/projects/${projectId}/trash`)) router.replace(`/projects/${projectId}/trash`);
    });

  return (
    <>
      <DropdownMenu>
        <Hint label="Trash options" side="right">
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" disabled={pending} aria-label="Trash options" />}>
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
        </Hint>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2Icon /> Delete all permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Empty the trash?</AlertDialogTitle>
            <AlertDialogDescription>
              All {items} in the trash, and everything inside them, will be deleted for good. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                empty();
              }}
            >
              Delete all permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
