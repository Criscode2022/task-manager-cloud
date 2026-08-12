import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { DatabaseService } from '../database/database.service';
import {
  AuthClaims,
  AuthSessionResult,
  SerializedUser,
} from './auth.types';
import { hashPin, pinLookupKey, verifyPinHash } from './pin.util';

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  getSessionTtlSeconds(): number {
    const raw = Number(this.config.get('SESSION_TTL_SECONDS'));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SESSION_TTL_SECONDS;
  }

  private requireEnv(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) {
      throw Object.assign(new Error(`${name} is not configured`), { status: 500 });
    }
    return value;
  }

  private jwtSecretKey(): Uint8Array {
    return new TextEncoder().encode(this.requireEnv('JWT_SECRET'));
  }

  async createAccessToken(params: {
    userId: number;
    sessionId: string;
    expiresAt: Date;
  }): Promise<string> {
    return new SignJWT({ sid: params.sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(params.userId))
      .setIssuedAt()
      .setExpirationTime(params.expiresAt)
      .sign(this.jwtSecretKey());
  }

  async verifyAccessToken(token: string): Promise<AuthClaims> {
    const { payload } = await jwtVerify(token, this.jwtSecretKey());
    const userId = Number(payload.sub);
    const sessionId = String(payload.sid || '');
    if (!userId || !sessionId) {
      throw new UnauthorizedException('Invalid token');
    }
    return { userId, sessionId, exp: payload.exp };
  }

  extractBearerToken(authorization?: string): string {
    const header = authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || '';
  }

  private serializeUser(row: Record<string, unknown>): SerializedUser {
    return {
      id: Number(row.id),
      created_at: String(row.created_at),
    };
  }

  private async issueSession(userId: number): Promise<AuthSessionResult> {
    const sql = this.db.getSql();
    const sessionId = randomUUID();
    const ttl = this.getSessionTtlSeconds();
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const rows = await sql`
      INSERT INTO public.sessions (id, user_id, expires_at)
      VALUES (${sessionId}, ${userId}, ${expiresAt.toISOString()})
      RETURNING id, user_id, expires_at
    `;
    const session = rows[0] as { id: string; expires_at: string };
    const token = await this.createAccessToken({
      userId,
      sessionId: session.id,
      expiresAt: new Date(session.expires_at),
    });
    return {
      id: Number(userId),
      token,
      expires_at: new Date(session.expires_at).toISOString(),
      expires_in: ttl,
    };
  }

  async register(pin: string): Promise<AuthSessionResult> {
    const sql = this.db.getSql();
    const lookup = pinLookupKey(pin, this.requireEnv('PIN_PEPPER'));
    const pinHash = await hashPin(pin);

    try {
      const rows = await sql`
        INSERT INTO public.users (pin_hash, pin_lookup)
        VALUES (${pinHash}, ${lookup})
        RETURNING *
      `;
      const user = this.serializeUser(rows[0] as Record<string, unknown>);
      return this.issueSession(user.id);
    } catch (error) {
      if (String((error as Error).message || error).includes('idx_users_pin_lookup')) {
        throw new ConflictException('PIN already in use');
      }
      throw error;
    }
  }

  async login(pin: string): Promise<AuthSessionResult> {
    const sql = this.db.getSql();
    const lookup = pinLookupKey(pin, this.requireEnv('PIN_PEPPER'));

    let rows = await sql`
      SELECT id, pin_hash, pin_lookup
      FROM public.users
      WHERE pin_lookup = ${lookup}
      LIMIT 1
    `;

    if (!rows[0]) {
      const legacyHash = createHash('sha256').update(pin).digest('hex');
      rows = await sql`
        SELECT id, pin_hash, pin_lookup
        FROM public.users
        WHERE pin_hash = ${legacyHash} AND pin_lookup IS NULL
        LIMIT 1
      `;
    }

    if (!rows[0]) {
      throw new UnauthorizedException('Invalid PIN');
    }

    const userRow = rows[0] as {
      id: number | string;
      pin_hash: string;
      pin_lookup: string | null;
    };
    const valid = await verifyPinHash(pin, userRow.pin_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid PIN');
    }

    if (!userRow.pin_lookup || /^[a-f0-9]{64}$/i.test(userRow.pin_hash)) {
      const upgradedHash = await hashPin(pin);
      await sql`
        UPDATE public.users
        SET pin_hash = ${upgradedHash}, pin_lookup = ${lookup}
        WHERE id = ${userRow.id}
      `;
    }

    return this.issueSession(Number(userRow.id));
  }

  async requireValidSession(userId: number, sessionId: string) {
    const sql = this.db.getSql();
    const rows = await sql`
      SELECT id, user_id, expires_at, revoked_at
      FROM public.sessions
      WHERE id = ${sessionId} AND user_id = ${userId}
      LIMIT 1
    `;
    const session = rows[0] as
      | { id: string; user_id: number; expires_at: string; revoked_at: string | null }
      | undefined;
    if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }
    return session;
  }

  async revokeSession(userId: number, sessionId: string): Promise<void> {
    const sql = this.db.getSql();
    await sql`
      UPDATE public.sessions
      SET revoked_at = NOW()
      WHERE id = ${sessionId} AND user_id = ${userId} AND revoked_at IS NULL
    `;
  }

  async revokeAllSessions(userId: number): Promise<void> {
    const sql = this.db.getSql();
    await sql`
      UPDATE public.sessions
      SET revoked_at = NOW()
      WHERE user_id = ${userId} AND revoked_at IS NULL
    `;
  }

  async getUser(userId: number): Promise<SerializedUser> {
    const sql = this.db.getSql();
    const rows = await sql`
      SELECT * FROM public.users WHERE id = ${userId} LIMIT 1
    `;
    if (!rows[0]) {
      throw new NotFoundException('User not found');
    }
    return this.serializeUser(rows[0] as Record<string, unknown>);
  }
}
