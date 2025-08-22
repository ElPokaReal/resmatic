import { ApiProperty } from '@nestjs/swagger';

export class SectionDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  menuId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ required: false })
  description?: string | null;
  @ApiProperty()
  sortOrder!: number;
  @ApiProperty()
  isActive!: boolean;
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}
