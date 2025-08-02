import { 
  generateSecretKey, 
  getPublicKey, 
  finalizeEvent, 
  nip19,
  SimplePool
} from 'nostr-tools';

export class NostrClient {
  constructor(logger) {
    this.logger = logger;
    this.pool = new SimplePool();
    this.relays = [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.snort.social',
      'wss://nostr.wine',
      'wss://relay.nostr.band'
    ];
    this.privateKey = null;
    this.publicKey = null;
  }

  async initialize() {
    try {
      this.logger.info('🔐 Initializing Nostr client...');
      
      // Get keys from environment
      const nsec = process.env.NOSTR_NSEC;
      const npub = process.env.NOSTR_NPUB;

      if (!nsec) {
        throw new Error('NOSTR_NSEC environment variable is required');
      }

      // Decode private key
      if (nsec.startsWith('nsec1')) {
        const decoded = nip19.decode(nsec);
        this.privateKey = decoded.data;
      } else {
        // Assume it's a hex string
        this.privateKey = nsec;
      }

      // Generate public key from private key
      this.publicKey = getPublicKey(this.privateKey);

      // Verify public key matches provided npub (if provided)
      if (npub) {
        const expectedPubkey = npub.startsWith('npub1') 
          ? nip19.decode(npub).data 
          : npub;
        
        if (this.publicKey !== expectedPubkey) {
          throw new Error('Private key does not match provided public key');
        }
      }

      this.logger.info(`✅ Nostr client initialized with pubkey: ${nip19.npubEncode(this.publicKey)}`);
      return true;

    } catch (error) {
      this.logger.error('❌ Failed to initialize Nostr client:', error);
      throw error;
    }
  }

  async publishNote(content, tags = []) {
    if (!this.privateKey) {
      throw new Error('Nostr client not initialized');
    }

    try {
      this.logger.debug('📡 Publishing note to Nostr...');

      // Create event
      const event = {
        kind: 1, // Text note
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['t', 'videostr'],
          ['t', 'privacy'],
          ['t', 'stackernews'],
          ['t', 'yewtubot'],
          ...tags
        ],
        content,
        pubkey: this.publicKey,
      };

      // Sign event
      const signedEvent = finalizeEvent(event, this.privateKey);
      
      this.logger.debug(`📤 Publishing event ${signedEvent.id} to ${this.relays.length} relays`);

      // Publish to relays
      const publishPromises = this.relays.map(async (relay) => {
        try {
          const pub = this.pool.publish([relay], signedEvent);
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              resolve({ relay, status: 'timeout' });
            }, 10000); // 10 second timeout

            pub.on('ok', () => {
              clearTimeout(timeout);
              resolve({ relay, status: 'ok' });
            });

            pub.on('failed', (reason) => {
              clearTimeout(timeout);
              resolve({ relay, status: 'failed', reason });
            });
          });
        } catch (error) {
          return { relay, status: 'error', error: error.message };
        }
      });

      const results = await Promise.all(publishPromises);
      
      // Log results
      const successful = results.filter(r => r.status === 'ok');
      const failed = results.filter(r => r.status !== 'ok');

      this.logger.info(`📡 Note published to ${successful.length}/${this.relays.length} relays`);
      
      if (failed.length > 0) {
        this.logger.warn('⚠️  Some relays failed:');
        failed.forEach(result => {
          this.logger.warn(`  ${result.relay}: ${result.status} ${result.reason || result.error || ''}`);
        });
      }

      // Consider it successful if published to at least one relay
      if (successful.length > 0) {
        this.logger.info(`✅ Note published successfully: ${signedEvent.id}`);
        return true;
      } else {
        this.logger.error('❌ Failed to publish to any relay');
        return false;
      }

    } catch (error) {
      this.logger.error('❌ Failed to publish note:', error);
      return false;
    }
  }

  async close() {
    try {
      this.pool.close(this.relays);
      this.logger.debug('🔌 Nostr connections closed');
    } catch (error) {
      this.logger.error('Error closing Nostr connections:', error);
    }
  }
}
