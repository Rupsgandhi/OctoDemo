import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import productRouter from './product';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Product API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed a supplier required by the products FK constraint
    const db = await getDatabase();
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Test Supplier']);

    app = express();
    app.use(express.json());
    app.use('/products', productRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  const sampleProduct = () => ({
    supplierId: 1,
    name: 'Widget',
    description: 'A useful widget',
    price: 19.99,
    sku: 'WGT-001',
    unit: 'piece',
    imgName: 'widget.png',
    discount: 0,
  });

  it('should create a new product', async () => {
    const response = await request(app).post('/products').send(sampleProduct());
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Widget');
    expect(response.body.productId).toBeDefined();
    expect(response.body.price).toBe(19.99);
  });

  it('should get all products', async () => {
    const response = await request(app).get('/products');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should return empty array when no products exist', async () => {
    const response = await request(app).get('/products');
    expect(response.body).toHaveLength(0);
  });

  it('should get a product by ID', async () => {
    const created = await request(app).post('/products').send(sampleProduct());
    const id = created.body.productId;

    const response = await request(app).get(`/products/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.productId).toBe(id);
    expect(response.body.sku).toBe('WGT-001');
  });

  it('should return 404 for a non-existing product', async () => {
    const response = await request(app).get('/products/9999');
    expect(response.status).toBe(404);
  });

  it('should update a product by ID', async () => {
    const created = await request(app).post('/products').send(sampleProduct());
    const id = created.body.productId;

    const response = await request(app)
      .put(`/products/${id}`)
      .send({ name: 'Super Widget', price: 24.99 });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Super Widget');
    expect(response.body.price).toBe(24.99);
  });

  it('should return 404 when updating a non-existing product', async () => {
    const response = await request(app)
      .put('/products/9999')
      .send({ name: 'Ghost Product' });
    expect(response.status).toBe(404);
  });

  it('should delete a product by ID', async () => {
    const created = await request(app).post('/products').send(sampleProduct());
    const id = created.body.productId;

    const response = await request(app).delete(`/products/${id}`);
    expect(response.status).toBe(204);

    const getResponse = await request(app).get(`/products/${id}`);
    expect(getResponse.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing product', async () => {
    const response = await request(app).delete('/products/9999');
    expect(response.status).toBe(404);
  });

  it('should find products by name', async () => {
    await request(app).post('/products').send({ ...sampleProduct(), name: 'Alpha Gadget', sku: 'ALG-001' });
    await request(app).post('/products').send({ ...sampleProduct(), name: 'Beta Gadget', sku: 'BEG-001' });

    const response = await request(app).get('/products/name/Gadget');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  it('should persist multiple products and list them', async () => {
    await request(app).post('/products').send({ ...sampleProduct(), name: 'Product 1', sku: 'P1' });
    await request(app).post('/products').send({ ...sampleProduct(), name: 'Product 2', sku: 'P2' });

    const response = await request(app).get('/products');
    expect(response.body.length).toBe(2);
  });
});
