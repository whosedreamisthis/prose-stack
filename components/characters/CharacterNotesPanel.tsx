"use client";

import { useId, useRef, useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { createCharacterNote, deleteCharacterNote, updateCharacterNote } from "@/actions/characters";
import { RightPanel } from "@/components/layout/RightPanel";
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
import { MAX_NOTES_PER_CHARACTER, MAX_NOTE_LENGTH } from "@/lib/character-config";
import { cn } from "@/lib/utils";
import type { CharacterNoteItem } from "@/types/characters";

// More tabs (e.g. links to scenes) can be added here later; each one renders its own panel.
const TABS = [{ id: "notes", label: "Notes" }] as const;

interface NotesPanelProps {
  projectId: string;
  characterId: string;
  characterName: string;
  notes: CharacterNoteItem[];
}

/** The right sidebar for the open character. Remounted per character, so the notes state always belongs to one character. */
export function CharacterNotesPanel({ projectId, characterId, characterName, notes }: NotesPanelProps) {
  const baseId = useId();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("notes");

  return (
    <RightPanel title={characterName}>
      <div role="tablist" aria-label="Character details" className="flex gap-1 border-b">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`${baseId}-panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px border-b-2 px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "notes" && (
        <div role="tabpanel" id={`${baseId}-panel-notes`} aria-labelledby={`${baseId}-tab-notes`}>
          <NotesTab projectId={projectId} characterId={characterId} initialNotes={notes} />
        </div>
      )}
    </RightPanel>
  );
}

function newClientId() {
  return crypto.randomUUID();
}

function NotesTab({ projectId, characterId, initialNotes }: { projectId: string; characterId: string; initialNotes: CharacterNoteItem[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const discardDraft = useRef(false);
  const full = notes.length >= MAX_NOTES_PER_CHARACTER;

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
      const result = await createCharacterNote({ projectId, characterId, content, id });
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
      const result = await updateCharacterNote({ projectId, characterId, noteId: id, content });
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
      const result = await deleteCharacterNote({ projectId, characterId, noteId: id });
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
          <NoteCard note={note} onSave={(content) => saveNote(note.id, content)} onDelete={() => removeNote(note.id)} />
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
              `Note limit reached (${MAX_NOTES_PER_CHARACTER})`
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
            maxLength={MAX_NOTE_LENGTH}
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

function NoteCard({ note, onSave, onDelete }: { note: CharacterNoteItem; onSave: (content: string) => void; onDelete: () => void }) {
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
        maxLength={MAX_NOTE_LENGTH}
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
