"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateCharacter } from "@/actions/characters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CHARACTER_ROLES,
  MAX_FIELD_LENGTH,
  SKETCH_FIELDS,
  characterNameSchema,
  type CharacterChanges,
  type CharacterRoleKey,
} from "@/lib/character-config";
import { consumeNameFocusRequest } from "@/lib/character-focus";
import type { CharacterDetail } from "@/types/characters";

type Values = Omit<CharacterDetail, "id">;

/**
 * The character's sketch. Each field saves when it loses focus, so there is no save button. The page remounts this
 * component per character (keyed by id), so the state below always belongs to one character.
 */
export function CharacterSketch({ projectId, character }: { projectId: string; character: CharacterDetail }) {
  const formId = useId();
  const [values, setValues] = useState<Values>(character);
  const saved = useRef<Values>(character);
  const [pending, startTransition] = useTransition();

  const nameRef = useRef<HTMLInputElement>(null);

  // A character the writer just added opens with its placeholder name selected, ready to be replaced.
  useEffect(() => {
    if (!consumeNameFocusRequest(character.id)) return;
    nameRef.current?.focus();
    nameRef.current?.select();
  }, [character.id]);

  const save = (changes: CharacterChanges) => {
    startTransition(async () => {
      const result = await updateCharacter({ projectId, characterId: character.id, changes });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      saved.current = { ...saved.current, ...changes };
    });
  };

  const saveField = (key: keyof Values) => {
    const value = values[key];
    if (value === saved.current[key]) return;
    if (key === "name") {
      const parsed = characterNameSchema.safeParse(value);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid name.");
        setValues((v) => ({ ...v, name: saved.current.name }));
        return;
      }
      setValues((v) => ({ ...v, name: parsed.data }));
      save({ name: parsed.data });
      return;
    }
    save({ [key]: value });
  };

  const changeRole = (role: CharacterRoleKey) => {
    setValues((v) => ({ ...v, role }));
    save({ role });
  };

  const set = (key: keyof Values) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <article aria-label={`${character.name} sketch`} className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4">
      <header className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor={`${formId}-name`}>Name</Label>
          <Input
            id={`${formId}-name`}
            ref={nameRef}
            value={values.name}
            maxLength={120}
            onChange={(e) => set("name")(e.target.value)}
            onBlur={() => saveField("name")}
            className="h-10 text-xl"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-group`}>Group</Label>
          <select
            id={`${formId}-group`}
            value={values.role}
            onChange={(e) => changeRole(e.target.value as CharacterRoleKey)}
            className="h-10 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {CHARACTER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {SKETCH_FIELDS.filter((f) => f.short).map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-${key}`}>{label}</Label>
            <Input
              id={`${formId}-${key}`}
              value={values[key]}
              maxLength={MAX_FIELD_LENGTH}
              onChange={(e) => set(key)(e.target.value)}
              onBlur={() => saveField(key)}
            />
          </div>
        ))}
      </div>

      {SKETCH_FIELDS.filter((f) => !f.short).map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <Label htmlFor={`${formId}-${key}`}>{label}</Label>
          <Textarea
            id={`${formId}-${key}`}
            value={values[key]}
            maxLength={MAX_FIELD_LENGTH}
            onChange={(e) => set(key)(e.target.value)}
            onBlur={() => saveField(key)}
          />
        </div>
      ))}

      <p role="status" aria-live="polite" className="h-4 text-xs text-muted-foreground">
        {pending ? "Saving…" : ""}
      </p>
    </article>
  );
}
