"use client";

import { useId, useRef, type ComponentType, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { ChevronDownIcon, ChevronRightIcon, FileTextIcon, GripVerticalIcon } from "lucide-react";
import { LabelBar } from "@/components/labels/LabelChip";
import { TitleEditor } from "@/components/manuscript/TitleEditor";
import { NODE_ICON, TYPE_LABEL, iconClass, treeRowClass } from "@/components/manuscript/tree-config";
import { cn } from "@/lib/utils";
import type { LabelItem } from "@/types/labels";
import type { ManuscriptNodeSummary } from "@/types/manuscript";
import { Hint, ROW_HINT_DELAY_MS, ROW_HINT_WRAPPER } from "@/components/layout/Hint";
import { SELECTED_ROW } from "@/components/layout/sidebar-styles";

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/** The item's own icon; on hover or focus it swaps to a chevron showing what a click does (down = collapse, right = expand). */
export function ToggleIcon({
  icon: Icon,
  expanded,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  expanded: boolean;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
}) {
  const Chevron = expanded ? ChevronDownIcon : ChevronRightIcon;
  return (
    <span className="relative size-4 shrink-0" aria-hidden onClick={onClick}>
      <Icon className={cn(iconClass, "absolute inset-0 group-hover/row:opacity-0 group-focus-visible/row:opacity-0")} />
      <Chevron
        className={cn(iconClass, "absolute inset-0 opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100")}
      />
    </span>
  );
}

interface TreeRowProps {
  node: ManuscriptNodeSummary;
  /** Where a scene row links to. Unused for parts and chapters. */
  href: string;
  /** Whether this scene is the open one. */
  active: boolean;
  collapsed: boolean;
  editing: boolean;
  /** Whether the dragged item would land here (shows a ring). */
  dropActive: boolean;
  /** The label on this part, chapter or scene, shown as a color bar at the right of the row. */
  label: LabelItem | null;
  /** The row's "…" menu. */
  menu: ReactNode;
  onToggle: () => void;
  onStartRename: () => void;
  onFinishRename: (value: string | null, refocus: boolean) => void;
  /** A scene's link was clicked. */
  onOpen: () => void;
  /** A part or chapter row (not its icon) was clicked: open its book view. */
  onOpenNode?: () => void;
  /** The rows nested under a part or chapter. */
  children?: ReactNode;
}

/**
 * One part, chapter or scene: the treeitem row (grip handle, icon, title, "…" menu) and, for an expanded parent, its
 * nested group. The row's controls live inside the treeitem, which is named by `aria-label` so they are not read as
 * part of its name; the group is tied to its treeitem with `aria-owns`.
 */
export function TreeRow({
  node,
  href,
  active,
  collapsed,
  editing,
  dropActive,
  label,
  menu,
  onToggle,
  onStartRename,
  onFinishRename,
  onOpen,
  onOpenNode,
  children,
}: TreeRowProps) {
  const router = useRouter();
  const isScene = node.type === "SCENE";
  const groupId = useId();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useSortable({
    id: node.id,
    disabled: editing,
  });
  const showChildren = !isScene && !collapsed;
  const opensNode = node.type !== "SCENE" && !!onOpenNode;
  const leadIcon = isScene ? (
    <FileTextIcon className={iconClass} aria-hidden />
  ) : (
    <ToggleIcon
      icon={NODE_ICON[node.type]}
      expanded={!collapsed}
      // On a part or chapter the icon still expands and collapses; the rest of the row opens it.
      onClick={
        opensNode
          ? (e) => {
              e.stopPropagation();
              onToggle();
            }
          : undefined
      }
    />
  );

  return (
    <li role="none">
      <Hint label={node.title} side="right" delay={ROW_HINT_DELAY_MS} wrapperClassName={ROW_HINT_WRAPPER}>
      <div
        ref={setNodeRef}
        role="treeitem"
        tabIndex={0}
        aria-label={node.title}
        aria-selected={active}
        aria-current={active ? "page" : undefined}
        aria-expanded={isScene ? undefined : !collapsed}
        aria-owns={showChildren ? groupId : undefined}
        data-node-id={node.id}
        data-kind={isScene ? "scene" : "parent"}
        // A scene opens when its row is clicked anywhere (its link covers only the title); a parent toggles.
        onClick={(e) => {
          if (opensNode) onOpenNode();
          else if (!isScene) onToggle();
          else if (e.target === e.currentTarget) linkRef.current?.click();
        }}
        onDoubleClick={onStartRename}
        className={cn(
          treeRowClass,
          isScene ? active && SELECTED_ROW : cn("cursor-pointer font-medium select-none", active && SELECTED_ROW),
          isDragging && "opacity-40",
          dropActive && "ring-2 ring-primary",
        )}
      >
        {!editing && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={`Reorder ${node.title}`}
            {...attributes}
            {...listeners}
            onClick={stop}
            onDoubleClick={stop}
            className="absolute top-1/2 left-0.5 z-10 grid size-5 [@media(pointer:coarse)]:size-8 -translate-y-1/2 cursor-grab touch-none place-items-center rounded text-muted-foreground opacity-0 outline-none group-focus-visible/item:opacity-100 group-has-[:focus-visible]/item:opacity-100 group-hover/item:opacity-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          >
            <GripVerticalIcon className="size-3.5" aria-hidden />
          </button>
        )}
        {editing ? (
          <>
            {leadIcon}
            <TitleEditor initial={node.title} label={`Rename ${TYPE_LABEL[node.type]}`} onDone={onFinishRename} />
          </>
        ) : isScene ? (
          <Link
            ref={linkRef}
            href={href}
            tabIndex={-1}
            // Fetch the scene as the pointer arrives, so the click is usually served from the browser.
            onPointerEnter={() => router.prefetch(href)}
            onFocus={() => router.prefetch(href)}
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-center gap-1.5 outline-none"
          >
            {leadIcon}
            <span className="truncate">{node.title}</span>
          </Link>
        ) : (
          <>
            {leadIcon}
            <span className="truncate">{node.title}</span>
          </>
        )}
        {!editing && label && <LabelBar label={label} className="absolute top-1/2 -right-2 -translate-y-1/2" />}
        {!editing && menu}
      </div>
      </Hint>
      {showChildren && (
        <ul id={groupId} role="group" className="ml-3 border-l pl-1">
          {children}
        </ul>
      )}
    </li>
  );
}
