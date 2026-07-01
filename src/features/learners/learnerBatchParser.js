const HEADERS = ['name', 'full name', 'learner', 'learners', 'student', 'students'];

export function parseLearnerNames(text = '') {
  return text
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-•\d.\s]+/, '').trim())
    .filter(Boolean)
    .filter((line) => !HEADERS.includes(line.toLowerCase()))
    .filter((line, index, list) => list.findIndex((item) => item.toLowerCase() === line.toLowerCase()) === index);
}
