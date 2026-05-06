import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsRepository } from './productsRepo';
import { NotFoundError } from '../utils/errors';

// Mock the getDatabase function first
vi.mock('../db/sqlite', () => ({
    getDatabase: vi.fn()
}));

// Import the mocked module
import { getDatabase } from '../db/sqlite';

describe('ProductsRepository', () => {
    let repository: ProductsRepository;
    let mockDb: any;

    const mockProductRow = {
        product_id: 1,
        supplier_id: 10,
        name: 'Widget A',
        description: 'A standard widget',
        price: 9.99,
        sku: 'WGT-001',
        unit: 'each',
        img_name: 'widget_a.png',
        discount: 0.0
    };

    const mockProductRow2 = {
        product_id: 2,
        supplier_id: 10,
        name: 'Widget B',
        description: 'Another widget',
        price: 19.99,
        sku: 'WGT-002',
        unit: 'each',
        img_name: 'widget_b.png',
        discount: 0.1
    };

    beforeEach(() => {
        // Create mock database connection
        mockDb = {
            db: {} as any,
            run: vi.fn(),
            get: vi.fn(),
            all: vi.fn(),
            close: vi.fn()
        };

        // Mock getDatabase to return our mock
        (getDatabase as any).mockResolvedValue(mockDb);

        repository = new ProductsRepository(mockDb);
        vi.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all products in inventory', async () => {
            mockDb.all.mockResolvedValue([mockProductRow, mockProductRow2]);

            const result = await repository.findAll();

            expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM products ORDER BY product_id');
            expect(result).toHaveLength(2);
            expect(result[0].productId).toBe(1);
            expect(result[0].name).toBe('Widget A');
            expect(result[1].productId).toBe(2);
            expect(result[1].name).toBe('Widget B');
        });

        it('should return empty array when inventory has no products', async () => {
            mockDb.all.mockResolvedValue([]);

            const result = await repository.findAll();

            expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM products ORDER BY product_id');
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('should return a product when found by ID', async () => {
            mockDb.get.mockResolvedValue(mockProductRow);

            const result = await repository.findById(1);

            expect(mockDb.get).toHaveBeenCalledWith(
                'SELECT * FROM products WHERE product_id = ?',
                [1]
            );
            expect(result).not.toBeNull();
            expect(result?.productId).toBe(1);
            expect(result?.name).toBe('Widget A');
            expect(result?.price).toBe(9.99);
            expect(result?.sku).toBe('WGT-001');
        });

        it('should return null when product ID does not exist', async () => {
            mockDb.get.mockResolvedValue(undefined);

            const result = await repository.findById(9999);

            expect(mockDb.get).toHaveBeenCalledWith(
                'SELECT * FROM products WHERE product_id = ?',
                [9999]
            );
            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create a new product and return it', async () => {
            const newProduct = {
                supplierId: 10,
                name: 'New Widget',
                description: 'Brand new widget',
                price: 14.99,
                sku: 'WGT-003',
                unit: 'each',
                imgName: 'new_widget.png',
                discount: 0.0
            };

            mockDb.run.mockResolvedValue({ lastID: 3, changes: 1 });
            mockDb.get.mockResolvedValue({
                product_id: 3,
                supplier_id: 10,
                name: 'New Widget',
                description: 'Brand new widget',
                price: 14.99,
                sku: 'WGT-003',
                unit: 'each',
                img_name: 'new_widget.png',
                discount: 0.0
            });

            const result = await repository.create(newProduct);

            expect(mockDb.run).toHaveBeenCalled();
            expect(result.productId).toBe(3);
            expect(result.name).toBe('New Widget');
            expect(result.price).toBe(14.99);
        });
    });

    describe('update', () => {
        it('should update product details successfully', async () => {
            const updateData = { price: 12.99, discount: 0.05 };

            mockDb.run.mockResolvedValue({ changes: 1 });
            mockDb.get.mockResolvedValue({
                ...mockProductRow,
                price: 12.99,
                discount: 0.05
            });

            const result = await repository.update(1, updateData);

            expect(mockDb.run).toHaveBeenCalledWith(
                'UPDATE products SET price = ?, discount = ? WHERE product_id = ?',
                [12.99, 0.05, 1]
            );
            expect(result.price).toBe(12.99);
            expect(result.discount).toBe(0.05);
        });

        it('should throw NotFoundError when updating a non-existent product', async () => {
            mockDb.run.mockResolvedValue({ changes: 0 });

            await expect(repository.update(9999, { price: 5.00 }))
                .rejects.toThrow(NotFoundError);
        });

        it('should not affect other products when updating one product', async () => {
            // Set up mocks so that updating product 1 still returns product 2 unchanged
            mockDb.run.mockResolvedValue({ changes: 1 });

            // First call is for the updated product 1, second for product 2
            mockDb.get
                .mockResolvedValueOnce({ ...mockProductRow, price: 24.99 })
                .mockResolvedValueOnce(mockProductRow2);

            const updatedProduct1 = await repository.update(1, { price: 24.99 });
            const unchangedProduct2 = await repository.findById(2);

            expect(updatedProduct1.productId).toBe(1);
            expect(updatedProduct1.price).toBe(24.99);
            expect(unchangedProduct2?.productId).toBe(2);
            expect(unchangedProduct2?.price).toBe(19.99);
        });
    });

    describe('delete', () => {
        it('should delete an existing product', async () => {
            mockDb.run.mockResolvedValue({ changes: 1 });

            await repository.delete(1);

            expect(mockDb.run).toHaveBeenCalledWith(
                'DELETE FROM products WHERE product_id = ?',
                [1]
            );
        });

        it('should throw NotFoundError when deleting a non-existent product', async () => {
            mockDb.run.mockResolvedValue({ changes: 0 });

            await expect(repository.delete(9999))
                .rejects.toThrow(NotFoundError);
        });
    });

    describe('exists', () => {
        it('should return true when product exists', async () => {
            mockDb.get.mockResolvedValue({ count: 1 });

            const result = await repository.exists(1);

            expect(result).toBe(true);
            expect(mockDb.get).toHaveBeenCalledWith(
                'SELECT COUNT(*) as count FROM products WHERE product_id = ?',
                [1]
            );
        });

        it('should return false when product does not exist', async () => {
            mockDb.get.mockResolvedValue({ count: 0 });

            const result = await repository.exists(9999);

            expect(result).toBe(false);
        });
    });

    describe('findBySupplierId', () => {
        it('should return all products for a given supplier', async () => {
            mockDb.all.mockResolvedValue([mockProductRow, mockProductRow2]);

            const result = await repository.findBySupplierId(10);

            expect(mockDb.all).toHaveBeenCalledWith(
                'SELECT * FROM products WHERE supplier_id = ? ORDER BY name',
                [10]
            );
            expect(result).toHaveLength(2);
            expect(result[0].supplierId).toBe(10);
            expect(result[1].supplierId).toBe(10);
        });

        it('should return empty array when supplier has no products', async () => {
            mockDb.all.mockResolvedValue([]);

            const result = await repository.findBySupplierId(999);

            expect(result).toEqual([]);
        });
    });

    describe('findByName', () => {
        it('should return products matching a name pattern', async () => {
            mockDb.all.mockResolvedValue([mockProductRow, mockProductRow2]);

            const result = await repository.findByName('Widget');

            expect(mockDb.all).toHaveBeenCalledWith(
                'SELECT * FROM products WHERE name LIKE ? ORDER BY name',
                ['%Widget%']
            );
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Widget A');
            expect(result[1].name).toBe('Widget B');
        });

        it('should return empty array when no products match the name', async () => {
            mockDb.all.mockResolvedValue([]);

            const result = await repository.findByName('NonExistent');

            expect(result).toEqual([]);
        });
    });
});
