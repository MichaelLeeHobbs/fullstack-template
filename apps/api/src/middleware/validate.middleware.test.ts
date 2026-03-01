// ===========================================
// Validate Middleware Tests
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod/v4';
import { validate } from './validate.middleware.js';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../test/utils/index.js';

describe('validate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes when body matches schema', () => {
    const schema = { body: z.object({ name: z.string() }) };
    const middleware = validate(schema);

    const req = createMockRequest({ body: { name: 'Alice' } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when body fails validation', () => {
    const schema = { body: z.object({ name: z.string() }) };
    const middleware = validate(schema);

    const req = createMockRequest({ body: { name: 123 } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('passes when query matches schema', () => {
    const schema = { query: z.object({ page: z.string() }) };
    const middleware = validate(schema);

    const req = createMockRequest({ query: { page: '1' } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when query fails validation', () => {
    const schema = { query: z.object({ page: z.string().min(1) }) };
    const middleware = validate(schema);

    const req = createMockRequest({ query: { page: '' } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('passes when params match schema', () => {
    const schema = { params: z.object({ id: z.string() }) };
    const middleware = validate(schema);

    const req = createMockRequest({ params: { id: 'abc-123' } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when params fail validation', () => {
    const schema = { params: z.object({ id: z.string().uuid() }) };
    const middleware = validate(schema);

    const req = createMockRequest({ params: { id: 'not-a-uuid' } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('replaces req.body with parsed data (coercion)', () => {
    const schema = {
      body: z.object({
        name: z.string(),
        count: z.coerce.number(),
      }),
    };
    const middleware = validate(schema);

    const req = createMockRequest({ body: { name: '  Alice  ', count: '5' } });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: '  Alice  ', count: 5 });
  });

  it('validates body, query, and params simultaneously', () => {
    const schema = {
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.string() }),
      params: z.object({ id: z.string() }),
    };
    const middleware = validate(schema);

    const req = createMockRequest({
      body: { name: 'Alice' },
      query: { page: '1' },
      params: { id: 'abc-123' },
    });
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
