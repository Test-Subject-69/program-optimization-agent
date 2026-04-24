export function notFound(message = "Not found") {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

export function badRequest(message = "Bad request") {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function unauthorized(message = "Authentication required") {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

export function forbidden(message = "Forbidden") {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

export function tooManyRequests(message = "Too many requests, please try again later") {
  const error = new Error(message);
  error.statusCode = 429;
  return error;
}

export function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function paginate(items, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return { data, pagination: { page, limit, total, totalPages } };
}

export function rateLimit(windowMs = 60000, maxRequests = 10) {
  const requests = new Map();
  return (request, _response, next) => {
    const key = request.ip;
    const now = Date.now();
    const entry = requests.get(key);
    if (!entry || now - entry.start > windowMs) {
      requests.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      return next(tooManyRequests());
    }
    next();
  };
}
