import { FileTextIcon, GitBranchIcon, MapPinIcon, MilestoneIcon, StickyNoteIcon, UserIcon, type LucideIcon } from "lucide-react";
import type { TrashKind } from "@/types/trash";

/** The icon for each kind of item shown in the Trash and Archive lists. */
export const KIND_ICON: Record<TrashKind, LucideIcon> = {
  node: FileTextIcon,
  character: UserIcon,
  place: MapPinIcon,
  characterNote: StickyNoteIcon,
  placeNote: StickyNoteIcon,
  sceneNote: StickyNoteIcon,
  plotPoint: MilestoneIcon,
  plotLine: GitBranchIcon,
};
