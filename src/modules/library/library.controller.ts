import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  LibraryClassifier,
  type ClassificationSuggestion,
} from './application/library-classifier';
import {
  LibraryService,
  type DocumentDetail,
  type IndexStatus,
  type TagCount,
} from './application/library.service';
import type { DocumentSummary } from './application/library-search';
import type { CategoryNode } from './domain/categories';
import {
  CreateArticleDto,
  LibraryQueryDto,
  PublishDocumentDto,
  SuggestDocumentDto,
  UpdateDocumentDto,
  optionalStringList,
  requireStringList,
  toList,
} from './dto/library.dto';
import type { RebuildResult } from './infrastructure/library-index';

@Controller('library')
export class LibraryController {
  constructor(
    private readonly library: LibraryService,
    private readonly classifier: LibraryClassifier,
  ) {}

  @Get('documents')
  list(@Query() query: LibraryQueryDto): Promise<DocumentSummary[]> {
    return this.library.list({
      q: query.q,
      category: toList(query.category),
      type: query.type,
      source: query.source,
      tags: toList(query.tag),
      status: query.status,
      sort: query.sort,
    });
  }

  @Get('inbox')
  inbox(): DocumentSummary[] {
    return this.library.inbox();
  }

  @Get('categories')
  categories(): CategoryNode[] {
    return this.library.categories();
  }

  @Get('tags')
  tags(): TagCount[] {
    return this.library.tags();
  }

  @Get('index')
  indexStatus(): IndexStatus {
    return this.library.indexStatus();
  }

  @Post('reindex')
  reindex(): Promise<RebuildResult> {
    return this.library.reindex();
  }

  @Post('documents/article')
  createArticle(@Body() body: CreateArticleDto): Promise<DocumentDetail> {
    return this.library.createArticle({
      title: body.title,
      category: requireStringList(body.category, 'category'),
      tags: optionalStringList(body.tags, 'tags'),
      content: body.content,
    });
  }

  @Get('documents/:id')
  get(@Param('id') id: string): Promise<DocumentDetail> {
    return this.library.get(id);
  }

  @Post('documents/:id/publish')
  publish(
    @Param('id') id: string,
    @Body() body: PublishDocumentDto,
  ): Promise<DocumentDetail> {
    return this.library.publish(id, {
      title: body.title,
      category: requireStringList(body.category, 'category'),
      tags: optionalStringList(body.tags, 'tags'),
    });
  }

  @Patch('documents/:id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateDocumentDto,
  ): Promise<DocumentDetail> {
    return this.library.update(id, {
      title: body.title,
      category: optionalStringList(body.category, 'category'),
      tags: optionalStringList(body.tags, 'tags'),
      content: body.content,
    });
  }

  @Post('documents/:id/suggest')
  suggest(
    @Param('id') id: string,
    @Body() body: SuggestDocumentDto,
  ): Promise<ClassificationSuggestion> {
    return this.classifier.suggest(id, body?.modelId);
  }

  @Post('documents/:id/archive')
  archive(@Param('id') id: string): Promise<DocumentDetail> {
    return this.library.archive(id);
  }

  @Delete('documents/:id')
  @HttpCode(204)
  async discard(@Param('id') id: string): Promise<void> {
    await this.library.discard(id);
  }
}
