"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  addStarterFolders,
  archiveResearchFolder,
  archiveResearchItem,
  createResearchFolder,
  createResearchItem,
  moveResearchFolder,
  moveResearchItem,
  renameResearchFolder,
  trashResearchFolder,
  trashResearchItem,
  updateResearchItem,
} from "@/actions/research";
import { DEFAULT_FOLDER_NAME, DEFAULT_LINK_TITLE, DEFAULT_NOTE_TITLE, researchTitleSchema } from "@/lib/research-config";
import { childFolders, folderItems, folderSubtree, reorder } from "@/lib/research-tree";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";
import { useResearchStore } from "@/lib/stores/research-store";
import { useTreeStore } from "@/lib/stores/tree-store";
import type { ResearchItemType, ResearchLibrary } from "@/types/research";

type Change =
  | { kind: "renameFolder"; id: string; name: string }
  | { kind: "renameItem"; id: string; title: string }
  | { kind: "addFolder"; id: string; parentId: string | null }
  | {
      kind: "addItem";
      id: string;
      folderId: string | null;
      type: ResearchItemType;
    }
  | { kind: "moveFolder"; id: string; parentId: string | null; index: number }
  | { kind: "moveItem"; id: string; folderId: string | null; index: number }
  | { kind: "hideFolder"; id: string }
  | { kind: "hideItem"; id: string };

/** Applies one change to the library, as the server will: what the tree shows before the server answers. */
function apply(library: ResearchLibrary, change: Change): ResearchLibrary {
  const { folders, items } = library;
  switch (change.kind) {
    case "renameFolder":
      return {
        folders: folders.map((f) => (f.id === change.id ? { ...f, name: change.name } : f)),
        items,
      };
    case "renameItem":
      return {
        folders,
        items: items.map((i) => (i.id === change.id ? { ...i, title: change.title } : i)),
      };
    case "addFolder":
      return {
        folders: [
          ...folders,
          {
            id: change.id,
            parentId: change.parentId,
            name: DEFAULT_FOLDER_NAME,
            position: childFolders(folders, change.parentId).length,
          },
        ],
        items,
      };
    case "addItem": {
      const title = change.type === "NOTE" ? DEFAULT_NOTE_TITLE : DEFAULT_LINK_TITLE;
      const position = folderItems(items, change.folderId).length;
      return {
        folders,
        items: [
          ...items,
          {
            id: change.id,
            folderId: change.folderId,
            type: change.type,
            title,
            position,
          },
        ],
      };
    }
    case "moveFolder": {
      const positions = new Map(reorder(childFolders(folders, change.parentId), change.id, change.index).map((p) => [p.id, p.position]));
      return {
        folders: folders.map((f) =>
          f.id === change.id
            ? {
                ...f,
                parentId: change.parentId,
                position: positions.get(f.id)!,
              }
            : positions.has(f.id)
              ? { ...f, position: positions.get(f.id)! }
              : f,
        ),
        items,
      };
    }
    case "moveItem": {
      const positions = new Map(reorder(folderItems(items, change.folderId), change.id, change.index).map((p) => [p.id, p.position]));
      return {
        folders,
        items: items.map((i) =>
          i.id === change.id
            ? {
                ...i,
                folderId: change.folderId,
                position: positions.get(i.id)!,
              }
            : positions.has(i.id)
              ? { ...i, position: positions.get(i.id)! }
              : i,
        ),
      };
    }
    case "hideFolder": {
      const gone = new Set(folderSubtree(folders, change.id));
      return {
        folders: folders.filter((f) => !gone.has(f.id)),
        items: items.filter((i) => !i.folderId || !gone.has(i.folderId)),
      };
    }
    case "hideItem":
      return { folders, items: items.filter((i) => i.id !== change.id) };
  }
}

type Result = { success: true } | { success: false; error: string };

