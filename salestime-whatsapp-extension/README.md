# SalesTime WhatsApp Gönderici v1.0.0

Bu Chrome eklentisi, SalesTime'da hazırlanıp başlatılan toplu teklif kuyruğunu WhatsApp Web üzerinden otomatik gönderir. Her aday için SalesTime'ın hazırladığı kişisel mesajı kullanır; kendi mesajını üretmez.

## Yönetici için tek seferlik ayar

Eklentinin sabit kimliği:

`olilhnenhdhjcdbdgcejhimpndflbele`

Render'daki SalesTime servisinde şu ortam değişkeni bulunmalıdır:

`CHROME_EXTENSION_ORIGIN=chrome-extension://olilhnenhdhjcdbdgcejhimpndflbele`

Bu değer kaydedildikten sonra servis yeniden dağıtılmalıdır. Manifest içindeki `key` alanı, farklı bilgisayarlarda klasörden yüklenen eklentinin aynı kimliği almasını sağlar.

## Kullanıcı kurulumu

1. ZIP dosyasını bilgisayarda kalıcı bir klasöre çıkarın. Klasörü sonradan taşımayın veya silmeyin.
2. Chrome adres çubuğuna `chrome://extensions` yazın.
3. Sağ üstten **Geliştirici modu**nu açın.
4. **Paketlenmemiş öğe yükle**ye basın ve ZIP'ten çıkan `salestime-whatsapp-extension` klasörünü seçin.
5. Eklentiyi Chrome araç çubuğuna sabitleyin.
6. `https://web.whatsapp.com` adresini açıp kurumsal WhatsApp hesabıyla giriş yapın.

## SalesTime ile eşleştirme ve gönderim

1. SalesTime → **Toplu Teklifler → Teklif Geçmişi** ekranına gidin.
2. İlgili kuyrukta **Chrome Eklentisini Bağla** düğmesine basıp tek kullanımlık kodu alın.
3. Chrome araç çubuğundaki SalesTime eklentisini açın, kodu yapıştırın ve **Eşleştir ve hazırla**ya basın.
4. SalesTime'da **Başlat**a basın. Eklenti kuyruğu otomatik tüketir; her aday için ayrıca gönder düğmesine basılmaz.
5. Chrome ve WhatsApp Web açık kalmalıdır. Gönderimler arasında güvenli, değişken bekleme uygulanır.

## Güvenlik davranışı

- Eşleştirme kodu tek kullanımlıktır; eklenti yetkisi 8 saat sonra biter.
- Her kayıt gönderilmeden hemen önce kira süresi yenilenir.
- Aynı teklif kimliği ikinci kez otomatik gönderilmez.
- WhatsApp mesajı gönderildikten sonra SalesTime'a sonuç bildirilir.
- Chrome tam gönderim anında kapanırsa kayıt otomatik tekrar gönderilmez. Eklenti durur ve kullanıcıdan WhatsApp'ı kontrol ederek **Gönderildi** veya **Gönderilmedi** seçmesini ister.
- Eklenti yalnızca `salestime.onrender.com` ve `web.whatsapp.com` alanlarına erişir.

## Önemli

Bu otomasyon yalnızca iletişim izni bulunan adaylar için ve WhatsApp'ın kullanım koşulları ile yürürlükteki kişisel veri/mevzuat kurallarına uygun kullanılmalıdır.

Bekleyen teklifleri tekli/toplu silme ve gönderilenleri arşivleyerek ekranı sade tutma özellikleri SalesTime web uygulamasında uygulanmalıdır; Chrome eklentisi sunucu kayıtlarını silmez.
