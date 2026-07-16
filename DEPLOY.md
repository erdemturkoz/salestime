# SALEstime - Deploy Talimatlari

Bu dosya, Replit'te yaptiginiz degisiklikleri production'a (Render) nasil gondereceginizi anlatir.

---

## 1. REPLIL'TE DEGISIKLIK YAP

Kodu duzenleyin, test edin, calistigindan emin olun.

---

## 2. GITHUB'A GONDER (PUSH)

Replit shell'de asagidaki komutu calistirin:

```bash
git push origin main
```

Eger "Authentication failed" hatasi verirse, token'u URL'e ekleyin:

```bash
git remote set-url origin https://TOKENUNUZ@github.com/erdemturkoz/salestime.git
git push origin main
```

Push bittikten sonra guvenlik icin URL'i temizleyin:

```bash
git remote set-url origin https://github.com/erdemturkoz/salestime.git
```

---

## 3. RENDER'DE KONTROL ET

GitHub'a kod gittiginde Render otomatik deploy baslatir.

Kontrol etmek icin:
- https://dashboard.render.com adresine gidin
- `salestime` servisine tiklayin
- Ustte "Deploying..." veya "Build in progress" gorunmeli
- ~3-5 dakika sonra "Build successful" ve yesil tik gelir

---

## 4. MANUEL DEPLOY (Eger otomatik olmazsa)

Render'da:
- "Manual Deploy" butonuna tiklayin
- "Deploy latest commit" secin
- Derleme baslayacaktir

---

## 5. SITENIZI KONTROL EDIN

Deploy bittikten sonra:
- https://salestime.onrender.com/ adresini acin
- Giris sayfasi gelmeli
- Admin girisi: telefon `admin`, sifre `admin123`

---

## 6. UPTIMEROBOT

UptimeRobot sitenizi her 5 dakikada bir ziyaret eder, uykuya dusmez.
Monitor adresi: https://uptimerobot.com/

---

## Hatirlatma

Her seferinde sadece 2 adim:
1. Replit'te degisiklik yap
2. Shell'de `git push origin main`

Render gerisini halleder!
