import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { RelayModule } from './relay/relay.module';
import { TurnModule } from './turn/turn.module';

@Module({
  imports: [AccountsModule, RelayModule, TurnModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
