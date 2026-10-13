"use client";

import { useEffect, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { listProofreadIgnores, removeProofreadIgnore } from "@/actions/proofread";
import { ProofreadCategories } from "@/components/manuscript/ProofreadPanel";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/stores/settings-store";
import type { ProofreadIgnoreItem } from "@/types/proofread";

/** What each rule id on the ignore list means, in words. */
const RULE_NAMES: Record<string, string> = {
  passive: "Passive voice",
  "long-sentence": "Very long sentences",
  article: "a/an mistakes",
  "double-space": "Double spaces",
  quotes: "Mixed quote styles",
};

/** The Proofread settings: which categories to show, and the project's ignore list (view and remove entries). */
export function ProofreadingTab() {
  const projectId = useSettingsStore((s) => s.projectId);
  const [items, setItems] = useState<ProofreadIgnoreItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let live = true;
    void listProofreadIgnores(projectId).then((result) => {
      if (!live) return;
      if (result.success) setItems(result.data);
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [projectId]);

  async function remove(item: ProofreadIgnoreItem) {
    if (!projectId) return;
    const result = await removeProofreadIgnore({ projectId, id: item.id });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setItems((current) => current?.filter((i) => i.id !== item.id) ?? null);
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="proofread-categories" className="flex flex-col gap-2">
        <h3 id="proofread-categories" className="text-sm font-medium">
          Show suggestions for
        </h3>
        <ProofreadCategories />
      </section>

      <section aria-labelledby="proofread-ignore" className="flex flex-col gap-2">
        <h3 id="proofread-ignore" className="text-sm font-medium">
          Ignore list
        </h3>
        <p className="text-xs text-muted-foreground">Words and rules you chose to ignore always, in this project.</p>
        {failed && <p className="text-sm text-destructive">Could not load the ignore list.</p>}
        {!failed && items === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {items?.length === 0 && <p className="text-sm text-muted-foreground">Nothing ignored yet.</p>}
        {items && items.length > 0 && (
          <ul className="flex flex-col divide-y rounded-lg border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {item.kind === "WORD" ? (
                    <>
                      <span className="text-muted-foreground">Word: </span>
                      {item.value}
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Rule: </span>
                      {RULE_NAMES[item.value] ?? item.value}
                    </>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Stop ignoring ${item.kind === "WORD" ? item.value : (RULE_NAMES[item.value] ?? item.value)}`}
                  onClick={() => void remove(item)}
                >
                  <Trash2Icon className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
