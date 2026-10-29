import { ZodError } from 'zod';
export const notFound = (req, res) => res.status(404).json({ message: 'Route not found' });
export function errorHandler(err, req, res, next) { // eslint-disable-line
  let status = err.status || 500, message = err.message;
  if (err instanceof ZodError) { status = 400; message = err.issues[0].message; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body'; }
  else if (err.code === 11000) { status = 409; message = 'Duplicate value'; }
  else if (err.name === 'CastError') { status = 400; message = 'Invalid identifier'; }
  else if (status >= 500) { console.error(err); message = 'Internal server error'; }
  res.status(status).json({ message });
}
