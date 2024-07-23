import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import { IUser } from './users.interface';
import aqp from 'api-query-params';
import { Model } from 'mongoose';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  hashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  };

  async create(createUserDto: CreateUserDto) {
    try {
      const isExitEmail = await this.userModel.findOne({
        email: createUserDto.email,
      });

      if (isExitEmail) {
        throw new BadRequestException(
          `Email: ${createUserDto.email} đã tồn tại trên hệ thống`,
        );
      }
      const newUser = new this.userModel({
        name: createUserDto.name,
        email: createUserDto.email,
        password: await this.hashPassword(createUserDto.password),
        age: createUserDto.age,
        role: createUserDto.role,
      });
      return await newUser.save();
    } catch (error) {
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi khi tạo người dùng',
      );
    }
  }

  async findAll(current: number, pageSize: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;
    let offset = (+current - 1) * +pageSize;
    let defaultLimit = +pageSize ? +pageSize : 10;
    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);
    const result = await this.userModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      // @ts-ignore: Unreachable code error
      .sort(sort)
      .populate(population)
      .exec();
    return {
      message: 'Lấy thành công',
      meta: {
        current: current,
        pageSize: pageSize,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }

  async findOne(email: string): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ email }).exec();
      if (!user)
        throw new NotFoundException(`User with email ${email} not found`);
      return user;
    } catch (error) {
      console.error(`Failed to find user: ${error.message}`);
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  async findOneByEmail(email: string) {
    try {
      if (email === null || email === '' || email === undefined)
        return 'Không được để trống email người dùng!';
      const user = await this.userModel.findOne({ email: email }).populate({
        path: 'role',
        select: { name: 1 },
      });
      if (!user) return 'Không tìm thấy người dùng!';
      return user;
    } catch (error) {
      console.log(error);
    }
  }
  async isValidPassword(password, hash) {
    const result = compareSync(password, hash);
    return result;
  }
  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const userUpdate = await this.userModel.findOneAndUpdate(
        { _id: id },
        updateUserDto,
      );
      if (!userUpdate) return 'Lỗi không thể cập nhật!';
      return userUpdate;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Có lỗi xảy ra trong quá trình xử lý yêu cầu.',
      );
    }
  }

  // async remove(id: string, user: IUser) {
  //   this.userModel.softDelete({ _id: id });
  //   const result = await this.userModel.findByIdAndUpdate({
  //     _id: id,
  //     deletedBy: {
  //       _id: user._id,
  //       email: user.email,
  //     },
  //   });
  //   return result;
  // }

  async updateUserToken(refresh_token: string, _id: string) {
    return this.userModel.updateOne(
      { _id },
      {
        refresh_token: refresh_token,
      },
    );
  }

  async findOneByRefreshToken(refresh_token: string) {
    return this.userModel.findOne({ refresh_token: refresh_token });
  }
}
