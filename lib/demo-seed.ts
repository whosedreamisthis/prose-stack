import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { STARTER_FOLDERS } from "@/lib/research-config";
import { countDocWords, type DocNode } from "@/lib/manuscript-text";

type NodeType = "PART" | "CHAPTER" | "SCENE";

interface SeedNode {
  id: string;
  parentId: string | null;
  type: NodeType;
  title: string;
  position: number;
  paragraphs?: string[];
  /** The name of the demo label on it, if any. */
  label?: DemoLabel;
}

const DEMO_LABELS = [
  { name: "Draft", color: "#ca8a04" },
  { name: "Revise", color: "#dc2626" },
  { name: "Final", color: "#16a34a" },
] as const;
type DemoLabel = (typeof DEMO_LABELS)[number]["name"];

const DEMO_PROJECT = {
  title: "The Lighthouse Keeper",
  subtitle: "A sample novel to explore",
  author: "Demo Writer",
  coverDesign: "classic",
  coverColor: "#1e3a5f",
} as const;

function docFromParagraphs(paragraphs: string[]): DocNode {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  };
}

const id = () => randomUUID();

/** The demo manuscript: two parts, three chapters, five scenes. Parents come before their children. */
function manuscriptNodes(): SeedNode[] {
  const [partOne, partTwo, ch1, ch2, ch3] = [id(), id(), id(), id(), id()];
  return [
    {
      id: partOne,
      parentId: null,
      type: "PART",
      title: "Part One: The Storm",
      position: 0,
      label: "Draft",
    },
    {
      id: partTwo,
      parentId: null,
      type: "PART",
      title: "Part Two: The Light",
      position: 1,
    },
    {
      id: ch1,
      parentId: partOne,
      type: "CHAPTER",
      title: "Chapter 1",
      position: 0,
      label: "Final",
    },
    {
      id: ch2,
      parentId: partOne,
      type: "CHAPTER",
      title: "Chapter 2",
      position: 1,
    },
    {
      id: ch3,
      parentId: partTwo,
      type: "CHAPTER",
      title: "Chapter 3",
      position: 0,
    },
    {
      id: id(),
      parentId: ch1,
      type: "SCENE",
      title: "The last ferry",
      position: 0,
      label: "Final",
      paragraphs: [
        "The last ferry of the season pulled away from the pier, and Mara Quill stood on the slick boards with one suitcase and a letter she had read so often the folds had gone soft.",
        "Ahead of her, across a mile of grey water, the lighthouse waited. It looked smaller than it had in the photograph, and a good deal angrier.",
      ],
    },
    {
      id: id(),
      parentId: ch1,
      type: "SCENE",
      title: "A key left under the lamp",
      position: 1,
      label: "Revise",
      paragraphs: [
        "Inside, everything smelled of salt and cold iron. Someone had left a key on the lowest step, tied with blue string, and beside it a note in a hand she almost recognised: Don't let the light go out.",
        "She laughed, because it was a ridiculous thing to say to a stranger, and then she did not laugh, because upstairs a door closed on its own.",
      ],
    },
    {
      id: id(),
      parentId: ch2,
      type: "SCENE",
      title: "Edric Vane comes to dinner",
      position: 0,
      paragraphs: [
        "Edric Vane arrived at dusk with a basket of bread and a harbour master's grudge. He had known the old keeper for thirty years and did not believe in successors.",
        '"You\'ll want to learn the weather before you learn the lamp," he said, and sat down at her table as if it were still his.',
      ],
    },
    {
      id: id(),
      parentId: ch2,
      type: "SCENE",
      title: "The first night",
      position: 1,
      label: "Draft",
      paragraphs: [
        "At midnight the wind found the one loose shutter and played it like a drum. Mara climbed the spiral stair with a lantern, counting steps to keep her mind quiet. One hundred and twelve.",
        "At the top, the great lens turned slowly on its own, though no one had wound it.",
      ],
    },
    {
      id: id(),
      parentId: ch3,
      type: "SCENE",
      title: "What the lamp remembers",
      position: 0,
      paragraphs: [
        "By morning she understood the lamp was not broken, only patient. It had been keeping a record of every ship it had guided home, and of the one it had not.",
        "Mara opened the logbook to a fresh page and began, at last, to write her own name in it.",
      ],
    },
  ];
}

