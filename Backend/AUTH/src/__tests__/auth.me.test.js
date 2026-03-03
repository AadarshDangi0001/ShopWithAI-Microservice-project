import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/user.model.js';

jest.setTimeout(60000);

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'testsecret';

  await mongoose.connect(uri, { dbName: 'auth-test' });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

const createUser = async () =>
  User.create({
    username: 'john_doe',
    email: 'john@example.com',
    password: 'hashed-password',
    fullName: { firstName: 'John', lastName: 'Doe' },
  });

describe('/api/auth/me', () => {
  it('returns the authenticated user when a valid token cookie is provided', async () => {
    const user = await createUser();
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(res.body.message).toBe('Current user fetched successfully');
    expect(res.body.user).toMatchObject({
      id: user._id.toString(),
      username: 'john_doe',
      email: 'john@example.com',
      fullName: { firstName: 'John', lastName: 'Doe' },
    });
    expect(res.body.user).toHaveProperty('role', 'user');
  });

  it('rejects requests that do not include an auth cookie', async () => {
    const res = await request(app).get('/api/auth/me').expect(401);

    expect(res.body.error).toBe('Authentication required');
  });

  it('rejects requests when the token is invalid or expired', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['token=invalid'])
      .expect(401);

    expect(res.body.error).toBe('Invalid or expired token');
  });
});
