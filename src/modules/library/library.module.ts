import { Module } from '@nestjs/common';

import { LibrarySearch } from './application/library-search';
import { LibraryService } from './application/library.service';
import { LibraryIndex } from './infrastructure/library-index';
import { LibraryStorage } from './infrastructure/library-storage';
import { LibraryController } from './library.controller';

@Module({
  controllers: [LibraryController],
  providers: [LibraryStorage, LibraryIndex, LibrarySearch, LibraryService],
  exports: [LibraryStorage, LibraryIndex, LibraryService],
})
export class LibraryModule {}
