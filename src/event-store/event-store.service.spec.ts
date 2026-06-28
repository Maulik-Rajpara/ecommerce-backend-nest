import { Test, TestingModule } from "@nestjs/testing";
import { EventStoreService } from "./event-store.service";

describe("EventStoreService", () => {
  let service: EventStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: EventStoreService, useValue: {} }],
    }).compile();

    service = module.get<EventStoreService>(EventStoreService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
