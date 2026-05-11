import { pool } from '../../config/db';
import { AppError } from '../../utils/errorResponse';

export type OrderItem = {
  book_id: number;
  quantity: number;
  price: number;
};

export type Order = {
  id: number;
  user_id: number;
  total: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  items?: OrderItem[];
  created_at?: Date;
};

export const createOrder = async (user_id: number, items: OrderItem[]): Promise<Order> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      const { rows } = await client.query(
        `SELECT id, title, stock, is_active FROM books WHERE id = $1`,
        [item.book_id]
      );
      const book = rows[0];

      if (!book) {
        throw new AppError(`Book with id ${item.book_id} not found`, 404);
      }
      if (!book.is_active) {
        throw new AppError(`Book "${book.title}" is not available`, 400);
      }
      if (book.stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${book.title}". Available: ${book.stock}, Requested: ${item.quantity}`,
          400
        );
      }
    }

    const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id, user_id, total, status, created_at`,
      [user_id, total]
    );
    const order = orderRows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, book_id, quantity, price) VALUES ($1, $2, $3, $4)`,
        [order.id, item.book_id, item.quantity, item.price]
      );

      await client.query(
        `UPDATE books SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.book_id]
      );
    }

    await client.query('COMMIT');

    return { ...order, items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getOrders = async (): Promise<Order[]> => {
  const { rows } = await pool.query(`SELECT * FROM orders ORDER BY id ASC`);
  return rows;
};

export const getOrderById = async (id: number, requesterId: number, requesterRole: string): Promise<Order | null> => {
  const { rows } = await pool.query(`SELECT * FROM orders WHERE id=$1`, [id]);
  const order = rows[0];
  if (!order) return null;

  if (requesterRole === 'CUSTOMER' && order.user_id !== requesterId) {
    throw new AppError('You do not have access to this order', 403);
  }

  const { rows: orderItems } = await pool.query(`SELECT * FROM order_items WHERE order_id=$1`, [id]);
  return { ...order, items: orderItems };
};

export const updateOrderStatus = async (id: number, status: 'PENDING' | 'PAID' | 'CANCELLED'): Promise<Order | null> => {
  const { rows } = await pool.query(
    `UPDATE orders SET status=$1 WHERE id=$2 RETURNING *`,
    [status, id]
  );
  return rows[0] ?? null;
};

export const getOrdersByUser = async (user_id: number): Promise<Order[]> => {
  const { rows } = await pool.query(
    `SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC`,
    [user_id]
  );
  return rows;
};