const CHARACTERS = [
  {
    role: "MAIN",
    name: "Mara Quill",
    age: "34",
    location: "The lighthouse",
    roleInStory: "Protagonist, the new keeper",
    goal: "Find out what happened to the previous keeper, and keep the light burning.",
    physicalDescription: "Short, wiry, with ink-stained fingers and a coat two sizes too big.",
    personality: "Dry-humoured and stubborn; hides worry behind practicality.",
    occupation: "Former archivist",
    habits: "Counts stairs. Talks to the lamp when she thinks no one is listening.",
    background: "Raised inland, never saw the sea until she was twenty. Inherited the post from a great-uncle she never met.",
    internalConflicts: "Wants to belong somewhere, but expects to be sent away.",
    externalConflicts: "The harbour town resents an outsider taking the post.",
    notes: [
      "Her voice should stay wry even in the scary scenes.",
      "Idea: she finds her great-uncle's handwriting in the margins of the logbook.",
    ],
  },
  {
    role: "MAIN",
    name: "Edric Vane",
    age: "61",
    location: "The harbour",
    roleInStory: "Antagonist turned ally, the harbour master",
    goal: "Keep the lighthouse the way it was, and keep his own secret buried.",
    physicalDescription: "Broad, weathered, with a white beard trimmed square.",
    personality: "Gruff and proud; generous in private, never in public.",
    occupation: "Harbour master",
    habits: "Brings bread to people he claims to dislike.",
    background: "Served under the old keeper for thirty years.",
    internalConflicts: "Guilt over the night the last ship was lost.",
    externalConflicts: "Mara's questions threaten the story he has told the town.",
    notes: ["He should be wrong about Mara early, and say so late."],
  },
  {
    role: "SUPPORTING",
    name: "Pip Marrow",
    age: "12",
    location: "The harbour",
    roleInStory: "Ferry boy and Mara's first friend",
    goal: "Get a ride on the lighthouse lamp's catwalk.",
    physicalDescription: "Gap-toothed, always in a borrowed jumper.",
    personality: "Fearless and talkative.",
    occupation: "Ferry hand",
    habits: "Whistles hymns off-key.",
    background: "Orphaned; lives above the net store.",
    internalConflicts: "",
    externalConflicts: "",
    notes: [],
  },
  {
    role: "SUPPORTING",
    name: "The Old Keeper",
    age: "",
    location: "Unknown",
    roleInStory: "Absent presence; his notes guide the story",
    goal: "",
    physicalDescription: "",
    personality: "Cryptic and kind, as remembered by others.",
    occupation: "Lighthouse keeper (retired, missing)",
    habits: "",
    background: "",
    internalConflicts: "",
    externalConflicts: "",
    notes: [],
  },
] as const;

const PLACES = [
  {
    name: "The Lighthouse",
    location: "A rock a mile off the coast",
    roleInStory: "Home and central mystery",
    season: "Late autumn",
    uniqueFeatures: "A great lens that turns on its own; a spiral stair of one hundred and twelve steps.",
    description: "A squat grey tower, older than the harbour town, with a keeper's cottage bolted to its side.",
    sights: "Salt-bleached stone, the slow sweep of the beam, a logbook open on the desk.",
    sounds: "Wind in the shutters, the lens ticking round, gulls.",
    smell: "Salt and cold iron.",
    notes: ["It should feel angrier than it looks in the photograph.", "The lens turning by itself is the first sign something is wrong."],
    characters: ["Mara Quill", "The Old Keeper"],
  },
  {
    name: "Harbour Town",
    location: "The mainland shore",
    roleInStory: "Where the resentment lives",
    season: "Late autumn",
    uniqueFeatures: "A net store with rooms above it; the harbour master's office with a view of the light.",
    description: "A huddle of slate roofs around a stone pier, closing up for the winter.",
    sights: "Hauled-out boats, drying nets, lamplit windows at four o'clock.",
    sounds: "Rope on cleats, the last ferry's horn.",
    smell: "",
    notes: [],
    characters: ["Edric Vane", "Pip Marrow"],
  },
] as const;

/** Notes for the first two demo scenes, as [title, content]. */
const SCENE_NOTES: readonly (readonly [string, string])[][] = [
  [["Mood", "Open quiet and a little uneasy; let the reader notice the details before the narrator does."]],
  [["To check", "Does the timeline match chapter 1? Keep the weather consistent."]],
];

const PLOT_LINES = ["Main plot", "The keeper's secret", "Mara and Edric"] as const;

