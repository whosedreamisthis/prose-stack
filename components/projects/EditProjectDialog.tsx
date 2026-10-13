"use client";

import { useState, useTransition } from "react";
import type { CSSProperties, FormEvent } from "react";
import { toast } from "sonner";
import { updateProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COVER_COLORS, updateProjectSchema } from "@/lib/project-config";
import { cn } from "@/lib/utils";
import type { ProjectSummary } from "@/types/projects";

interface EditProjectDialogProps {
  project: ProjectSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toForm(project: ProjectSummary) {
  return { title: project.title, subtitle: project.subtitle ?? "", author: project.author, coverColor: project.coverColor };
}

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
  const [form, setForm] = useState(() => toForm(project));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(toForm(project));
      setError(null);
    }
    onOpenChange(next);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = updateProjectSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid project details.");
      return;
    }
    startTransition(async () => {
      const result = await updateProject(project.id, form);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      onOpenChange(false);
      toast.success("Project updated");
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit book</DialogTitle>
          <DialogDescription>Change the name, subtitle, author or color shown on the cover.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-title-${project.id}`}>Title</Label>
            <Input
              id={`edit-title-${project.id}`}
              value={form.title}
              maxLength={120}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-subtitle-${project.id}`}>Subtitle (optional)</Label>
            <Input
              id={`edit-subtitle-${project.id}`}
              value={form.subtitle}
              maxLength={160}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-author-${project.id}`}>Author</Label>
            <Input
              id={`edit-author-${project.id}`}
              value={form.author}
              maxLength={80}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cover color</Label>
            <div className="flex flex-wrap items-center gap-2">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cover color ${color}`}
                  aria-pressed={form.coverColor === color}
                  onClick={() => setForm((f) => ({ ...f, coverColor: color }))}
                  className={cn(
                    "size-7 rounded-full border border-border bg-(--swatch) ring-offset-2 ring-offset-background",
                    form.coverColor === color && "ring-2 ring-ring",
                  )}
                  style={{ "--swatch": color } as CSSProperties}
                />
              ))}
              <Input
                type="color"
                aria-label="Custom cover color"
                value={form.coverColor}
                onChange={(e) => setForm((f) => ({ ...f, coverColor: e.target.value }))}
                className="h-7 w-10 p-0.5"
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
