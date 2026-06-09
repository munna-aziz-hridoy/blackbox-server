import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { DirectoryService } from '../directory/directory.service';
import { PresenceService } from '../presence/presence.service';

@Controller('search')
export class SearchController {
  constructor(
    private readonly authService: AuthService,
    private readonly directory: DirectoryService,
    private readonly presence: PresenceService,
  ) {}

  @Get()
  search(
    @Headers('authorization') authorization: string | undefined,
    @Query('email') email: string | undefined,
  ): { userId: string; publicKey: string; online: boolean } {
    const identityKey = authorization?.replace(/^Bearer /, '') ?? '';
    if (!this.authService.verifyIdentityKey(identityKey)) {
      throw new UnauthorizedException();
    }
    const account = email ? this.directory.find(email) : null;
    if (!account) {
      throw new NotFoundException('no verified user with that email');
    }
    return {
      userId: account.userId,
      publicKey: account.publicKey,
      online: this.presence.get(account.userId) !== undefined,
    };
  }
}
