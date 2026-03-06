import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../app.js';

let mongo;

const TEST_USER_ID = '69aa970204f287662f4fa392';

const authCookies = (overrides = {}) => {
  const userId = overrides.userId || TEST_USER_ID;
  const role = overrides.role || 'user';
  const token = overrides.token || `test-token-${userId}`;

  return [`token=${token}`, `userId=${userId}`, `role=${role}`];
};

const validPayload = {
  shippingAddress: {
    street: '221B Baker Street',
    city: 'London',
    state: 'Greater London',
    zip: 'NW16XE',
    country: 'UK',
  },
};

// These are contract tests for the endpoint requested by product requirements.
// They are skipped until POST /api/order/ is implemented.
describe.skip('POST /api/order/ - create order from current cart', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'order-test' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }

    if (mongo) {
      await mongo.stop();
    }
  });

  it('creates an order from current cart items and returns 201', async () => {
    const res = await request(app)
      .post('/api/order/')
      .set('Cookie', authCookies())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/order created/i);
    expect(res.body.order).toBeDefined();
    expect(Array.isArray(res.body.order.items)).toBe(true);
    expect(res.body.order.items.length).toBeGreaterThan(0);
  });

  it('copies priced items from cart snapshot into order', async () => {
    const res = await request(app)
      .post('/api/order/')
      .set('Cookie', authCookies())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.order.items[0]).toEqual(
      expect.objectContaining({
        product: expect.any(String),
        quantity: expect.any(Number),
        price: expect.objectContaining({
          amount: expect.any(Number),
          currency: expect.any(String),
        }),
      }),
    );
  });

  it('computes tax and shipping and returns payable totals', async () => {
    const res = await request(app)
      .post('/api/order/')
      .set('Cookie', authCookies())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.order).toEqual(
      expect.objectContaining({
        subtotal: expect.any(Number),
        tax: expect.any(Number),
        shipping: expect.any(Number),
        totalAmount: expect.any(Number),
      }),
    );

    const { subtotal, tax, shipping, totalAmount } = res.body.order;
    expect(totalAmount).toBeCloseTo(subtotal + tax + shipping, 2);
  });

  it('sets initial order status to pending', async () => {
    const res = await request(app)
      .post('/api/order/')
      .set('Cookie', authCookies())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('pending');
  });

  it('reserves inventory for every ordered item before success response', async () => {
    const res = await request(app)
      .post('/api/order/')
      .set('Cookie', authCookies())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.inventoryReserved).toBe(true);
    expect(res.body.reservations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          product: expect.any(String),
          quantity: expect.any(Number),
          reserved: true,
        }),
      ]),
    );
  });

  it('returns 401 when user is not authenticated', async () => {
    const res = await request(app)
      .post('/api/order/')
      .send(validPayload);

    expect(res.status).toBe(401);
  });

  it('returns 404 when no active cart is found for the user', async () => {
    const res = await request(app)
      .post('/api/order/')
      .set('Cookie', authCookies({ userId: '507f1f77bcf86cd799439099' }))
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/cart not found/i);
  });

  it('returns 400 when cart exists but has zero items', async () => {
    const res = await request(app)
      .post('/api/order/')
      .set('Cookie', authCookies())
      .send({ ...validPayload, cartMode: 'empty' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cart is empty/i);
  });

  it('returns 400 for invalid shipping address payload', async () => {
    const res = await request(app)
      .post('/api/order/')
      .set('Cookie', authCookies())
      .send({ shippingAddress: { street: '' } });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('fails atomically if any inventory reservation fails', async () => {
    const res = await request(app)
      .post('/api/order/')
      .set('Cookie', authCookies())
      .send({ ...validPayload, forceInventoryFailure: true });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/inventory/i);
  });
});
