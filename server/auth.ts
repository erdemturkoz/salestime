import bcrypt from "bcryptjs";
import session from "express-session";
import { Express, Request, Response, NextFunction } from "express";
import connectPgSimple from "connect-pg-simple";
import { SignJWT, jwtVerify } from "jose";
import { pool } from "./db";
import { z } from "zod";
import { loginSchema, changePasswordSchema } from "@shared/schema";
import { storage } from "./storage";

// Oturum ve token imzalaması için zorunlu gizli anahtar.
// Güvensiz bir varsayılana düşmek yerine eksikse uygulamayı başlatma.
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET ortam değişkeni ayarlanmalıdır. Kimlik doğrulama için gereklidir."
  );
}

// Şifre şifreleme
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Şifre karşılaştırma
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Session ayarları
export const setupSession = (app: Express) => {
  const PgSession = connectPgSimple(session);
  const chromeExtensionOrigin = parseChromeExtensionOrigin(process.env.CHROME_EXTENSION_ORIGIN);

  // Trust first proxy for secure cookies
  app.set('trust proxy', 1);
  
  app.use((req, res, next) => {
    const origin = req.get("origin");
    const isSameOrigin = !!origin && isTrustedAppOrigin(req, origin);
    const isExtensionRequest = !!origin
      && origin === chromeExtensionOrigin
      && isExtensionGrantPath(req.path);

    // Never reflect arbitrary Origins. Credentialed CORS is restricted to the
    // application itself; the extension has a separately configured origin and
    // never receives cookie credentials.
    if (isSameOrigin || isExtensionRequest) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
      res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
      if (isSameOrigin) res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    next();
  });
  
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "sessions", // Varolan session tablosu
        createTableIfMissing: true,
        ttl: 30 * 24 * 60 * 60, // Çerezle aynı: 30 gün
      }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'fiyatlama_sid',   // Özel isim
      cookie: {
        secure: true,          // Replit HTTPS proxy arkasında çalışır; iframe için gerekli
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 gün
        path: '/',
        sameSite: 'none'       // Önizleme iframe'i (çapraz-site) içinde çerezin gönderilmesi için şart
      },
    })
  );
};

function parseChromeExtensionOrigin(value: string | undefined): string | null {
  if (!value || !/^chrome-extension:\/\/[a-p]{32}$/.test(value)) return null;
  return value;
}

function isExtensionGrantPath(path: string): boolean {
  return path === "/api/toplu-eklenti-eslestirmeleri/exchange"
    || /^\/api\/toplu-gonderimler\/\d+\/kuyruk\/siradaki$/.test(path)
    || /^\/api\/toplu-teklifler\/\d+\/(?:kuyruk\/heartbeat|sonuc)$/.test(path);
}

function isTrustedAppOrigin(req: Request, origin: string): boolean {
  try {
    const parsedOrigin = new URL(origin);
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || req.get("host");
    const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = forwardedProtocol || req.protocol;
    return !!requestHost
      && parsedOrigin.host === requestHost
      && parsedOrigin.protocol === `${requestProtocol}:`;
  } catch {
    return false;
  }
}

export const requireSameOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get("origin");
  if (origin && isTrustedAppOrigin(req, origin)) return next();
  res.status(403).json({ error: "Bu işlem yalnızca SalesTime uygulamasından yapılabilir." });
};

// SameSite=None zorunluluğu nedeniyle cookie taşıyan her mutasyon isteği
// açıkça aynı origin'den gelmelidir. Bearer ve dar kapsamlı eklenti grant'i
// tarayıcının otomatik eklediği bir kimlik bilgisi olmadığından bu CSRF
// kontrolünden muaftır.
export const requireMutationProtection = (req: Request, res: Response, next: NextFunction) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const authorization = req.get("authorization") || "";
  if (/^Bearer\s+\S+$/.test(authorization) || /^Extension-Grant\s+\S+$/.test(authorization)) {
    return next();
  }

  const origin = req.get("origin");
  if (origin && isTrustedAppOrigin(req, origin)) return next();
  if (origin && origin === parseChromeExtensionOrigin(process.env.CHROME_EXTENSION_ORIGIN) && isExtensionGrantPath(req.path)) {
    return next();
  }

  return res.status(403).json({ error: "Bu işlem yalnızca güvenilen uygulama origin'inden yapılabilir." });
};

export const requireChromeExtensionOrigin = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigin = parseChromeExtensionOrigin(process.env.CHROME_EXTENSION_ORIGIN);
  if (allowedOrigin && req.get("origin") === allowedOrigin) return next();
  res.status(403).json({ error: "Eklenti origin'i yetkili değil." });
};

export const isChromeExtensionOriginConfigured = (): boolean =>
  !!parseChromeExtensionOrigin(process.env.CHROME_EXTENSION_ORIGIN);

// ----------------------------------------------------------------------------
// Token tabanlı kimlik doğrulama (iframe'de çerez engellemesine karşı)
// ----------------------------------------------------------------------------
const tokenSecret = new TextEncoder().encode(SESSION_SECRET);

