import { Module } from '@nestjs/common';

import { AIModule } from '../ai/ai.module';

import { LibraryClassifier } from './application/library-classifier';
import { LibrarySearch } from './application/library-search';
import { LibraryService } from './application/library.service';
import { LibraryIndex } from './infrastructure/library-index';
import { LibraryStorage } from './infrastructure/library-storage';
import { LibraryController } from './library.controller';

@Module({
  imports: [AIModule],
  controllers: [LibraryController],
  providers: [
    LibraryStorage,
    LibraryIndex,
    LibrarySearch,
    LibraryService,
    LibraryClassifier,
  ],
  exports: [LibraryStorage, LibraryIndex, LibraryService],
})
export class LibraryModule {}
