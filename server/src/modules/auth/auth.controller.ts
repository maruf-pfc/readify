import { NextFunction, Request, Response } from 'express';
import * as authService from './auth.service';
import { z } from 'zod';
import { AuthRequest } from '../../middlewares/auth';

export const registerSchema = z.object({
  name: z.string().nonempty('Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password too short'),
  retypePassword: z.string().min(8, 'Retype Password too short'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password too short'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().nonempty('Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().nonempty('Refresh token is required'),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, retypePassword } = registerSchema.parse(req.body);
    const user = await authService.register(name, email, password, retypePassword);
    res.status(201).json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const data = await authService.login(email, password);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.json({ ok: true, data: tokens });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = logoutSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.json({ ok: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ ok: false, error: 'Not authenticated' });
      return;
    }
    const user = await authService.getMe(req.user.id);
    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
};