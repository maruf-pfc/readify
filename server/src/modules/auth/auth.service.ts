import { pool } from '../../config/db';
import { hashPassword, verifyPassword } from '../../utils/passwords';
import { signAccessToken, signRefreshToken, JwtPayload, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../utils/errorResponse';

export type User = {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  password?: string;
};

export const register = async (name: string, email: string, password: string, retypePassword: string): Promise<User> => {
  if (!name || !email || !password || !retypePassword) {
    throw new AppError('All fields are required', 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length) {
    throw new AppError('Email already in use', 409);
  }

  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_])[A-Za-z\d!@#$%^&*()_]{8,}$/;

  if (!strongPasswordRegex.test(password)) {
    throw new AppError(
      'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character',
      400
    );
  }

  if (password !== retypePassword) {
    throw new AppError('Passwords do not match', 400);
  }

  const hashed = await hashPassword(password);

  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role',
    [name, email, hashed]
  );

  return rows[0];
};

export const login = async (email: string, password: string) => {
  if (!email || !password) {
    throw new AppError('All fields are required', 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  const user = rows[0];

  if (!user) throw new AppError('Invalid email or password', 401);

  const now = new Date();
  if (user.lock_until && now < new Date(user.lock_until)) {
    const waitMinutes = Math.ceil((new Date(user.lock_until).getTime() - now.getTime()) / 60000);
    throw new AppError(`Account locked. Try again after ${waitMinutes} minute(s).`, 403);
  }

  const valid = await verifyPassword(password, user.password);

  if (!valid) {
    let failedAttempts = (user.failed_attempts || 0) + 1;
    let lockUntil: Date | null = null;

    if (failedAttempts >= 3) {
      lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      failedAttempts = 0;
      await pool.query(
        'UPDATE users SET failed_attempts=$1, lock_until=$2 WHERE id=$3',
        [failedAttempts, lockUntil, user.id]
      );
      throw new AppError(`Account locked due to 3 failed attempts. Try again after 15 minutes.`, 403);
    } else {
      const remaining = 3 - failedAttempts;
      await pool.query(
        'UPDATE users SET failed_attempts=$1 WHERE id=$2',
        [failedAttempts, user.id]
      );
      throw new AppError(`Password not matched. You have ${remaining} attempt(s) left.`, 401);
    }
  }

  await pool.query(
    'UPDATE users SET failed_attempts=0, lock_until=NULL WHERE id=$1',
    [user.id]
  );

  const payload: JwtPayload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await pool.query('UPDATE users SET refresh_token=$1 WHERE id=$2', [refreshToken, user.id]);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const refreshAccessToken = async (token: string) => {
  try {
    const payload = verifyRefreshToken(token);

    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1 AND refresh_token=$2', [payload.sub, token]);
    const user = rows[0];
    if (!user) throw new AppError('Invalid refresh token', 401);

    const newAccessToken = signAccessToken({ sub: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ sub: user.id, role: user.role });

    await pool.query('UPDATE users SET refresh_token=$1 WHERE id=$2', [newRefreshToken, user.id]);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (err) {
    throw new AppError('Refresh token expired or invalid', 401);
  }
};

export const logout = async (token: string): Promise<void> => {
  const { rowCount } = await pool.query(
    'UPDATE users SET refresh_token=NULL WHERE refresh_token=$1',
    [token]
  );
  if (!rowCount) {
    throw new AppError('Invalid refresh token', 401);
  }
};

export const getMe = async (userId: number): Promise<User> => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id=$1',
    [userId]
  );
  if (!rows.length) throw new AppError('User not found', 404);
  return rows[0];
};
