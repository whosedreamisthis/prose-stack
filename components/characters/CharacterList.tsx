"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArchiveIcon, PlusIcon, Trash2Icon, UserIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { archiveCharacter, createCharacter, trashCharacter } from "@/actions/characters";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { Hint } from "@/components/layout/Hint";
import { ExportItem, RowMenu } from "@/components/manuscript/RowMenu";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { requestNameFocus } from "@/lib/character-focus";
import { CHARACTER_ROLES, type CharacterRoleKey } from "@/lib/character-config";
import { resolveActiveCharacter } from "@/lib/character-selection";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { cn } from "@/lib/utils";
import type { CharacterSummary } from "@/types/characters";
import { SELECTED_ROW } from "@/components/layout/sidebar-styles";

interface CharacterListProps {
  projectId: string;
  characters: CharacterSummary[];
}

/** The left sidebar: characters grouped into Main and Supporting, each group with its own add button. */
export function CharacterList({ projectId, characters }: CharacterListProps) {
  const router = useRouter();
  // The sidebar shows on every page, so a character is only "open" while the characters page is.
  const onCharactersPage = usePathname().startsWith(`/projects/${projectId}/characters`);
  // Read from the URL here, not on the server, so the sidebar can live in the layout and stay mounted between pages.
  const activeId = resolveActiveCharacter(characters, useSearchParams().get("character"))?.id ?? null;
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const setPending = usePendingNavStore((s) => s.setPending);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<CharacterSummary | null>(null);

  const add = (role: CharacterRoleKey) => {
    startTransition(async () => {
      const result = await createCharacter({ projectId, role });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      requestNameFocus(result.data.id);
      router.push(`/projects/${projectId}/characters?character=${result.data.id}`);
    });
  };

  const hide = (character: CharacterSummary, action: typeof trashCharacter, done: string) => {
    startTransition(async () => {
      const result = await action({ projectId, characterId: character.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(done);
      // The open character is gone, so drop it from the URL and let the page fall back to another one.
      if (onCharactersPage && character.id === activeId) router.replace(`/projects/${projectId}/characters`);
    });
  };

  return (
    <nav aria-label="Characters" className="flex flex-col gap-4">
      {CHARACTER_ROLES.map(({ value, label, plural }) => {
        const group = characters.filter((c) => c.role === value);
        return (
          <section key={value} aria-label={plural} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 pl-2">
              <UsersIcon className="size-4 shrink-0" aria-hidden />
              <h2 className="truncate text-sm font-normal">{plural}</h2>
              <Hint label={`Add ${label.toLowerCase()} character`} side="right" wrapperClassName="ml-auto">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={pending}
                  aria-label={`Add ${label.toLowerCase()} character`}
                  onClick={() => add(value)}
                >
                  <PlusIcon />
                </Button>
              </Hint>
            </div>
            {group.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="ml-3 flex flex-col border-l pl-1">
                {group.map((c) => (
                  <li key={c.id} className="group/item relative">
                    <Link
                      href={`/projects/${projectId}/characters?character=${c.id}`}
                      aria-current={onCharactersPage && c.id === activeId ? "true" : undefined}
                      // Fetch the character as the pointer arrives, so the click is usually served from the browser.
                      onPointerEnter={() => router.prefetch(`/projects/${projectId}/characters?character=${c.id}`)}
                      onFocus={() => router.prefetch(`/projects/${projectId}/characters?character=${c.id}`)}
                      onClick={() => {
                        // Show the sketch skeleton straight away; only for a character that isn't already open.
                        if (!onCharactersPage) setPending("section", "characters");
                        if (!onCharactersPage || c.id !== activeId) setPending("character", c.id);
                        setDrawerOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        onCharactersPage && c.id === activeId
                          ? SELECTED_ROW
                          : "text-foreground/80 hover:bg-muted/60",
                      )}
                    >
                      <UserIcon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{c.name}</span>
                    </Link>
                    <RowMenu label={`${c.name} options`}>
                      <ExportItem type="character" id={c.id} projectId={projectId} name={c.name} />
                      <DropdownMenuItem onClick={() => hide(c, archiveCharacter, "Character archived.")}>
                        <ArchiveIcon /> Archive
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setConfirming(c)}>
                        <Trash2Icon /> Move to trash
                      </DropdownMenuItem>
                    </RowMenu>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <ConfirmTrashDialog
        target={confirming && { kind: "character", name: confirming.name }}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) hide(confirming, trashCharacter, "Moved to the trash.");
          setConfirming(null);
        }}
      />
    </nav>
  );
}
