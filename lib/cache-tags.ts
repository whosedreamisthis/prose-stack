/**
 * Cache tags for the `use cache` reads in lib/. A read is tagged with the narrowest thing it depends on, and the Server
 * Action that changes that thing calls `updateTag` with the same tag. Every project read also carries `project`, so
 * deleting or editing a project drops everything cached for it.
 */
export const cacheTags = {
  project: (projectId: string) => `project:${projectId}`,
  characters: (projectId: string) => `characters:${projectId}`,
  character: (characterId: string) => `character:${characterId}`,
  characterNotes: (characterId: string) => `character-notes:${characterId}`,
  manuscript: (projectId: string) => `manuscript:${projectId}`,
  scene: (nodeId: string) => `scene:${nodeId}`,
  stats: (projectId: string) => `stats:${projectId}`,
};
