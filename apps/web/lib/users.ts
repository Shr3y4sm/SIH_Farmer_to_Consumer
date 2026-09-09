import { scryptSync, timingSafeEqual } from "node:crypto";
import type { SessionUser } from "./session";

/**
 * Seeded demo accounts that map one-to-one with the marketplace roles. Passwords are stored as
 * scrypt hashes with a per-user salt — never in plaintext. At pilot these rows live in Supabase
 * `auth.users` + a `profiles` table instead (see docs/DEPLOYMENT.md and supabase/migrations).
 */

type StoredUser = {
  email: string;
  name: string;
  role: SessionUser["role"];
  salt: string;
  passwordHash: string;
};

const USERS: StoredUser[] = [
  {
    email: "consumer@farmit.in",
    name: "Ananya Rao",
    role: "consumer",
    salt: "farmit-demo-salt-consumer",
    // scrypt("consumer123", salt, 64)
    passwordHash: "05ad0d318650cac125bf1ce53e202a3764ecace7adf40cedfdeb85b6ec8e131a7ae870e53f38bbf7e07b82dc19c6ff87173fa1673a6cc356c2055b3d9af99eab",
  },
  {
    email: "farmer@farmit.in",
    name: "Shivanna",
    role: "farmer",
    salt: "farmit-demo-salt-farmer",
    // scrypt("farmer123", salt, 64)
    passwordHash: "82c6bcd5fc12e3ecb966f290ef0e1716e8d7d0d62964e7e03f83154af9af4567cc39687076ec635282d3cc6a6554489670a7971dcf001d7cc90d1e03cc362cc8",
  },
  {
    email: "operator@farmit.in",
    name: "FarmIt team",
    role: "operator",
    salt: "farmit-demo-salt-operator",
    // scrypt("operator123", salt, 64)
    passwordHash: "a9185899282b85cb7b8f0fa6fc6c7e307e061ff0af717e77a6d900369c044b2cac87428b743e775edbda17fbb2bbdb5ed64424aec118668d72f7e7c172f35d48",
  },
];

function hashPassword(password: string, salt: string): Buffer {
  return Buffer.from(scryptSync(password, salt, 64));
}

/** Returns the session user when email+password match a seeded account, else null. */
export function verifyCredentials(email: string, password: string): SessionUser | null {
  const user = USERS.find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!user) return null;
  const candidate = hashPassword(password, user.salt);
  const expected = Buffer.from(user.passwordHash, "hex");
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
  return { sub: user.email, email: user.email, name: user.name, role: user.role };
}
