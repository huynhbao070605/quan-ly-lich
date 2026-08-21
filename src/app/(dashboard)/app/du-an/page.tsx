import { Archive, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";

import { requireUser } from "@/lib/auth/require-user";
import {
  listProjectSummaries,
  type ProjectSummaryRecord,
  type ProjectSupabaseClient,
} from "@/lib/projects/project-repository";
import { createServerClient } from "@/lib/supabase/server";

function completion(project: ProjectSummaryRecord): number {
  if (project.task_count === 0) {
    return 0;
  }

  return Math.round((project.done_count / project.task_count) * 100);
}

function ProjectCard({ project }: { project: ProjectSummaryRecord }) {
  const percent = completion(project);

  return (
    <Link
      href={`/app/du-an/${project.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ backgroundColor: project.color ?? "#0f766e" }}
            />
            <h2 className="truncate text-base font-semibold text-slate-950">
              {project.name}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {project.done_count}/{project.task_count} công việc hoàn thành
          </p>
        </div>
        {project.archived ? (
          <Archive aria-hidden="true" className="size-5 shrink-0 text-slate-400" />
        ) : null}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-600"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-sm font-medium text-slate-700">{percent}%</p>
    </Link>
  );
}

function ProjectSection({
  empty,
  projects,
  title,
}: {
  empty: string;
  projects: ProjectSummaryRecord[];
  title: string;
}) {
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
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function ProjectsPage() {
  const user = await requireUser();
  const supabase = (await createServerClient()) as unknown as ProjectSupabaseClient;
  const projects = await listProjectSummaries(supabase, user.id);
  const activeProjects = projects.filter((project) => !project.archived);
  const archivedProjects = projects.filter((project) => project.archived);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Dự án</h1>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi tiến độ công việc theo từng nhóm mục tiêu.
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
          <Plus aria-hidden="true" className="size-4" />
          Dự án mới
        </button>
      </div>

      <ProjectSection
        title="Đang hoạt động"
        projects={activeProjects}
        empty="Chưa có dự án đang hoạt động."
      />
      <ProjectSection
        title="Đã lưu trữ"
        projects={archivedProjects}
        empty="Chưa có dự án đã lưu trữ."
      />

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <FolderKanban aria-hidden="true" className="size-4" />
        <span>{projects.length} dự án</span>
      </div>
    </div>
  );
}
