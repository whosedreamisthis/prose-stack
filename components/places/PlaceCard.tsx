"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { setPlaceCharacters, updatePlace } from "@/actions/places";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FIELD_LENGTH, PLACE_FIELDS, placeNameSchema, type PlaceChanges } from "@/lib/place-config";
import { consumePlaceNameFocusRequest } from "@/lib/place-focus";
import { cn } from "@/lib/utils";
import type { CharacterSummary } from "@/types/characters";
import type { PlaceDetail } from "@/types/places";

type Values = Omit<PlaceDetail, "id" | "relatedCharacterIds">;

interface PlaceCardProps {
  projectId: string;
  place: PlaceDetail;
  /** The project's live characters, to pick the related ones from. */
  characters: CharacterSummary[];
}

/**
 * The place's card. Each field saves when it loses focus and each related character saves when ticked, so there is no
 * save button. The page remounts this component per place (keyed by id), so the state below always belongs to one place.
 */
export function PlaceCard({ projectId, place, characters }: PlaceCardProps) {
  const formId = useId();
  const [values, setValues] = useState<Values>(place);
  const saved = useRef<Values>(place);
  const [related, setRelated] = useState<string[]>(place.relatedCharacterIds);
  const [pending, startTransition] = useTransition();

  const nameRef = useRef<HTMLInputElement>(null);

  // A place the writer just added opens with its placeholder name selected, ready to be replaced.
  useEffect(() => {
    if (!consumePlaceNameFocusRequest(place.id)) return;
    nameRef.current?.focus();
    nameRef.current?.select();
  }, [place.id]);

  const save = (changes: PlaceChanges) => {
    startTransition(async () => {
      const result = await updatePlace({
        projectId,
        placeId: place.id,
        changes,
      });
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
      const parsed = placeNameSchema.safeParse(value);
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

  const toggleCharacter = (characterId: string, checked: boolean) => {
    const before = related;
    const next = checked ? [...before, characterId] : before.filter((id) => id !== characterId);
    setRelated(next);
    startTransition(async () => {
      const result = await setPlaceCharacters({
        projectId,
        placeId: place.id,
        characterIds: next,
      });
      if (!result.success) {
        toast.error(result.error);
        setRelated(before);
      }
    });
  };

  const set = (key: keyof Values) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <article aria-label={`${place.name} card`} className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4">
      <div className="flex flex-col gap-1.5">
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

      <div className="grid gap-4 sm:grid-cols-2">
        {PLACE_FIELDS.filter((f) => f.short).map(({ key, label }) => (
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

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Related characters</legend>
        {characters.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a character to link it to this place.</p>
        ) : (
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {characters.map((c) => {
              const checked = related.includes(c.id);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    {/* Native checkboxes can't be rounded, so the box and its check are drawn from state; the real input sits invisibly on top for clicks, focus and screen readers. */}
                    <span
                      className={cn(
                        "relative grid size-5 shrink-0 place-items-center rounded-md border transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-transparent dark:bg-input/30",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleCharacter(c.id, e.target.checked)}
                        className="absolute inset-0 m-0 cursor-pointer appearance-none opacity-0"
                      />
                      {checked && <CheckIcon className="pointer-events-none size-3.5 stroke-3" aria-hidden />}
                    </span>
                    {c.name}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      {PLACE_FIELDS.filter((f) => !f.short).map(({ key, label }) => (
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
