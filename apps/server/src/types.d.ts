declare global {
  namespace Express {
    interface Request {
      /** Set by the requireUser middleware. */
      userId?: string;
    }
  }
}

export {};
