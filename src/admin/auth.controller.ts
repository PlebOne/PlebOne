import { Controller, Get, Post, Body } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Controller('api/auth')
export class AuthController {
  private challenges = new Map<string, number>();

  @Get('challenge')
  getChallenge() {
    // Generate a random challenge
    const challenge = randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    // Store challenge with timestamp (cleanup old ones)
    this.challenges.set(challenge, timestamp);
    this.cleanupOldChallenges();
    
    return { challenge };
  }

  @Post('verify')
  verifyAuth(@Body() body: { event: any }) {
    // This is just for testing - actual verification happens in AdminGuard
    return { 
      message: 'Use this signed event in Authorization header as: Nostr <signed-event-json>',
      example: `Authorization: Nostr ${JSON.stringify(body.event)}`
    };
  }

  private cleanupOldChallenges() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [challenge, timestamp] of this.challenges.entries()) {
      if (timestamp < fiveMinutesAgo) {
        this.challenges.delete(challenge);
      }
    }
  }
}
