import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsRepository } from './productsRepo';

// Mock the getDatabase function first
vi.mock('../db/sqlite', () => ({
    getDatabase: vi.fn()
}));

// Import the mocked module
import { getDatabase } from '../db/sqlite';

describe('ProductsRepository', () => {
    let repository: ProductsRepository;
    let mockDb: any;

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

    describe('findLowStock', () => {
        it('should return products where stock_level is below reorder_level', async () => {
            const mockResults = [
                { product_id: 1, name: 'SmartFeeder One', stock_level: 5, reorder_level: 10 },
                { product_id: 7, name: 'ClimbCast Cat Tree', stock_level: 0, reorder_level: 3 },
            ];
            mockDb.all.mockResolvedValue(mockResults);

            const result = await repository.findLowStock();

            expect(mockDb.all).toHaveBeenCalledWith(
                'SELECT product_id, name, stock_level, reorder_level FROM products WHERE stock_level < reorder_level ORDER BY name',
            );
            expect(result).toHaveLength(2);
            expect(result[0].productId).toBe(1);
            expect(result[0].name).toBe('SmartFeeder One');
            expect(result[0].stockLevel).toBe(5);
            expect(result[0].reorderLevel).toBe(10);
            expect(result[1].productId).toBe(7);
            expect(result[1].name).toBe('ClimbCast Cat Tree');
            expect(result[1].stockLevel).toBe(0);
            expect(result[1].reorderLevel).toBe(3);
        });

        it('should return empty array when no products are low on stock', async () => {
            mockDb.all.mockResolvedValue([]);

            const result = await repository.findLowStock();

            expect(mockDb.all).toHaveBeenCalledWith(
                'SELECT product_id, name, stock_level, reorder_level FROM products WHERE stock_level < reorder_level ORDER BY name',
            );
            expect(result).toEqual([]);
        });

        it('should propagate database errors', async () => {
            mockDb.all.mockRejectedValue(new Error('Database connection failed'));

            await expect(repository.findLowStock()).rejects.toThrow();
        });
    });
});
