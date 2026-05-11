import { Request, Response, NextFunction } from 'express';
import * as ordersService from './orders.service';
import { AuthRequest } from '../../middlewares/auth';
import { z } from 'zod';

const createOrderSchema = z.object({
  items: z.array(z.object({
    book_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).min(1, 'Order must contain at least one item'),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']),
});

export const getOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await ordersService.getOrders();
    res.json({ ok: true, data: orders });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid order id' });
    }

    const requesterId = req.user!.id;
    const requesterRole = req.user!.role;

    const order = await ordersService.getOrderById(id, requesterId, requesterRole);
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

    res.json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createOrderSchema.parse(req.body);
    const user_id = req.user!.id;
    const order = await ordersService.createOrder(user_id, parsed.items);
    res.status(201).json({ ok: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid order id' });
    }

    const { status } = updateStatusSchema.parse(req.body);
    const updated = await ordersService.updateOrderStatus(id, status);
    if (!updated) return res.status(404).json({ ok: false, error: 'Order not found' });

    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user!.id;
    const orders = await ordersService.getOrdersByUser(user_id);
    res.json({ ok: true, data: orders });
  } catch (err) {
    next(err);
  }
};
