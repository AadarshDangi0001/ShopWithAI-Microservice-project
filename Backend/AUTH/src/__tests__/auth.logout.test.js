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

const createUserAndToken = async () => {
  const user = await User.create({
    username: 'logout_user',
    email: 'logout@example.com',
    password: 'hashed-password',
    fullName: { firstName: 'Logout', lastName: 'User' },
  });

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

  return { user, token };
};

describe('/api/auth/logout', () => {
  it('logs out an authenticated user by clearing the auth cookie', async () => {
    const { token } = await createUserAndToken();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(res.body.message).toBe('User logged out successfully');
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie.some((cookie) => cookie.toLowerCase().startsWith('token=;'))).toBe(true);
  });
  

  it('rejects logout attempts without an auth cookie', async () => {
    const res = await request(app).post('/api/auth/logout').expect(401);

    expect(res.body.error).toBe('Authentication required');
  });

  it('rejects logout attempts when the token is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['token=malformed'])
      .expect(401);

    expect(res.body.error).toBe('Invalid or expired token');
  });
});
