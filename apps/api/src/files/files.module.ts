import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
<<<<<<< HEAD
import { FilebasesService } from './filebases.service';
import { FoldersService } from './folders.service';
import { FileService } from './files.service';
import { FsService } from './fs.service';
import { AccessRulesService } from './accessRules.service';
import { UserGroupsService } from './userGroups.service';
=======
import { FilebasesService } from '../filebases/filebases.service';
import { FoldersService } from '../folders/folders.service';
import { FileService } from './files.service';
import { FsService } from '../fs/fs.service';
import { AccessRulesService } from '../access-rules/accessRules.service';
import { UserGroupsService } from '../user-groups/userGroups.service';
>>>>>>> 8dba22f3501bf352ea9476e481542473abb48eb9
import { FileCleanupService } from '../db/triggers/fileCleanup.service';

// Guards
import { FilebaseAccessGuard } from './guards/filebaseAccess.guard';
import { FileAccessGuard } from './guards/fileAccess.guard';

// Controllers
<<<<<<< HEAD
import { FilebasesController } from './filebases.controller';
import { FoldersController } from './folders.controller';
=======
import { FilebasesController } from '../filebases/filebases.controller';
import { FoldersController } from '../folders/folders.controller';
>>>>>>> 8dba22f3501bf352ea9476e481542473abb48eb9
import { FilesController } from './files.controller';

/**
 * FilesModule
 *
 * Main module for file management functionality.
 * Provides services for filebases, folders, files, and access control.
 */
@Module({
  imports: [ConfigModule],
  controllers: [FilebasesController, FoldersController, FilesController],
  providers: [
    // Core services
    FilebasesService,
    FoldersService,
    FileService,
    FsService,
    FileCleanupService,

    // Access control
    AccessRulesService,
    UserGroupsService,

    // Guards
    FilebaseAccessGuard,
    FileAccessGuard,
  ],
  exports: [
    FilebasesService,
    FoldersService,
    FileService,
    FsService,
    AccessRulesService,
    UserGroupsService,
  ],
})
export class FilesModule {}
