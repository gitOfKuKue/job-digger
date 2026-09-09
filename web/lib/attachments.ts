export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 15 * 1024 * 1024;

export type ExistingFile = {
  name: string;
  size: number;
  lastModified?: number;
};

export function takeFiles(incoming: File[], already: ExistingFile[]) {
  const accepted: File[] = [];
  let error: string | null = null;
  let count = already.length;
  let bytes = already.reduce((sum, file) => sum + file.size, 0);

  const seen = new Set(
    already.map(
      (file) => `${file.name}:${file.size}:${file.lastModified ?? 0}`,
    ),
  );

  for (const file of incoming) {
    if (count >= MAX_FILES) {
      error = `You can attach up to ${MAX_FILES} files.`;
      break;
    }
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) continue;
    if (file.size > MAX_FILE_BYTES) {
      error = `${file.name} is larger than 10 MB.`;
      continue;
    }
    if (bytes + file.size > MAX_TOTAL_BYTES) {
      error = "Attachments together must be 15 MB or smaller.";
      break;
    }
    seen.add(key);
    accepted.push(file);
    count += 1;
    bytes += file.size;
  }

  return { accepted, error };
}
