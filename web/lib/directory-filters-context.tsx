"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import type { Facets } from "@/lib/types";

export type DirectoryFilterValues = {
  q: string;
  title: string;
  company: string;
  location: string;
  industry: string;
  hasEmail: boolean;
};

export const EMPTY_DIRECTORY_FILTERS: DirectoryFilterValues = {
  q: "",
  title: "",
  company: "",
  location: "",
  industry: "",
  hasEmail: false,
};

type DirectoryFiltersContextValue = {
  filters: DirectoryFilterValues;
  draft: DirectoryFilterValues;
  setDraft: React.Dispatch<React.SetStateAction<DirectoryFilterValues>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  facets: Facets | null;
  setFacets: React.Dispatch<React.SetStateAction<Facets | null>>;
  apply: () => void;
  reset: () => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeCount: number;
};

const DirectoryFiltersContext =
  createContext<DirectoryFiltersContextValue | null>(null);

export function DirectoryFiltersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [filters, setFilters] = useState(EMPTY_DIRECTORY_FILTERS);
  const [draft, setDraft] = useState(EMPTY_DIRECTORY_FILTERS);
  const [page, setPage] = useState(1);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void api<Facets>("/contacts/facets")
      .then(setFacets)
      .catch(() => {
        setFacets(null);
      });
  }, []);

  const apply = useCallback(() => {
    setFilters(draft);
    setPage(1);
  }, [draft]);

  const reset = useCallback(() => {
    setDraft(EMPTY_DIRECTORY_FILTERS);
    setFilters(EMPTY_DIRECTORY_FILTERS);
    setPage(1);
  }, []);

  const activeCount = [
    filters.q,
    filters.title,
    filters.company,
    filters.location,
    filters.industry,
    filters.hasEmail ? "email" : "",
  ].filter(Boolean).length;

  const value = useMemo(
    () => ({
      filters,
      draft,
      setDraft,
      page,
      setPage,
      facets,
      setFacets,
      apply,
      reset,
      open,
      setOpen,
      activeCount,
    }),
    [filters, draft, page, facets, apply, reset, open, activeCount],
  );

  return (
    <DirectoryFiltersContext.Provider value={value}>
      {children}
    </DirectoryFiltersContext.Provider>
  );
}

export function useDirectoryFilters() {
  const context = useContext(DirectoryFiltersContext);
  if (!context) {
    throw new Error(
      "useDirectoryFilters must be used within DirectoryFiltersProvider",
    );
  }
  return context;
}
