"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Difficulty = "easy" | "medium" | "hard";
type ModelType = "matrix" | "rings" | "graph" | null;

interface SolvedModelStats {
  maxDifficulty: Difficulty | null;
  stars: number;
}

interface AppState {
  currentModel: ModelType;
  sessionStart: number | null;
  moves: number;
  progress: number;
  solvedTasks: number;
  matrixDifficulty: Difficulty;
  ringsDifficulty: Difficulty;
  graphDifficulty: Difficulty;
  matrixSave: any | null;
  shouldRestoreMatrix: boolean;
  progressHistory: number[];
  moveHistory: any[];
  isGameWon: boolean;
  totalTaskTime: number;
  solvedModels: {
    matrix: SolvedModelStats;
    rings: SolvedModelStats;
    graph: SolvedModelStats;
  };
  modelHistory: {
    matrix: any[];
    rings: any[];
    graph: any[];
  };
  sessionData: {
    totalTime: number;
    accuracy: number;
    speed: number;
    logic: number;
    algorithmic: number;
  };
  helpShown: {
    matrix: boolean;
    rings: boolean;
    graph: boolean;
  };
}

const defaultState: AppState = {
  currentModel: null,
  sessionStart: null,
  moves: 0,
  progress: 0,
  solvedTasks: 0,
  matrixDifficulty: "medium",
  ringsDifficulty: "medium",
  graphDifficulty: "medium",
  matrixSave: null,
  shouldRestoreMatrix: false,
  progressHistory: [],
  moveHistory: [],
  isGameWon: false,
  totalTaskTime: 0,
  solvedModels: {
    matrix: { maxDifficulty: null, stars: 0 },
    rings: { maxDifficulty: null, stars: 0 },
    graph: { maxDifficulty: null, stars: 0 },
  },
  modelHistory: {
    matrix: [],
    rings: [],
    graph: [],
  },
  sessionData: {
    totalTime: 0,
    accuracy: 0,
    speed: 0,
    logic: 0,
    algorithmic: 0,
  },
  helpShown: {
    matrix: false,
    rings: false,
    graph: false,
  },
};

interface AppContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  updateState: (updates: Partial<AppState>) => void;
  setDifficulty: (model: NonNullable<ModelType>, difficulty: Difficulty) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("algolab_state");
      if (saved) {
        setState({ ...defaultState, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.warn("Could not load state from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("algolab_state", JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save state to localStorage", e);
    }
  }, [state]);

  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const setDifficulty = (model: NonNullable<ModelType>, difficulty: Difficulty) => {
    if (model === "matrix") {
      updateState({ matrixDifficulty: difficulty, matrixSave: null });
    } else if (model === "rings") {
      updateState({ ringsDifficulty: difficulty });
    } else if (model === "graph") {
      updateState({ graphDifficulty: difficulty });
    }
  };

  return (
    <AppContext.Provider value={{ state, setState, updateState, setDifficulty }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