/** The Research tree's state and actions: every change shows at once and rolls back if the server refuses it. */
export function useResearchTree(projectId: string, serverLibrary: ResearchLibrary) {
  const router = useRouter();
  const pathname = usePathname();
  const researchPath = `/projects/${projectId}/research`;
  const onResearchPage = pathname === researchPath;
  const requested = useSearchParams().get("item");
  // The sidebar shows on every page, so an item is only "open" while the research page is.
  const openId = onResearchPage ? requested : null;
  const [library, applyChange] = useOptimistic(serverLibrary, apply);
  const [, startTransition] = useTransition();
  const toggle = useTreeStore((s) => s.toggle);
  const setPending = usePendingNavStore((s) => s.setPending);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const setSectionOpen = useLayoutStore((s) => s.setSectionOpen);

  /** Shows the change, runs the action, and reports a refusal (the optimistic change then rolls back on its own). */
  const run = (change: Change | null, action: () => Promise<Result>, done?: string) =>
    startTransition(async () => {
      if (change) applyChange(change);
      const result = await action();
      if (!result.success) toast.error(result.error);
      else if (done) toast.success(done);
    });

  const openItem = (id: string) => {
    if (!onResearchPage) setPending("section", "research");
    if (id !== openId) setPending("item", id);
    setDrawerOpen(false);
    router.push(`${researchPath}?item=${id}`);
  };

  return {
    library,
    openId,
    openItem,
    addFolder(parentId: string | null) {
      const id = crypto.randomUUID();
      setSectionOpen("research", true);
      if (parentId) toggle(`research:${parentId}`, false);
      run({ kind: "addFolder", id, parentId }, () => createResearchFolder({ projectId, parentId, id }));
      return id;
    },
    addItem(folderId: string | null, type: ResearchItemType) {
      const id = crypto.randomUUID();
      setSectionOpen("research", true);
      if (folderId) toggle(`research:${folderId}`, false);
      // Selected and in rename mode at once, before the server answers; the page follows once it has the item.
      useResearchStore.getState().setRenamingId(id);
      if (!onResearchPage) setPending("section", "research");
      setPending("item", id);
      startTransition(async () => {
        applyChange({ kind: "addItem", id, folderId, type });
        const result = await createResearchItem({
          projectId,
          folderId,
          type,
          id,
        });
        if (!result.success) {
          setPending("item", null);
          toast.error(result.error);
        } else openItem(id);
      });
    },
    renameFolder(id: string, value: string | null, current: string) {
      const parsed = researchTitleSchema.safeParse(value ?? "");
      if (value === null || !parsed.success || parsed.data === current) {
        if (value !== null && !parsed.success) toast.error(parsed.error.issues[0]?.message ?? "Invalid name.");
        return;
      }
      run({ kind: "renameFolder", id, name: parsed.data }, () => renameResearchFolder({ projectId, folderId: id, name: parsed.data }));
    },
    renameItem(id: string, value: string | null, current: string) {
      const parsed = researchTitleSchema.safeParse(value ?? "");
      if (value === null || !parsed.success || parsed.data === current) {
        if (value !== null && !parsed.success) toast.error(parsed.error.issues[0]?.message ?? "Invalid name.");
        return;
      }
      run({ kind: "renameItem", id, title: parsed.data }, () =>
        updateResearchItem({
          projectId,
          itemId: id,
          changes: { title: parsed.data },
        }),
      );
    },
    moveFolder(id: string, parentId: string | null, index: number) {
      if (parentId) toggle(`research:${parentId}`, false);
      run({ kind: "moveFolder", id, parentId, index }, () => moveResearchFolder({ projectId, folderId: id, parentId, index }));
    },
    moveItem(id: string, folderId: string | null, index: number) {
      if (folderId) toggle(`research:${folderId}`, false);
      run({ kind: "moveItem", id, folderId, index }, () => moveResearchItem({ projectId, itemId: id, folderId, index }));
    },
    hideFolder(id: string, how: "trash" | "archive") {
      const action = how === "trash" ? trashResearchFolder : archiveResearchFolder;
      const closesOpen =
        openId !== null &&
        library.items.some((i) => i.id === openId && i.folderId && folderSubtree(library.folders, id).includes(i.folderId));
      run(
        { kind: "hideFolder", id },
        () => action({ projectId, folderId: id }),
        how === "trash" ? "Moved to the trash." : "Folder archived.",
      );
      if (closesOpen) router.replace(researchPath);
    },
    hideItem(id: string, how: "trash" | "archive") {
      const action = how === "trash" ? trashResearchItem : archiveResearchItem;
      run({ kind: "hideItem", id }, () => action({ projectId, itemId: id }), how === "trash" ? "Moved to the trash." : "Item archived.");
      if (id === openId) router.replace(researchPath);
    },
    addStarterFolders() {
      setSectionOpen("research", true);
      run(null, () => addStarterFolders({ projectId }));
    },
  };
}

export type ResearchTreeApi = ReturnType<typeof useResearchTree>;
