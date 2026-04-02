/**
 * SessionManager
 * Manages WhatsApp Web connection lifecycle, authentication state, and reconnection logic
 */

import { Client, LocalAuth } from 'whatsapp-web.js';
import { EventEmitter } from 'events';
import { ConnectionState } from '../types';
import { logger } from '../utils/logger';

export class SessionManager extends EventEmitter {
  private client: Client | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private backoffDelays = [5000, 15000, 30000];
  private authenticated = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing WhatsApp Web client...');

    const headless = process.env.WWEBJS_HEADLESS !== 'false';
    const sessionPath = process.env.WWEBJS_SESSION_PATH || './.wwebjs_auth';

    const isProd = process.env.NODE_ENV === 'production';
    const exePath = isProd 
      ? '/usr/bin/chromium-browser' 
      : (process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || '/usr/bin/chromium-browser');

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      puppeteer: {
        headless,
        executablePath: exePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=Translate,BackForwardCache',
        ],
      },
    });

    this.setupEventListeners();
    this.updateState(ConnectionState.CONNECTING);

    await this.client.initialize();
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('qr', (qr: string) => {
      logger.info('QR code event received from client', { qrLength: qr.length });
      if (qr && qr.length > 0) {
        this.emit('qr', qr);
      } else {
        logger.warn('QR code event received but data is empty');
      }
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated successfully');
      this.authenticated = true;
      this.updateState(ConnectionState.AUTHENTICATED);
      this.emit('authenticated');
    });

    this.client.on('ready', () => {
      logger.info('WhatsApp client is ready!');
      this.reconnectAttempts = 0;
      this.updateState(ConnectionState.READY);
      this.emit('ready');
    });

    this.client.on('disconnected', async (reason: string) => {
      logger.warn('WhatsApp client disconnected', { reason });
      this.authenticated = false;
      this.updateState(ConnectionState.DISCONNECTED);
      this.emit('disconnected', reason);
      await this.handleDisconnection();
    });

    this.client.on('auth_failure', (msg: string) => {
      logger.error('WhatsApp authentication failure', { message: msg });
      this.authenticated = false;
      this.updateState(ConnectionState.DISCONNECTED);
      this.emit('auth_failure', msg);
    });

    this.client.on('error', (error: Error) => {
      logger.error('WhatsApp client error', { error: error.message });
      this.emit('error', error);
    });

    this.client.on('change_state', (state: string) => {
      logger.debug('WhatsApp client state change', { state });
    });
  }

  getClient(): Client | null {
    return this.client;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  async handleDisconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. Manual restart required.');
      this.emit('max_reconnect_reached');
      return;
    }

    const delay = this.backoffDelays[
      Math.min(this.reconnectAttempts, this.backoffDelays.length - 1)
    ];
    this.reconnectAttempts++;

    logger.info(`Reconnecting in ${delay / 1000}s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      this.updateState(ConnectionState.CONNECTING);
      await this.client?.initialize();
    } catch (error) {
      logger.error('Reconnection failed', { error });
      await this.handleDisconnection();
    }
  }

  async destroy(): Promise<void> {
    logger.info('Destroying WhatsApp client...');
    try {
      await this.client?.destroy();
    } catch (error) {
      logger.warn('Error destroying client', { error });
    }
    this.client = null;
    this.authenticated = false;
    this.updateState(ConnectionState.DISCONNECTED);
  }

  private updateState(state: ConnectionState): void {
    this.connectionState = state;
    this.emit('state_change', state);
    logger.debug('Connection state changed', { state });
  }
}
