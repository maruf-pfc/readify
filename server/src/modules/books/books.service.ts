import { pool } from '../../config/db';
import { AppError } from '../../utils/errorResponse';

export type Book = {
  id: number;
  title: string;
  author: string;
  price: number;
  stock: number;
  is_active: boolean;
  created_at?: Date;
};

export type NewBook = {
  title: string;
  author: string;
  price: number;
  stock?: number;
  is_active?: boolean;
};

export type BookQuery = {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
};

export const getAllBooks = async (query: BookQuery = {}): Promise<{ books: Book[]; total: number; page: number; limit: number }> => {
  const { search = '', minPrice, maxPrice, page = 1, limit = 10 } = query;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['is_active = true'];
  const values: any[] = [];
  let idx = 1;

  if (search) {
    conditions.push(`(title ILIKE $${idx} OR author ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }

  if (minPrice !== undefined) {
    conditions.push(`price >= $${idx}`);
    values.push(minPrice);
    idx++;
  }

  if (maxPrice !== undefined) {
    conditions.push(`price <= $${idx}`);
    values.push(maxPrice);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM books ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT id, title, author, price, stock, is_active, created_at
     FROM books ${where}
     ORDER BY id ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return { books: rows, total, page, limit };
};

export const getBookById = async (id: number): Promise<Book | null> => {
  const { rows } = await pool.query(
    `SELECT id, title, author, price, stock, is_active, created_at 
     FROM books WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const createBook = async (payload: NewBook): Promise<Book> => {
  const { title, author, price, stock = 0, is_active = true } = payload;
  const { rows } = await pool.query(
    `INSERT INTO books (title, author, price, stock, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, author, price, stock, is_active, created_at`,
    [title, author, price, stock, is_active]
  );
  return rows[0];
};

export const updateBook = async (
  id: number,
  payload: Partial<NewBook>
): Promise<Book | null> => {
  const keys = Object.keys(payload) as (keyof NewBook)[];
  if (keys.length === 0) return getBookById(id);

  const sets: string[] = [];
  const values: any[] = [];

  keys.forEach((k, idx) => {
    sets.push(`${k} = $${idx + 1}`);
    // @ts-ignore
    values.push(payload[k]);
  });

  values.push(id);
  const query = `UPDATE books SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING id, title, author, price, stock, is_active, created_at`;

  const { rows } = await pool.query(query, values);
  return rows[0] ?? null;
};

export const deleteBook = async (id: number): Promise<Book | null> => {
  const { rows } = await pool.query(
    `UPDATE books SET is_active = false WHERE id = $1 RETURNING id, title, author, price, stock, is_active, created_at`,
    [id]
  );
  return rows[0] ?? null;
};