/** Plot points as [plot line, scene, title, text]; the scene is an index into the demo scenes in manuscript order, so none repeats a line. */
const PLOT_POINTS: readonly (readonly [line: number, scene: number, title: string, text: string, label?: DemoLabel])[] = [
  [0, 0, "Mara arrives", "The last ferry leaves her at the lighthouse with one suitcase and a letter.", "Final"],
  [0, 1, "The first warning", "A key and a note: don't let the light go out.", "Revise"],
  [0, 3, "Climbing the stair", "Her first night. The loose shutter, the hundred and twelve steps, the lens turning by itself."],
  [0, 4, "She takes the post", "Mara writes her own name in the logbook."],
  [1, 1, "A familiar hand", "The note looks like handwriting she should know."],
  [1, 3, "The lens turns itself", "No one wound it. Someone, or something, is keeping the light.", "Draft"],
  [1, 4, "What the lamp remembers", "The logbook records every ship guided home, and the one that was not."],
  [2, 2, "A grudging dinner", "Edric tests her, and sits down at her table as if it were still his."],
  [2, 4, "A truce", "He admits he was wrong about her, and says he has a secret of his own."],
];

/** Notes on the first part and the first chapter, as [title, content]; they are kept like scene notes. */
const PART_NOTES: readonly (readonly [string, string])[] = [["Arc", "The storm part is arrival and unease. By its end Mara should have decided to stay."]];
const CHAPTER_NOTES: readonly (readonly [string, string])[] = [["Pacing", "Keep chapter 1 short and sensory; save the backstory for chapter 2."]];

/** Notes on the whole manuscript, as [title, content]. */
const BOOK_NOTES: readonly (readonly [string, string])[] = [
  ["Themes", "Inheritance, belonging, and keeping a promise to someone you never met."],
  ["Tone", "Wry and atmospheric. A ghost story that is mostly about work."],
];

/** The demo's research: worldbuilding starter folders with a few notes and a link, two of them linked to the story. */
async function seedResearch(tx: Prisma.TransactionClient, projectId: string, links: { characterId?: string; placeId?: string }) {
  const folders = STARTER_FOLDERS.map((name, position) => ({ id: id(), projectId, parentId: null, name, position }));
  await tx.researchFolder.createMany({ data: folders });
  const folder = (name: (typeof STARTER_FOLDERS)[number]) => folders.find((f) => f.name === name)!.id;
  const note = (paragraphs: string[]) => docFromParagraphs(paragraphs) as Prisma.InputJsonValue;
  await tx.researchItem.createMany({
    data: [
      {
        projectId,
        folderId: folder("History"),
        type: "NOTE",
        position: 0,
        title: "Lighthouse keepers",
        content: note([
          "Keepers worked in pairs or with family, trimming wicks and winding the clockwork every few hours through the night.",
          "Most lights were automated by the 1990s; the last keepers left with them.",
        ]),
        characterId: links.characterId,
      },
      {
        projectId,
        folderId: folder("Magic & Technology"),
        type: "NOTE",
        position: 0,
        title: "The Fresnel lens",
        content: note(["Rings of prisms bend the lamp's light into one beam that can be seen for twenty miles.", "A first-order lens stands taller than a person."]),
        placeId: links.placeId,
      },
      {
        projectId,
        folderId: folder("Magic & Technology"),
        type: "LINK",
        position: 1,
        title: "How a lighthouse lens works",
        url: "https://en.wikipedia.org/wiki/Fresnel_lens",
        description: "Background for the lamp room scenes.",
      },
      {
        projectId,
        folderId: null,
        type: "NOTE",
        position: 0,
        title: "Shipwreck legends",
        content: note(["Collect local stories of wrecks on the reef: who was saved, who wasn't, and who was blamed."]),
      },
    ],
  });
}

/**
 * Seeds the demo user's one project: labels applied to some of the outline and plot points, manuscript (with notes on the book, a part, a chapter and scenes), characters and places (each with notes), the places linked to their characters, and plot
 * lines with points on several scenes, and a research library (the starter folders, notes and a link, two of them linked to the story). Runs inside the
 * caller's transaction; uses a handful of bulk inserts, not a query per row.
 */
