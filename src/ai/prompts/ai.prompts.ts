export function buildPlanPrompt(context: {
  student: {
    name: string;
    subject: string;
    currentLevel: string;
    learningGoals: string[];
    weakAreas: string[];
  };
  topic: string;
  pastSessions: Array<{
    topic: string;
    notes: string;
    aiDebrief?: any;
    scheduledAt: Date;
  }>;
}): string {
  const pastHistory = context.pastSessions.length > 0
    ? context.pastSessions.map(s => 
        `- ${s.scheduledAt.toISOString().split('T')[0]}: ${s.topic} ${s.aiDebrief ? `(Debrief: ${s.aiDebrief.summary.substring(0, 100)}...)` : ''}`
      ).join('\n')
    : 'No previous sessions available.';

  return `
**STUDENT PROFILE**
- Name: ${context.student.name}
- Subject: ${context.student.subject}
- Current Level: ${context.student.currentLevel}
- Learning Goals: ${context.student.learningGoals.join(', ') || 'Not specified'}
- Weak Areas: ${context.student.weakAreas.join(', ') || 'Not specified'}

**CURRENT SESSION**
- Topic: ${context.topic}

**PAST SESSION HISTORY**
${pastHistory}

Generate a personalized session plan with:
- Learning objectives (at least 1)
- Lesson outline (exactly 4 steps with title and description)
- Practice questions (exactly 3)

Return only valid JSON with the following schema:
{
  "learningObjectives": ["objective1", ...],
  "lessonOutline": [{"title": "...", "description": "..."}, ...],
  "practiceQuestions": ["question1", ...]
}
`;
}

export function buildDebriefPrompt(context: {
  student: {
    name: string;
    subject: string;
    currentLevel: string;
    learningGoals: string[];
    weakAreas: string[];
  };
  topic: string;
  notes: string;
  pastSessions: Array<{
    topic: string;
    aiDebrief?: any;
    scheduledAt: Date;
  }>;
}): string {
  const pastHistory = context.pastSessions.length > 0
    ? context.pastSessions.map(s => 
        `- ${s.scheduledAt.toISOString().split('T')[0]}: ${s.topic} ${s.aiDebrief ? `(Next focus: ${s.aiDebrief.nextFocus})` : ''}`
      ).join('\n')
    : 'No previous sessions.';

  return `
**STUDENT PROFILE**
- Name: ${context.student.name}
- Subject: ${context.student.subject}
- Current Level: ${context.student.currentLevel}
- Learning Goals: ${context.student.learningGoals.join(', ') || 'Not specified'}
- Weak Areas: ${context.student.weakAreas.join(', ') || 'Not specified'}

**SESSION TOPIC**
${context.topic}

**TUTOR'S NOTES**
${context.notes || 'No notes recorded.'}

**PREVIOUS SESSION HISTORY**
${pastHistory}

Generate a debrief with:
- Summary of what was covered and achieved
- 2-3 homework tasks
- Suggested focus for next session

Return only valid JSON with schema:
{
  "summary": "...",
  "homework": ["task1", "task2", ...],
  "nextFocus": "..."
}
`;
}

export function buildProgressPrompt(context: {
  student: {
    name: string;
    subject: string;
    currentLevel: string;
    learningGoals: string[];
    weakAreas: string[];
  };
  pastDebriefs: Array<{
    summary: string;
    homework: string[];
    nextFocus: string;
    topic: string;
    scheduledAt: Date;
  }>;
}): string {
  const debriefHistory = context.pastDebriefs.length > 0
    ? context.pastDebriefs.map(d => 
        `- ${d.scheduledAt.toISOString().split('T')[0]} (${d.topic}): Summary: ${d.summary.substring(0, 150)}... Next focus: ${d.nextFocus}`
      ).join('\n')
    : 'No debriefs available.';

  return `
**STUDENT PROFILE**
- Name: ${context.student.name}
- Subject: ${context.student.subject}
- Current Level: ${context.student.currentLevel}
- Learning Goals: ${context.student.learningGoals.join(', ') || 'Not specified'}
- Weak Areas: ${context.student.weakAreas.join(', ') || 'Not specified'}

**PAST SESSION DEBRIEFS**
${debriefHistory}

Based on the above, provide a concise progress summary covering:
- Areas of improvement
- Persistent weaknesses
- Recurring patterns
- Areas requiring reinforcement
- Sensible next learning focus

Return a single paragraph (plain text, not JSON).
`;
}