"use client";

import { STORY_TEMPLATES, getStoryTemplate } from "@/lib/story-templates";

interface StoryStructureSelectProps {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

/** Picks a built-in story structure, or none. Shared by the new-project dialog and the General settings tab. */
export function StoryStructureSelect({ id, value, onChange }: StoryStructureSelectProps) {
  const structures = STORY_TEMPLATES.filter((t) => t.kind === "structure");
  const genres = STORY_TEMPLATES.filter((t) => t.kind === "genre");
  const chosen = getStoryTemplate(value);

  return (
    <>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        aria-describedby={`${id}-hint`}
        className="h-10 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        <option value="">None</option>
        <optgroup label="Plot structures">
          {structures.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Genre notes">
          {genres.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </optgroup>
      </select>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {chosen?.description ?? "A guide shown beside your manuscript. It never adds chapters or scenes."}
      </p>
    </>
  );
}
