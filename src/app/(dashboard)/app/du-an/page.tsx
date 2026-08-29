import { ProjectsWorkspace } from "@/components/projects/projects-workspace";
import { requireUser } from "@/lib/auth/require-user";
import {
  listProjectSummaries,
  type ProjectSupabaseClient,
} from "@/lib/projects/project-repository";
import { createServerClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const user = await requireUser();
  const supabase = (await createServerClient()) as unknown as ProjectSupabaseClient;
  const projects = await listProjectSummaries(supabase, user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Dự án</h1>
        <p className="mt-1 text-sm text-slate-600">
          Theo dõi tiến độ công việc theo từng nhóm mục tiêu.
        </p>
      </div>
      <ProjectsWorkspace projects={projects} />
    </div>
  );
}
