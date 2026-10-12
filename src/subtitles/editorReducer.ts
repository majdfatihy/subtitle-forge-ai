import type { SubtitleCue } from "@/models/subtitle";
import { createCue } from "@/models/subtitle";

export interface EditorState {
  past: SubtitleCue[][];
  present: SubtitleCue[];
  future: SubtitleCue[][];
}

export type EditorAction =
  | { type: "SET_ALL"; cues: SubtitleCue[] }
  | { type: "UPDATE_TEXT"; id: string; text: string }
  | { type: "UPDATE_TIMING"; id: string; start?: number; end?: number }
  | { type: "ADD_AFTER"; id: string }
  | { type: "DELETE"; id: string }
  | { type: "SPLIT"; id: string; atCharIndex: number }
  | { type: "MERGE_WITH_NEXT"; id: string }
  | { type: "SHIFT_ALL"; deltaSeconds: number }
  | { type: "UNDO" }
  | { type: "REDO" };

const HISTORY_LIMIT = 50;

export const initialEditorState: EditorState = {
  past: [],
  present: [],
  future: [],
};

/** يبني الحالة التالية مع دفع الحالة الحالية لسجل التراجع (يُستخدم لكل تعديل فعلي). */
function withHistory(state: EditorState, nextPresent: SubtitleCue[]): EditorState {
  const past = [...state.past, state.present].slice(-HISTORY_LIMIT);
  return { past, present: nextPresent, future: [] };
}

function findIndex(cues: SubtitleCue[], id: string): number {
  return cues.findIndex((c) => c.id === id);
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_ALL":
      // تحميل أولي من نتيجة التفريغ — ليس تعديلًا يدويًا، فلا يُسجَّل في التراجع.
      return { past: [], present: action.cues, future: [] };

    case "UPDATE_TEXT": {
      const next = state.present.map((c) =>
        c.id === action.id ? { ...c, text: action.text } : c
      );
      return withHistory(state, next);
    }

    case "UPDATE_TIMING": {
      const next = state.present.map((c) =>
        c.id === action.id
          ? {
              ...c,
              start: action.start ?? c.start,
              end: action.end ?? c.end,
            }
          : c
      );
      return withHistory(state, next);
    }

    case "ADD_AFTER": {
      const idx = findIndex(state.present, action.id);
      if (idx === -1) return state;
      const current = state.present[idx]!;
      const next = state.present[idx + 1];
      const gapStart = current.end;
      const gapEnd = next ? next.start : current.end + 2;
      const newCue = createCue({
        start: gapStart,
        end: Math.max(gapStart + 0.5, Math.min(gapEnd, gapStart + 2)),
        text: "",
      });
      const nextCues = [
        ...state.present.slice(0, idx + 1),
        newCue,
        ...state.present.slice(idx + 1),
      ];
      return withHistory(state, nextCues);
    }

    case "DELETE": {
      const next = state.present.filter((c) => c.id !== action.id);
      return withHistory(state, next);
    }

    case "SPLIT": {
      const idx = findIndex(state.present, action.id);
      if (idx === -1) return state;
      const cue = state.present[idx]!;
      const text = cue.text;
      const cut = Math.max(0, Math.min(action.atCharIndex, text.length));
      const firstText = text.slice(0, cut).trim();
      const secondText = text.slice(cut).trim();
      if (!firstText || !secondText) return state; // قطع غير مفيد (سطر فاضي)

      const mid = cue.start + (cue.end - cue.start) / 2;
      const first = { ...cue, text: firstText, end: mid };
      const second = createCue({ start: mid, end: cue.end, text: secondText });
      const next = [
        ...state.present.slice(0, idx),
        first,
        second,
        ...state.present.slice(idx + 1),
      ];
      return withHistory(state, next);
    }

    case "MERGE_WITH_NEXT": {
      const idx = findIndex(state.present, action.id);
      if (idx === -1 || idx + 1 >= state.present.length) return state;
      const current = state.present[idx]!;
      const next = state.present[idx + 1]!;
      const merged = {
        ...current,
        text: [current.text, next.text].filter(Boolean).join(" "),
        end: next.end,
      };
      const nextCues = [
        ...state.present.slice(0, idx),
        merged,
        ...state.present.slice(idx + 2),
      ];
      return withHistory(state, nextCues);
    }

    case "SHIFT_ALL": {
      const next = state.present.map((c) => ({
        ...c,
        start: Math.max(0, c.start + action.deltaSeconds),
        end: Math.max(0, c.end + action.deltaSeconds),
      }));
      return withHistory(state, next);
    }

    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1]!;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next!,
        future: rest,
      };
    }

    default:
      return state;
  }
}
