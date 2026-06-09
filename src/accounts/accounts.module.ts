import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DirectoryModule } from '../directory/directory.module';
import { EmailModule } from '../email/email.module';
import { PresenceModule } from '../presence/presence.module';
import { AccountsController } from './accounts.controller';
import { SearchController } from './search.controller';

@Module({
  imports: [AuthModule, DirectoryModule, EmailModule, PresenceModule],
  controllers: [AccountsController, SearchController],
})
export class AccountsModule {}
