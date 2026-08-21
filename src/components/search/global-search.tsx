"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  searchGlobal,
  type GlobalSearchResults,
} from "@/actions/search-actions";

const emptyResults: GlobalSearchResults = { tasks: [], projects: [] };

export function GlobalSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(emptyResults);
  const [completedQuery, setCompletedQuery] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target;
      const isTextInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (event.key !== "/" || event.defaultPrevented || isTextInput) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();
    }

    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) {
      return;
    }

    let isCurrent = true;
    const timeoutId = window.setTimeout(async () => {
      const result = await searchGlobal(trimmedQuery);

      if (!isCurrent) return;

      if (result.ok) {
        setResults(result.data);
        setHasError(false);
        setCompletedQuery(trimmedQuery);
        return;
      }

      setResults(emptyResults);
      setHasError(true);
      setCompletedQuery(trimmedQuery);
    }, 300);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const isLoading = hasQuery && query.trim() !== completedQuery;
  const showError = hasQuery && !isLoading && hasError;
  const showResults = hasQuery && !isLoading && !showError;
  const hasResults = results.tasks.length > 0 || results.projects.length > 0;

  return (
    <div className="relative max-w-xl flex-1" role="search">
      <label className="relative block">
        <span className="sr-only">Tìm công việc</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm công việc..."
          className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      {hasQuery ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {isLoading ? (
            <p className="px-3 py-3 text-sm text-slate-600" role="status">
              Đang tìm kiếm...
            </p>
          ) : null}
          {showError ? (
            <p className="px-3 py-3 text-sm text-rose-700" role="alert">
              Không thể tìm kiếm. Vui lòng thử lại.
            </p>
          ) : null}
          {showResults && !hasResults ? (
            <p className="px-3 py-3 text-sm text-slate-600">Không tìm thấy kết quả.</p>
          ) : null}
          {showResults && results.tasks.length > 0 ? (
            <section aria-labelledby="search-tasks-heading">
              <h2
                id="search-tasks-heading"
                className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-500"
              >
                Công việc
              </h2>
              <ul>
                {results.tasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      className="block px-3 py-2 text-sm hover:bg-slate-50"
                      href={`/app/cong-viec?taskId=${task.id}`}
                    >
                      <span className="block truncate font-medium text-slate-900">{task.title}</span>
                      <span className="block truncate text-slate-500">
                        {[task.projectName, ...task.tagNames].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {showResults && results.projects.length > 0 ? (
            <section aria-labelledby="search-projects-heading">
              <h2
                id="search-projects-heading"
                className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-500"
              >
                Dự án
              </h2>
              <ul>
                {results.projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      className="block px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                      href={`/app/du-an/${project.id}`}
                    >
                      {project.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
