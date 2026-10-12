"use client";

import { useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { RowMenu } from "@/components/manuscript/RowMenu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
 * in a dialog; closing it with the X, Esc or a click outside saves, so nothing is lost. Remount it per owner.
 */
export function NotesList({ initialNotes, maxNotes, maxLength, onCreate, onUpdate, onTrash }: NotesListProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [open, setOpen] = useState<Open | null>(null);
  const [confirming, setConfirming] = useState<NoteItem | null>(null);
  const [, startTransition] = useTransition();
  const full = notes.length >= maxNotes;
  const openNote = open && !open.isNew ? notes.find((n) => n.id === open.id) : undefined;

  /** Saves what the dialog shows. A new note is created once it has a title or text; an existing one is updated if it changed. */
  const persist = (target: Open, raw: NoteValues) => {
    const values = { title: raw.title.trim(), content: raw.content.trim() };
    const existing = notes.find((n) => n.id === target.id);
    if (!existing) {
      if (isBlank(values)) return;
      setNotes((prev) => [...prev, { id: target.id, ...values }]);
      startTransition(async () => {
        const result = await onCreate({ id: target.id, ...values });
        if (!result.success) {
          setNotes((prev) => prev.filter((n) => n.id !== target.id));
          toast.error(result.error);
        }
      });
      return;
    }
    if (values.title === existing.title && values.content === existing.content) return;
    if (isBlank(values)) {
      toast.error("A note can't be empty. Use Delete to remove it.");
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === target.id ? { ...n, ...values } : n)));
    startTransition(async () => {
      const result = await onUpdate({ noteId: target.id, ...values });
      if (!result.success) {
        setNotes((prev) => prev.map((n) => (n.id === target.id ? existing : n)));
        toast.error(result.error);
      }
    });
  };

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
          onBlurSave={(values) => !open.isNew && persist(open, values)}
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
  onBlurSave: (values: NoteValues) => void;
  onClose: (values: NoteValues) => void;
}

function NoteDialog({ initial, isNew, maxLength, onBlurSave, onClose }: NoteDialogProps) {
  const [values, setValues] = useState(initial);

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
          <DialogDescription className="sr-only">Changes are saved when you close this note.</DialogDescription>
          <Input
            aria-label="Note title"
            placeholder="Title"
            value={values.title}
            maxLength={MAX_NOTE_TITLE_LENGTH}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            onBlur={() => onBlurSave(values)}
            className="mr-8 h-9 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Textarea
            autoFocus
            aria-label="Note content"
            placeholder="Note content"
            value={values.content}
            maxLength={maxLength}
            onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
            onBlur={() => onBlurSave(values)}
            className="min-h-48 flex-1 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
