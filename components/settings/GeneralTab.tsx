"use client";

import { CoverColorPicker } from "@/components/projects/CoverColorPicker";
import { StoryStructureSelect } from "@/components/structure/StoryStructureSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/lib/stores/settings-store";

export function GeneralTab() {
  const draft = useSettingsStore((s) => s.draft);
  const updateDraft = useSettingsStore((s) => s.updateDraft);
  if (!draft) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-title">Title</Label>
        <Input
          id="settings-title"
          value={draft.title}
          maxLength={120}
          required
          aria-invalid={draft.title.trim() === ""}
          onChange={(e) => updateDraft({ title: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-subtitle">Subtitle (optional)</Label>
        <Input
          id="settings-subtitle"
          value={draft.subtitle}
          maxLength={160}
          onChange={(e) => updateDraft({ subtitle: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-author">Author</Label>
        <Input
          id="settings-author"
          value={draft.author}
          maxLength={80}
          required
          aria-invalid={draft.author.trim() === ""}
          onChange={(e) => updateDraft({ author: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Cover color</Label>
        <CoverColorPicker value={draft.coverColor} onChange={(coverColor) => updateDraft({ coverColor })} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-structure">Story structure</Label>
        <StoryStructureSelect
          id="settings-structure"
          value={draft.storyTemplateId}
          onChange={(storyTemplateId) => updateDraft({ storyTemplateId })}
        />
      </div>
    </div>
  );
}
