import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OracleService } from '../oracle/oracle.service';
import { IncomingMessage } from 'http';

interface SseMessage {
  id?: string;
  event?: string;
  data: string;
}

@Injectable()
export class TxoddsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TxoddsService.name);
  private isRunning = false;
  private activeRequest: any = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private jwt: string | null = null;
  private jwtExpiresAt = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly oracleService: OracleService,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Starting TxODDS event stream listener...');
    this.isRunning = true;
    this.startStreamLoop();
  }

  onApplicationShutdown() {
    this.logger.log('Shutting down TxODDS event stream listener...');
    this.isRunning = false;
    if (this.activeRequest) {
      try {
        this.activeRequest.destroy();
      } catch (err) {
        // ignore
      }
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  /**
   * Fetches or refreshes the guest JWT from TxLINE auth endpoint
   */
  private async getJwt(): Promise<string> {
    const now = Date.now();
    // Refresh if missing, or expires in less than 5 minutes (tokens usually last 30 days)
    if (this.jwt && this.jwtExpiresAt > now + 300000) {
      return this.jwt;
    }

    const apiOrigin = this.configService.get<string>('TXLINE_API_ORIGIN') ?? 'https://txline-dev.txodds.com';
    const authUrl = `${apiOrigin}/auth/guest/start`;

    this.logger.log(`Acquiring guest JWT from ${authUrl}...`);
    try {
      let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://txline.txodds.com/auth/guest/start',
  headers: { 
    'Content-Type': 'application/json'
  },

};
      const response = await axios.request(config);
      this.jwt = response.data.token;
      // Set expiration safety threshold (30 days from now, minus 1 hour)
      this.jwtExpiresAt = now + (30 * 24 * 3600 * 1000) - 3600000;
      this.logger.log('Successfully acquired guest JWT');
      return this.jwt!;
    } catch (err) {
      this.logger.error(`Failed to acquire guest JWT: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Main reconnection loop for streaming scores updates
   */
  private async startStreamLoop() {
    while (this.isRunning) {
      try {
        const token = await this.getJwt();
        const apiToken = this.configService.get<string>('TXODDS_API');
        if (!apiToken) {
          this.logger.warn('TXODDS_API is not set in env. Stream connection might fail.');
        }

        const apiOrigin = this.configService.get<string>('TXLINE_API_ORIGIN') ?? 'https://txline-dev.txodds.com';
        const streamUrl = `${apiOrigin}/api/scores/stream`;

        this.logger.log(`Connecting to scores stream: ${streamUrl}`);

        await this.connectToSse(streamUrl, token, apiToken || '');
      } catch (err) {
        this.logger.error(`Stream error or disconnected: ${(err as Error).message}`);
      }

      if (this.isRunning) {
        this.logger.log('Reconnecting to scores stream in 5 seconds...');
        await new Promise((resolve) => {
          this.reconnectTimeout = setTimeout(resolve, 5000);
        });
      }
    }
  }

  /**
   * Establishes the SSE connection and processes events
   */
  private connectToSse(url: string, jwt: string, apiToken: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      axios({
        method: 'get',
        url,
        headers: {
          Authorization: `Bearer ${jwt}`,
          'X-Api-Token': apiToken,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        responseType: 'stream',
      })
        .then((response) => {
          const stream = response.data as IncomingMessage;
          this.activeRequest = stream;

          this.logger.log('Scores event stream connection established');

          let buffer = '';

          stream.on('data', (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            let boundary = buffer.indexOf('\n\n');

            while (boundary !== -1) {
              const block = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              this.parseAndHandleSseBlock(block);
              boundary = buffer.indexOf('\n\n');
            }
          });

          stream.on('end', () => {
            this.logger.warn('Scores event stream ended by server');
            resolve();
          });

          stream.on('error', (err) => {
            this.logger.error(`Scores stream read error: ${err.message}`);
            reject(err);
          });
        })
        .catch((err) => {
          this.logger.error(`Failed to initiate stream connection: ${err.message}`);
          reject(err);
        });
    });
  }

  /**
   * Helper to parse raw SSE format into structured event object
   */
  private parseAndHandleSseBlock(block: string) {
    const message: SseMessage = { data: '' };

    for (const rawLine of block.split(/\r?\n/)) {
      if (!rawLine || rawLine.startsWith(':')) continue;

      const separatorIndex = rawLine.indexOf(':');
      const field = separatorIndex === -1 ? rawLine : rawLine.slice(0, separatorIndex);
      const value =
        separatorIndex === -1
          ? ''
          : rawLine.slice(separatorIndex + 1).replace(/^ /, '');

      if (field === 'data') message.data += `${value}\n`;
      if (field === 'event') message.event = value;
      if (field === 'id') message.id = value;
    }

    message.data = message.data.replace(/\n$/, '');

    if (message.event === 'heartbeat') {
      // Periodic heartbeat, keep-alive indicator
      return;
    }

    if (message.data) {
      try {
        const scoresRecord = JSON.parse(message.data);
        this.handleScoresUpdate(scoresRecord);
      } catch (err) {
        this.logger.warn(`Failed to parse scores update JSON: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Forwards parsed scores record to the Oracle Service
   */
  private async handleScoresUpdate(scoresRecord: any) {
    const { fixtureId, seq, gameState, action } = scoresRecord;
    this.logger.debug(`Received update for fixture: ${fixtureId}, seq: ${seq}, gameState: ${gameState}, action: ${action}`);

    try {
      await this.oracleService.processScoresUpdate(scoresRecord);
    } catch (err) {
      this.logger.error(`Error processing score update for fixture ${fixtureId}: ${(err as Error).message}`);
    }
  }
}
