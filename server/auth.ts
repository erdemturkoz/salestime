import bcrypt from "bcryptjs";
import session from "express-session";
import { Express, Request, Response, NextFunction } from "express";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { z } from "zod";
import { loginSchema, Login } from "@shared/schema";
import { storage } from "./storage";

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

  // Trust first proxy for secure cookies
  app.set('trust proxy', 1);
  
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
  });
  
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "sessions", // Varolan session tablosu
        createTableIfMissing: true,
        ttl: 86400 // 1 gün
      }),
      secret: process.env.SESSION_SECRET || "fiyathesaplama-gizli-anahtar", // Prodüksiyonda gerçek bir secret kullanın
      resave: true,            // Session bilgilerinin yeniden kaydedilmesini sağlar
      saveUninitialized: true, // Başlatılmamış oturumların kaydedilmesini sağlar
      name: 'fiyatlama_sid',   // Özel isim
      cookie: {
        secure: false,         // Geliştirme modunda HTTPS olmadığı için false
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 gün
        path: '/',
        sameSite: 'none'       // Embedded iframe için gereklidir
      },
    })
  );
};

// Oturum kontrolü için middleware
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  res.status(401).json({ error: "Oturumunuz açık değil. Lütfen giriş yapın." });
};

// Admin (Kurucu ve Müdür) rolü kontrolü
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
    const user = req.session.user as any;
    
    // Roller içinde KURUCU veya MÜDÜR var mı kontrol et
    if (user.roller && user.roller.some((r: any) => 
      r.rol === "Kurucu" || r.rol === "Müdür")) {
      return next();
    }
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
    const kullaniciWithRoller = {
      ...kullanici,
      roller: roller
    };
    
    // Session'a kullanıcı bilgisini kaydet
    req.session.user = kullaniciWithRoller;
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 gün
    
    console.log('Login - Session ID:', req.sessionID);
    console.log('Login - Session cookie:', req.session.cookie);
    
    // Session'ı kaydetmek için
    req.session.save((err) => {
      if (err) {
        console.error('Session kayıt hatası:', err);
        return res.status(500).json({ error: "Oturum kaydedilirken bir hata oluştu" });
      }
      
      console.log('Session kaydedildi - User ID:', kullaniciWithRoller.id);
      
      // Hassas bilgileri (şifre) kullanıcı bilgisinden çıkart
      const { sifre, ...userWithoutPassword } = kullaniciWithRoller;
      return res.json(userWithoutPassword);
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
export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Çıkış yapılırken bir hata oluştu" });
    }
    
    res.clearCookie("fiyatlama_sid", { 
    path: '/', 
    sameSite: 'none',
    secure: false
  });
    res.json({ message: "Başarıyla çıkış yapıldı" });
  });
};

// Mevcut oturum bilgisi
export const getCurrentUser = (req: Request, res: Response) => {
  console.log("Session ID:", req.sessionID);
  console.log("Session bilgisi:", req.session);
  
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Oturum açık değil" });
  }
  
  // Hassas bilgileri (şifre) kullanıcı bilgisinden çıkart
  const { sifre, ...userWithoutPassword } = req.session.user as any;
  res.json(userWithoutPassword);
};

// Şifre değiştirme
export const changePassword = async (req: Request, res: Response) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Oturum açık değil" });
  }
  
  try {
    const { eskiSifre, yeniSifre } = req.body;
    const user = req.session.user as any;
    
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
    await storage.updateKullaniciPassword(kullanici.id, hashedPassword);
    
    res.json({ message: "Şifre başarıyla değiştirildi" });
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    res.status(500).json({ error: "Şifre değiştirme sırasında bir hata oluştu" });
  }
};