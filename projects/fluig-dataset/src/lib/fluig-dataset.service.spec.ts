import { TestBed } from '@angular/core/testing';
import { FluigDatasetService } from './fluig-dataset.service';

describe('FluigDatasetService', () => {
  let service: FluigDatasetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FluigDatasetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
