"use client";

import { Archive, FolderKanban, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  archiveProject,
  createProject,
  deleteProject,
} from "@/actions/project-actions";
import type { ProjectSummaryRecord } from "@/lib/projects/project-repository";

function completion(project: ProjectSummaryRecord): number {
  return project.task_count === 0
    ? 0
    : Math.round((project.done_count / project.task_count) * 100);
}

type ProjectSectionProps = {
  empty: string;
  onArchive: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  projects: ProjectSummaryRecord[];
  title: string;
};

function ProjectSection({
  empty,
  onArchive,
  onDelete,
  projects,
  title,
}: ProjectSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          {empty}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const percent = completion(project);
            return (
              <article
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                key={project.id}
              >
                <Link className="block hover:text-teal-700" href={`/app/du-an/${project.id}`}>
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-3 rounded-full"
                      style={{ backgroundColor: project.color ?? "#0f766e" }}
                    />
                    <h3 className="truncate text-base font-semibold text-slate-950">
                      {project.name}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {project.done_count}/{project.task_count} công việc hoàn thành
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-600"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700">{percent}%</p>
                </Link>
                <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  {!project.archived ? (
                    <button
                      aria-label={`Lưu trữ ${project.name}`}
                      className="inline-flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                      onClick={() => onArchive(project.id)}
                      type="button"
                    >
                      <Archive aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
                  <button
                    aria-label={`Xóa ${project.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                    onClick={() => onDelete(project.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ProjectsWorkspace({ projects }: { projects: ProjectSummaryRecord[] }) {
  const router = useRouter();
  const [color, setColor] = useState("#0f766e");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const activeProjects = projects.filter((project) => !project.archived);
  const archivedProjects = projects.filter((project) => project.archived);

  async function run(
    promise: Promise<{ ok: true; data: unknown } | { ok: false; message: string }>,
  ) {
    const result = await promise;
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setError(null);
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          onClick={() => setShowForm((visible) => !visible)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Dự án mới
        </button>
      </div>

      {showForm ? (
        <form
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void run(createProject({ name, color })).then((ok) => {
              if (ok) {
                setName("");
                setShowForm(false);
              }
            });
          }}
        >
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Tên dự án</span>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Màu</span>
            <input
              aria-label="Màu"
              className="h-10 w-14 rounded-md border border-slate-300 p-1"
              onChange={(event) => setColor(event.target.value)}
              type="color"
              value={color}
            />
          </label>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
            type="submit"
          >
            Tạo dự án
          </button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-rose-700" role="status">{error}</p> : null}

      <ProjectSection
        empty="Chưa có dự án đang hoạt động."
        onArchive={(projectId) => void run(archiveProject(projectId))}
        onDelete={(projectId) => {
          if (window.confirm("Bạn có chắc muốn xóa dự án này?")) {
            void run(deleteProject(projectId));
          }
        }}
        projects={activeProjects}
        title="Đang hoạt động"
      />
      <ProjectSection
        empty="Chưa có dự án đã lưu trữ."
        onArchive={() => undefined}
        onDelete={(projectId) => {
          if (window.confirm("Bạn có chắc muốn xóa dự án này?")) {
            void run(deleteProject(projectId));
          }
        }}
        projects={archivedProjects}
        title="Đã lưu trữ"
      />

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <FolderKanban aria-hidden="true" className="size-4" />
        <span>{projects.length} dự án</span>
      </div>
    </div>
  );
}
