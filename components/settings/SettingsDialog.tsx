"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { updateProjectSettings, updateUserTheme } from "@/actions/settings";
import { AppearanceTab } from "@/components/settings/AppearanceTab";
import { FormattingTab } from "@/components/settings/FormattingTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { LabelsTab } from "@/components/settings/LabelsTab";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  RESETTABLE_TABS,
  SETTINGS_TABS,
  getChanges,
  getDirtyTabs,
  hasChanges,
  updateProjectSettingsSchema,
  type SettingsTab,
} from "@/lib/settings-config";
import { discardWarning } from "@/lib/story-config";
import { lostBeatKeys } from "@/lib/story-templates";
import { useFormattingStore } from "@/lib/stores/formatting-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { applyTheme, persistThemeCookie } from "@/lib/theme-config";
import { cn } from "@/lib/utils";

const PANELS: Record<SettingsTab, () => ReactNode> = {
  general: () => <GeneralTab />,
  appearance: () => <AppearanceTab />,
  formatting: () => <FormattingTab />,
  labels: () => <LabelsTab />,
};

/** The project settings modal. Open it with `useSettingsStore().openSettings`; it is mounted once, in the navbar. */
export function SettingsDialog() {
  const open = useSettingsStore((s) => s.open);
  const projectId = useSettingsStore((s) => s.projectId);
  const tab = useSettingsStore((s) => s.tab);
  const saved = useSettingsStore((s) => s.saved);
  const draft = useSettingsStore((s) => s.draft);
  const labelsChanged = useSettingsStore((s) => s.labelsChanged);
  const setTab = useSettingsStore((s) => s.setTab);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const markSaved = useSettingsStore((s) => s.markSaved);
  const resetDraftTab = useSettingsStore((s) => s.resetDraftTab);

  const [confirm, setConfirm] = useState<"discard" | "reset" | "structure" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const changes = saved && draft ? getChanges(saved, draft) : null;
  const dirty = changes !== null && hasChanges(changes);
  // The Labels tab is marked once a label changed, though it needs no Save: the dot says "you touched this tab".
  const dirtyTabs = saved && draft ? { ...getDirtyTabs(saved, draft), labels: labelsChanged } : null;
  // The Labels tab saves each change on its own, so a Save button there only ever looks broken: it offers Done instead,
  // unless another tab has edits that still need Save or Cancel.
  const autoSaves = tab === "labels" && !dirty;

  // The theme previews live: the draft's theme is on <html> while the modal is open, and the saved one is put back on cancel.
  const draftTheme = draft?.theme ?? null;
  useEffect(() => {
    if (open) applyTheme(draftTheme);
  }, [open, draftTheme]);

  // Formatting previews live too: the editor reads the draft while the modal is open and goes back to the saved values after.
  const { fontFamily, fontSize, lineSpacing } = draft ?? {};
  const setPreview = useFormattingStore((s) => s.setPreview);
  useEffect(() => {
    if (open && fontFamily && fontSize && lineSpacing) setPreview({ fontFamily, fontSize, lineSpacing });
    else setPreview(null);
  }, [open, fontFamily, fontSize, lineSpacing, setPreview]);

  function discard() {
    if (saved) applyTheme(saved.theme);
    setConfirm(null);
    setError(null);
    closeSettings();
  }

  function requestClose() {
    if (dirty) setConfirm("discard");
    else discard();
  }

  // Switching structure drops the progress of stages the new one lacks, so the writer confirms first.
  const lostStages =
    saved && changes?.project.storyTemplateId !== undefined ? lostBeatKeys(saved.storyTemplateId, changes.project.storyTemplateId).length : 0;

  function save(confirmed = false) {
    if (!changes || !dirty || !projectId) return;
    if (lostStages > 0 && !confirmed) {
      setConfirm("structure");
      return;
    }
    const hasProjectChanges = Object.keys(changes.project).length > 0;
    if (hasProjectChanges) {
      const parsed = updateProjectSettingsSchema.safeParse(changes.project);
      if (!parsed.success) {
        setTab("general");
        setError(parsed.error.issues[0]?.message ?? "Invalid settings.");
        return;
      }
    }
    setError(null);
    startTransition(async () => {
      const ok = { success: true as const, data: undefined };
      const [projectResult, themeResult] = await Promise.all([
        hasProjectChanges ? updateProjectSettings(projectId, changes.project) : ok,
        changes.theme !== undefined ? updateUserTheme(changes.theme) : ok,
      ]);
      if (themeResult.success && changes.theme !== undefined) {
        persistThemeCookie(changes.theme);
        markSaved({ theme: changes.theme });
      }
      const failed = [projectResult, themeResult].find((r) => !r.success);
      if (failed && !failed.success) {
        setError(failed.error);
        toast.error(failed.error);
        return;
      }
      closeSettings();
      toast.success("Settings saved");
    });
  }

  function onTabKeyDown(e: KeyboardEvent, index: number) {
    const count = SETTINGS_TABS.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % count;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    if (next === null) return;
    e.preventDefault();
    const id = SETTINGS_TABS[next].id;
    setTab(id);
    tabRefs.current[id]?.focus();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent className="h-[min(36rem,calc(100dvh-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 max-w-[calc(100%-1rem)] sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-base">Settings</DialogTitle>
            <DialogDescription className="sr-only">Change this project&apos;s details and how the app looks.</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 min-w-0 flex-col md:flex-row">
            <div
              role="tablist"
              aria-label="Settings"
              className="grid shrink-0 grid-cols-4 gap-0.5 border-b p-1.5 md:flex md:w-44 md:flex-col md:gap-1 md:border-r md:border-b-0 md:p-2"
            >
              {SETTINGS_TABS.map(({ id, label }, index) => (
                <button
                  key={id}
                  ref={(el) => {
                    tabRefs.current[id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`settings-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`settings-panel-${id}`}
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => setTab(id)}
                  onKeyDown={(e) => onTabKeyDown(e, index)}
                  className={cn(
                    "flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs outline-none md:justify-between md:gap-2 md:px-3 md:text-left md:text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                    tab === id && "bg-muted font-medium",
                  )}
                >
                  {label}
                  {dirtyTabs?.[id] && (
                    <>
                      <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                      <span className="sr-only">{id === "labels" ? "(changed)" : "(unsaved changes)"}</span>
                    </>
                  )}
                </button>
              ))}
            </div>

            <div
              role="tabpanel"
              id={`settings-panel-${tab}`}
              aria-labelledby={`settings-tab-${tab}`}
              tabIndex={0}
              className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 outline-none sm:p-4"
            >
              {PANELS[tab]()}
              {error && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t bg-muted/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
            <div className="flex min-w-0 items-center">
              {tab === "labels" && (
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {autoSaves ? "Labels save automatically." : "Labels save automatically. Save applies to your other changes."}
                </p>
              )}
              {RESETTABLE_TABS.includes(tab) && (
                <Button type="button" variant="ghost" onClick={() => setConfirm("reset")} disabled={pending}>
                  Reset to default
                </Button>
              )}
            </div>
            {autoSaves ? (
              <Button type="button" onClick={discard}>
                Done
              </Button>
            ) : (
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" onClick={requestClose} disabled={pending}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => save()} disabled={!dirty || pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm === "discard"} onOpenChange={(next) => !next && setConfirm(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>Your unsaved settings will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === "structure"} onOpenChange={(next) => !next && setConfirm(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Change story structure?</AlertDialogTitle>
            <AlertDialogDescription>{discardWarning(lostStages)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirm(null);
                save(true);
              }}
            >
              Change structure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === "reset"} onOpenChange={(next) => !next && setConfirm(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to default?</AlertDialogTitle>
            <AlertDialogDescription>
              This tab&apos;s settings go back to their defaults. Nothing is saved until you press Save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetDraftTab(tab);
                setConfirm(null);
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
