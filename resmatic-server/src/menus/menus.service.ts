import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, MenuItemStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  // Menus
  async createMenu(restaurantId: string, data: { name: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.menu.create({
      data: {
        restaurantId,
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async listMenus(restaurantId: string) {
    return this.prisma.menu.findMany({ where: { restaurantId }, orderBy: { sortOrder: 'asc' } });
  }

  async getMenu(restaurantId: string, menuId: string) {
    const menu = await this.prisma.menu.findFirst({ where: { id: menuId, restaurantId } });
    if (!menu) throw new NotFoundException('Menu not found');
    return menu;
  }

  async updateMenu(restaurantId: string, menuId: string, data: Prisma.MenuUpdateInput) {
    // Ensure ownership by composite where
    const existing = await this.prisma.menu.findFirst({ where: { id: menuId, restaurantId } });
    if (!existing) throw new NotFoundException('Menu not found');
    return this.prisma.menu.update({ where: { id: menuId }, data });
  }

  async archiveMenu(restaurantId: string, menuId: string) {
    const existing = await this.prisma.menu.findFirst({ where: { id: menuId, restaurantId } });
    if (!existing) throw new NotFoundException('Menu not found');
    return this.prisma.menu.update({ where: { id: menuId }, data: { isActive: false } });
  }

  // Sections
  async createSection(restaurantId: string, menuId: string, data: { name: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    // Confirm menu scope
    const menu = await this.prisma.menu.findFirst({ where: { id: menuId, restaurantId } });
    if (!menu) throw new NotFoundException('Menu not found for restaurant');
    return this.prisma.menuSection.create({
      data: {
        menuId,
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async listSections(restaurantId: string, menuId: string) {
    const menu = await this.prisma.menu.findFirst({ where: { id: menuId, restaurantId } });
    if (!menu) throw new NotFoundException('Menu not found for restaurant');
    return this.prisma.menuSection.findMany({ where: { menuId }, orderBy: { sortOrder: 'asc' } });
  }

  async getSection(restaurantId: string, menuId: string, sectionId: string) {
    const section = await this.prisma.menuSection.findFirst({ where: { id: sectionId, menuId, menu: { restaurantId } } });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  async updateSection(restaurantId: string, menuId: string, sectionId: string, data: Prisma.MenuSectionUpdateInput) {
    const section = await this.prisma.menuSection.findFirst({ where: { id: sectionId, menuId, menu: { restaurantId } } });
    if (!section) throw new NotFoundException('Section not found');
    return this.prisma.menuSection.update({ where: { id: sectionId }, data });
  }

  async archiveSection(restaurantId: string, menuId: string, sectionId: string) {
    const section = await this.prisma.menuSection.findFirst({ where: { id: sectionId, menuId, menu: { restaurantId } } });
    if (!section) throw new NotFoundException('Section not found');
    return this.prisma.menuSection.update({ where: { id: sectionId }, data: { isActive: false } });
  }

  // Items
  async createItem(restaurantId: string, menuId: string, sectionId: string, data: { name: string; description?: string; price: number; tags?: string[]; sortOrder?: number; status?: 'ACTIVE' | 'INACTIVE' }) {
    const section = await this.prisma.menuSection.findFirst({ where: { id: sectionId, menuId, menu: { restaurantId } } });
    if (!section) throw new NotFoundException('Section not found for menu/restaurant');
    return this.prisma.menuItem.create({
      data: {
        sectionId,
        name: data.name,
        description: data.description,
        price: new Prisma.Decimal(data.price),
        tags: data.tags ?? [],
        sortOrder: data.sortOrder ?? 0,
        status: data.status ? MenuItemStatus[data.status] : MenuItemStatus.ACTIVE,
      },
    });
  }

  async listItems(restaurantId: string, menuId: string, sectionId: string) {
    const section = await this.prisma.menuSection.findFirst({ where: { id: sectionId, menuId, menu: { restaurantId } } });
    if (!section) throw new NotFoundException('Section not found for menu/restaurant');
    return this.prisma.menuItem.findMany({ where: { sectionId }, orderBy: { sortOrder: 'asc' } });
  }

  async getItem(restaurantId: string, menuId: string, sectionId: string, itemId: string) {
    const item = await this.prisma.menuItem.findFirst({ where: { id: itemId, sectionId, section: { menuId, menu: { restaurantId } } } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async updateItem(restaurantId: string, menuId: string, sectionId: string, itemId: string, data: Partial<{ name: string; description?: string; price?: number; tags?: string[]; sortOrder?: number; status?: 'ACTIVE' | 'INACTIVE' }>) {
    const item = await this.prisma.menuItem.findFirst({ where: { id: itemId, sectionId, section: { menuId, menu: { restaurantId } } } });
    if (!item) throw new NotFoundException('Item not found');

    const upd: Prisma.MenuItemUpdateInput = {};
    if (data.name !== undefined) upd.name = data.name;
    if (data.description !== undefined) upd.description = data.description;
    if (data.price !== undefined) upd.price = new Prisma.Decimal(data.price);
    if (data.tags !== undefined) upd.tags = { set: data.tags };
    if (data.sortOrder !== undefined) upd.sortOrder = data.sortOrder;
    if (data.status !== undefined)
      upd.status = data.status === 'ACTIVE' ? MenuItemStatus.ACTIVE : MenuItemStatus.INACTIVE;

    return this.prisma.menuItem.update({ where: { id: itemId }, data: upd });
  }

  async deleteItem(restaurantId: string, menuId: string, sectionId: string, itemId: string) {
    const item = await this.prisma.menuItem.findFirst({ where: { id: itemId, sectionId, section: { menuId, menu: { restaurantId } } } });
    if (!item) throw new NotFoundException('Item not found');
    await this.prisma.menuItem.delete({ where: { id: itemId } });
    return { ok: true };
  }
}
