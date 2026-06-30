const STORAGE_KEY = 'teachers-helper-poc-state';

export const initialState = {
  teacher: {
    name: 'Demo Teacher',
    plan: 'R89/month',
    voiceNotesUsedThisWeek: 0,
    voiceNoteWeeklyLimit: 100,
  },
  classes: [
    {
      id: 'class-1',
      name: 'Grade 3J',
      grade: 'Grade 3',
      term: 'Term 2',
    },
  ],
  learners: [
    { id: 'learner-1', classId: 'class-1', fullName: 'Jackson Smith', preferredName: 'Jackson' },
    { id: 'learner-2', classId: 'class-1', fullName: 'Emily Brown', preferredName: 'Emily' },
    { id: 'learner-3', classId: 'class-1', fullName: 'Henry Mokoena', preferredName: 'Henry' },
    { id: 'learner-4', classId: 'class-1', fullName: 'James Patel', preferredName: 'James' },
  ],
  observations: [
    {
      id: 'obs-1',
      learnerId: 'learner-4',
      classId: 'class-1',
      type: 'typed',
      text: 'James keeps getting the 8 times table mixed up.',
      category: 'Maths',
      sentiment: 'Development area',
      createdAt: new Date().toISOString(),
      usedInReport: false,
    },
    {
      id: 'obs-2',
      learnerId: 'learner-3',
      classId: 'class-1',
      type: 'typed',
      text: 'Henry’s reading has improved so much and he is more willing to read aloud.',
      category: 'Reading',
      sentiment: 'Improvement',
      createdAt: new Date().toISOString(),
      usedInReport: false,
    },
  ],
  reportStructure: {
    tone: 'Warm, specific and professional',
    sections: [
      { id: 'section-1', name: 'English', minWords: 60, maxWords: 90 },
      { id: 'section-2', name: 'Maths', minWords: 60, maxWords: 90 },
      { id: 'section-3', name: 'General Comment', minWords: 80, maxWords: 120 },
    ],
  },
};

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialState;
  } catch (error) {
    console.warn('Could not load saved state. Falling back to demo state.', error);
    return initialState;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return initialState;
}