// Giriş sonrası kullanıcıya verilen JWT token'ı oluştur
export const createToken = async (userId: number, authVersion?: number): Promise<string> => {
  const kullanici = authVersion === undefined ? await storage.getKullanici(userId) : undefined;
  const version = authVersion ?? kullanici?.authVersion;
  if (!Number.isInteger(version) || !version || (!kullanici?.aktif && authVersion === undefined)) {
    throw new Error("Etkin kullanıcı için token sürümü bulunamadı.");
  }
  return await new SignJWT({ userId, authVersion: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(tokenSecret);
};

// Her istekte oturum (çerez) VEYA Authorization header token'ından kullanıcıyı çöz
// ve req.authUser'a ekle. Böylece çerez engellenen iframe'de de kimlik doğrulanır.
async function resolveAuthorizedUser(userId: number, authVersion: number) {
  const kullanici = await storage.getKullanici(userId);
  if (!kullanici || !kullanici.aktif || kullanici.authVersion !== authVersion) return null;
  return serializeKullanici(kullanici);
}

async function destroySession(req: Request): Promise<void> {
  await new Promise<void>((resolve) => req.session?.destroy(() => resolve()));
}

export const attachUser = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // 1) Cookie sadece kimlik+sürüm taşır; güncel kullanıcı, aktiflik ve roller
    // her istekte veritabanından okunur.
    const sessionUser = req.session?.user;
    if (sessionUser) {
      const authorizedUser = await resolveAuthorizedUser(sessionUser.id, sessionUser.authVersion);
      if (authorizedUser) {
        (req as any).authUser = authorizedUser;
        return next();
      }
      await destroySession(req);
    }

    // 2) Aksi halde Authorization: Bearer <token> başlığını dene (iframe)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { payload } = await jwtVerify(token, tokenSecret);
      const userId = Number(payload.userId);
      const authVersion = Number(payload.authVersion);
      if (Number.isInteger(userId) && userId > 0 && Number.isInteger(authVersion) && authVersion > 0) {
        const authorizedUser = await resolveAuthorizedUser(userId, authVersion);
        if (authorizedUser) (req as any).authUser = authorizedUser;
      }
    }
  } catch (e) {
    // Geçersiz/expired token → kimliksiz devam et (route'lar 401 döner)
  }
  next();
};

// Oturum kontrolü için middleware
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (getSessionUser(req)) {
    return next();
  }
  
  res.status(401).json({ error: "Oturumunuz açık değil. Lütfen giriş yapın." });
};

// Admin (Sistem Yöneticisi, Kurucu ve Müdür) rolü kontrolü
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = getSessionUser(req);
  if (user) {
    // Roller içinde Sistem Yöneticisi, KURUCU veya MÜDÜR var mı kontrol et
    if (user.roller && user.roller.some((r: any) => 
      r.rol === "Sistem Yöneticisi" || r.rol === "Kurucu" || r.rol === "Müdür")) {
      return next();
    }
  }
  
  res.status(403).json({ error: "Bu işlemi yapmak için yetkiniz yok." });
};

// ----------------------------------------------------------------------------
// Rol yardımcıları (yetki kontrolleri için tek kaynak)
// ----------------------------------------------------------------------------

// Oturumdaki kullanıcıyı döndür (çerez oturumu VEYA token'dan çözülen kullanıcı)
export const getSessionUser = (req: Request): any | null => {
  return (req as any).authUser || null;
};

export const serializeKullanici = <T extends Record<string, any>>(kullanici: T) => {
  const { sifre: _sifre, ...safeUser } = kullanici;
  return safeUser;
};

// Kullanıcının rol adlarını döndür
export const getUserRoles = (user: any): string[] => {
  if (!user || !user.roller) return [];
  return user.roller.map((r: any) => r.rol);
};

// Tam yetkili admin mi? (yalnızca Sistem Yöneticisi) — TÜM şubelere hakim
export const isFullAdminUser = (user: any): boolean => {
  const roles = getUserRoles(user);
  return roles.includes("Sistem Yöneticisi");
};

// Kurucu mu? (birden fazla şubeye atanmış, şube kapsamlı yönetici)
export const isKurucuUser = (user: any): boolean => {
  return getUserRoles(user).includes("Kurucu");
};

// Şube müdürü mü?
export const isMudurUser = (user: any): boolean => {
  return getUserRoles(user).includes("Müdür");
};

// Kullanıcının görebileceği tüm şube id'leri (herhangi bir roldeki şubeler)
export const getUserSubeIds = (user: any): number[] => {
  if (!user || !user.roller) return [];
  const ids = user.roller
    .map((r: any) => r.subeId)
    .filter((x: any) => x !== null && x !== undefined);
  return Array.from(new Set<number>(ids));
};

// Yönetilen şube id'leri (Müdür + Kurucu kapsamı — kampanya/kullanıcı yönetimi)
export const getManagedSubeIds = (user: any): number[] => {
  if (!user || !user.roller) return [];
  const ids = user.roller
    .filter((r: any) => r.rol === "Müdür" || r.rol === "Kurucu")
    .map((r: any) => r.subeId)
    .filter((x: any) => x !== null && x !== undefined);
  return Array.from(new Set<number>(ids));
};

