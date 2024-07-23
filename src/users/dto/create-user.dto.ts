import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from 'src/constants/enums/role.enum';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Name Không được để trống!' })
  @ApiProperty({ example: 'ajanuw', description: 'user name' })
  name: string;

  @IsString({ message: 'Phải là 1 chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Không được để trống!' })
  @IsEmail({}, { message: 'Không đúng định dạng email!' })
  @ApiProperty({ example: 'ajanuw', description: 'Email' })
  email: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'ajanuw', description: 'Password' })
  password: string;

  @IsNotEmpty({ message: 'Age Không được để trống!' })
  @ApiProperty({ example: 'ajanuw', description: 'Age' })
  age: number;

  @IsNotEmpty({ message: 'Role Không được để trống!' })
  @IsEnum(Role, { message: 'Role phải là một trong các giá trị hợp lệ' })
  @ApiProperty({ example: 'ajanuw', description: 'Role' })
  role: Role;
}

export class RegisterUserDto {
  @IsNotEmpty({ message: 'Name Không được để trống!' })
  @ApiProperty({ example: 'ajanuw', description: 'user name' })
  name: string;

  @IsString({ message: 'Phải là 1 chuỗi ký tự!' })
  @IsNotEmpty({ message: 'Không được để trống!' })
  @IsEmail({}, { message: 'Không đúng định dạng email!' })
  @ApiProperty({ example: 'ajanuw', description: 'user email' })
  email: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'ajanuw', description: 'password ' })
  password: string;

  @IsNotEmpty({ message: 'Age Không được để trống!' })
  @ApiProperty({ example: 'ajanuw', description: 'age' })
  age: number;
}

export class UserLoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'ajanuw', description: 'user name login' })
  readonly email: string;
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123456',
    description: 'Password login',
  })
  readonly password: string;
}
