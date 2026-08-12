export interface AuthClaims {
  userId: number;
  sessionId: string;
  exp?: number;
}

export interface AuthSessionResult {
  id: number;
  token: string;
  expires_at: string;
  expires_in: number;
}

export interface SerializedUser {
  id: number;
  created_at: string;
}
