const HEADER_WORDS = ['name', 'full name', 'learner', 'learners', 'student', 'students'];

export function parseLearnerList(text = '') {
  return text
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-•\d.\s]+/, '').trim())
    .filter(Boolean)
    .filter((line) => !HEADER_WORDS.includes(line.toLowerCase()))
    .filter((line, index, list) => list.findIndex((item) => item.toLowerCase() === line.toLowerCase()) === index);
}
