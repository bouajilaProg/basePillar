import type { Filebase, FilePointer, Folder, User } from './drive-types';
import { auth } from './services/auth.service';
import { filebases } from './services/filebases.service';
import { folders } from './services/folders.service';
import { files } from './services/files.service';

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const api = {
  auth,
  filebases,
  folders,
  files,
};
