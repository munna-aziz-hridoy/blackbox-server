import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PresenceModule } from '../presence/presence.module';
import { RelayGateway } from './relay.gateway';

@Module({
  imports: [AuthModule, PresenceModule],
  providers: [RelayGateway],
})
export class RelayModule {}