export async function seedDemoProject(tx: Prisma.TransactionClient, userId: string) {
  const project = await tx.project.create({
    data: { userId, ...DEMO_PROJECT },
    select: { id: true },
  });

  // The labels come first: the outline and the plot points refer to them.
  const labels = DEMO_LABELS.map((l) => ({ id: id(), projectId: project.id, name: l.name, nameKey: l.name.toLowerCase(), color: l.color }));
  await tx.label.createMany({ data: labels });
  const labelId = (name?: DemoLabel) => labels.find((l) => l.name === name)?.id;

  const nodes = manuscriptNodes();
  await tx.manuscriptNode.createMany({
    data: nodes.map((node) => {
      if (node.type !== "SCENE")
        return {
          id: node.id,
          projectId: project.id,
          parentId: node.parentId,
          type: node.type,
          title: node.title,
          position: node.position,
          labelId: labelId(node.label),
        };
      const content = docFromParagraphs(node.paragraphs ?? []);
      return {
        id: node.id,
        projectId: project.id,
        parentId: node.parentId,
        type: node.type,
        title: node.title,
        position: node.position,
        content: content as Prisma.InputJsonValue,
        wordCount: countDocWords(content),
        labelId: labelId(node.label),
      };
    }),
  });

  // A couple of notes on the first scenes, so the scene sidebar has something to show.
  const sceneNotes = nodes
    .filter((n) => n.type === "SCENE")
    .slice(0, 2)
    .flatMap((n, i) => SCENE_NOTES[i].map(([title, content]) => ({ sceneId: n.id, title, content })));
  // Notes on the first part and chapter (kept like scene notes), and on the whole manuscript.
  const firstPart = nodes.find((n) => n.type === "PART");
  const firstChapter = nodes.find((n) => n.type === "CHAPTER");
  const outlineNotes = [
    ...(firstPart ? PART_NOTES.map(([title, content]) => ({ sceneId: firstPart.id, title, content })) : []),
    ...(firstChapter ? CHAPTER_NOTES.map(([title, content]) => ({ sceneId: firstChapter.id, title, content })) : []),
  ];
  await tx.sceneNote.createMany({ data: [...sceneNotes, ...outlineNotes] });
  await tx.projectNote.createMany({ data: BOOK_NOTES.map(([title, content]) => ({ projectId: project.id, title, content })) });

  const scenes = nodes.filter((n) => n.type === "SCENE");
  const plotLines = PLOT_LINES.map((name, position) => ({ id: id(), projectId: project.id, name, position }));
  await tx.plotLine.createMany({ data: plotLines });
  await tx.plotPoint.createMany({
    data: PLOT_POINTS.map(([line, scene, title, text, label]) => ({
      plotLineId: plotLines[line].id,
      sceneId: scenes[scene].id,
      title,
      text,
      labelId: labelId(label),
    })),
  });

  const characters = CHARACTERS.map((c) => ({ ...c, id: id() }));
  // Blank sketch fields are stored as null, like the app does for a field the writer leaves empty.
  const text = (value: string) => value || null;
  await tx.character.createMany({
    data: characters.map((c) => ({
      id: c.id,
      projectId: project.id,
      role: c.role,
      name: c.name,
      age: text(c.age),
      location: text(c.location),
      roleInStory: text(c.roleInStory),
      goal: text(c.goal),
      physicalDescription: text(c.physicalDescription),
      personality: text(c.personality),
      occupation: text(c.occupation),
      habits: text(c.habits),
      background: text(c.background),
      internalConflicts: text(c.internalConflicts),
      externalConflicts: text(c.externalConflicts),
    })),
  });

  const noteRows = characters.flatMap((c) => c.notes.map((content) => ({ characterId: c.id, content })));
  if (noteRows.length > 0) await tx.characterNote.createMany({ data: noteRows });

  // Few rows, and each connects to characters, which a bulk insert can't do, so these are created one by one.
  const placeIds: string[] = [];
  for (const { characters: related, ...place } of PLACES) {
    const created = await tx.place.create({
      data: {
        projectId: project.id,
        name: place.name,
        location: text(place.location),
        roleInStory: text(place.roleInStory),
        season: text(place.season),
        uniqueFeatures: text(place.uniqueFeatures),
        description: text(place.description),
        sights: text(place.sights),
        sounds: text(place.sounds),
        smell: text(place.smell),
        notes: { create: place.notes.map((content) => ({ content })) },
        relatedCharacters: {
          connect: characters.filter((c) => (related as readonly string[]).includes(c.name)).map((c) => ({ id: c.id })),
        },
      },
      select: { id: true },
    });
    placeIds.push(created.id);
  }

  await seedResearch(tx, project.id, { characterId: characters[0]?.id, placeId: placeIds[0] });
  return project.id;
}
