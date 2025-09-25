declare global {
  namespace Express {
    interface Request {
      sessionStorage: any;
    }
  }
}

export {};