import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';

jest.setTimeout(60000);

let mongo;

const buildUserId = () => new mongoose.Types.ObjectId().toString();
const buildProductId = () => new mongoose.Types.ObjectId().toString();

const buildItemPayload = overrides => ({
  productId: overrides?.productId || buildProductId(),
  title: overrides?.title || 'Noise Cancelling Headphones',
  price: overrides?.price || { amount: 4999, currency: 'INR' },
  quantity: overrides?.quantity || 1,
  thumbnail:
    overrides?.thumbnail ||
    'https://cdn.example.com/images/noise-cancelling-headphones.png',
});

const addItem = async ({ userId, payload }) => {
  return request(app)
    .post('/api/cart/items')
    .set('x-test-user-id', userId)
    .send(payload ?? buildItemPayload());
};

const patchItem = ({ userId, productId, quantity }) =>
  request(app)
    .patch(`/api/cart/items/${productId}`)
    .set('x-test-user-id', userId)
    .send({ quantity });

const removeItem = ({ userId, productId }) =>
  request(app)
    .delete(`/api/cart/items/${productId}`)
    .set('x-test-user-id', userId);

const getCart = userId => request(app).get('/api/cart').set('x-test-user-id', userId);

const clearCart = userId => request(app).delete('/api/cart').set('x-test-user-id', userId);

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri, { dbName: 'cart-test' });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  const { db } = mongoose.connection;
  if (!db) return;
  const collections = await db.collections();
  await Promise.all(collections.map(collection => collection.deleteMany({})));
});

describe('POST /api/cart/items', () => {
  it('creates a cart for the user when the first item is added', async () => {
    const userId = buildUserId();
    const payload = buildItemPayload({ quantity: 2, price: { amount: 2499, currency: 'INR' } });

    const res = await addItem({ userId, payload }).expect(201);

    expect(res.body.message).toMatch(/added/i);
    expect(res.body.cart.user).toBe(userId);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0]).toEqual(
      expect.objectContaining({
        productId: payload.productId,
        quantity: 2,
        price: expect.objectContaining({ amount: 2499, currency: 'INR' }),
      }),
    );
    expect(res.body.cart.subtotal).toEqual(
      expect.objectContaining({ amount: 4998, currency: 'INR' }),
    );
  });

  it('increments the quantity when the same product is added twice', async () => {
    const userId = buildUserId();
    const payload = buildItemPayload({ quantity: 1 });

    await addItem({ userId, payload }).expect(201);
    const res = await addItem({ userId, payload }).expect(200);

    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(2);
    expect(res.body.cart.subtotal.amount).toBe(payload.price.amount * 2);
  });

  it('rejects inbound requests missing the required fields', async () => {
    const userId = buildUserId();

    const res = await addItem({
      userId,
      payload: { productId: buildProductId() },
    }).expect(400);

    expect(res.body.error).toMatch(/required/i);
  });
});

describe('GET /api/cart', () => {
  it('returns an empty cart for first-time shoppers', async () => {
    const userId = buildUserId();

    const res = await getCart(userId).expect(200);

    expect(res.body.message).toMatch(/fetched/i);
    expect(res.body.cart.user).toBe(userId);
    expect(res.body.cart.items).toEqual([]);
    expect(res.body.cart.subtotal).toEqual(
      expect.objectContaining({ amount: 0, currency: 'INR' }),
    );
  });

  it('hydrates the cart with the latest items and totals', async () => {
    const userId = buildUserId();
    const payload = buildItemPayload({ quantity: 3, price: { amount: 1299, currency: 'INR' } });

    await addItem({ userId, payload }).expect(201);

    const res = await getCart(userId).expect(200);

    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0]).toEqual(
      expect.objectContaining({
        productId: payload.productId,
        quantity: 3,
        price: expect.objectContaining({ amount: 1299 }),
      }),
    );
    expect(res.body.cart.subtotal.amount).toBe(1299 * 3);
  });

  it('returns the latest list of items alongside accurate cart totals', async () => {
    const userId = buildUserId();
    const firstItem = buildItemPayload({ quantity: 2, price: { amount: 999, currency: 'INR' } });
    const secondItem = buildItemPayload({ quantity: 1, price: { amount: 1499, currency: 'INR' } });

    await addItem({ userId, payload: firstItem }).expect(201);
    await addItem({ userId, payload: secondItem }).expect(201);

    const res = await getCart(userId).expect(200);

    expect(res.body.message).toMatch(/fetched/i);
    expect(res.body.cart.items).toHaveLength(2);
    expect(res.body.cart.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: firstItem.productId,
          quantity: firstItem.quantity,
          price: expect.objectContaining({ amount: firstItem.price.amount }),
        }),
        expect.objectContaining({
          productId: secondItem.productId,
          quantity: secondItem.quantity,
          price: expect.objectContaining({ amount: secondItem.price.amount }),
        }),
      ]),
    );
    const expectedTotal =
      firstItem.price.amount * firstItem.quantity + secondItem.price.amount * secondItem.quantity;
    expect(res.body.cart.subtotal).toEqual(
      expect.objectContaining({ amount: expectedTotal, currency: 'INR' }),
    );
  });
});

describe('PATCH /api/cart/items/:productId', () => {
  it('updates the quantity for a given product and recalculates the subtotal', async () => {
    const userId = buildUserId();
    const payload = buildItemPayload({ quantity: 1 });

    await addItem({ userId, payload }).expect(201);

    const res = await patchItem({ userId, productId: payload.productId, quantity: 5 }).expect(200);

    expect(res.body.message).toMatch(/updated/i);
    expect(res.body.cart.items[0].quantity).toBe(5);
    expect(res.body.cart.subtotal.amount).toBe(payload.price.amount * 5);
  });

  it('returns 404 when the target product is not inside the cart', async () => {
    const userId = buildUserId();

    const res = await patchItem({
      userId,
      productId: buildProductId(),
      quantity: 2,
    }).expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('DELETE /api/cart/items/:productId', () => {
  it('removes the requested product while keeping the remaining entries intact', async () => {
    const userId = buildUserId();
    const firstItem = buildItemPayload({ title: 'Bluetooth Speaker' });
    const secondItem = buildItemPayload({ title: 'Desk Lamp' });

    await addItem({ userId, payload: firstItem }).expect(201);
    await addItem({ userId, payload: secondItem }).expect(201);

    const res = await removeItem({ userId, productId: firstItem.productId }).expect(200);

    expect(res.body.message).toMatch(/removed/i);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].productId).toBe(secondItem.productId);
  });

  it('returns 404 when attempting to remove a product that is not present', async () => {
    const userId = buildUserId();

    const res = await removeItem({ userId, productId: buildProductId() }).expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('DELETE /api/cart', () => {
  it('clears the entire cart and returns an empty payload', async () => {
    const userId = buildUserId();
    await addItem({ userId, payload: buildItemPayload({ quantity: 2 }) }).expect(201);
    await addItem({ userId, payload: buildItemPayload({ quantity: 1 }) }).expect(201);

    const res = await clearCart(userId).expect(200);

    expect(res.body.message).toMatch(/cleared/i);
    expect(res.body.cart.items).toHaveLength(0);
    expect(res.body.cart.subtotal.amount).toBe(0);

    const followUp = await getCart(userId).expect(200);
    expect(followUp.body.cart.items).toHaveLength(0);
  });
});
