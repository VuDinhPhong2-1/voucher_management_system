import { Controller, Get, Post, UseGuards, Body, Req } from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { RegisterUserDto, UserLoginDto } from 'src/users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ResponseMessage, User } from 'src/decorators/customize';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: UserLoginDto })
  @Post('/login')
  handleLogin(@User() user) {
    return this.authService.login(user._doc);
  }

  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }

  @Post('/register')
  @ResponseMessage('Register a new user')
  @ApiBody({ type: RegisterUserDto })
  registerUser(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.RegisterUser(registerUserDto);
  }

  // @Get('/account')
  // @ResponseMessage('Get infomation account')
  // async handleGetAccount(@User() user: IUser) {
  //   return user;
  // }

  @Get('/refresh')
  @ResponseMessage('refresh token')
  handleRefreshToken(refresh_token: string) {
    return this.authService.processNewToken(refresh_token);
  }

  @Get('/logout')
  @ResponseMessage('Logout account')
  handleLogout(userId: string) {
    this.authService.deleteCookieAndToken(userId);
  }
}
