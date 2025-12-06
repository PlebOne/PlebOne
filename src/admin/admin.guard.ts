import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  private nostrTools: any;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.nostrTools) {
      this.nostrTools = await import('nostr-tools');
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    console.log('[AdminGuard] Auth header:', authHeader ? `Present (${authHeader.substring(0, 50)}...)` : 'Missing');

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const spaceIndex = authHeader.indexOf(' ');
    if (spaceIndex === -1) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const type = authHeader.substring(0, spaceIndex);
    const token = authHeader.substring(spaceIndex + 1);

    console.log('[AdminGuard] Auth type:', type);
    console.log('[AdminGuard] Token length:', token ? token.length : 'undefined');

    if (type !== 'Nostr') {
      throw new UnauthorizedException('Invalid authentication type. Use "Nostr <signed-event>"');
    }

    try {
      const event = JSON.parse(token);

      console.log('[AdminGuard] Parsed event pubkey:', event.pubkey ? event.pubkey.substring(0, 16) + '...' : 'missing');
      console.log('[AdminGuard] Parsed event kind:', event.kind);

      const isValid = this.nostrTools.verifyEvent(event);
      console.log('[AdminGuard] Signature valid:', isValid);

      if (!isValid) {
        throw new UnauthorizedException('Invalid event signature');
      }

      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - event.created_at) > 300) {
        console.log('[AdminGuard] Event too old/new. Now:', now, 'Event:', event.created_at, 'Diff:', Math.abs(now - event.created_at));
        throw new UnauthorizedException('Event is too old or in the future');
      }

      const adminPubkeys = (process.env.ADMIN_PUBKEYS || '').split(',').map(k => k.trim());
      console.log('[AdminGuard] Admin pubkeys:', adminPubkeys.map(k => k.substring(0, 16) + '...'));
      console.log('[AdminGuard] Event pubkey matches:', adminPubkeys.includes(event.pubkey));

      if (!adminPubkeys.includes(event.pubkey)) {
        throw new UnauthorizedException('Pubkey not authorized as admin');
      }

      request.nostrPubkey = event.pubkey;

      console.log('[AdminGuard] Authentication successful');
      return true;
    } catch (error) {
      console.log('[AdminGuard] Error:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid authentication token format');
    }
  }
}
