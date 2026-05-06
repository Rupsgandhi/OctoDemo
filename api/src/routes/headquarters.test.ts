import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import headquartersRouter from './headquarters';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Headquarters API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    app = express();
    app.use(express.json());
    app.use('/headquarters', headquartersRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  const sampleHQ = () => ({
    name: 'Central HQ',
    description: 'Main operations center',
    address: '1 Corporate Plaza',
    contactPerson: 'Frank Director',
    email: 'frank@hq.com',
    phone: '555-1000',
  });

  it('should create a new headquarters', async () => {
    const response = await request(app).post('/headquarters').send(sampleHQ());
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Central HQ');
    expect(response.body.headquartersId).toBeDefined();
  });

  it('should get all headquarters', async () => {
    const response = await request(app).get('/headquarters');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should return empty array when no headquarters exist', async () => {
    const response = await request(app).get('/headquarters');
    expect(response.body).toHaveLength(0);
  });

  it('should get a headquarters by ID', async () => {
    const created = await request(app).post('/headquarters').send(sampleHQ());
    const id = created.body.headquartersId;

    const response = await request(app).get(`/headquarters/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.headquartersId).toBe(id);
    expect(response.body.name).toBe('Central HQ');
  });

  it('should return 404 for a non-existing headquarters', async () => {
    const response = await request(app).get('/headquarters/9999');
    expect(response.status).toBe(404);
  });

  it('should delete a headquarters by ID', async () => {
    const created = await request(app).post('/headquarters').send(sampleHQ());
    const id = created.body.headquartersId;

    const response = await request(app).delete(`/headquarters/${id}`);
    expect(response.status).toBe(204);

    const getResponse = await request(app).get(`/headquarters/${id}`);
    expect(getResponse.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing headquarters', async () => {
    const response = await request(app).delete('/headquarters/9999');
    expect(response.status).toBe(404);
  });

  it('should return 500 for POST without required name field (TypeError in validator)', async () => {
    // validateHQName(undefined) throws TypeError: Cannot read properties of undefined
    // because it tries to access `hq.name` when hq is undefined → 500 instead of 400
    const response = await request(app)
      .post('/headquarters')
      .send({ address: '123 St' }); // missing name
    expect(response.status).toBe(500);
  });

  it('should return 400 for POST without required address field', async () => {
    const response = await request(app)
      .post('/headquarters')
      .send({ name: 'HQ' }); // missing address
    expect(response.status).toBe(400);
  });

  // PUT /headquarters/:id calls HeadquartersValidator without `new` — strict mode makes `this`
  // undefined, causing a TypeError that the error handler converts to 500.
  it('should return 500 for PUT due to broken validator (calling constructor without new)', async () => {
    const created = await request(app).post('/headquarters').send(sampleHQ());
    const id = created.body.headquartersId;

    const response = await request(app)
      .put(`/headquarters/${id}`)
      .send({ name: 'Updated HQ', address: '2 Corporate Plaza' });
    expect(response.status).toBe(500);
  });

  it('should return metrics for an existing headquarters', async () => {
    const created = await request(app).post('/headquarters').send(sampleHQ());
    const id = created.body.headquartersId;

    const response = await request(app).get(`/headquarters/${id}/metrics`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('score');
    expect(response.body).toHaveProperty('average');
    expect(response.body).toHaveProperty('display');
  });

  it('should return 404 for metrics of non-existing headquarters', async () => {
    const response = await request(app).get('/headquarters/9999/metrics');
    expect(response.status).toBe(404);
  });

  it('should return label for an existing headquarters', async () => {
    const created = await request(app).post('/headquarters').send(sampleHQ());
    const id = created.body.headquartersId;

    const response = await request(app).get(`/headquarters/${id}/label`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('label');
    expect(typeof response.body.label).toBe('string');
  });

  it('should return 404 for label of non-existing headquarters', async () => {
    const response = await request(app).get('/headquarters/9999/label');
    expect(response.status).toBe(404);
  });

  it('should persist multiple headquarters and list them', async () => {
    await request(app).post('/headquarters').send({ ...sampleHQ(), name: 'HQ Alpha', address: '1 Alpha St' });
    await request(app).post('/headquarters').send({ ...sampleHQ(), name: 'HQ Beta', address: '2 Beta St' });

    const response = await request(app).get('/headquarters');
    expect(response.body.length).toBe(2);
  });
});
