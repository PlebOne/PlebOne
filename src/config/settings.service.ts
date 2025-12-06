import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
  ) {}

  async get(key: string): Promise<string | null> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting ? setting.value : null;
  }

  async set(key: string, value: string, description?: string): Promise<Settings> {
    let setting = await this.settingsRepository.findOne({ where: { key } });
    
    if (setting) {
      setting.value = value;
      if (description) setting.description = description;
    } else {
      setting = this.settingsRepository.create({ key, value, description });
    }
    
    return this.settingsRepository.save(setting);
  }

  async getRelays(): Promise<string[]> {
    const relaysJson = await this.get('nostr_relays');
    if (!relaysJson) {
      // Default relays
      return [
        'wss://relay.damus.io',
        'wss://relay.nostr.band',
        'wss://nos.lol',
        'wss://relay.primal.net',
      ];
    }
    try {
      return JSON.parse(relaysJson);
    } catch {
      return [];
    }
  }

  async setRelays(relays: string[]): Promise<void> {
    await this.set('nostr_relays', JSON.stringify(relays), 'Nostr relays for publishing posts');
  }
}
