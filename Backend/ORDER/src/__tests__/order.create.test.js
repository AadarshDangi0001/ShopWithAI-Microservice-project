import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

const CART_PRODUCT_ID = '69a7dc8ab7a3d02a3e52a11f';
const OOS_PRODUCT_ID = '69a7dc8ab7a3d02a3e52a120';
const MISSING_PRODUCT_ID = '69a7dc8ab7a3d02a3e52a121';

const axiosError = (status, data = {}) => {
  const err = new Error(`Request failed with status code ${status}`);
  err.isAxiosError = true;
  err.response = { status, data };
  return err;
};

const mockAxiosGet = jest.fn(async (url, config = {}) => {
  const auth = config?.headers?.Authorization || '';

  if (url.endsWith('/api/cart')) {
    if (auth.includes('missing-cart')) {
      throw axiosError(404, { error: 'Cart not found' });
    }

    if (auth.includes('empty-cart')) {
      return { data: { cart: { item: [] } } };
    }

    if (auth.includes('oos-product')) {
      return {
        data: {
          cart: { item: [{ productId: OOS_PRODUCT_ID, quantity: 2 }] },
        },
      };
    }

    if (auth.includes('missing-product')) {
      return {
        data: {
          cart: { item: [{ productId: MISSING_PRODUCT_ID, quantity: 1 }] },
        },
      };
    }

    return {
      data: {
        cart: { item: [{ productId: CART_PRODUCT_ID, quantity: 2 }] },
      },
    };
  }

  if (url.endsWith(`/api/products/${CART_PRODUCT_ID}`)) {
    return {
      data: {
        data: {
          _id: CART_PRODUCT_ID,
          stock: 10,
          price: { amount: 100, currency: 'INR' },
        },
      },
    };
  }

  if (url.endsWith(`/api/products/${OOS_PRODUCT_ID}`)) {
    return {
      data: {
        data: {
          _id: OOS_PRODUCT_ID,
          stock: 0,
          price: { amount: 100, currency: 'INR' },
        },
      },
    };
  }

  if (url.endsWith(`/api/products/${MISSING_PRODUCT_ID}`)) {
    throw axiosError(404, { error: 'Product not found' });
  }

  throw axiosError(404, { error: 'Unknown mocked route' });
});

await jest.unstable_mockModule('axios', () => ({
  default: {
    get: mockAxiosGet,
    isAxiosError: (error) => Boolean(error?.isAxiosError),
  },
}));

const { default: app } = await import('../app.js');

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
    pincode: 'NW16XE',
    country: 'UK',
  },
};

describe('POST /api/orders/ - create order from current cart', () => {
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

  beforeEach(() => {
    mockAxiosGet.mockClear();
  });

  it('creates an order from current cart items and returns 201', async () => {
    const res = await request(app)
      .post('/api/orders/')
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
      .post('/api/orders/')
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
      .post('/api/orders/')
      .set('Cookie', authCookies())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.pricing).toEqual(
      expect.objectContaining({
        subtotal: expect.any(Number),
        tax: expect.any(Number),
        shipping: expect.any(Number),
        totalAmount: expect.any(Number),
      }),
    );

    const { subtotal, tax, shipping, totalAmount } = res.body.pricing;
    expect(totalAmount).toBeCloseTo(subtotal + tax + shipping, 2);
  });

  it('sets initial order status to pending', async () => {
    const res = await request(app)
      .post('/api/orders/')
      .set('Cookie', authCookies())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('pending');
  });

  it('does not allow order creation when product is out of stock', async () => {
    const res = await request(app)
      .post('/api/orders/')
      .set('Cookie', authCookies({ token: 'oos-product' }))
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/out of stock/i);
    expect(Array.isArray(res.body.unavailableItems)).toBe(true);
    expect(res.body.unavailableItems[0]).toEqual(
      expect.objectContaining({
        productId: OOS_PRODUCT_ID,
        requested: expect.any(Number),
        available: expect.any(Number),
      }),
    );
  });

  it('returns 401 when user is not authenticated', async () => {
    const res = await request(app)
      .post('/api/orders/')
      .send(validPayload);

    expect(res.status).toBe(401);
  });

  it('returns 404 when no active cart is found for the user', async () => {
    const res = await request(app)
      .post('/api/orders/')
      .set('Cookie', authCookies({ token: 'missing-cart' }))
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/resource not found/i);
  });

  it('returns 400 when cart exists but has zero items', async () => {
    const res = await request(app)
      .post('/api/orders/')
      .set('Cookie', authCookies({ token: 'empty-cart' }))
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cart is empty/i);
  });

  it('returns 400 for invalid shipping address payload', async () => {
    const res = await request(app)
      .post('/api/orders/')
      .set('Cookie', authCookies())
      .send({ shippingAddress: { street: '' } });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('returns 404 when product lookup fails', async () => {
    const res = await request(app)
      .post('/api/orders/')
      .set('Cookie', authCookies({ token: 'missing-product' }))
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/resource not found/i);
  });
});
