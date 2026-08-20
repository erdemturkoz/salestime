import "express-session";

// Express oturumları için özel tip tanımlaması
declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      authVersion: number;
    };
  }
}