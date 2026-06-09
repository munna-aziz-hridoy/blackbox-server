import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class PresenceService {
  private readonly sockets = new Map<string, Socket>();

  add(userId: string, socket: Socket) {
    this.sockets.set(userId, socket);
  }

  remove(userId: string) {
    this.sockets.delete(userId);
  }

  get(userId: string): Socket | undefined {
    return this.sockets.get(userId);
  }
}
