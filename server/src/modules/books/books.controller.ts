import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as booksService from './books.service';

// Zod schemas
const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  price: z.coerce.number().positive('Price must be a positive number'),
  stock: z.coerce.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

const updateBookSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  price: z.coerce.number().positive().optional(),
  stock: z.coerce.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const getBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = (req.query.search as string) || '';
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;

    const result = await booksService.getAllBooks({ search, minPrice, maxPrice, page, limit });
    res.status(200).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getBookById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid book id' });
    }

    const book = await booksService.getBookById(id);
    if (!book) return res.status(404).json({ ok: false, error: 'Book not found' });

    res.json({ ok: true, data: book });
  } catch (err) {
    next(err);
  }
};

export const createBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBookSchema.parse(req.body);
    const created = await booksService.createBook(parsed);
    res.status(201).json({ ok: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const updateBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid book id' });
    }

    const parsed = updateBookSchema.parse(req.body);
    if (Object.keys(parsed).length === 0) {
      return res.status(400).json({ ok: false, error: 'Nothing to update' });
    }

    const updated = await booksService.updateBook(id, parsed);
    if (!updated) return res.status(404).json({ ok: false, error: 'Book not found' });

    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid book id' });
    }

    const deleted = await booksService.deleteBook(id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Book not found' });

    res.json({ ok: true, data: deleted });
  } catch (err) {
    next(err);
  }
};
