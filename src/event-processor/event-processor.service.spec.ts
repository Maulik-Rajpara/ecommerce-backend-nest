import { Test, TestingModule } from '@nestjs/testing';
import { EventProcessorService } from './event-processor.service';

describe('EventProcessorService', () => {
  let service: EventProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventProcessorService],
    }).compile();

    service = module.get<EventProcessorService>(EventProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
