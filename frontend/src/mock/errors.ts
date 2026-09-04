export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(typeof body === 'string' ? body : body?.message ?? 'Request failed');
    this.status = status;
    this.body = typeof body === 'string' ? { message: body } : body;
  }
}

export const notFound = () => new ApiError(404, { message: 'Not Found', statusCode: 404 });
export const badRequest = (message: any) => new ApiError(400, typeof message === 'string' ? { message, error: 'Bad Request', statusCode: 400 } : message);
