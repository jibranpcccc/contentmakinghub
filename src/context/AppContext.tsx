"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { AppState, AppAction } from "@/lib/types";

const defaultPrompts = [
  // Each prompt is kept lean to save input tokens. [topic] = keyword placeholder.

  "Comprehensive Guide: Write a thorough blog article about [topic]. Cover what it is, why it matters, and how to get started. Use H2 subheadings for each section.",

  "Step-by-Step How-To: Write a numbered step-by-step tutorial on [topic]. Start with what the reader will achieve. Each step gets a bold action heading.",

  "Top 10 Listicle: Write a Top 10 list article about [topic]. Each item: bold heading, 2-3 sentence explanation, one specific example or tip.",

  "Beginner's Guide: Write a beginner-friendly guide to [topic]. Assume zero knowledge. Define terms simply. Use analogies. End with next steps.",

  "Expert Deep-Dive: Write an advanced analysis of [topic] for experienced readers. Skip basics. Focus on nuances, edge cases, and advanced strategies.",

  "Myths Debunked: Debunk 5 common myths about [topic]. For each: state the myth, explain why people believe it, then dismantle it with facts.",

  "Case Study: Write a case study article about [topic]. Create a realistic before/after scenario with specific numbers, strategies used, and key takeaways.",

  "Comparison Article: Write a detailed comparison of two approaches to [topic]. Compare side-by-side on key criteria. Declare a winner with reasoning.",

  "Problem-Solution: Identify the #1 problem people face with [topic] and provide a complete solution. First third: build empathy. Rest: actionable fix.",

  "Lessons Learned: Share 5 hard-won lessons about [topic]. Each lesson: what went wrong, what was learned, what readers should do differently.",

  "Trends & Predictions: Write about the future of [topic]. Cover 4-5 emerging trends with reasoning. End with a bold prediction.",

  "Ultimate Checklist: Write a checklist article for [topic]. Each item: bold heading and 1-2 sentences explaining why it matters.",

  "FAQ Article: Answer the 7 most important questions about [topic]. Each question as H2. Direct, thorough answers that flow as a cohesive article.",

  "Resource Guide: Write a curated resource guide for [topic]. For each resource: name, 2-sentence review, who it's best for, standout feature.",

  "Opinion Editorial: Write an opinion piece about [topic] with a clear stance. 3 strong arguments with examples. Briefly acknowledge the opposing view.",

  "Behind the Scenes: Write a behind-the-scenes article about [topic]. Share insider details and realities most people never see.",

  "Mistakes to Avoid: Cover 7 critical mistakes people make with [topic]. For each: describe it, explain the consequence, provide the correct approach.",

  "Success Roadmap: Write a success roadmap for [topic] with 5 phases. Each phase: heading, focus area, key action, milestone to hit.",

  "Quick-Start Guide: Write a get-started-in-15-minutes guide for [topic]. Pure action, no theory. Numbered steps, short punchy sentences.",

  "Data-Driven Article: Write a data-heavy article about [topic]. Weave in 5+ specific statistics naturally. Draw actionable conclusions from the data.",

  "Interview Style: Write a Q&A interview article about [topic] with a fictional expert. 8 insightful questions with detailed, quotable answers.",

  "Story-Driven Article: Open with a compelling story about [topic]. Use it to illustrate a key principle. Transition to 3 practical takeaways.",

  "Contrarian Take: Argue against the most popular advice about [topic]. Challenge conventional wisdom with logic and examples. Offer your alternative.",

  "Pillar Content: Write a definitive reference article about [topic]. Cover it so completely the reader never needs another source.",

  "Timely Angle: Connect [topic] to current trends. Explain why it matters right now. Provide 4-5 actionable tips tied to the current moment.",

  "Honest Review: Write a balanced review of [topic]. Structure: Overview, Pros (4+), Cons (3+), Who It's For, Who Should Skip It, Verdict.",

  "Historical Evolution: Trace the evolution of [topic] from origins to today. Cover 3-4 turning points. End with where things are heading.",

  "Rapid-Fire Tips: Write 15 quick tips about [topic]. Each: one bold sentence + 1-2 sentence expansion. Group into 3 themed H2 sections.",

  "Framework Article: Introduce a simple framework for [topic]. Give it a catchy name. Explain each component with an H2. Show it in action.",

  "Pros and Cons: Write a balanced pros and cons article about [topic]. 5 pros, 5 cons, each with bold heading and 2-sentence explanation. End with Bottom Line.",

  "What-If Scenarios: Explore 3 what-if scenarios about [topic]. Analyze likely outcomes of each. Extract actionable insights from all three.",

  "Troubleshooting Guide: Cover 6 common problems with [topic]. For each: symptoms, likely cause, and step-by-step fix.",

  "Key Terms Explained: Explain 10 important terms in [topic]. Each: plain English definition, one practical example, why it matters.",

  "Day in the Life: Write a day-in-the-life article about working with [topic]. Walk through morning, afternoon, evening with specific details.",

  "Cost Breakdown: Write a cost breakdown for [topic]. Cover hidden and obvious costs by category. Include money-saving tips. End with budget ranges.",

  "Rookie Mistakes: Cover 5 beginner mistakes with [topic]. For each: brief cautionary scenario, why it happens, the exact fix.",

  "Industry Secrets: Reveal 5 insider things about [topic] the public doesn't know. Each: bold heading, insider explanation, how to use this knowledge.",

  "Detailed Walkthrough: Write an extremely detailed walkthrough of the main process in [topic]. Number every micro-step. Include Pro Tips between steps.",

  "Research Summary: Summarize latest research on [topic] for a general audience. Translate complex findings into practical advice.",

  "Actionable Strategies: Present 5 high-impact strategies for [topic]. Each: H2 heading, why it works, and a specific 'Do This Today' action.",

  "Mini Case Studies: Feature 3 brief case studies about [topic]. Each ~120 words: challenge, approach, result. End with common patterns.",

  "AMA Style: Answer 6 specific real-world questions about [topic]. Make questions practical, not generic. Thorough, no-nonsense answers.",

  "Hot Take: Share a controversial opinion about [topic]. State it upfront. Build an airtight case with evidence. Acknowledge and refute counterarguments.",

  "Inspirational Guide: Write an uplifting article about [topic] blending inspiration with practical advice. Open with a struggle-to-success story. Extract 4 principles.",

  "Technical Breakdown: Break down how [topic] works under the hood. Use clear analogies for complex parts. Make the reader feel smarter after reading.",

  "Buyer's Guide: Write a buyer's guide for [topic]. Cover what to look for, what to avoid, budget tips, red flags, and Best For recommendations.",

  "Productivity Hacks: Share 8 time-saving shortcuts for [topic]. Bold headings, 2-3 sentence implementation details. Prioritize uncommon tips.",

  "Beginner to Pro Roadmap: Map the journey from beginner to expert in [topic]. 4 stages: Beginner, Intermediate, Advanced, Expert. Skills and milestones per stage.",

  "Science Behind: Explain the science/psychology behind [topic]. Reference principles and research. Structure: The Question, The Science, What It Means For You.",

  "Complete Playbook: Write a playbook for mastering [topic]. Phases: Preparation, Execution, Optimization. 3 tactics per phase. End with a 7-day action plan."
];

const initialState: AppState = {
  language: "English",
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
