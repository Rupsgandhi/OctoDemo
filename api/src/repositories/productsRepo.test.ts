import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsRepository } from './productsRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('ProductsRepository', () => {
  let repository: ProductsRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      db: {} as any,
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
      close: vi.fn(),
    };
    (getDatabase as any).mockResolvedValue(mockDb);
    repository = new ProductsRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all products mapped to camelCase', async () => {
      mockDb.all.mockResolvedValue([
        { product_id: 1, supplier_id: 2, name: 'Widget', description: 'A widget', price: 9.99, sku: 'W-001', unit: 'piece', img_name: 'w.png', discount: 0 },
      ]);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM products ORDER BY product_id');
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(1);
      expect(result[0].supplierId).toBe(2);
      expect(result[0].name).toBe('Widget');
    });

    it('should return empty array when no products exist', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      mockDb.get.mockResolvedValue({ product_id: 1, supplier_id: 2, name: 'Widget', description: '', price: 9.99, sku: 'W-001', unit: 'pc', img_name: '', discount: 0 });

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM products WHERE product_id = ?', [1]);
      expect(result?.productId).toBe(1);
      expect(result?.name).toBe('Widget');
    });

    it('should return null when product not found', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return the created product', async () => {
      const newProduct = { supplierId: 1, name: 'Gadget', description: 'Desc', price: 5.0, sku: 'G-001', unit: 'kg', imgName: 'g.png', discount: 0 };
      const dbRow = { product_id: 3, supplier_id: 1, name: 'Gadget', description: 'Desc', price: 5.0, sku: 'G-001', unit: 'kg', img_name: 'g.png', discount: 0 };

      mockDb.run.mockResolvedValue({ lastID: 3, changes: 1 });
      mockDb.get.mockResolvedValue(dbRow);

      const result = await repository.create(newProduct);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.productId).toBe(3);
      expect(result.name).toBe('Gadget');
    });
  });

  describe('update', () => {
    it('should update and return modified product', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({ product_id: 1, supplier_id: 1, name: 'Updated', description: '', price: 12.0, sku: 'U-001', unit: 'pc', img_name: '', discount: 0 });

      const result = await repository.update(1, { name: 'Updated', price: 12.0 });

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Updated');
      expect(result.price).toBe(12.0);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { name: 'Ghost' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete existing product', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM products WHERE product_id = ?', [1]);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when product exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM products WHERE product_id = ?',
        [1],
      );
    });

    it('should return false when product does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });

      const result = await repository.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('findBySupplierId', () => {
    it('should return products for a given supplier', async () => {
      const rows = [
        { product_id: 1, supplier_id: 5, name: 'A', description: '', price: 1.0, sku: 'A1', unit: 'pc', img_name: '', discount: 0 },
        { product_id: 2, supplier_id: 5, name: 'B', description: '', price: 2.0, sku: 'B1', unit: 'pc', img_name: '', discount: 0 },
      ];
      mockDb.all.mockResolvedValue(rows);

      const result = await repository.findBySupplierId(5);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE supplier_id = ? ORDER BY name',
        [5],
      );
      expect(result).toHaveLength(2);
      expect(result[0].supplierId).toBe(5);
    });

    it('should return empty array when supplier has no products', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findBySupplierId(999);

      expect(result).toEqual([]);
    });
  });

  describe('findByName', () => {
    it('should return products matching the name pattern', async () => {
      mockDb.all.mockResolvedValue([
        { product_id: 1, supplier_id: 1, name: 'Widget Pro', description: '', price: 9.99, sku: 'WP-1', unit: 'pc', img_name: '', discount: 0 },
      ]);

      const result = await repository.findByName('Widget');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Widget Pro');
    });

    it('should return empty array when no products match the name', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findByName('Nonexistent');

      expect(result).toEqual([]);
    });
  });
});
