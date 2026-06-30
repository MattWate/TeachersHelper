export function mapDashboard(data) {
  return {
    profile: data.profile,
    classes: data.classes || [],
    learners: data.learners || [],
    observations: data.observations || [],
    reportStructures: data.reportStructures || [],
    usage: data.usage || { voice_note_count: 0, seconds_used: 0 },
  };
}

export function getActiveClass(dashboard, selectedClassId) {
  return dashboard?.classes.find((item) => item.id === selectedClassId) || dashboard?.classes[0] || null;
}

export function getClassLearners(dashboard, classId) {
  return dashboard?.learners.filter((learner) => learner.class_id === classId) || [];
}

export function getLearnerObservations(dashboard, learnerId) {
  return dashboard?.observations.filter((observation) => observation.learner_id === learnerId) || [];
}

export function wordCount(text = '') {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function displayLearnerName(learner) {
  return learner?.preferred_name || learner?.full_name || 'this learner';
}
