"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveNodeSummary } from "@/actions/manuscript";
import { Textarea } from "@/components/ui/textarea";
import { MAX_SUMMARY_LENGTH } from "@/lib/manuscript-config";

/** Show the character count once the writer is within this many characters of the limit. */
const COUNTER_FROM = MAX_SUMMARY_LENGTH - 200;

/** The summary of a scene, chapter or part. It saves when the field loses focus. Remount it (key by node) when the node changes. */
export function SummaryTab({
  projectId,
  nodeId,
  initialSummary,
}: {
  projectId: string;
  nodeId: string;
  initialSummary: string;
}) {
  const [value, setValue] = useState(initialSummary);
  const saved = useRef(initialSummary);
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (value === saved.current) return;
    const summary = value;
    startTransition(async () => {
      const result = await saveNodeSummary({ projectId, nodeId, summary });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      saved.current = summary;
    });
  };

  return (
    <div className="flex flex-col gap-1.5 pt-3">
      <Textarea
        aria-label="Summary"
        value={value}
        maxLength={MAX_SUMMARY_LENGTH}
        placeholder="What happens here, in a few sentences."
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        className="min-h-40"
      />
      <p role="status" aria-live="polite" className="h-4 text-xs text-muted-foreground">
        {pending ? "Saving…" : value.length >= COUNTER_FROM ? `${value.length} / ${MAX_SUMMARY_LENGTH}` : ""}
      </p>
    </div>
  );
}
