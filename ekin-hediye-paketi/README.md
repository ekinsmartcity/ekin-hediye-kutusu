# Ekin · Hediye Paketini Oluştur

Ürünleri seç, kutuna ekle, paket bütçeni anında gör.

Yılbaşı 2026–2027 hediye paketleri için etkileşimli paket oluşturma sayfası. Ürünler sürükle-bırak ya da "Ekle" ile kutuya eklenir. Paket başına toplam ve toplam bütçe canlı hesaplanır. Farklı kutular kaydedilip yan yana karşılaştırılabilir.

Derleme adımı ya da bağımlılık yoktur: düz HTML, CSS ve JavaScript.

## Klasör yapısı

```
index.html            Sayfa
css/style.css         Tüm stiller
js/data.js            Ürün kataloğu, fiyatlar, başlangıç kuru  ← fiyat/ürün değişikliği burada
js/app.js             Uygulama mantığı (sürükle-bırak, hesap, kaydetme, karşılaştırma)
data/kur.json         Günlük TCMB kuru (iş akışı otomatik oluşturur)
tools/kur_guncelle.py TCMB'den kuru alan betik
.github/workflows/    Günlük kur + GitHub Pages yayını
assets/products/      Ürün görselleri (arka planı şeffaf .webp)
assets/box/           Hediye kutusu render'ı: lid (kapak), body (gövde), front (ön duvar) + box.json (iç alan koordinatları)
assets/fonts/         Pilat Bold (woff2) — lisans notu aşağıda
```

## Yerelde çalıştırma

`index.html` dosyasını tarayıcıda çift tıklayarak açmak yeterli.

## GitHub Pages ile yayınlama

1. Bu klasörün içeriğini bir GitHub reposunun `main` dalına gönderin. `index.html` ve `.github` klasörü reponun kökünde olmalı.
2. Repo → **Settings → Pages** → **Source: GitHub Actions** seçin.
3. Repo → **Actions** sekmesi → **Kur ve yayın** → **Run workflow**. İlk çalıştırmada günün kuru alınır ve site yayımlanır.
4. Sayfa `https://<kullanıcı-adı>.github.io/<repo-adı>/` adresinde açılır. Bundan sonra `main`'e her gönderimde site kendiliğinden yeniden yayımlanır.

## Günlük kur (TCMB USD döviz satış)

- `.github/workflows/site.yml` hafta içi her gün 16:10'da (Türkiye saati) çalışır. `tools/kur_guncelle.py` ile TCMB'nin günlük bülteninden USD döviz satış kurunu alır ve `data/kur.json` dosyasına yazar.
- Sayfa açılınca bu kur kullanılır, yanında "TCMB döviz satış · tarih" etiketi görünür. Hafta sonu ve tatillerde TCMB bülten yayımlamadığı için son iş gününün kuru kalır.
- Kullanıcı kuru elle değiştirirse onun değeri korunur; "Günün kuruna dön" ile TCMB kuruna dönülür.
- Kur alınamazsa iş akışı Actions sekmesinde kırmızı görünür. Site son bilinen kurla çalışmaya devam eder.
- `data/kur.json` yoksa (ilk çalıştırmadan önce) ya da `index.html` doğrudan dosyadan açıldıysa `js/data.js` içindeki sunum kuru (49,6540 TL) kullanılır.

## Fiyat, ürün ve kur

- Başlangıç fiyatları ve yedek kur (`1 USD = 49,6540 TL`, sunumdaki kur · 26.10.2026) `js/data.js` içindedir.
- Fiyatı bilinmeyen ürünlerde `price: null` kullanılır. Sayfada "Fiyat giriniz" görünür ve toplam "Bilinen ara toplam" olarak gösterilir.
- Sayfadaki "Fiyatları düzenle" ile yapılan değişiklikler ve yüklenen görseller yalnızca o tarayıcıda saklanır (localStorage). Herkes için kalıcı değişiklik `js/data.js` ve `assets/products/` üzerinden yapılır.
- Kutu, ambalaj, baskı, kargo veya vergi gibi ek maliyetler hesaba katılmaz. Toplam, girilen ürün bedelleri üzerinden hesaplanır.

## Kaydetme ve karşılaştırma

- **"1. kutuyu kaydet"** o anki kutuyu kaydeder. Sonraki kayıtlar 2., 3. kutu olarak devam eder.
- Kaydedilen bir kutu açılıp değiştirildiğinde iki seçenek çıkar: aynı kutuyu güncellemek ya da yeni kutu olarak kaydetmek.
- **Karşılaştır** sekmesi kayıtlı kutuları yan yana gösterir. Paket başına toplam, toplam bütçe ve en düşüğe göre fark burada görünür; ürün × kutu tablosu da bu sekmededir.
- Karşılaştırma her zaman **güncel** fiyat, kur ve paket adediyle hesaplanır.
- Kayıtlar tarayıcıda (localStorage) tutulur, sunucuya gönderilmez. Başka bir bilgisayarda ya da tarayıcıda görünmezler.

## Pilat fontu

Başlıklar Ekin'in kurumsal fontu Pilat Bold ile gösterilir (`assets/fonts/Pilat-Bold.woff2`). Font yüklenemezse Archivo yedek olarak kullanılır.

Pilat, General Type Studio'nun ticari bir fontudur. Bu dosyayı herkese açık bir repoya koymadan önce şirketin font lisansının web kullanımına izin verdiğinden emin olun.

## Görseller

Ürün görselleri `assets/products/` klasöründedir; arka planı şeffaf .webp dosyalarıdır. Bazı ürünlerin kutuya eklenince görünen ayrı bir görseli vardır (`-kutu.webp`, `js/data.js` içinde `boxImg`). Bir ürünün görselini değiştirmek için aynı adla yeni dosya koymak yeterlidir.
