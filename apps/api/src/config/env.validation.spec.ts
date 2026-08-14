import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const valid = {
    DATABASE_URL: 'postgresql://user:pass@localhost/db',
    JWT_SECRET: 'x'.repeat(32),
    PIN_PEPPER: 'y'.repeat(32),
  };

  it('accepts a complete configuration', () => {
    expect(validateEnv(valid).DATABASE_URL).toBe(valid.DATABASE_URL);
  });

  it('refuses to boot without JWT_SECRET', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_SECRET: 'short' }),
    ).toThrow(/JWT_SECRET/);
  });

  it('refuses to boot without DATABASE_URL', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: '' })).toThrow(
      /DATABASE_URL/,
    );
  });
});
