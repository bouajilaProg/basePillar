import { ApiProperty } from '@nestjs/swagger';

export class StarDto {
  @ApiProperty({ example: '4cb2d708-233f-4eb7-a8c5-f2682f7e9eea' })
  id: string;

  @ApiProperty({ example: 'ba564d6f-6204-4296-a539-f39ff20411c8' })
  filebaseId: string;

  @ApiProperty({ example: '7fc9517e-7d8a-4b58-9c75-c5967ca5a9df' })
  folderId: string;

  @ApiProperty({ example: '22db660d-e63a-4f26-a975-c5bfd0f36e87' })
  userId: string;

  @ApiProperty({ example: '2026-04-26T15:20:00.000Z' })
  createdAt: Date;
}

export class StarredFolderDto extends StarDto {
  @ApiProperty({ example: 'Design Docs' })
  folderName: string;

  @ApiProperty({ example: 'b0dc4448-c9a6-4bf8-962f-00c87ee15ef9', nullable: true })
  parentId: string | null;
}

export class UnstarResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}
