"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { AppState, AppAction } from "@/lib/types";

const defaultPrompts = [
  "Comprehensive Guide: Act as a senior industry expert. Write an authoritative, comprehensive guide on [topic]. Structure the article with a compelling hook, a deep explanation of core concepts, why it matters in today's landscape, and a step-by-step implementation section. Use NLP entities naturally. Aim for zero fluff.",

  "Step-by-Step How-To: Act as an experienced instructor. Write a highly actionable, numbered step-by-step tutorial on [topic]. Start by explicitly stating the end goal the reader will achieve. For each step, provide a bold heading, the 'why', the exact 'how', and common pitfalls to avoid. Use transitional words to ensure flow.",

  "Top 10 Listicle: Act as a meticulous curator. Write a highly engaging 'Top 10' listicle about [topic]. Each item must feature a bold, benefit-driven heading, a detailed 3-4 sentence explanation, and one highly specific real-world example, tool, or actionable tip. Conclude with a synthesis of the top picks.",

  "Beginner's Guide: Act as a patient, empathetic mentor. Write a beginner-friendly guide to [topic] that assumes absolutely zero prior knowledge. Break down complex jargon into simple terms, use highly relatable everyday analogies, and gently walk the reader through foundational concepts. End with immediate next steps.",

  "Expert Deep-Dive: Act as a thought leader writing for industry peers. Write an advanced, technical deep-dive into [topic]. Completely skip the basic definitions. Focus exclusively on nuanced strategies, edge cases, advanced frameworks, and high-level theoretical applications. Ensure a sophisticated, academic yet readable tone.",

  "Myths Debunked: Act as a critical investigative journalist. Debunk 5 pervasive, common myths surrounding [topic]. For each myth: explicitly state the misconception, explore the psychological or historical reason people believe it, and ruthlessly dismantle it using logic, hypothetical data, and expert reasoning.",

  "Case Study: Act as a business analyst. Write a compelling, realistic case study article regarding [topic]. Create a detailed avatar facing a massive challenge, outline the specific strategies they implemented, and highlight the numerical or qualitative results achieved. Extract 3 universal takeaways for the reader.",

  "Comparison Article: Act as an unbiased, objective reviewer. Write a definitive, side-by-side comparison of the two leading approaches to [topic]. Evaluate them on 4 key criteria (e.g., cost, time, complexity, scalability). Weigh the pros and cons meticulously, and conclude by declaring a definitive winner for specific use cases.",

  "Problem-Solution: Act as a seasoned consultant. Identify the single biggest, most painful problem people face regarding [topic] and provide a surgical solution. Spend the first third of the article deeply agitating the problem to build empathy, then pivot to a structured, highly actionable framework to fix it permanently.",

  "Lessons Learned: Act as a veteran who has 'been there, done that'. Document 5 hard-won, painful lessons you've learned about [topic]. For each lesson, vividly describe the mistake that was made, the financial or emotional cost of that mistake, and the precise rule the reader should adopt to avoid it.",

  "Trends & Predictions: Act as a futurist and industry analyst. Analyze the current trajectory of [topic] and forecast its future over the next 3-5 years. Detail 4-5 emerging micro-trends, explain the driving forces behind them, and end with one bold, contrarian prediction that most people would disagree with.",

  "Ultimate Checklist: Act as an operational manager. Formulate the ultimate, highly-detailed checklist article for [topic]. Organize the checklist chronologically (e.g., Before, During, After). For every single item, provide a bold heading and a concise, urgent rationale explaining the catastrophic risk of skipping it.",

  "FAQ Article: Act as a customer success manager. Compile and answer the 7 most critical, frequently asked questions about [topic]. Use exact-match question phrasing for H2 headings. Provide direct, no-nonsense answers followed by a deeper explanation, ensuring the entire article flows cohesively rather than disjointedly.",

  "Resource Guide: Act as a master librarian. Write a highly curated resource and tool guide for mastering [topic]. For each recommended resource, provide the name, a compelling 2-sentence review, specifically who it is best suited for, and the single standout feature that elevates it above the competition.",

  "Opinion Editorial: Act as a passionate industry disruptor. Write a fiery, opinion-driven editorial about [topic]. Take a clear, polarizing stance entirely avoiding neutral ground. Support your thesis with 3 ironclad arguments and vivid examples. Briefly acknowledge the opposing viewpoint before systematically destroying it.",

  "Behind the Scenes: Act as an insider pulling back the curtain. Write a raw, behind-the-scenes exposé about [topic]. Highlight the grueling realities, the hidden workflows, and the insider details that the general public is completely oblivious to. Use narrative storytelling to make it immersive.",

  "Mistakes to Avoid: Act as a risk management expert. Detail the 7 most catastrophic, progress-killing mistakes people make with [topic]. For each entry: describe the mistake vividly, explain the compound negative consequences it creates, and provide the exact, step-by-step corrective protocol.",

  "Success Roadmap: Act as a strategic lifecycle coach. Architect a complete, linear success roadmap for [topic] broken into 5 distinct phases. For each phase, provide a clear heading, the primary objective, the most critical action to take, and the specific milestone that signals it's time to move to the next phase.",

  "Quick-Start Guide: Act as a tactical executioner. Write a blazing-fast, 'get-started-in-15-minutes' guide for [topic]. Strip away absolutely all theory, background, and fluff. Rely exclusively on numbered steps, short punchy sentences, and direct commands. Optimize for immediate human action.",

  "Data-Driven Article: Act as a rigorous data scientist. Write a heavily analytical article about [topic]. Organically weave plausible statistics, percentages, and metrics into the narrative to build unshakeable authority. Ensure the numbers aren't just listed, but contextualized into actionable business insights.",

  "Interview Style: Act as a veteran podcaster. Write a highly engaging, simulated Q&A interview article about [topic] featuring a fictional, world-renowned expert. Craft 8 piercing, unconventional questions. Ensure the expert's answers are profound, quotable, heavily detailed, and packed with unique mental models.",

  "Story-Driven Article: Act as a master storyteller. Open with a gripping, emotionally resonant narrative about a specific scenario involving [topic]. Use the story as an anchor to illustrate a broader, fundamental principle. Seamlessly transition from the narrative into 3 highly practical, standalone takeaways.",

  "Contrarian Take: Act as an intellectual rebel. Identify the most universally accepted piece of 'best practice' advice regarding [topic], and fiercely argue against it. Challenge conventional wisdom using first-principles logic and historical examples. Offer a completely alternative framework that yields better results.",

  "Pillar Content: Act as the definitive encyclopedia on the subject. Write a massive, foundational pillar article about [topic]. Cover the absolute breadth and depth of the subject so comprehensively that the reader will bookmark it and never need to consult another source. Use rich semantic structuring.",

  "Timely Angle: Act as a breaking news analyst. Connect [topic] to massive, current societal or economic trends. Explain with urgency why this topic matters right this very second more than ever before. Provide 4-5 actionable strategies the reader must implement today to capitalize on the moment.",

  "Honest Review: Act as a scrupulous, unbiased critic. Write a brutally honest, balanced review of [topic]. Structure the article perfectly: An executive overview, 4+ massive benefits, 3+ glaring flaws or limitations, exactly who this is for, exactly who should run away from it, and a final, unvarnished verdict.",

  "Historical Evolution: Act as an industry historian. Trace the fascinating evolution of [topic] from its earliest, primitive origins to its current modern state. Detail 3-4 massive paradigm shifts or turning points. Conclude by extrapolating this historical data to predict where things are heading next.",

  "Rapid-Fire Tips: Act as a rapid-fire consultant. Deliver 15 hyper-specific, actionable tips about [topic]. Do not waste words. Each tip must be exactly one bold sentence followed by a maximum of two sentences explaining the execution detail. Group these tips into 3 distinct, thematic H2 sections.",

  "Framework Article: Act as a management consultant (think McKinsey or Bain). Introduce a proprietary, completely original conceptual framework for mastering [topic]. Give the framework a catchy, memorable acronym. Dedicate an H2 to deeply dissecting each component of the framework, and show it applied to a real scenario.",

  "Pros and Cons: Act as a pragmatic decision-maker. Write an exhaustively balanced pros and cons analysis of [topic]. Detail exactly 5 pros and 5 cons. Each point must have a bold heading and a rich, nuanced explanation. Conclude with a 'Bottom Line' section that helps the reader make a final choice.",

  "What-If Scenarios: Act as a scenario planner. Deeply explore 3 radical 'what-if' scenarios concerning [topic] (e.g., what if the market crashes, what if technology automates it). Analyze the cascading outcomes and second-order effects of each. Extract survival and optimization insights from all three.",

  "Troubleshooting Guide: Act as a senior technical support engineer. Identify the 6 most frustrating, common bottlenecks or failures encountered with [topic]. Formulate the guide as a triage manual: clearly state the symptom, rapidly diagnose the likely root cause, and provide an infallible, step-by-step remediation plan.",

  "Key Terms Explained: Act as a lexicographer. Demystify and explain the 10 most important, misunderstood jargon terms within [topic]. Format each entry precisely: an incredibly plain-English definition, a relatable real-world analogy, and a brief note on why misunderstanding this term will cost the reader dearly.",

  "Day in the Life: Act as a documentary filmmaker. Write a vivid, hour-by-hour 'day in the life' narrative of a professional intensely engaged with [topic]. Walk through their morning routines, afternoon crises, and evening wrap-ups. Inject highly specific sensory details and micro-decisions to make it authentic.",

  "Cost Breakdown: Act as a forensic accountant. Write a ruthless, transparent cost breakdown for executing [topic]. Uncover the hidden, sneaky costs that blindside beginners, alongside the obvious ones. Categorize the expenses, provide aggressive money-saving hacks, and end with realistic budget tiers (Low/Med/High).",

  "Rookie Mistakes: Act as a harsh but fair coach. Expose 5 classic, embarrassing 'rookie mistakes' people consistently make when starting with [topic]. For each mistake, paint a brief, cringe-worthy scenario of it happening, explain the psychological bias that causes it, and provide the exact mechanical fix.",

  "Industry Secrets: Act as a whistleblower. Reveal 5 highly guarded, lucrative insider secrets about [topic] that the top 1% of the industry uses but hides from the public. Use bold headings. Explain the mechanism of the secret in deep detail, and provide a roadmap for the reader to ethically exploit this knowledge.",

  "Detailed Walkthrough: Act as an over-the-shoulder guide. Write an excruciatingly detailed, microscopic walkthrough of the hardest process in [topic]. Number every single micro-step. Do not skip assumptions. Insert highlighted 'Pro Tips' between difficult steps to ensure the reader does not get stuck.",

  "Research Summary: Act as an academic translator. Synthesize the latest, cutting-edge theories and research regarding [topic] for a mainstream audience. Strip away the dense academic jargon without losing the profound insights. Translate these complex theoretical findings into highly practical, daily advice.",

  "Actionable Strategies: Act as a growth hacker. Present 5 unconventional, high-impact strategies for mastering [topic]. Structure each perfectly: An H2 heading, the psychological or economic reason why the strategy boasts massive leverage, and a hyper-specific 'Do This Today' execution command.",

  "Mini Case Studies: Act as an aggregator of success. Feature 3 rapid-fire, highly condensed mini case studies about [topic]. Keep each to roughly 150 words: clearly define the initial challenge, the unconventional approach taken, and the quantified result. Dedicate the final section to connecting the common patterns among all three.",

  "AMA Style: Act as a brutally honest guru hosting an Ask Me Anything. Answer 6 highly specific, difficult, real-world questions about [topic]. Completely avoid generic, softball questions. Deliver answers that are thorough, slightly edgy, intensely practical, and devoid of any corporate speak.",

  "Hot Take: Act as a provocateur. Drop a massive, highly controversial 'hot take' regarding [topic]. State your polarizing thesis in the very first sentence. Build an absolutely airtight, logically sound case supported by historical and empirical evidence. Anticipate the hatred, acknowledge the counterarguments, and refute them.",

  "Inspirational Guide: Act as a motivational speaker who also delivers extreme value. Write an emotionally uplifting article about [topic] that permanently shifts the reader's paradigm. Open with a visceral story of struggle and eventual triumph. Extract 4 unbreakable philosophical principles from the story to guide the reader.",

  "Technical Breakdown: Act as an elite reverse-engineer. Completely dissect how the mechanics of [topic] work under the hood. Use incredibly lucid, clear analogies to map complex systems to everyday objects. Ensure the reader experiences a massive 'aha' moment and feels exponentially smarter after reading.",

  "Buyer's Guide: Act as an uncompromising consumer advocate. Write the ultimate buyer's defense guide for [topic]. Unpack exactly what features to demand, the gimmicks to completely ignore, aggressive budgeting negotiation tactics, massive red flags that signal a scam, and definitive 'Best For [X]' recommendations.",

  "Productivity Hacks: Act as an efficiency obsessive. Share 8 ruthless, time-saving, completely uncommon productivity hacks for dominating [topic]. Use bold headings and extremely dense, 3-sentence implementation details. Completely ignore trite advice like 'wake up early'—focus exclusively on high-leverage workflow hacks.",

  "Beginner to Pro Roadmap: Act as an RPG game designer. Map the complete progression skill-tree for moving from absolute novice to world-class expert in [topic]. Define 4 distinct stages: Novice, Intermediate, Advanced, Elite. Explicitly list the specific skills to master, the traps to avoid, and the exact milestone required to 'level up'.",

  "Science Behind: Act as an evolutionary biologist. Deeply explain the invisible science, neurology, or core physics behind *why* [topic] behaves the way it does. Reference fundamental principles. Structure it beautifully: The Core Phenomenon, The Invisible Science Driving It, and What This Means For Your Daily Execution.",

  "Complete Playbook: Act as an elite military strategist. Write the ultimate, uncompromising execution playbook for [topic]. Divide it into 3 phases: Recon & Preparation, The Execution Strike, and Post-Action Optimization. Provide exactly 3 devastatingly effective tactics per phase. End with a strict 7-day action manifesto."
];

