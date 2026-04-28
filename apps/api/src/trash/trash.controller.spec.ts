import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { TrashController } from './trash.controller';
import { TrashService } from './trash.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilebaseAccessGuard } from '@/files/guards/filebaseAccess.guard';

// Mock guard that bypasses authentication
const mockGuard: CanActivate = {
  canActivate: (context: ExecutionContext) => true,
};

describe('TrashController', () => {
  let controller: TrashController;
  let service: TrashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrashController],
      providers: [
        {
          provide: TrashService,
          useValue: {
            moveToTrash: jest.fn(),
            restoreFromTrash: jest.fn(),
            listTrashedItems: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(FilebaseAccessGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TrashController>(TrashController);
    service = module.get<TrashService>(TrashService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have moveToTrash method', () => {
    expect(controller.moveToTrash).toBeDefined();
  });

  it('should have restoreFromTrash method', () => {
    expect(controller.restoreFromTrash).toBeDefined();
  });

  it('should have listTrash method', () => {
    expect(controller.listTrash).toBeDefined();
  });
});
