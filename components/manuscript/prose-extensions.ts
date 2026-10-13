import StarterKit from "@tiptap/starter-kit";
import { SearchReplace } from "@/lib/search-replace-extension";
import { Proofread } from "@/lib/proofread-extension";
import { Spellcheck } from "@/lib/spellcheck-extension";

// Prose only: paragraphs, bold, italic and undo history.
export const PROSE_EXTENSIONS = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: false,
  }),
  SearchReplace,
  Spellcheck,
  Proofread,
];
