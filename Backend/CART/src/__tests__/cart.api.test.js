import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockCartModel = jest.fn(function MockCartModel(doc) {
  Object.assign(this, doc);
  this.save = jest.fn().mockResolvedValue(this);

  if (!this.item) {
    this.item = [];
  }

  if (!this.items) {
    this.items = this.item;
  }
});

mockCartModel.findOne = mockFindOne;

await jest.unstable_mockModule('../models/car.model.js', () => ({
  cartModel: mockCartModel,
}));

const { default: app } = await import('../app.js');

const TEST_USER_ID = '507f1f77bcf86cd799439011';
const TEST_PRODUCT_ID = '507f1f77bcf86cd799439012';

function authHeaders(overrides = {}) {
  return {
    'x-test-user-id': TEST_USER_ID,
    'x-test-user-role': 'user',
    ...overrides,
  };
}

function createCartDoc(items = []) {
  return {
    user: TEST_USER_ID,
    item: items,
    items,
    save: jest.fn().mockResolvedValue(true),
  };
}

describe('Cart API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('GET /api/cart', () => {
    it('returns existing cart with totals', async () => {
      const cart = createCartDoc([
        { productId: TEST_PRODUCT_ID, quantity: 2 },
        { productId: '507f1f77bcf86cd799439099', quantity: 1 },
      ]);
      mockFindOne.mockResolvedValue(cart);

      const response = await request(app)
        .get('/api/cart')
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Cart fetched successfully');
      expect(response.body.totals).toEqual({
        itemCount: 2,
        totalQuantity: 3,
      });
      expect(mockFindOne).toHaveBeenCalledWith({ user: TEST_USER_ID });
    });

    it('creates a cart when user cart does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/cart')
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Cart fetched successfully');
      expect(response.body.totals).toEqual({
        itemCount: 0,
        totalQuantity: 0,
      });
      expect(mockCartModel).toHaveBeenCalledWith({
        user: TEST_USER_ID,
        items: [],
      });
    });
  });

  describe('POST /api/cart/items', () => {
    it('creates a new cart and adds item', async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/cart/items')
        .set(authHeaders())
        .send({ productId: TEST_PRODUCT_ID, qty: 2 });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Item added to cart successfully');
      expect(mockCartModel).toHaveBeenCalledWith({
        user: TEST_USER_ID,
        item: [{ productId: TEST_PRODUCT_ID, quantity: 2 }],
      });
    });

    it('increments quantity for existing item', async () => {
      const cart = createCartDoc([{ productId: TEST_PRODUCT_ID, quantity: 1 }]);
      mockFindOne.mockResolvedValue(cart);

      const response = await request(app)
        .post('/api/cart/items')
        .set(authHeaders())
        .send({ productId: TEST_PRODUCT_ID, qty: 2 });

      expect(response.status).toBe(201);
      expect(response.body.cart.item[0].quantity).toBe(3);
      expect(cart.save).toHaveBeenCalledTimes(1);
    });

    it('returns 400 for invalid payload', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set(authHeaders())
        .send({ productId: 'bad-id', qty: 0 });

      expect(response.status).toBe(400);
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('PATCH /api/cart/items/:productId', () => {
    it('updates item quantity', async () => {
      const cart = createCartDoc([{ productId: TEST_PRODUCT_ID, quantity: 2 }]);
      mockFindOne.mockResolvedValue(cart);

      const response = await request(app)
        .patch(`/api/cart/items/${TEST_PRODUCT_ID}`)
        .set(authHeaders())
        .send({ qty: 5 });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Item quantity updated successfully');
      expect(cart.item[0].quantity).toBe(5);
      expect(cart.save).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when cart does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .patch(`/api/cart/items/${TEST_PRODUCT_ID}`)
        .set(authHeaders())
        .send({ qty: 3 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Cart not found');
    });

    it('returns 404 when item does not exist', async () => {
      const cart = createCartDoc([{ productId: '507f1f77bcf86cd799439099', quantity: 1 }]);
      mockFindOne.mockResolvedValue(cart);

      const response = await request(app)
        .patch(`/api/cart/items/${TEST_PRODUCT_ID}`)
        .set(authHeaders())
        .send({ qty: 3 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Item not found in cart');
    });
  });

  describe('DELETE /api/cart/items/:productId', () => {
    it('deletes item from cart', async () => {
      const cart = createCartDoc([
        { productId: TEST_PRODUCT_ID, quantity: 2 },
        { productId: '507f1f77bcf86cd799439099', quantity: 1 },
      ]);
      mockFindOne.mockResolvedValue(cart);

      const response = await request(app)
        .delete(`/api/cart/items/${TEST_PRODUCT_ID}`)
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Item removed from cart successfully');
      expect(response.body.cart.item).toHaveLength(1);
      expect(response.body.cart.item[0].productId).toBe('507f1f77bcf86cd799439099');
      expect(cart.save).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when cart does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/cart/items/${TEST_PRODUCT_ID}`)
        .set(authHeaders());

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Cart not found');
    });
  });

  describe('DELETE /api/cart', () => {
    it('clears all items from cart', async () => {
      const cart = createCartDoc([{ productId: TEST_PRODUCT_ID, quantity: 3 }]);
      mockFindOne.mockResolvedValue(cart);

      const response = await request(app)
        .delete('/api/cart')
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Cart cleared successfully');
      expect(response.body.cart.item).toEqual([]);
      expect(cart.save).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when cart does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/cart')
        .set(authHeaders());

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Cart not found');
    });
  });
});
