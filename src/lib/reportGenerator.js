export function classifyObservation(text) {
  const lower = text.toLowerCase();

  if (lower.includes('read') || lower.includes('reading')) {
    return { category: 'Reading', sentiment: lower.includes('improved') ? 'Improvement' : 'Observation' };
  }

  if (lower.includes('times table') || lower.includes('math') || lower.includes('number')) {
    return { category: 'Maths', sentiment: lower.includes('struggle') || lower.includes('mixed up') ? 'Development area' : 'Observation' };
  }

  if (lower.includes('friend') || lower.includes('helped') || lower.includes('kind')) {
    return { category: 'Social development', sentiment: 'Positive' };
  }

  if (lower.includes('focus') || lower.includes('concentration')) {
    return { category: 'Focus', sentiment: 'Development area' };
  }

  return { category: 'General', sentiment: 'Observation' };
}

export function generateLearnerReport({ learner, observations, reportStructure }) {
  const learnerNotes = observations.filter((observation) => observation.learnerId === learner.id);
  const notesText = learnerNotes.map((observation) => observation.text).join(' ');

  const hasReading = /read|reading|book|fluency/i.test(notesText);
  const hasMaths = /math|number|times table|calculation|multiply|multiplication/i.test(notesText);
  const hasSocial = /friend|helped|kind|group|settle/i.test(notesText);
  const hasFocus = /focus|concentration|distract/i.test(notesText);

  const sectionDrafts = reportStructure.sections.map((section) => {
    const sectionName = section.name.toLowerCase();

    if (sectionName.includes('english')) {
      if (hasReading) {
        return {
          sectionName: section.name,
          text: `${learner.preferredName} has shown encouraging progress in reading this term. The classroom notes suggest growing confidence and a greater willingness to engage with texts, especially when reading aloud. Continued regular reading practice will help ${learner.preferredName} build fluency and strengthen comprehension further.`,
        };
      }

      return {
        sectionName: section.name,
        text: `${learner.preferredName} is continuing to develop important English skills. More specific classroom observations would help make this section more personal, particularly around reading, writing, spelling and comprehension.`,
      };
    }

    if (sectionName.includes('math')) {
      if (hasMaths) {
        return {
          sectionName: section.name,
          text: `${learner.preferredName} is developing confidence in Maths and benefits from regular practice with key number facts. The notes highlight an area to keep strengthening, especially around multiplication recall. Short, consistent practice will support quicker and more accurate work.`,
        };
      }

      return {
        sectionName: section.name,
        text: `${learner.preferredName} is working steadily in Maths. Adding a few observations about number work, calculations or problem-solving would help produce a more specific and balanced comment.`,
      };
    }

    const strengths = [];
    if (hasSocial) strengths.push('positive social awareness');
    if (hasFocus) strengths.push('a need for gentle support with focus during longer tasks');
    if (learnerNotes.length > 0 && strengths.length === 0) strengths.push('steady classroom engagement');

    return {
      sectionName: section.name,
      text: `${learner.preferredName} is a valued member of the class. ${strengths.length ? `The notes from this term point to ${strengths.join(' and ')}.` : 'A few personal observations would help make this general comment warmer and more specific.'} With continued encouragement, ${learner.preferredName} can keep building confidence and independence next term.`,
    };
  });

  const questions = [];
  if (learnerNotes.length < 2) questions.push(`What is one thing you want to highlight about ${learner.preferredName} this term?`);
  if (!hasSocial) questions.push(`Is there anything worth mentioning about ${learner.preferredName}'s friendships, confidence or classroom contribution?`);
  if (!hasMaths) questions.push(`Is there a specific Maths goal ${learner.preferredName} should focus on next term?`);

  return {
    learnerId: learner.id,
    learnerName: learner.fullName,
    sections: sectionDrafts,
    questions: questions.slice(0, 3),
  };
}
