import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { BookView } from "@/components/book/BookView";
import { EditorColumn } from "@/components/layout/EditorColumn";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { getCurrentUser } from "@/lib/auth";
import { buildBookItems } from "@/lib/book/content";
import { fontCss, toFormatting } from "@/lib/formatting";
import { getBookNodes } from "@/lib/manuscript";
import { getProject } from "@/lib/projects";

type PageParams = PageProps<"/projects/[projectId]/manuscript/book">;

async function Book({ params, searchParams }: { params: PageParams["params"]; searchParams: PageParams["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [project, nodes] = await Promise.all([getProject(user.id, projectId), getBookNodes(user.id, projectId)]);
  if (!project) notFound();
  const formatting = toFormatting(project);
  const requested = Number(Array.isArray(query.page) ? query.page[0] : query.page);

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      <EditorColumn stats="">
        <BookView
          meta={{ title: project.title, subtitle: project.subtitle ?? "", author: project.author }}
          items={buildBookItems(nodes)}
          formatting={formatting}
          fontCss={fontCss(formatting.fontFamily)}
          initialPage={Number.isInteger(requested) && requested > 0 ? requested : 1}
        />
      </EditorColumn>
    </>
  );
}

export default function BookPage(props: PageParams) {
  return (
    <Suspense fallback={null}>
      <Book params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
