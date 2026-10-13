export interface StoryBeat {
  /** Stable key stored in `BeatProgress`. Beats with the same meaning share a key across templates, so progress survives a switch. */
  key: string;
  title: string;
  description: string;
  prompts: string[];
}

export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  /** "structure" templates are plot beats; "genre" templates are worldbuilding checklists. */
  kind: "structure" | "genre";
  beats: StoryBeat[];
}

const beat = (key: string, title: string, description: string, prompts: string[]): StoryBeat => ({ key, title, description, prompts });

export const STORY_TEMPLATES: readonly StoryTemplate[] = [
  {
    id: "three-act",
    name: "Three-Act Structure",
    description: "Setup, confrontation and resolution: the classic shape of most stories.",
    kind: "structure",
    beats: [
      beat("setup", "Act I: Setup", "Introduce the hero, the world and what is normal before it changes.", [
        "Who is the hero, and what do they want?",
        "What does their ordinary world look like?",
      ]),
      beat("inciting-incident", "Inciting incident", "An event disrupts the hero's world and sets the story in motion.", [
        "What happens that cannot be ignored?",
        "Why can't the hero go back to how things were?",
      ]),
      beat("first-plot-point", "First plot point", "The hero commits to the journey and Act II begins.", [
        "What choice sends the hero into the unknown?",
        "What are the stakes now?",
      ]),
      beat("rising-action", "Act II: Rising action", "Obstacles grow, allies and enemies appear, and the hero is tested.", [
        "What does each obstacle teach the hero?",
        "Who helps, and who stands in the way?",
      ]),
      beat("midpoint", "Midpoint", "A turning point that raises the stakes or changes what the hero believes.", [
        "What is revealed or lost here?",
        "How does the hero shift from reacting to acting?",
      ]),
      beat("all-is-lost", "Crisis", "Everything falls apart and the hero hits their lowest point.", [
        "What does the hero lose?",
        "What do they have to face about themselves?",
      ]),
      beat("climax", "Act III: Climax", "The final confrontation where the hero's choices decide the outcome.", [
        "What does the hero do differently now?",
        "What is the cost of winning?",
      ]),
      beat("resolution", "Resolution", "The new normal: show how the world and the hero have changed.", [
        "What loose ends need tying?",
        "What final image echoes the opening?",
      ]),
    ],
  },
  {
    id: "heros-journey",
    name: "Hero's Journey",
    description: "Joseph Campbell's twelve stages, as adapted by Christopher Vogler.",
    kind: "structure",
    beats: [
      beat("ordinary-world", "Ordinary world", "Show the hero's everyday life before the adventure.", ["What is missing from the hero's life?"]),
      beat("call-to-adventure", "Call to adventure", "A challenge or problem arrives.", ["What is the call, and who delivers it?"]),
      beat("refusal-of-the-call", "Refusal of the call", "The hero hesitates out of fear or duty.", ["What makes the hero say no at first?"]),
      beat("meeting-the-mentor", "Meeting the mentor", "A guide offers advice, training or a gift.", ["What does the mentor give the hero?"]),
      beat("crossing-the-threshold", "Crossing the threshold", "The hero commits and enters the special world.", ["What marks the point of no return?"]),
      beat("tests-allies-enemies", "Tests, allies, enemies", "The hero learns the rules of the new world.", ["Who joins the hero, and who opposes them?"]),
      beat("approach", "Approach to the inmost cave", "The hero prepares for the central ordeal.", ["What preparations or doubts come before the ordeal?"]),
      beat("ordeal", "Ordeal", "The hero faces death or their greatest fear.", ["What must die, literally or figuratively?"]),
      beat("reward", "Reward", "The hero survives and claims what they came for.", ["What is gained, and what does it cost?"]),
      beat("road-back", "The road back", "The hero heads home, but the story is not over.", ["What new danger chases the hero?"]),
      beat("resurrection", "Resurrection", "A final test where the hero is transformed.", ["How has the hero changed since the start?"]),
      beat("return-with-the-elixir", "Return with the elixir", "The hero brings something back that helps the ordinary world.", ["What does the hero share with others?"]),
    ],
  },
  {
    id: "eight-sequence",
    name: "Eight-Sequence Method",
    description: "Eight roughly equal sequences of about ten to fifteen minutes each, from film structure.",
    kind: "structure",
    beats: [
      beat("sequence-1", "Sequence 1: Status quo and inciting incident", "Establish the world and end on the event that disturbs it.", ["What is the hero's status quo?"]),
      beat("sequence-2", "Sequence 2: Predicament and lock in", "The problem takes shape and the hero is locked into pursuing it.", ["What makes the hero commit?"]),
      beat("sequence-3", "Sequence 3: First obstacle and raising the stakes", "The hero meets resistance, ending in the first act turn.", ["What is the first big obstacle?"]),
      beat("sequence-4", "Sequence 4: First culmination", "Efforts lead to a high or a reversal at the midpoint.", ["What shifts at the halfway mark?"]),
      beat("sequence-5", "Sequence 5: Subplot and rising action", "Subplots deepen and the new situation plays out.", ["Which subplot moves forward?"]),
      beat("sequence-6", "Sequence 6: Main culmination", "Things go wrong; the hero ends with their lowest moment.", ["What is the lowest point?"]),
      beat("sequence-7", "Sequence 7: New tension and twist", "A new path opens, often with a final twist.", ["What last surprise changes the plan?"]),
      beat("sequence-8", "Sequence 8: Resolution", "The final confrontation and the new equilibrium.", ["How does the story answer its main question?"]),
    ],
  },
  {
    id: "save-the-cat",
    name: "Save the Cat",
    description: "Blake Snyder's fifteen beats.",
    kind: "structure",
    beats: [
      beat("opening-image", "Opening image", "A snapshot of the hero's life before the change.", ["What image sets the tone and the problem?"]),
      beat("theme-stated", "Theme stated", "Someone hints at the lesson the hero will learn.", ["What truth does the hero not yet see?"]),
      beat("setup", "Set-up", "Show the hero's world, flaws and what needs fixing.", ["What is broken in the hero's life?"]),
      beat("catalyst", "Catalyst", "Life-changing news or an event upsets the hero's world.", ["What changes everything?"]),
      beat("debate", "Debate", "The hero doubts and weighs whether to act.", ["What is the hero afraid of?"]),
      beat("break-into-two", "Break into two", "The hero chooses to act and enters a new world.", ["What choice does the hero make?"]),
      beat("b-story", "B story", "A new relationship carries the theme.", ["Who helps the hero learn the lesson?"]),
      beat("fun-and-games", "Fun and games", "The promise of the premise: the hero explores the new world.", ["What did the reader come to see?"]),
      beat("midpoint", "Midpoint", "A false victory or false defeat raises the stakes.", ["What changes at the halfway point?"]),
      beat("bad-guys-close-in", "Bad guys close in", "Pressure builds from outside and from within.", ["How do the hero's flaws make things worse?"]),
      beat("all-is-lost", "All is lost", "The hero loses what mattered; something dies.", ["What does the hero lose?"]),
      beat("dark-night-of-the-soul", "Dark night of the soul", "The hero hits bottom and faces what they must change.", ["What does the hero finally understand?"]),
      beat("break-into-three", "Break into three", "A new idea combines the A and B stories.", ["What solution appears?"]),
      beat("finale", "Finale", "The hero applies the lesson and wins the final battle.", ["How does the hero use what they learned?"]),
      beat("final-image", "Final image", "A mirror of the opening image showing the change.", ["What is different from page one?"]),
    ],
  },
  {
    id: "romance",
    name: "Romance Beats",
    description: "The four turning points of a romance plot.",
    kind: "structure",
    beats: [
      beat("meet", "The meet", "The leads meet and something sparks, good or bad.", ["What is each lead's first impression?", "What do they want from life?"]),
      beat("barrier", "The barrier", "Something keeps them apart: inner wounds, circumstance or other people.", ["Why can't they simply be together?"]),
      beat("black-moment", "Black moment", "The relationship seems lost for good.", ["What breaks them apart, and who is at fault?"]),
      beat("resolution", "Resolution", "They overcome the barrier and commit to each other.", ["What does each give up or accept?"]),
    ],
  },
  {
    id: "fantasy-notes",
    name: "Fantasy Worldbuilding",
    description: "A checklist of things to decide about a fantasy world. Not plot beats.",
    kind: "genre",
    beats: [
      beat("magic-system", "Magic system", "How magic works, what it costs and who can use it.", ["What are the rules and limits?", "What does magic cost?"]),
      beat("geography", "Geography and map", "Lands, borders, climates and travel times.", ["Where do the main scenes happen?"]),
      beat("peoples", "Peoples and cultures", "Races, customs, languages and beliefs.", ["Who lives where, and how do they see each other?"]),
      beat("history", "History and legends", "Past wars, founding myths and lost ages that shape the present.", ["What past event still echoes today?"]),
      beat("politics", "Power and politics", "Who rules, who resists and what they want.", ["What conflicts exist between factions?"]),
      beat("religion", "Religion and myth", "Gods, rituals and what people fear.", ["How does belief shape daily life?"]),
      beat("daily-life", "Daily life and economy", "Food, trade, work, money and technology.", ["How do ordinary people live?"]),
    ],
  },
  {
    id: "scifi-notes",
    name: "Sci-Fi Worldbuilding",
    description: "A checklist of things to decide about a science-fiction setting. Not plot beats.",
    kind: "genre",
    beats: [
      beat("premise", "The big what-if", "The speculative idea the story explores.", ["What single change sets this world apart?"]),
      beat("technology", "Technology and its limits", "What exists, who controls it and what it cannot do.", ["What are the rules of the key technology?"]),
      beat("society", "Society and consequences", "How the premise changes laws, work, family and class.", ["Who benefits, and who pays?"]),
      beat("setting", "Setting and scale", "Planets, ships, stations or timelines; distances and travel.", ["How do people get around?"]),
      beat("science", "Science and plausibility", "What is real, what is invented and how you explain it.", ["What does the reader need to believe?"]),
      beat("ethics", "Ethics and conflict", "The moral questions the technology raises.", ["What do the characters disagree about?"]),
      beat("history", "History and timeline", "The events that led from now to the story's present.", ["What turning point defines this era?"]),
    ],
  },
];

export const STORY_TEMPLATE_IDS = STORY_TEMPLATES.map((t) => t.id) as [string, ...string[]];

export function getStoryTemplate(id: string | null | undefined): StoryTemplate | null {
  return STORY_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** The beat keys that exist in a template; none for no template. */
export function beatKeysOf(id: string | null | undefined): Set<string> {
  return new Set(getStoryTemplate(id)?.beats.map((b) => b.key) ?? []);
}

/** The beats a switch from one template to another would lose progress on: keys of the old template that the new one lacks. */
export function lostBeatKeys(from: string | null | undefined, to: string | null | undefined): string[] {
  const kept = beatKeysOf(to);
  return [...beatKeysOf(from)].filter((key) => !kept.has(key));
}
