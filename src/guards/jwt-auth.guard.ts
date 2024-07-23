import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Add custom authentication logic here if needed
    // For example, you can use the reflector to read custom metadata
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Customize the error handling
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
