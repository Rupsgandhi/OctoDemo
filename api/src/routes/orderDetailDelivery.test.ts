import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import orderDetailDeliveryRouter from './orderDetailDelivery';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('OrderDetailDelivery API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed full FK chain: hq → branch → supplier → product → order → orderDetail + delivery
    const db = await getDatabase();
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [1, 'HQ']);
    await db.run('INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)', [1, 1, 'Branch 1']);
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier 1']);
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, price, sku, unit) VALUES (?, ?, ?, ?, ?, ?)',
      [1, 1, 'Product 1', 10.0, 'SKU-1', 'unit'],
    );
    await db.run(
      'INSERT INTO orders (order_id, branch_id, order_date, name, status) VALUES (?, ?, ?, ?, ?)',
      [1, 1, '2024-03-01', 'Order 1', 'pending'],
    );
    await db.run(
      'INSERT INTO order_details (order_detail_id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
      [1, 1, 1, 10, 10.0],
    );
    await db.run(
      'INSERT INTO deliveries (delivery_id, supplier_id, delivery_date, name, status) VALUES (?, ?, ?, ?, ?)',
      [1, 1, '2024-03-05', 'Delivery 1', 'pending'],
    );

    app = express();
    app.use(express.json());
    app.use('/order-detail-deliveries', orderDetailDeliveryRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  const sampleLink = () => ({
    orderDetailId: 1,
    deliveryId: 1,
    quantity: 5,
    notes: 'Partial shipment',
  });

  it('should create a new order detail delivery', async () => {
    const response = await request(app).post('/order-detail-deliveries').send(sampleLink());
    expect(response.status).toBe(201);
    expect(response.body.orderDetailDeliveryId).toBeDefined();
    expect(response.body.quantity).toBe(5);
    expect(response.body.orderDetailId).toBe(1);
    expect(response.body.deliveryId).toBe(1);
  });

  it('should get all order detail deliveries', async () => {
    const response = await request(app).get('/order-detail-deliveries');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should return empty array when none exist', async () => {
    const response = await request(app).get('/order-detail-deliveries');
    expect(response.body).toHaveLength(0);
  });

  it('should get an order detail delivery by ID', async () => {
    const created = await request(app).post('/order-detail-deliveries').send(sampleLink());
    const id = created.body.orderDetailDeliveryId;

    const response = await request(app).get(`/order-detail-deliveries/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.orderDetailDeliveryId).toBe(id);
    expect(response.body.deliveryId).toBe(1);
  });

  it('should return 404 for non-existing order detail delivery', async () => {
    const response = await request(app).get('/order-detail-deliveries/9999');
    expect(response.status).toBe(404);
  });

  it('should update quantity of an order detail delivery', async () => {
    const created = await request(app).post('/order-detail-deliveries').send(sampleLink());
    const id = created.body.orderDetailDeliveryId;

    const response = await request(app)
      .put(`/order-detail-deliveries/${id}`)
      .send({ quantity: 8 });
    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(8);
  });

  it('should update notes of an order detail delivery', async () => {
    const created = await request(app).post('/order-detail-deliveries').send(sampleLink());
    const id = created.body.orderDetailDeliveryId;

    const response = await request(app)
      .put(`/order-detail-deliveries/${id}`)
      .send({ notes: 'Full shipment' });
    expect(response.status).toBe(200);
    expect(response.body.notes).toBe('Full shipment');
  });

  it('should return 404 when updating a non-existing order detail delivery', async () => {
    const response = await request(app)
      .put('/order-detail-deliveries/9999')
      .send({ quantity: 1 });
    expect(response.status).toBe(404);
  });

  it('should delete an order detail delivery by ID', async () => {
    const created = await request(app).post('/order-detail-deliveries').send(sampleLink());
    const id = created.body.orderDetailDeliveryId;

    const response = await request(app).delete(`/order-detail-deliveries/${id}`);
    expect(response.status).toBe(204);

    const getResponse = await request(app).get(`/order-detail-deliveries/${id}`);
    expect(getResponse.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing order detail delivery', async () => {
    const response = await request(app).delete('/order-detail-deliveries/9999');
    expect(response.status).toBe(404);
  });

  it('should persist multiple entries and list all', async () => {
    // Need two separate orderDetails or deliveries to avoid any UNIQUE issues
    const db = await getDatabase();
    await db.run(
      'INSERT INTO order_details (order_detail_id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
      [2, 1, 1, 3, 10.0],
    );

    await request(app).post('/order-detail-deliveries').send({ ...sampleLink(), orderDetailId: 1 });
    await request(app).post('/order-detail-deliveries').send({ ...sampleLink(), orderDetailId: 2 });

    const response = await request(app).get('/order-detail-deliveries');
    expect(response.body.length).toBe(2);
  });
});
