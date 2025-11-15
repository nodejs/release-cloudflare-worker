// This file is used to setup things before we switch into a wranglerd isolate.
// It is ran in Node.js and has access to Node's apis.

import { join, relative } from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import type { TestProject } from 'vitest/node';

const DEV_BUCKET_PATH = join(import.meta.dirname, 'dev-bucket');

/**
 * This is called when Vitest is ran and allows us to pass in data that we need
 * for the tests
 */
export default async function setup(project: TestProject) {
  // Get the contents of the dev bucket
  const devBucket = await listDirectory(DEV_BUCKET_PATH);

  // Expose it for the tests
  project.provide('devBucket', devBucket);
}

interface File {
  size: number;
  lastModified: number;
  contents: string;
}

export interface Directory {
  name: string;
  subdirectories: Record<string, Directory>;
  files: Record<string, File>;
}

async function listDirectory(directoryPath: string): Promise<Directory> {
  const directory: Directory = {
    name: relative(DEV_BUCKET_PATH, directoryPath),
    subdirectories: {},
    files: {},
  };

  const paths = await readdir(directoryPath, { recursive: true });

  for (const path of paths) {
    const relativePath = join(directoryPath, path);

    const statResult = await stat(relativePath);

    if (statResult.isFile()) {
      const contents = await readFile(relativePath, 'utf8');

      directory.files[path] = {
        size: contents.length,
        lastModified: Math.floor(Date.now() / 1000),
        contents,
      };
    } else {
      const subdirectory = await listDirectory(relativePath);

      directory.subdirectories[path] = subdirectory;
    }
  }

  return directory;
}
