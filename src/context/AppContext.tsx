"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { AppState, AppAction } from "@/lib/types";

const defaultPrompts = [
  "Comprehensive Guide: Act as a senior expert in [topic]. Write an authoritative, comprehensive guide that covers the core concepts, why it matters right now, and a practical step-by-step section. Hook the reader immediately. Use NLP-rich language naturally. Zero fluff — every sentence must earn its place.",

  "Beginner's Explainer: Act as a patient mentor introducing [topic] to someone with zero prior knowledge. Break down every term in plain language. Use everyday analogies to make complex ideas click. Walk the reader through exactly what they need to know to get started, and end with clear immediate next steps.",

  "Tactical Strategy Guide: Act as a seasoned practitioner who has spent years mastering [topic]. Write a tactical, no-nonsense guide focused on real strategies that work. Skip the theory — go straight to specific techniques, decision rules, and thresholds the reader can apply immediately. Use concrete numbers and examples.",

  "Top X Roundup: Act as a meticulous expert curator in [topic]. Write a compelling 'Top X' roundup. Each entry needs: a bold benefit-driven heading, 2-3 sentences on what makes it stand out, who it's best for, and one specific detail that separates it from the rest. End with a clear overall winner summary.",

  "Myths & Misconceptions Busted: Act as a critical analyst in [topic]. Identify 5 widely-believed myths that are leading people to make bad decisions. For each: state the myth exactly as people believe it, explain precisely why it's wrong using logic and evidence, and give the corrected truth they should act on instead.",

  "How It Actually Works: Act as an expert explaining the real mechanics behind [topic] to a curious, intelligent reader. Break down the technical reality in clear, relatable terms. Use strong analogies. Make the reader feel like they've been given insider knowledge they can't get anywhere else.",

  "Comparison Article: Act as an opinionated, independent analyst. Compare [topic] head-to-head against its main alternative. Evaluate both on 4-5 specific criteria. Be direct about which is better and for whom. Never sit on the fence — give a definitive recommendation at the end.",

  "Problem & Solution: Act as a consultant who deeply understands the reader's biggest pain point with [topic]. Open by making the reader feel completely understood — name the exact frustration. Then pivot to a structured, step-by-step solution they can execute immediately. Make it feel like personalized advice.",

  "Common Mistakes to Avoid: Act as a blunt, experienced coach. Expose 5-7 mistakes people consistently make with [topic]. For each mistake: paint a vivid scenario of it happening, explain the real cost of making it, and give the exact fix. Be harsh but fair — the reader's time and money are at stake.",

  "FAQ Article: Act as a knowledgeable expert who has answered thousands of questions about [topic]. Write a structured FAQ answering the 7 most searched, most important questions. Use the exact question as the H2 heading. Answers must be direct (2-4 sentences) followed by a short deeper explanation. No padding.",

  "Ultimate Checklist: Act as an operational expert in [topic]. Build a practical, detailed checklist article that a reader can follow step-by-step. Organize it into clear phases (e.g., Before, During, After). Each item needs a bold heading and 2-3 sentences explaining why skipping it is a costly mistake.",

  "Industry Insider Secrets: Act as a whistleblower pulling back the curtain on [topic]. Share 5 things that industry insiders know but rarely say publicly. Each secret must be genuinely actionable — something that changes how the reader approaches [topic] once they know it. Stick to verifiable logic, no conspiracy theories.",

  "Story-Driven Article: Act as a master storyteller. Open with a gripping, real-feeling narrative scenario involving [topic]. Use the story to illustrate a key insight or strategy. Then smoothly transition into 3 concrete, standalone takeaways the reader can apply immediately.",

  "Data-Driven Breakdown: Act as an analytical expert in [topic]. Build your article around specific statistics, percentages, and measurable insights. Don't just list numbers — contextualize every data point into a practical conclusion the reader can act on. Give the article the authority of research without the dryness.",

  "Pros & Cons Deep-Dive: Act as a pragmatic, unbiased analyst. Write a thorough pros and cons breakdown of [topic]. Cover exactly 5 pros and 5 cons. Each point gets a bold heading and a rich, nuanced explanation — not a bullet point. End with a 'Bottom Line' section that helps the reader make a final decision.",

  "Beginner to Advanced Roadmap: Act as a mentor mapping the full journey in [topic]. Define 4 clear stages: Starter, Intermediate, Advanced, Expert. For each stage: list the specific skills to build, the traps that derail people at that level, and the clear milestone that signals it's time to level up.",

  "Quick-Start Action Guide: Act as a results-obsessed coach. Write a blazing-fast guide to getting started with [topic] in the shortest time possible. Strip all theory. Use numbered steps, short punchy sentences, and direct commands only. Every line should push the reader toward immediate action.",

  "Honest Review: Act as a rigorous, unbiased critic. Write a brutally honest review of [topic]. Structure: executive summary, 4+ genuine benefits, 3+ real drawbacks or limitations, who it's genuinely right for, who should walk away, and a final unvarnished verdict. No promotional tone whatsoever.",

  "Rapid-Fire Tips: Act as a rapid-fire expert consultant in [topic]. Deliver 12-15 hyper-specific, actionable tips. Each tip: one bold sentence headline, then maximum 2 sentences of how-to detail. Group tips into 3 thematic H2 sections. Zero generic advice — every tip must be specific enough to be immediately useful.",

  "Complete Playbook: Act as an elite strategist in [topic]. Write a complete execution playbook divided into 3 phases: Preparation, Execution, and Optimization. Provide 3 specific, high-leverage tactics per phase. Close with a concrete 7-day action plan the reader can start today.",
];


const initialState: AppState = {
  provider: "mistral",
  language: "English",
  outputFormat: "markdown",
  keywords: [],
  prompts: defaultPrompts,
  selectedPromptIndices: Array.from({ length: 20 }, (_, i) => i),
  totalArticles: 10,
  generatedTitles: [],
  generationJobs: [],
  articles: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_PROVIDER":
      return { ...state, provider: action.payload };
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