const initialState: AppState = {
  language: "English",
  outputFormat: "markdown",
  keywords: [],
  prompts: defaultPrompts,
  selectedPromptIndices: Array.from({ length: 50 }, (_, i) => i),
  totalArticles: 10,
  generatedTitles: [],
  generationJobs: [],
  articles: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LANGUAGE":
      return { ...state, language: action.payload };
    case "SET_OUTPUT_FORMAT":
      return { ...state, outputFormat: action.payload };
    case "SET_KEYWORDS":
      return { ...state, keywords: action.payload };
    case "SET_PROMPTS":
      return { ...state, prompts: action.payload };
    case "SET_SELECTED_PROMPT_INDICES":
      return { ...state, selectedPromptIndices: action.payload };
    case "SET_TOTAL_ARTICLES":
      return { ...state, totalArticles: action.payload };
    case "SET_GENERATED_TITLES":
      return { ...state, generatedTitles: action.payload };
    case "TOGGLE_TITLE_SELECTION": {
      const newTitles = [...state.generatedTitles];
      newTitles[action.payload] = { ...newTitles[action.payload], selected: !newTitles[action.payload].selected };
      return { ...state, generatedTitles: newTitles };
    }
    case "SELECT_ALL_TITLES":
      return {
        ...state,
        generatedTitles: state.generatedTitles.map((t) => ({ ...t, selected: action.payload })),
      };
    case "EDIT_TITLE": {
      const newTitles = [...state.generatedTitles];
      newTitles[action.payload.index] = { ...newTitles[action.payload.index], title: action.payload.newTitle };
      return { ...state, generatedTitles: newTitles };
    }
    case "INIT_GENERATION_JOBS":
      return { ...state, generationJobs: action.payload, articles: [] };
    case "UPDATE_JOB":
      return {
        ...state,
        generationJobs: state.generationJobs.map((job) =>
          job.id === action.payload.id
            ? { ...job, status: action.payload.status, error: action.payload.error }
            : job
        ),
      };
    case "ADD_ARTICLE":
      return { ...state, articles: [...state.articles, action.payload] };
    case "RESET_BATCH":
      return {
        ...state,
        generatedTitles: [],
        generationJobs: [],
        articles: [],
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
