import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verifyEvent } from 'nostr-tools';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Nostr') {
      throw new UnauthorizedException('Invalid authentication type. Use "Nostr <signed-event>"');
    }

    try {
      // Parse the signed Nostr event
      const event = JSON.parse(token);

      // Verify the event signature
      const isValid = verifyEvent(event);
      if (!isValid) {
        throw new UnauthorizedException('Invalid event signature');
      }

      // Check if event is recent (within 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - event.created_at) > 300) {
        throw new UnauthorizedException('Event is too old or in the future');
      }

      // Check if pubkey is in admin list
      const adminPubkeys = (process.env.ADMIN_PUBKEYS || '').split(',').map(k => k.trim());
      if (!adminPubkeys.includes(event.pubkey)) {
        throw new UnauthorizedException('Pubkey not authorized as admin');
      }

      // Attach pubkey to request for later use
      request.nostrPubkey = event.pubkey;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid authentication token format');
    }
  }
}
