import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestaurantAccessGuard } from '../restaurants/guards/restaurant-access.guard';
import { RestaurantRoles } from '../restaurants/decorators/restaurant-roles.decorator';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { MenuDto } from './dto/menu.dto';
import { SectionDto } from './dto/section.dto';
import { ItemDto } from './dto/item.dto';
import { OkResponseDto } from '../common/dto/ok-response.dto';

@ApiTags('menus')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'restaurants/:id/menus', version: '1' })
export class MenusController {
  constructor(private readonly service: MenusService) {}

  // Menus
  @Get()
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'List menus for a restaurant' })
  @ApiOkResponse({ type: MenuDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  list(@Param('id') id: string) {
    return this.service.listMenus(id);
  }

  @Post()
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create menu - OWNER/MANAGER' })
  @ApiCreatedResponse({ type: MenuDto })
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiBody({
    type: CreateMenuDto,
    examples: {
      simple: { summary: 'Crear menú básico', value: { name: 'Principal' } },
      full: { summary: 'Crear menú completo', value: { name: 'Desayunos', description: 'De 7am a 11am', sortOrder: 1, isActive: true } },
    },
  })
  create(@Param('id') id: string, @Body() dto: CreateMenuDto) {
    return this.service.createMenu(id, dto);
  }

  @Get(':menuId')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'Get one menu' })
  @ApiOkResponse({ type: MenuDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  getOne(@Param('id') id: string, @Param('menuId') menuId: string) {
    return this.service.getMenu(id, menuId);
  }

  @Patch(':menuId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update menu - OWNER/MANAGER' })
  @ApiOkResponse({ type: MenuDto })
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiBody({
    type: UpdateMenuDto,
    examples: {
      activate: { summary: 'Activar menú', value: { isActive: true } },
      reorder: { summary: 'Cambiar sortOrder', value: { sortOrder: 2 } },
      rename: { summary: 'Renombrar y describir', value: { name: 'Carta', description: 'Actualizada' } },
    },
  })
  update(@Param('id') id: string, @Param('menuId') menuId: string, @Body() dto: UpdateMenuDto) {
    const data: Prisma.MenuUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.service.updateMenu(id, menuId, data);
  }

  @Delete(':menuId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Archive menu - OWNER/MANAGER' })
  @ApiOkResponse({ type: MenuDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  archive(@Param('id') id: string, @Param('menuId') menuId: string) {
    return this.service.archiveMenu(id, menuId);
  }

  // Sections
  @Get(':menuId/sections')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'List sections of a menu' })
  @ApiOkResponse({ type: SectionDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  listSections(@Param('id') id: string, @Param('menuId') menuId: string) {
    return this.service.listSections(id, menuId);
  }

  @Post(':menuId/sections')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create section - OWNER/MANAGER' })
  @ApiCreatedResponse({ type: SectionDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiBody({
    type: CreateSectionDto,
    examples: {
      simple: { summary: 'Sección básica', value: { name: 'Entradas' } },
      full: { summary: 'Sección completa', value: { name: 'Bebidas', description: 'Frías y calientes', sortOrder: 0, isActive: true } },
    },
  })
  createSection(@Param('id') id: string, @Param('menuId') menuId: string, @Body() dto: CreateSectionDto) {
    return this.service.createSection(id, menuId, dto);
  }

  @Get(':menuId/sections/:sectionId')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'Get one section' })
  @ApiOkResponse({ type: SectionDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiParam({ name: 'sectionId', example: 'ckv9h1sect0000xyz123' })
  getSection(@Param('id') id: string, @Param('menuId') menuId: string, @Param('sectionId') sectionId: string) {
    return this.service.getSection(id, menuId, sectionId);
  }

  @Patch(':menuId/sections/:sectionId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update section - OWNER/MANAGER' })
  @ApiOkResponse({ type: SectionDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiParam({ name: 'sectionId', example: 'ckv9h1sect0000xyz123' })
  @ApiBody({
    type: UpdateSectionDto,
    examples: {
      activate: { summary: 'Activar sección', value: { isActive: true } },
      reorder: { summary: 'Cambiar sortOrder', value: { sortOrder: 3 } },
      rename: { summary: 'Renombrar', value: { name: 'Platos fuertes' } },
    },
  })
  updateSection(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    const data: Prisma.MenuSectionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.service.updateSection(id, menuId, sectionId, data);
  }

  @Delete(':menuId/sections/:sectionId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Archive section - OWNER/MANAGER' })
  @ApiOkResponse({ type: SectionDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiParam({ name: 'sectionId', example: 'ckv9h1sect0000xyz123' })
  archiveSection(@Param('id') id: string, @Param('menuId') menuId: string, @Param('sectionId') sectionId: string) {
    return this.service.archiveSection(id, menuId, sectionId);
  }

  // Items
  @Get(':menuId/sections/:sectionId/items')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'List items of a section' })
  @ApiOkResponse({ type: ItemDto, isArray: true })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiParam({ name: 'sectionId', example: 'ckv9h1sect0000xyz123' })
  listItems(@Param('id') id: string, @Param('menuId') menuId: string, @Param('sectionId') sectionId: string) {
    return this.service.listItems(id, menuId, sectionId);
  }

  @Post(':menuId/sections/:sectionId/items')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create item - OWNER/MANAGER' })
  @ApiCreatedResponse({ type: ItemDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiParam({ name: 'sectionId', example: 'ckv9h1sect0000xyz123' })
  @ApiBody({
    type: CreateItemDto,
    examples: {
      simple: { summary: 'Ítem básico', value: { name: 'Hamburguesa clásica', price: 9.99 } },
      full: { summary: 'Ítem completo', value: { name: 'Limonada', description: 'Natural', price: 2.5, tags: ['bebida'], sortOrder: 0, status: 'ACTIVE' } },
    },
  })
  createItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.service.createItem(id, menuId, sectionId, dto);
  }

  @Get(':menuId/sections/:sectionId/items/:itemId')
  @UseGuards(RestaurantAccessGuard)
  @ApiOperation({ summary: 'Get one item' })
  @ApiOkResponse({ type: ItemDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiParam({ name: 'sectionId', example: 'ckv9h1sect0000xyz123' })
  @ApiParam({ name: 'itemId', example: 'ckv9h1item0000xyz123' })
  getItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.getItem(id, menuId, sectionId, itemId);
  }

  @Patch(':menuId/sections/:sectionId/items/:itemId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update item - OWNER/MANAGER' })
  @ApiOkResponse({ type: ItemDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiParam({ name: 'sectionId', example: 'ckv9h1sect0000xyz123' })
  @ApiParam({ name: 'itemId', example: 'ckv9h1item0000xyz123' })
  @ApiBody({
    type: UpdateItemDto,
    examples: {
      price: { summary: 'Actualizar precio', value: { price: 10.5 } },
      status: { summary: 'Cambiar estado', value: { status: 'INACTIVE' } },
      reorder: { summary: 'Reordenar', value: { sortOrder: 2 } },
      rename: { summary: 'Renombrar', value: { name: 'Cheeseburger' } },
    },
  })
  updateItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.service.updateItem(id, menuId, sectionId, itemId, dto);
  }

  @Delete(':menuId/sections/:sectionId/items/:itemId')
  @UseGuards(RestaurantAccessGuard)
  @RestaurantRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Delete item - OWNER/MANAGER' })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', example: 'ckv9h1rest0000xyz123' })
  @ApiParam({ name: 'menuId', example: 'ckv9h1menu0000xyz123' })
  @ApiParam({ name: 'sectionId', example: 'ckv9h1sect0000xyz123' })
  @ApiParam({ name: 'itemId', example: 'ckv9h1item0000xyz123' })
  deleteItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.deleteItem(id, menuId, sectionId, itemId);
  }
}
