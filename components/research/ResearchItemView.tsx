"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EditorContent, useEditor } from "@tiptap/react";
import { ExternalLinkIcon, FileTextIcon, MapPinIcon, UserIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { setResearchItemLink, updateResearchItem } from "@/actions/research";
import { PROSE_EXTENSIONS } from "@/components/manuscript/prose-extensions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDialogAutosave } from "@/hooks/useDialogAutosave";
import { createAutosaveScheduler } from "@/lib/autosave-scheduler";
import { FORMATTED_TEXT, formattingStyle } from "@/lib/formatting";
import { emptyDoc, type DocNode } from "@/lib/manuscript-text";
import type { Formatting } from "@/lib/project-config";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_RESEARCH_TITLE_LENGTH,
  MAX_URL_LENGTH,
  isWebUrl,
  researchTitleSchema,
  researchUrlSchema,
} from "@/lib/research-config";
import type { ResearchItemDetail, ResearchLinkKind, ResearchLinkOptions, ResearchLinkTarget } from "@/types/research";

const SELECT =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const STATUS_TEXT = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved. Retrying…",
} as const;
const LINK_ICON = {
  character: UserIcon,
  place: MapPinIcon,
  scene: FileTextIcon,
} as const;

interface ResearchItemViewProps {
  projectId: string;
  item: ResearchItemDetail;
  formatting: Formatting;
  linkOptions: ResearchLinkOptions;
}

/** One research item in the main pane: its title, its note or link, and what it links to in the story. Mount with `key={item.id}`. */
export function ResearchItemView({ projectId, item, formatting, linkOptions }: ResearchItemViewProps) {
  return (
    <article aria-label={item.title} className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <TitleField projectId={projectId} itemId={item.id} initial={item.title} />
      {item.type === "NOTE" ? (
        <NoteEditor projectId={projectId} itemId={item.id} initial={item.content ?? emptyDoc()} formatting={formatting} />
      ) : (
        <LinkFields projectId={projectId} itemId={item.id} url={item.url} description={item.description} />
      )}
      <StoryLink projectId={projectId} itemId={item.id} initial={item.link} options={linkOptions} />
    </article>
  );
}

/** The title, saved a moment after typing stops. A blank title is not saved (the last good one stays). */
function TitleField({ projectId, itemId, initial }: { projectId: string; itemId: string; initial: string }) {
  const [title, setTitle] = useState(initial);
  const [focused, setFocused] = useState(false);
  const [seen, setSeen] = useState(initial);
  // A rename made elsewhere (the sidebar) shows here too, unless the writer is typing in this field.
  if (initial !== seen) {
    setSeen(initial);
    if (!focused) setTitle(initial);
  }
  useDialogAutosave(title, async (value) => {
    const parsed = researchTitleSchema.safeParse(value);
    if (!parsed.success) return;
    const result = await updateResearchItem({
      projectId,
      itemId,
      changes: { title: parsed.data },
    });
    if (!result.success) toast.error(result.error);
  });
  return (
    <Input
      aria-label="Title"
      value={title}
      maxLength={MAX_RESEARCH_TITLE_LENGTH}
      onChange={(e) => setTitle(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="h-10 border-0 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
    />
  );
}

/** The note's text: the scene editor's prose setup and the project's formatting, saved as the writer pauses. */
function NoteEditor({
  projectId,
  itemId,
  initial,
  formatting,
}: {
  projectId: string;
  itemId: string;
  initial: DocNode;
  formatting: Formatting;
}) {
  const [status, setStatus] = useState<keyof typeof STATUS_TEXT>("idle");
  const scheduler = useRef<ReturnType<typeof createAutosaveScheduler> | null>(null);

  const editor = useEditor({
    extensions: PROSE_EXTENSIONS,
    content: initial,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Note text",
      },
    },
    onUpdate: () => scheduler.current?.markDirty(),
  });

  useEffect(() => {
    if (!editor) return;
    const s = createAutosaveScheduler({
      idleMs: 800,
      maxWaitMs: 5000,
      retryDelaysMs: [2000, 5000, 15000],
      onStatus: setStatus,
      save: async () => {
        const result = await updateResearchItem({
          projectId,
          itemId,
          changes: { content: editor.getJSON() as { type: "doc" } },
        });
        return result.success;
      },
    });
    scheduler.current = s;
    const flush = () => void s.flush();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      // Leaving the note saves what is pending first.
      void s.flush().finally(() => s.dispose());
      scheduler.current = null;
    };
  }, [editor, projectId, itemId]);

  return (
    <div className="flex flex-col gap-1">
      <div
        style={formattingStyle(formatting)}
        className={`${FORMATTED_TEXT} rounded-md border border-foreground/25 bg-card/30 px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 [&_.ProseMirror]:min-h-[50vh] [&_.ProseMirror]:px-1 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:mb-(--editor-gap)`}
      >
        <EditorContent editor={editor} />
      </div>
      <p role="status" className={status === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {STATUS_TEXT[status]}
      </p>
    </div>
  );
}

