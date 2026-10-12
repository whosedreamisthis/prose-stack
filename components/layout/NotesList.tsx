"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { DialogSaveBar } from "@/components/layout/DialogSaveBar";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { RowMenu } from "@/components/manuscript/RowMenu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDialogAutosave } from "@/hooks/useDialogAutosave";
import { MAX_NOTE_TITLE_LENGTH } from "@/lib/note-config";
import type { ActionResult } from "@/types/actions";

export interface NoteItem {
  id: string;
  /** Empty when the note has no title. */
  title: string;
  content: string;
}

type NoteValues = Pick<NoteItem, "title" | "content">;

interface NotesListProps {
  initialNotes: NoteItem[];
  maxNotes: number;
  maxLength: number;
  /** Server actions for the owner (a character or a place). Each result is checked, and a failed change is rolled back. */
  onCreate: (input: NoteValues & { id: string }) => Promise<ActionResult<unknown>>;
  onUpdate: (input: NoteValues & { noteId: string }) => Promise<ActionResult>;
  onTrash: (input: { noteId: string }) => Promise<ActionResult>;
}

/** Which note the dialog shows: one that exists, or a new one that is only created when it is closed with something in it. */
type Open = { id: string; isNew: boolean };

const isBlank = (v: NoteValues) => !v.title.trim() && !v.content.trim();

/**
 * Notes as cards (a bold title and as much of the text as fits). A card, or the dashed "Add a note" card, opens the note
 * in a dialog that saves as you type; closing it (Done, the X, Esc or a click outside) only closes. Remount it per owner.
 */
export function NotesList({ initialNotes, maxNotes, maxLength, onCreate, onUpdate, onTrash }: NotesListProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [open, setOpen] = useState<Open | null>(null);
  const [confirming, setConfirming] = useState<NoteItem | null>(null);
  const [, startTransition] = useTransition();
  const full = notes.length >= maxNotes;
  const openNote = open && !open.isNew ? notes.find((n) => n.id === open.id) : undefined;

  /** Runs a server call as a transition; the promise settles when it has finished, so an autosave can show "Saving…" until then. */
  const sent = (run: () => Promise<void>) =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        await run();
        resolve();
      });
    });

  /**
   * Saves what the dialog shows. A new note is created once it has a title or text; an existing one is updated if it changed.
   * `quiet` is for autosaves: a note emptied mid-edit is skipped without a complaint, since the writer is still typing.
   */
  const persist = (target: Open, raw: NoteValues, quiet = false): Promise<void> | void => {
    const values = { title: raw.title.trim(), content: raw.content.trim() };
    const existing = notes.find((n) => n.id === target.id);
    if (!existing) {
      if (isBlank(values)) return;
      setNotes((prev) => [...prev, { id: target.id, ...values }]);
      return sent(async () => {
        const result = await onCreate({ id: target.id, ...values });
        if (!result.success) {
          setNotes((prev) => prev.filter((n) => n.id !== target.id));
          toast.error(result.error);
        }
      });
    }
    if (values.title === existing.title && values.content === existing.content) return;
    if (isBlank(values)) {
      if (!quiet) toast.error("A note can't be empty. Use Delete to remove it.");
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === target.id ? { ...n, ...values } : n)));
    return sent(async () => {
      const result = await onUpdate({ noteId: target.id, ...values });
      if (!result.success) {
        setNotes((prev) => prev.map((n) => (n.id === target.id ? existing : n)));
        toast.error(result.error);
      }
    });
  };

  // Autosaves fire later, so they must use the latest list (a note created by an earlier autosave is then updated, not created again).
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  const trashNote = (id: string) => {
    const index = notes.findIndex((n) => n.id === id);
    const removed = notes[index];
    if (!removed) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      const result = await onTrash({ noteId: id });
      if (!result.success) {
        setNotes((prev) => [...prev.slice(0, index), removed, ...prev.slice(index)]);
        toast.error(result.error);
        return;
      }
      toast.success("Moved to the trash.");
    });
  };

  return (
    <>
      <ul className="flex flex-col gap-2 pt-3">
        {notes.map((note) => (
          <li key={note.id} className="group/item relative">
            <button
              type="button"
              onClick={() => setOpen({ id: note.id, isNew: false })}
              className="flex max-h-40 min-h-16 w-full flex-col gap-1 overflow-hidden rounded-lg border bg-card p-3 pr-9 text-left text-sm outline-none transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {note.title && <span className="truncate font-semibold">{note.title}</span>}
              {/* Clamped by lines rather than cut at a height, so the last visible line is never sliced in half. */}
              {note.content && <span className="line-clamp-6 wrap-break-word whitespace-pre-wrap text-foreground/80">{note.content}</span>}
            </button>
            {/* The same hover-only "…" menu as every other row; in the corner, since the card is tall. */}
            <RowMenu label={`${note.title || "Note"} options`} className="top-2 translate-y-0">
              <DropdownMenuItem variant="destructive" onClick={() => setConfirming(note)}>
                <Trash2Icon /> Move to trash
              </DropdownMenuItem>
            </RowMenu>
          </li>
        ))}
        <li>
          <button
            type="button"
            disabled={full}
            onClick={() => setOpen({ id: crypto.randomUUID(), isNew: true })}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border px-3 py-4 text-sm text-muted-foreground outline-none transition-colors hover:border-primary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {full ? (
              `Note limit reached (${maxNotes})`
            ) : (
              <>
                Add a note <PlusIcon className="size-4" aria-hidden />
              </>
            )}
          </button>
        </li>
      </ul>
      <ConfirmTrashDialog
        target={confirming && { kind: "note", name: confirming.title || confirming.content.slice(0, 40) }}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) trashNote(confirming.id);
          setConfirming(null);
        }}
      />
      {open && (
        <NoteDialog
          // Remounted per note, so its fields always belong to one note.
          key={open.id}
          initial={openNote ?? { title: "", content: "" }}
          isNew={open.isNew}
          maxLength={maxLength}
          onAutosave={(values) => persistRef.current(open, values, true)}
          onClose={(values) => {
            persist(open, values);
            // A new note now exists in the list; if it was blank nothing was created and nothing is left to open.
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

interface NoteDialogProps {
  initial: NoteValues;
  isNew: boolean;
  maxLength: number;
  onAutosave: (values: NoteValues) => Promise<void> | void;
  onClose: (values: NoteValues) => void;
}

function NoteDialog({ initial, isNew, maxLength, onAutosave, onClose }: NoteDialogProps) {
  const [values, setValues] = useState(initial);
  const { status } = useDialogAutosave(values, onAutosave);

  return (
    <>
      <Dialog
        open
        onOpenChange={(next) => {
          if (!next) onClose(values);
        }}
      >
        <DialogContent className="flex max-h-[85dvh] flex-col gap-3 sm:max-w-lg">
          <DialogTitle className="sr-only">{isNew ? "New note" : "Note"}</DialogTitle>
          <DialogDescription className="sr-only">Changes are saved as you type.</DialogDescription>
          <Input
            aria-label="Note title"
            placeholder="Title"
            value={values.title}
            maxLength={MAX_NOTE_TITLE_LENGTH}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="h-9 border-0 bg-transparent pr-8 pl-0 text-base font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Textarea
            autoFocus
            aria-label="Note content"
            placeholder="Note content"
            value={values.content}
            maxLength={maxLength}
            onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
            className="min-h-48 flex-1 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <DialogSaveBar status={status} onDone={() => onClose(values)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
