import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../config/settings.service';

@Injectable()
export class NostrService {
  private readonly logger = new Logger(NostrService.name);
  private pool: any;
  private nostrTools: any;

  constructor(private settingsService: SettingsService) {
    this.initializeNostr();
  }

  private async initializeNostr() {
    const { SimplePool } = await import('nostr-tools/pool');
    this.nostrTools = await import('nostr-tools');
    this.pool = new SimplePool();
  }

  /**
   * Verify a Nostr event signature
   */
  async verifyEvent(event: any): Promise<boolean> {
    try {
      await this.ensureInitialized();
      return this.nostrTools.verifyEvent(event);
    } catch (error) {
      this.logger.error(`Failed to verify event: ${error.message}`);
      return false;
    }
  }

  /**
   * Publish a pre-signed Nostr event to configured relays
   */
  async publishSignedEvent(signedEvent: any): Promise<string | null> {
    try {
      await this.ensureInitialized();

      const relays = await this.settingsService.getRelays();
      if (relays.length === 0) {
        this.logger.warn('No relays configured. Skipping Nostr publishing.');
        return null;
      }

      // Verify the event signature
      if (!this.nostrTools.verifyEvent(signedEvent)) {
        this.logger.error('Failed to verify signed event');
        return null;
      }

      this.logger.log(`Publishing to ${relays.length} relays...`);

      const publishPromises = this.pool.publish(relays, signedEvent);
      const results = await Promise.allSettled(publishPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      this.logger.log(`Published to ${successful}/${relays.length} relays. Event ID: ${signedEvent.id}`);

      return signedEvent.id;
    } catch (error) {
      this.logger.error(`Failed to publish to Nostr: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Publish a reply to an existing Nostr event (used for task status updates)
   * The signedEvent should already have the 'e' and 'p' tags set for the reply
   */
  async publishReply(signedReplyEvent: any): Promise<string | null> {
    return this.publishSignedEvent(signedReplyEvent);
  }

  /**
   * Get the configured relays (for client-side event creation)
   */
  async getRelays(): Promise<string[]> {
    return this.settingsService.getRelays();
  }

  private async ensureInitialized() {
    if (!this.nostrTools || !this.pool) {
      await this.initializeNostr();
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      const relays = await this.settingsService.getRelays();
      this.pool.close(relays);
    }
  }
}
