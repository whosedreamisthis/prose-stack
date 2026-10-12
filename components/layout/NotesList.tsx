"use client";

import { useRef, useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/actions";

export interface NoteItem {
  id: string;
  content: string;
}

interface NotesListProps {
  initialNotes: NoteItem[];
  maxNotes: number;
  maxLength: number;
  /** Server actions for the owner (a character or a place). Each result is checked, and a failed change is rolled back. */
  onCreate: (input: { id: string; content: string }) => Promise<ActionResult<unknown>>;
  onUpdate: (input: { noteId: string; content: string }) => Promise<ActionResult>;
  onDelete: (input: { noteId: string }) => Promise<ActionResult>;
}

function newClientId() {
  return crypto.randomUUID();
}

/** A list of free-form notes: edit in place, delete with confirmation, and a dashed button that opens a draft. Remount it per owner. */
export function NotesList({ initialNotes, maxNotes, maxLength, onCreate, onUpdate, onDelete }: NotesListProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const discardDraft = useRef(false);
  const full = notes.length >= maxNotes;

  const commitDraft = () => {
    const content = (draft ?? "").trim();
    setDraft(null);
    if (discardDraft.current || !content) {
      discardDraft.current = false;
      return;
    }
    const id = newClientId();
    setNotes((prev) => [...prev, { id, content }]);
    startTransition(async () => {
      const result = await onCreate({ id, content });
      if (!result.success) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        toast.error(result.error);
      }
    });
  };

  const saveNote = (id: string, content: string) => {
    const previous = notes.find((n) => n.id === id)?.content ?? "";
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
    startTransition(async () => {
      const result = await onUpdate({ noteId: id, content });
      if (!result.success) {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content: previous } : n)));
        toast.error(result.error);
      }
    });
  };

  const removeNote = (id: string) => {
    const index = notes.findIndex((n) => n.id === id);
    const removed = notes[index];
    if (!removed) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      const result = await onDelete({ noteId: id });
      if (!result.success) {
        setNotes((prev) => [...prev.slice(0, index), removed, ...prev.slice(index)]);
        toast.error(result.error);
      }
    });
  };

  return (
    <ul className="flex flex-col gap-2 pt-3">
      {notes.map((note) => (
        <li key={note.id}>
          <NoteCard
            note={note}
            maxLength={maxLength}
            onSave={(content) => saveNote(note.id, content)}
            onDelete={() => removeNote(note.id)}
          />
        </li>
      ))}
      <li>
        {draft === null ? (
          <button
            type="button"
            disabled={full}
            onClick={() => setDraft("")}
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
        ) : (
          <Textarea
            autoFocus
            aria-label="New note"
            placeholder="Write a note… (click away to save, Esc to cancel)"
            value={draft}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              discardDraft.current = true;
              e.currentTarget.blur();
            }}
            className="border-2 border-dashed border-primary"
          />
        )}
      </li>
    </ul>
  );
}

function NoteCard({
  note,
  maxLength,
  onSave,
  onDelete,
}: {
  note: NoteItem;
  maxLength: number;
  onSave: (content: string) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(note.content);
  const [confirming, setConfirming] = useState(false);

  const commit = () => {
    const content = value.trim();
    if (!content) {
      setValue(note.content);
      toast.error("A note can't be empty. Use the delete button to remove it.");
      return;
    }
    if (content !== note.content) onSave(content);
    setValue(content);
  };

  return (
    <div className="group/note relative rounded-lg border bg-card">
      <Textarea
        aria-label="Note"
        value={value}
        maxLength={maxLength}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        className="min-h-20 resize-none border-0 bg-transparent pr-8 dark:bg-transparent"
      />
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Delete note"
        onClick={() => setConfirming(true)}
        className="absolute top-1.5 right-1.5 text-muted-foreground opacity-0 group-focus-within/note:opacity-100 group-hover/note:opacity-100 focus-visible:opacity-100"
      >
        <Trash2Icon />
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
