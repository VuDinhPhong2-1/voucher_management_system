import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { IUser } from 'src/users/users.interface';
import { RegisterUserDto } from 'src/users/dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { retry, throwError } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import { Role } from 'src/constants/enums/role.enum';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(User.name)
    private UserModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findOne(username);
    const isValidPassword = await this.usersService.isValidPassword(
      password,
      user.password,
    );
    if (user && isValidPassword) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: IUser) {
    if (!user) {
      throw new Error('User không hợp lệ');
    }
    const { _id, name, email, role, age } = user;
    if (!_id || !name || !email || !role)
      throw new Error('Thiếu thông tin người dùng cần thiết');

    const payload = {
      sub: _id.toString(),
      iss: 'from server',
      _id: _id.toString(),
      name,
      email,
      role,
      age,
    };

    const refresh_token = this.createRefreshToken(payload);
    await this.usersService.updateUserToken(refresh_token, _id.toString());

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token,
    };
  }

  async RegisterUser(registerUserDto: RegisterUserDto) {
    const emailExists = await this.UserModel.findOne({
      email: registerUserDto.email,
    });
    if (emailExists) throw new ConflictException('Email đã tồn tại!!!');

    const roleUser = Role.User;
    const pass = await this.usersService.hashPassword(registerUserDto.password);
    const result = await this.UserModel.create({
      ...registerUserDto,
      role: roleUser,
      password: pass,
    });
    return result;
  }

  createRefreshToken = (payload) => {
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')) / 1000,
    });
    return refresh_token;
  };

  processNewToken = async (refreshToken: string) => {
    try {
      this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });
      const user = await this.usersService.findOneByRefreshToken(refreshToken);
      if (user) {
        const { _id, name, email, role } = user;
        const payload = {
          sub: 'token login',
          iss: 'from server',
          _id,
          name,
          email,
          role,
        };
        const refresh_token = this.createRefreshToken(payload);
        await this.usersService.updateUserToken(refresh_token, _id.toString());
        return {
          access_token: this.jwtService.sign(payload),
          user: {
            _id,
            name,
            email,
          },
          role,
        };
      } else {
        throw new BadRequestException('Token không hợp lệ! Hãy login');
      }
    } catch (error) {
      throw new BadRequestException('Token không hợp lệ! Hãy login');
    }
  };

  deleteCookieAndToken = async (userId: string) => {
    try {
      await this.usersService.updateUserToken(null, userId);
      return 'ok';
    } catch (error) {
      throw new BadRequestException(error);
    }
  };
}
