"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTaxReturn() {
  const { data, error, isLoading, mutate } = useSWR("/api/tax-return", fetcher);
  return {
    taxReturn: data?.taxReturn,
    error,
    isLoading,
    mutate,
  };
}

export function useDocuments() {
  const { data, error, isLoading, mutate } = useSWR("/api/documents", fetcher);
  return {
    documents: data?.documents ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useExtractedItems() {
  const { data, error, isLoading, mutate } = useSWR("/api/items", fetcher);
  return {
    items: data?.items ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR("/api/categories", fetcher);
  return {
    categories: data?.categories ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useTaxSummary() {
  const { data, error, isLoading, mutate } = useSWR("/api/tax-return/summary", fetcher);
  return {
    summary: data?.summary,
    categoryTotals: data?.categoryTotals ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useGeneratedForms() {
  const { data, error, isLoading, mutate } = useSWR("/api/generate-forms", fetcher);
  return {
    forms: data?.forms ?? [],
    error,
    isLoading,
    mutate,
  };
}
