import { Role } from 'src/common/enum/role.enum';
import { SessionStatus } from 'src/common/enum/session-status.enum';

export const seedData = {
  tutor: {
    username: 'tutor_one',
    firstName: 'Muhammed',
    lastName: 'anees',
    email: 'aneespengad4447@gmail.com',
    password: '123456',
    role: Role.TUTOR,
    isActive: true,
  },

  tutor_two: {
    username: 'tutor_two',
    firstName: 'John',
    lastName: 'Smith',
    email: 'tutor2@example.com',
    password: '123456',
    role: Role.TUTOR,
    isActive: true,
  },

  student: {
    username: 'student_one',
    name: 'student_one',
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

  student_two: {
    username: 'student_two',
    name: 'student_two',
    email: 'student2@example.com',
    password: '123456',
    subject: 'Science',
    currentLevel: 'Grade 9',
    learningGoals: [
      'Improve physics fundamentals',
      'Understand motion and forces',
      'Master basic scientific calculations',
    ],
    weakAreas: ['Newton laws', 'Force calculations', 'Unit conversions'],
  },

  sessions: [
    {
      topic: 'Algebra Basics',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: SessionStatus.SCHEDULED,
    },

    {
      topic: 'Linear Equations',
      scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: SessionStatus.SCHEDULED,
    },

    {
      topic: 'Word Problems',
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
      scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
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

    {
      topic: 'Introduction to Physics',
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: SessionStatus.SCHEDULED,
    },

    {
      topic: 'Forces and Motion',
      scheduledAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      status: SessionStatus.SCHEDULED,
    },

    {
      topic: 'Newton Laws',
      scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: SessionStatus.COMPLETED,
      notes:
        'Reviewed Newton first and second laws. Student understands the concepts but needs more practice with force calculations.',
      aiDebrief: {
        summary:
          'Student understands the basic concepts of Newton laws but needs additional practice applying formulas to numerical problems.',
        homework: [
          'Solve 5 force calculation problems',
          'Review Newton laws and examples',
        ],
        nextFocus: 'Applying F = ma to real-world problems',
      },
    },

    {
      topic: 'Motion and Speed',
      scheduledAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      status: SessionStatus.AI_REVIEWED,
      notes:
        'Reviewed speed, distance, and time calculations. Student showed good understanding of the basic formulas.',
      aiPlan: {
        learningObjectives: [
          'Understand speed and velocity',
          'Calculate distance and time',
          'Solve basic motion problems',
        ],
        lessonOutline: [
          {
            title: 'Speed Fundamentals',
            description:
              'Understand the relationship between distance, time, and speed',
          },
          {
            title: 'Formula Practice',
            description: 'Use speed = distance / time to solve problems',
          },
          {
            title: 'Unit Conversions',
            description: 'Convert between common distance and time units',
          },
          {
            title: 'Mixed Practice',
            description: 'Solve real-world motion problems',
          },
        ],
        practiceQuestions: [
          'A car travels 120 km in 2 hours. What is its speed?',
          'How far will an object travel at 10 m/s for 5 seconds?',
          'How long does it take to travel 100 km at 50 km/h?',
        ],
      },
      aiDebrief: {
        summary:
          'Student demonstrated a good understanding of basic motion calculations. More practice is needed with unit conversions.',
        homework: [
          'Solve 10 speed and distance problems',
          'Practice km/h to m/s conversions',
        ],
        nextFocus: 'Motion problems involving unit conversions',
      },
    },
  ],
};
