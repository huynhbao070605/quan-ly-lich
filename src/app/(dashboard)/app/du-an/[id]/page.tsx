import { CalendarDays, Columns3, FolderKanban } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import {
  getProjectSummaryById,
  type ProjectSupabaseClient,
} from "@/lib/projects/project-repository";
import { createServerClient } from "@/lib/supabase/server";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = (await createServerClient()) as unknown as ProjectSupabaseClient;
  const project = await getProjectSummaryById(supabase, user.id, id);

  if (project === null) {
    notFound();
  }

  const completion =
    project.task_count === 0
      ? 0
      : Math.round((project.done_count / project.task_count) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ backgroundColor: project.color ?? "#0f766e" }}
            />
            <h1 className="text-2xl font-semibold text-slate-950">
              {project.name}
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {project.done_count}/{project.task_count} công việc hoàn thành
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/kanban?projectId=${project.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Columns3 aria-hidden="true" className="size-4" />
            Xem trong Kanban
          </Link>
          <Link
            href={`/app/lich?projectId=${project.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            Xem trong Lịch
          </Link>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav aria-label="Dự án" className="flex gap-5">
          <a className="border-b-2 border-teal-600 px-1 py-3 text-sm font-semibold text-teal-700">
            Tổng quan
          </a>
          <a className="px-1 py-3 text-sm font-medium text-slate-600">Công việc</a>
        </nav>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Tổng công việc</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {project.task_count}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Đã hoàn thành</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {project.done_count}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Tiến độ</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {completion}%
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <FolderKanban aria-hidden="true" className="size-5 text-teal-700" />
          <h2 className="text-base font-semibold text-slate-950">Công việc</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Danh sách công việc của dự án sẽ dùng cùng nguồn dữ liệu với các chế độ xem khác.
        </p>
      </section>
    </div>
  );
}