/** A link's address and description. Only http(s) addresses are saved or opened. */
function LinkFields({ projectId, itemId, url, description }: { projectId: string; itemId: string; url: string; description: string }) {
  const [values, setValues] = useState({ url, description });
  const urlError = researchUrlSchema.safeParse(values.url).success ? null : "Enter a web address starting with http:// or https://";
  const { status } = useDialogAutosave(values, async (v) => {
    if (!researchUrlSchema.safeParse(v.url).success) return;
    const result = await updateResearchItem({
      projectId,
      itemId,
      changes: { url: v.url, description: v.description },
    });
    if (!result.success) toast.error(result.error);
  });
  const trimmed = values.url.trim();

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Address</span>
        <div className="flex gap-2">
          <Input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={values.url}
            maxLength={MAX_URL_LENGTH}
            aria-invalid={!!urlError}
            aria-describedby={urlError ? `${itemId}-url-error` : undefined}
            onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
          />
          <Button
            variant="outline"
            disabled={!trimmed || !isWebUrl(trimmed)}
            render={<a href={isWebUrl(trimmed) ? trimmed : undefined} target="_blank" rel="noopener noreferrer" />}
          >
            Open link <ExternalLinkIcon />
          </Button>
        </div>
        {urlError && (
          <span id={`${itemId}-url-error`} className="text-xs text-destructive">
            {urlError}
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Description</span>
        <Textarea
          value={values.description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder="What this source is and why it matters"
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          className="min-h-32"
        />
      </label>
      <p role="status" className="text-xs text-muted-foreground">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
      </p>
    </div>
  );
}

const linkHref = (projectId: string, link: ResearchLinkTarget) =>
  link.kind === "scene"
    ? `/projects/${projectId}/manuscript?scene=${link.id}`
    : `/projects/${projectId}/${link.kind}s?${link.kind}=${link.id}`;

/** What the item is about in the story: a chip that opens it, and a picker to set or clear it. */
function StoryLink({
  projectId,
  itemId,
  initial,
  options,
}: {
  projectId: string;
  itemId: string;
  initial: ResearchLinkTarget | null;
  options: ResearchLinkOptions;
}) {
  const [link, setLink] = useState(initial);
  const save = async (next: ResearchLinkTarget | null) => {
    const previous = link;
    setLink(next);
    const result = await setResearchItemLink({
      projectId,
      itemId,
      link: next && { kind: next.kind, id: next.id },
    });
    if (!result.success) {
      toast.error(result.error);
      setLink(previous);
    }
  };
  const pick = (value: string) => {
    if (!value) return void save(null);
    const [kind, id] = value.split(":") as [ResearchLinkKind, string];
    const list = kind === "character" ? options.characters : kind === "place" ? options.places : options.scenes;
    const found = list.find((o) => o.id === id);
    if (found) void save({ kind, id, name: found.name });
  };
  const ChipIcon = link ? LINK_ICON[link.kind] : null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {link && ChipIcon ? (
        <span className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/40 py-0.5 pr-1 pl-2">
          <Link href={linkHref(projectId, link)} className="inline-flex min-w-0 items-center gap-1 hover:underline">
            <ChipIcon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{link.name}</span>
          </Link>
          <button
            type="button"
            aria-label="Remove link"
            onClick={() => void save(null)}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" aria-hidden />
          </button>
        </span>
      ) : (
        <span className="text-muted-foreground">Not linked to the story.</span>
      )}
      <select
        aria-label="Link to a character, place or scene"
        value={link ? `${link.kind}:${link.id}` : ""}
        onChange={(e) => pick(e.target.value)}
        className={`${SELECT} w-auto max-w-56`}
      >
        <option value="">Link to…</option>
        {options.characters.length > 0 && (
          <optgroup label="Characters">
            {options.characters.map((c) => (
              <option key={c.id} value={`character:${c.id}`}>
                {c.name}
              </option>
            ))}
          </optgroup>
        )}
        {options.places.length > 0 && (
          <optgroup label="Places">
            {options.places.map((p) => (
              <option key={p.id} value={`place:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
        {options.scenes.length > 0 && (
          <optgroup label="Scenes">
            {options.scenes.map((s) => (
              <option key={s.id} value={`scene:${s.id}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
