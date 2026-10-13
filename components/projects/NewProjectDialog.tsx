"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProject } from "@/actions/projects";
import { BookCover } from "@/components/projects/BookCover";
import { CoverColorPicker } from "@/components/projects/CoverColorPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COVER_DESIGNS,
  DEFAULT_COVER_COLOR,
  DEFAULT_COVER_DESIGN,
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/project-config";
import { useProjectStore } from "@/lib/stores/project-store";

type FormState = Required<CreateProjectInput>;

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  author: "",
  coverDesign: DEFAULT_COVER_DESIGN,
  coverColor: DEFAULT_COVER_COLOR,
};

export function NewProjectDialog() {
  const router = useRouter();
  const open = useProjectStore((s) => s.isNewProjectOpen);
  const setOpen = useProjectStore((s) => s.setNewProjectOpen);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setForm(EMPTY_FORM);
      setError(null);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = createProjectSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid project details.");
      return;
    }
    startTransition(async () => {
      const result = await createProject(form);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      handleOpenChange(false);
      toast.success("Project created");
      router.push(`/projects/${result.data.id}/manuscript`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Choose a cover, then name your book.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-[10rem_1fr]">
          <BookCover
            design={form.coverDesign}
            color={form.coverColor}
            title={form.title}
            subtitle={form.subtitle}
            author={form.author}
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Cover design</Label>
              <div className="flex flex-wrap gap-2">
                {COVER_DESIGNS.map((design) => (
                  <Button
                    key={design}
                    type="button"
                    size="sm"
                    variant={form.coverDesign === design ? "default" : "outline"}
                    onClick={() => update("coverDesign", design)}
                    className="capitalize"
                  >
                    {design}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cover color</Label>
              <CoverColorPicker value={form.coverColor} onChange={(color) => update("coverColor", color)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-title">Title</Label>
              <Input id="project-title" value={form.title} maxLength={120} onChange={(e) => update("title", e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-subtitle">Subtitle (optional)</Label>
              <Input id="project-subtitle" value={form.subtitle} maxLength={160} onChange={(e) => update("subtitle", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-author">Author</Label>
              <Input id="project-author" value={form.author} maxLength={80} onChange={(e) => update("author", e.target.value)} required />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create project"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