// Tam yetkili admin zorunlu middleware (şube açma, eğitim tipi, vb.)
export const isFullAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = getSessionUser(req);
  if (user && isFullAdminUser(user)) {
    return next();
  }
  res.status(403).json({ error: "Bu işlemi yapmak için yetkiniz yok." });
};

// Kampanya yönetebilir mi? (Sistem Yöneticisi, Kurucu veya Müdür)
export const canManageCampaigns = (req: Request, res: Response, next: NextFunction) => {
  const user = getSessionUser(req);
  if (user && (isFullAdminUser(user) || isKurucuUser(user) || isMudurUser(user))) {
    return next();
  }
  res.status(403).json({ error: "Bu işlemi yapmak için yetkiniz yok." });
};

// Login işlemi
export const login = async (req: Request, res: Response) => {
  try {
    const credentials = loginSchema.parse(req.body);
    
    // Telefon numarasına göre kullanıcıyı bul
    const kullanici = await storage.getKullaniciByTelefon(credentials.telefon);
    
    if (!kullanici) {
      return res.status(401).json({ error: "Geçersiz telefon numarası veya şifre" });
    }
    
    // Şifreyi kontrol et
    const isPasswordValid = await comparePassword(credentials.sifre, kullanici.sifre);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Geçersiz telefon numarası veya şifre" });
    }
    
    // Kullanıcı aktif değilse giriş yapmasına izin verme
    if (!kullanici.aktif) {
      return res.status(401).json({ error: "Hesabınız pasif durumdadır. Lütfen yöneticiyle iletişime geçin." });
    }
    
    // Kullanıcının şube rollerini al
    const roller = await storage.getKullaniciRoller(kullanici.id);
    const kullaniciWithRoller = { ...kullanici, roller };

    // Yeni girişte oturumu yenilemek session fixation riskini kapatır. Oturumda
    // yalnızca id+sürüm saklanır; şifre hash'i ve roller saklanmaz.
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        console.error("Session yenileme hatası:", regenerateError);
        return res.status(500).json({ error: "Oturum yenilenirken bir hata oluştu" });
      }
      req.session.user = { id: kullanici.id, authVersion: kullanici.authVersion };
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      req.session.save(async (err) => {
      if (err) {
        console.error('Session kayıt hatası:', err);
        return res.status(500).json({ error: "Oturum kaydedilirken bir hata oluştu" });
      }
        try {
          const token = await createToken(kullanici.id, kullanici.authVersion);
          return res.json({ ...serializeKullanici(kullaniciWithRoller), token });
        } catch (tokenError) {
          console.error("Token oluşturma hatası:", tokenError);
          return res.status(500).json({ error: "Oturum token'ı oluşturulamadı" });
        }
      });
    });
  } catch (error) {
    console.error("Giriş hatası:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Giriş sırasında bir hata oluştu" });
  }
};

// Logout işlemi
export const logout = async (req: Request, res: Response) => {
  const user = getSessionUser(req);
  if (!user || !(await storage.invalidateKullaniciAuth(user.id))) {
    return res.status(401).json({ error: "Oturum açık değil" });
  }
  await destroySession(req);
  res.clearCookie("fiyatlama_sid", {
    path: "/",
    sameSite: "none",
    secure: true,
    httpOnly: true,
  });
  res.json({ message: "Başarıyla çıkış yapıldı" });
};

// Mevcut oturum bilgisi
export const getCurrentUser = (req: Request, res: Response) => {
  const user = getSessionUser(req);
  
  if (!user) {
    return res.status(401).json({ error: "Oturum açık değil" });
  }
  
  res.json(serializeKullanici(user));
};

// Şifre değiştirme
export const changePassword = async (req: Request, res: Response) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Oturum açık değil" });
  }
  
  try {
    const { eskiSifre, yeniSifre } = changePasswordSchema.parse(req.body);
    
    const kullanici = await storage.getKullanici(user.id);
    
    if (!kullanici) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }
    
    // Eski şifreyi kontrol et
    const isPasswordValid = await comparePassword(eskiSifre, kullanici.sifre);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Mevcut şifre yanlış" });
    }
    
    // Yeni şifreyi hashle
    const hashedPassword = await hashPassword(yeniSifre);
    
    // Şifreyi güncelle
    if (!(await storage.updateKullaniciPasswordAndInvalidate(kullanici.id, hashedPassword))) {
      return res.status(500).json({ error: "Şifre güncellenemedi" });
    }
    await destroySession(req);
    res.clearCookie("fiyatlama_sid", { path: "/", sameSite: "none", secure: true, httpOnly: true });
    res.json({ message: "Şifre başarıyla değiştirildi. Güvenliğiniz için yeniden giriş yapın." });
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    res.status(500).json({ error: "Şifre değiştirme sırasında bir hata oluştu" });
  }
};