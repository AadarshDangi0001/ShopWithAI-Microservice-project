import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
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

describe('/api/auth/login', () => {
  it('logs in with email and correct password', async () => {
    const password = 'Password123!';
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: 'john_doe',
      email: 'john@example.com',
      password: hash,
      fullName: { firstName: 'John', lastName: 'Doe' },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password })
      .expect(200);

    expect(res.body.message).toBe('User logged in successfully');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(String(user._id));
    expect(res.body.user.username).toBe('john_doe');
    expect(res.body.user.email).toBe('john@example.com');
    expect(res.body.user.fullName).toEqual({ firstName: 'John', lastName: 'Doe' });

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie.some((c) => c.toLowerCase().includes('token='))).toBe(true);
  });

  it('logs in with username and correct password', async () => {
    const password = 'Password123!';
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: 'jane_doe',
      email: 'jane@example.com',
      password: hash,
      fullName: { firstName: 'Jane', lastName: 'Doe' },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'jane_doe', password })
      .expect(200);

    expect(res.body.message).toBe('User logged in successfully');
    expect(res.body.user.id).toBe(String(user._id));
    expect(res.body.user.username).toBe('jane_doe');
  });

  it('rejects wrong password', async () => {
    const hash = await bcrypt.hash('Password123!', 10);
    await User.create({
      username: 'john_doe',
      email: 'john@example.com',
      password: hash,
      fullName: { firstName: 'John', lastName: 'Doe' },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'WrongPass123!' })
      .expect(401);

    expect(res.body.error).toBe('Invalid credentials');
  });

  it('rejects missing email/username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password123!' })
      .expect(400);

    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    const messages = res.body.errors.map((e) => e.msg);
    expect(messages).toContain('Either email or username is required');
  });
});
