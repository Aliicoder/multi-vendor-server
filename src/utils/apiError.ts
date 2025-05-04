export class ApiError extends Error {
  constructor(public message: string, public statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
