export function readFileForExtraction(file) {
  return new Promise((resolve, reject) => {
    const isSpreadsheet =
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls');
    const isPdf = file.type === 'application/pdf';

    if (isPdf || isSpreadsheet) {
      const reader = new FileReader();
      reader.onload = () => resolve({ fileBase64: reader.result.split(',')[1], mimeType: file.type || (isSpreadsheet ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf') });
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => resolve({ textContent: reader.result, mimeType: file.type || 'text/csv' });
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsText(file);
    }
  });
}

export async function extractMarks({ file, learnerNames }) {
  const fileData = await readFileForExtraction(file);

  const response = await fetch('/.netlify/functions/parse-marks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...fileData, learnerNames }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.details || data.error || 'Could not extract marks from that file.');
  }

  return data.learners || [];
}
