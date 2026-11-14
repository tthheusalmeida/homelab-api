import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import {
  BookService,
  type BookDetail,
  type BookReading,
  type BookSearchHit,
  type BookSummary,
} from './application/book.service';
import {
  AddChapterDto,
  CreateBookDto,
  SavePositionDto,
  SetReadDto,
  SetStructureDto,
  UpdateBookDto,
} from './dto/book.dto';

@Controller('library/books')
export class BookController {
  constructor(private readonly books: BookService) {}

  @Get()
  list(@Query('documentId') documentId?: string): Promise<BookSummary[]> {
    return this.books.list(documentId);
  }

  @Post()
  create(@Body() dto: CreateBookDto): Promise<BookDetail> {
    return this.books.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<BookDetail> {
    return this.books.get(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
  ): Promise<BookDetail> {
    return this.books.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.books.remove(id);
  }

  @Put(':id/structure')
  setStructure(
    @Param('id') id: string,
    @Body() dto: SetStructureDto,
  ): Promise<BookDetail> {
    if (!Array.isArray(dto?.modules)) {
      throw new BadRequestException('O campo "modules" deve ser uma lista.');
    }

    return this.books.setStructure(id, dto.modules);
  }

  @Post(':id/chapters')
  addChapter(
    @Param('id') id: string,
    @Body() dto: AddChapterDto,
  ): Promise<BookDetail> {
    return this.books.addChapter(id, dto?.documentId, dto?.moduleId);
  }

  @Put(':id/chapters/:documentId/read')
  setChapterRead(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() dto: SetReadDto,
  ): Promise<BookDetail> {
    return this.books.setChapterRead(id, documentId, dto?.read);
  }

  @Delete(':id/progress')
  resetProgress(@Param('id') id: string): Promise<BookDetail> {
    return this.books.resetProgress(id);
  }

  @Put(':id/position')
  savePosition(
    @Param('id') id: string,
    @Body() dto: SavePositionDto,
  ): Promise<BookDetail> {
    return this.books.saveLastPosition(id, dto);
  }

  @Get(':id/read')
  read(@Param('id') id: string): Promise<BookReading> {
    return this.books.read(id);
  }

  @Get(':id/search')
  search(
    @Param('id') id: string,
    @Query('q') q?: string,
  ): Promise<BookSearchHit[]> {
    return this.books.search(id, q ?? '');
  }
}
