/**
 * Cache tags for the `use cache` reads in lib/. A read is tagged with the narrowest thing it depends on, and the Server
 * Action that changes that thing calls `updateTag` with the same tag. Every project read also carries `project`, so
 * deleting or editing a project drops everything cached for it.
 */
export const cacheTags = {
  /** Settings stored on the user rather than a project: today, the theme. */
  user: (userId: string) => `user:${userId}`,
  /** A user's project list: the navbar switcher and the Projects page. */
  projects: (userId: string) => `projects:${userId}`,
  project: (projectId: string) => `project:${projectId}`,
  characters: (projectId: string) => `characters:${projectId}`,
  character: (characterId: string) => `character:${characterId}`,
  characterNotes: (characterId: string) => `character-notes:${characterId}`,
  places: (projectId: string) => `places:${projectId}`,
  place: (placeId: string) => `place:${placeId}`,
  placeNotes: (placeId: string) => `place-notes:${placeId}`,
  /** The project's Trash and Archive pages and their counts in the sidebar. Every trash, archive, restore and delete expires these. */
  trash: (projectId: string) => `trash:${projectId}`,
  archive: (projectId: string) => `archive:${projectId}`,
  manuscript: (projectId: string) => `manuscript:${projectId}`,
  scene: (nodeId: string) => `scene:${nodeId}`,
  sceneNotes: (nodeId: string) => `scene-notes:${nodeId}`,
  /** The notes of the whole manuscript (the project itself). */
  projectNotes: (projectId: string) => `project-notes:${projectId}`,
  stats: (projectId: string) => `stats:${projectId}`,
  /** The project's plot lines and points: the plot grid, the Plots sidebar section and each scene's Plots tab. */
  plot: (projectId: string) => `plot:${projectId}`,
};
