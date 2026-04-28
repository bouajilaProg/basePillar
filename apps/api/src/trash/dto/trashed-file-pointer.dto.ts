import { ApiProperty } from '@nestjs/swagger';

export class TrashedFilePointerDto {
  @ApiProperty({ example: '4cb2d708-233f-4eb7-a8c5-f2682f7e9eea' })
  id: string;

  @ApiProperty({ example: '7c1f7f0f-2ef6-4a2d-94db-4f2a2f7cf3d1' })
  fileId: string;

  @ApiProperty({ example: 'b3c7f5db-6f1e-4f6a-bbe6-2b5fbc0b1dd4' })
  folderId: string;

  @ApiProperty({ example: 'Q1 Report.pdf' })
  name: string;

  @ApiProperty({ example: false })
  isShortcut: boolean;

  @ApiProperty({ example: true })
  isArchived: boolean;

  @ApiProperty({ example: '2026-04-26T15:20:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-26T15:20:00.000Z' })
  updatedAt: Date;
}
