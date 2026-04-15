export type JobStatus = "queued" | "running" | "done" | "error";

export type OutputFormat = "markdown" | "plain" | "html" | "bbcode" | "wiki";

export interface Job {
  id: string;
  titleIndex: number;
  promptIndex: number;
  status: JobStatus;
  error?: string;
}

export interface Article {
  id: string;
  title: string;
  keyword: string;
  promptUsed: string;
  content: string;
  generatedAt: number;
}

export interface GeneratedTitle {
  keyword: string;
  title: string;
  selected: boolean;
}

export interface AppState {
  language: string;              // output language
  outputFormat: OutputFormat;    // article heading format
  keywords: string[];
  prompts: string[];
  selectedPromptIndices: number[];
  totalArticles: number;
  generatedTitles: GeneratedTitle[];
  generationJobs: Job[];
  articles: Article[];
}

export type AppAction =
  | { type: "SET_LANGUAGE"; payload: string }
  | { type: "SET_OUTPUT_FORMAT"; payload: OutputFormat }
  | { type: "SET_KEYWORDS"; payload: string[] }
  | { type: "SET_PROMPTS"; payload: string[] }
  | { type: "SET_SELECTED_PROMPT_INDICES"; payload: number[] }
  | { type: "SET_TOTAL_ARTICLES"; payload: number }
  | { type: "SET_GENERATED_TITLES"; payload: GeneratedTitle[] }
  | { type: "TOGGLE_TITLE_SELECTION"; payload: number }
  | { type: "SELECT_ALL_TITLES"; payload: boolean }
  | { type: "EDIT_TITLE"; payload: { index: number; newTitle: string } }
  | { type: "INIT_GENERATION_JOBS"; payload: Job[] }
  | { type: "UPDATE_JOB"; payload: { id: string; status: JobStatus; error?: string } }
  | { type: "ADD_ARTICLE"; payload: Article }
  | { type: "RESET_BATCH" };
