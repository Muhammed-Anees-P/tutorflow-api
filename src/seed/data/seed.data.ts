import { Role } from 'src/common/enum/role.enum';
import { SessionStatus } from 'src/common/enum/session-status.enum';

export const seedData = {
  tutor: {
    username: 'tutor_demo',
    firstName: 'Muhammed',
    lastName: 'anees',
    email: 'aneespengad4447@gmail.com',
    password: '123456',
    role: Role.TUTOR,
    isActive: true,
  },
  student: {
    name: 'student_demo',
    email: 'student@example.com',
    password: '123456',
    subject: 'Mathematics',
    currentLevel: 'Grade 8',
    learningGoals: [
      'Improve algebra fundamentals',
      'Master linear equations',
      'Understand word problems',
    ],
    weakAreas: ['Linear equations', 'Word problems', 'Multi-step equations'],
  },
  sessions: [
    {
      topic: 'Algebra Basics',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: SessionStatus.SCHEDULED,
    },
    {
      topic: 'Linear Equations',
      scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: SessionStatus.SCHEDULED,
    },
    {
      topic: 'Word Problems',
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      status: SessionStatus.COMPLETED,
      notes:
        'Covered translating word problems into equations. Student struggled with identifying key information.',
      aiDebrief: {
        summary:
          'Reviewed word problem strategies. Student needs more practice with multi-step problems.',
        homework: [
          'Practice 5 word problems from chapter 3',
          'Create 3 word problems of your own',
        ],
        nextFocus: 'Multi-step word problems with variables on both sides',
      },
    },
    {
      topic: 'Solving Equations',
      scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      status: SessionStatus.AI_REVIEWED,
      notes: 'Reviewed solving one-step and two-step equations. Good progress!',
      aiPlan: {
        learningObjectives: [
          'Solve one-step equations',
          'Solve two-step equations',
          'Check solutions',
        ],
        lessonOutline: [
          {
            title: 'Review of One-Step',
            description:
              'Solve equations with addition, subtraction, multiplication, division',
          },
          {
            title: 'Two-Step Equations',
            description: 'Combine operations to solve',
          },
          {
            title: 'Checking Solutions',
            description: 'Verify answers by substitution',
          },
          {
            title: 'Mixed Practice',
            description: 'Solve various equation types',
          },
        ],
        practiceQuestions: ['2x + 3 = 7', '3x - 4 = 11', 'x/2 + 5 = 8'],
      },
      aiDebrief: {
        summary:
          'Student demonstrated good understanding of two-step equations. Need more work on negative coefficients.',
        homework: [
          'Solve 10 equations with negative numbers',
          'Review practice problems',
        ],
        nextFocus: 'Equations with variables on both sides',
      },
    },
  ],
};
