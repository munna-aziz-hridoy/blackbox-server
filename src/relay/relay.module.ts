import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DirectoryModule } from '../directory/directory.module';
import { PresenceModule } from '../presence/presence.module';
import { PushModule } from '../push/push.module';
import { RelayGateway } from './relay.gateway';

@Module({
  imports: [AuthModule, DirectoryModule, PresenceModule, PushModule],
  providers: [RelayGateway],
})
export class RelayModule {}
