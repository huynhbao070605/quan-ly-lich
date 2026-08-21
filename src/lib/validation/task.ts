import { z } from "zod";

export const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
]);

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const taskIdSchema = z.uuid();
const taskDateTimeSchema = z.string().datetime({ offset: true });

const taskFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  projectId: taskIdSchema.nullable().optional(),
  description: z.string().nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  startAt: taskDateTimeSchema.nullable().optional(),
  dueAt: taskDateTimeSchema.nullable().optional(),
  allDay: z.boolean().optional(),
  tagIds: z.array(taskIdSchema).optional(),
  important: z.boolean().optional(),
  urgent: z.boolean().optional(),
  eisenhowerOverride: z.boolean().optional(),
});

export const createTaskSchema = taskFieldsSchema;

export const updateTaskSchema = taskFieldsSchema.partial();

export const taskFilterSchema = z.object({
  projectId: taskIdSchema.nullable().optional(),
  description: z.string().optional(),
  tagIds: z.array(taskIdSchema).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  startAt: taskDateTimeSchema.optional(),
  dueAt: taskDateTimeSchema.optional(),
  allDay: z.boolean().optional(),
  important: z.boolean().optional(),
  urgent: z.boolean().optional(),
  eisenhowerOverride: z.boolean().optional(),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
