import { create } from "zustand";

export type Phase =
  | "boot"
  | "approach"
  | "shelf"
  | "extract"
  | "cover"
  | "opening"
  | "reading";

export type Hover = "none" | "shelf" | "cover" | "pageL" | "pageR";

interface LibraryState {
  phase: Phase;
  ready: boolean;
  bookReady: boolean;
  spread: number;
  spreadCount: number;
  hover: Hover;
  flipEpoch: number;
  setPhase: (phase: Phase) => void;
  setReady: (ready: boolean) => void;
  setBookReady: (bookReady: boolean) => void;
  setSpread: (spread: number) => void;
  setSpreadCount: (n: number) => void;
  setHover: (hover: Hover) => void;
  bumpFlip: () => void;
}

export const useLibrary = create<LibraryState>((set) => ({
  phase: "boot",
  ready: false,
  bookReady: false,
  spread: 0,
  spreadCount: 1,
  hover: "none",
  flipEpoch: 0,
  setPhase: (phase) => set({ phase }),
  setReady: (ready) => set({ ready }),
  setBookReady: (bookReady) => set({ bookReady }),
  setSpread: (spread) => set({ spread }),
  setSpreadCount: (spreadCount) => set({ spreadCount }),
  setHover: (hover) => set({ hover }),
  bumpFlip: () => set((s) => ({ flipEpoch: s.flipEpoch + 1 })),
}));
