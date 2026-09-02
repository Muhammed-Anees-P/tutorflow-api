import { z } from 'zod';

export const SessionPlanSchema = z.object({
  learningObjectives: z.array(z.string()).min(1),
  lessonOutline: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ).length(4),
  practiceQuestions: z.array(z.string()).length(3),
});

export const SessionDebriefSchema = z.object({
  summary: z.string().min(10),
  homework: z.array(z.string()).min(2).max(3),
  nextFocus: z.string().min(5),
});

export type SessionPlan = z.infer<typeof SessionPlanSchema>;
export type SessionDebrief = z.infer<typeof SessionDebriefSchema>;