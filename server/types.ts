import { Kullanici, KullaniciWithRollerVeSubeler } from "@shared/schema";
import "express-session";

// Express oturumları için özel tip tanımlaması
declare module "express-session" {
  interface SessionData {
    user: KullaniciWithRollerVeSubeler | Kullanici;
  }
}