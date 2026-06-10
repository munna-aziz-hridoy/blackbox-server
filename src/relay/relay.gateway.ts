import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { PresenceService } from '../presence/presence.service';

@WebSocketGateway({ cors: { origin: '*' }, maxHttpBufferSize: 1e7 })
export class RelayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly authService: AuthService,
    private readonly presence: PresenceService,
  ) {}

  handleConnection(socket: Socket) {
    const payload = this.authService.verifyIdentityKey(
      socket.handshake.auth?.identityKey ?? '',
    );
    if (!payload) {
      socket.disconnect();
      return;
    }
    socket.data.userId = payload.userId;
    socket.data.publicKey = payload.publicKey;
    this.presence.add(payload.userId, socket);
  }

  handleDisconnect(socket: Socket) {
    this.presence.remove(socket.data.userId);
  }

  @SubscribeMessage('message')
  relayMessage(socket: Socket, data: { to: string } & Record<string, unknown>) {
    const { to, ...envelope } = data;
    const recipient = this.presence.get(to);
    if (!recipient) {
      return { delivered: false };
    }
    recipient.emit('message', {
      from: socket.data.userId,
      fromPublicKey: socket.data.publicKey,
      ...envelope,
    });
    return { delivered: true };
  }

  @SubscribeMessage('call:signal')
  relayCallSignal(
    socket: Socket,
    data: { to: string } & Record<string, unknown>,
  ) {
    const { to, ...envelope } = data;
    const recipient = this.presence.get(to);
    if (!recipient) {
      return { delivered: false };
    }
    recipient.emit('call:signal', {
      from: socket.data.userId,
      fromPublicKey: socket.data.publicKey,
      ...envelope,
    });
    return { delivered: true };
  }

  @SubscribeMessage('read')
  relayRead(socket: Socket, data: { to: string; ids: string[] }) {
    const sender = this.presence.get(data.to);
    if (!sender) return;
    sender.emit('read', { from: socket.data.userId, ids: data.ids });
  }

  @SubscribeMessage('requestProfile')
  requestProfile(socket: Socket, data: { toUserId: string }) {
    const target = this.presence.get(data.toUserId);
    if (!target) {
      return { online: false };
    }
    target.emit('profileRequest', {
      from: socket.data.userId,
      fromPublicKey: socket.data.publicKey,
    });
    return { online: true };
  }

  @SubscribeMessage('profileResponse')
  profileResponse(
    socket: Socket,
    data: { to: string; nonce: string; box: string },
  ) {
    const requester = this.presence.get(data.to);
    if (!requester) return;
    requester.emit('profile', {
      from: socket.data.userId,
      fromPublicKey: socket.data.publicKey,
      nonce: data.nonce,
      box: data.box,
    });
  }
}
