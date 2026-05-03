/**
 * Read all stdin as a UTF-8 string.
 * Resolves immediately with '' when stdin is a TTY (no pipe).
 * Listeners are not attached on TTY to avoid leaking promises.
 */
export function readStdin() {
  if (process.stdin.isTTY) return Promise.resolve('');
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}
