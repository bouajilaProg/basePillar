import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

/**
 * FsService - S3 File System Operations
 *
 * Handles all S3 operations for file storage:
 * - Upload files (buffer or stream)
 * - Download files
 * - Delete files
 * - Generate signed URLs for direct browser access
 *
 * S3 Key Format: {filebaseId}/{uuid}
 * This keeps files organized by filebase and uses UUIDs for uniqueness.
 */

export interface UploadParams {
  filebaseId: string;
  buffer: Buffer;
  mimeType: string;
}

export interface UploadResult {
  s3Key: string;
  size: number;
}

export interface SignedUploadParams {
  filebaseId: string;
  mimeType: string;
  expiresIn?: number; // seconds, default 3600
}

export interface SignedUploadResult {
  url: string;
  s3Key: string;
}

@Injectable()
export class FsService {
  private readonly logger = new Logger(FsService.name);
  private s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET') || 'basepillar-storage';

    this.s3Client = new S3Client({
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      region: this.configService.get<string>('S3_REGION') || 'garage',
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY') || '',
      },
      forcePathStyle: true, // Required for Garage and MinIO
    });
  }

  /**
   * Upload a file buffer to S3
   *
   * @param params - Upload parameters
   * @returns S3 key and file size
   */
  async upload(params: UploadParams): Promise<UploadResult> {
    const { filebaseId, buffer, mimeType } = params;

    // Generate unique S3 key: {filebaseId}/{uuid}
    const uuid = randomUUID();
    const s3Key = `${filebaseId}/${uuid}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
    });

    await this.s3Client.send(command);

    this.logger.log(`Uploaded file: ${s3Key} (${buffer.length} bytes)`);

    return {
      s3Key,
      size: buffer.length,
    };
  }

  /**
   * Download a file from S3
   *
   * @param s3Key - The S3 key of the file
   * @returns Readable stream of file content
   */
  async download(s3Key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`File not found: ${s3Key}`);
    }

    // response.Body is a Readable stream in Node.js
    return response.Body as Readable;
  }

  /**
   * Delete a file from S3
   *
   * @param s3Key - The S3 key of the file to delete
   */
  async delete(s3Key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    await this.s3Client.send(command);

    this.logger.log(`Deleted file: ${s3Key}`);
  }

  /**
   * Generate a signed URL for downloading a file
   *
   * @param s3Key - The S3 key of the file
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    return url;
  }

  /**
   * Generate a signed URL for direct browser upload
   *
   * @param params - Upload parameters
   * @returns Signed URL and the S3 key that will be used
   */
  async getSignedUploadUrl(params: SignedUploadParams): Promise<SignedUploadResult> {
    const { filebaseId, mimeType, expiresIn = 3600 } = params;

    // Generate the S3 key that will be used
    const uuid = randomUUID();
    const s3Key = `${filebaseId}/${uuid}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      url,
      s3Key,
    };
  }

  /**
   * Check if a file exists in S3
   *
   * @param s3Key - The S3 key to check
   * @returns true if file exists, false otherwise
   */
  async exists(s3Key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Duplicate a file in S3
   * 
   * @param s3key - The s3 key of the file to duplicate
   * @param filebaseId - The filebase id for the file to duplicate
   */
  async duplicate(s3key: string, filebaseId: string): Promise<string> {
    // Generate a unique S3 key for the duplicated file
    const uuid = randomUUID();
    const duplicatedFileS3Key = `${filebaseId}/${uuid}`;

    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${s3key}`,
      Key: duplicatedFileS3Key,
    });

    await this.s3Client.send(command);

    return duplicatedFileS3Key;
  }
}
