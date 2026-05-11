import { Request, Response, NextFunction } from 'express';
import * as userService from './users.service';
import { z } from 'zod';

// Zod schemas
const idSchema = z.number().int().positive();

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']).optional(), // STAFF was missing
});

export const getAllUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ ok: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(Number(req.params.id));
    const user = await userService.getUserById(id);
    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(Number(req.params.id));
    const parsed = updateUserSchema.parse(req.body);

    const updated = await userService.updateUser(id, parsed.name, parsed.role);
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = idSchema.parse(Number(req.params.id));
    const deleted = await userService.deleteUser(id);
    res.json({ ok: true, message: 'User deleted', data: deleted });
  } catch (err) {
    next(err);
  }
};
