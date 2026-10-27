/*
 * Ürün kataloğu ve başlangıç değerleri.
 * Fiyat değiştirmek, ürün eklemek ya da görsel yolunu güncellemek için yalnızca bu dosyayı düzenleyin.
 *  - price: birim fiyat (sayı). Bilinmiyorsa null -> sayfada "Fiyat giriniz" olarak görünür.
 *  - cur:   'TRY' veya 'USD'
 *  - img:   assets/products altındaki görsel. Yoksa null -> "Görsel ekle" alanı görünür.
 *  - boxImg: (isteğe bağlı) kutuya eklenince kutuda ve sepet listesinde görünen görsel. Yoksa img kullanılır.
 *  - exclusive: true ise ürünün seçeneklerinden yalnızca biri aynı anda kutuda olabilir.
 */
window.EKIN_DATA = {
  rateDefault: 49.654,
  rateDefaultStr: '49,6540',
  rateLabel: 'Sunumdaki kur · 26.10.2026',
  packDefault: '200',
  catalog: [
    { id: 'termos-canta', name: 'Ekin logolu termos çanta', v: [{ sku: 'termos-canta', price: 3.78, cur: 'USD', img: 'assets/products/termos-canta.webp', boxImg: 'assets/products/termos-canta-kutu.webp' }] },
    { id: 'yemek-kabi', name: 'Ekin logolu termoslu yemek kabı', v: [{ sku: 'yemek-kabi', price: 8.15, cur: 'USD', img: 'assets/products/yemek-kabi-liste.webp', boxImg: 'assets/products/yemek-kabi.webp' }] },
    { id: 'bel-cantasi', name: 'Ekin logolu bel çantası', v: [{ sku: 'bel-cantasi', price: 1.89, cur: 'USD', img: 'assets/products/bel-cantasi.webp' }] },
    { id: 'pasaport', name: 'Ekin logolu pasaport kılıfı', v: [{ sku: 'pasaport', price: 2.5, cur: 'USD', img: 'assets/products/pasaport.webp' }] },
    { id: 'saklama', name: 'Ekin logolu saklama kabı', v: [{ sku: 'saklama', price: 2.27, cur: 'USD', img: 'assets/products/saklama.webp', boxImg: 'assets/products/saklama-kutu.webp' }] },
    { id: 'misir', name: 'Patlamış mısır kasesi ve patlamış mısır', v: [{ sku: 'misir', price: 500, cur: 'TRY', img: 'assets/products/misir.webp' }] },
    { id: 'cikolata', name: 'Kahve Dünyası sıcak çikolata paketi', v: [{ sku: 'cikolata', price: 250, cur: 'TRY', img: 'assets/products/cikolata.webp' }] },
    { id: 'godiva-cello', name: 'Godiva Mini Napoliten Cello, 20 adet', v: [{ sku: 'godiva-cello', price: 525, cur: 'TRY', img: 'assets/products/godiva-cello.webp' }] },
    { id: 'godiva-pouch', name: 'Godiva Mini Napoliten Pouch, 14 adet', v: [{ sku: 'godiva-pouch', price: 350, cur: 'TRY', img: 'assets/products/godiva-pouch.webp' }] },
    { id: 'godiva-madlen', name: 'Godiva Finesse Belle, 20 adet sargılı madlen', v: [{ sku: 'godiva-madlen', price: 660, cur: 'TRY', img: 'assets/products/godiva-madlen.webp' }] },
    { id: 'godiva-domes', name: 'Godiva Sütlü Fındık Krokantlı Chocolate Domes, 123 gr', v: [{ sku: 'godiva-domes', price: 350, cur: 'TRY', img: 'assets/products/godiva-domes.webp' }] },
    {
      id: 'kuruyemis', name: 'Kuruyemiş paketi', segLabel: 'Kuruyemiş seçeneği', v: [
        { sku: 'kuruyemis-3', label: '3 bölmeli ahşap kutu', price: 565, cur: 'TRY', img: 'assets/products/kuruyemis-3.webp' },
        { sku: 'kuruyemis-7', label: '7 bölmeli ahşap kutu', price: 1110, cur: 'TRY', img: 'assets/products/kuruyemis-7.webp' }
      ]
    },
    { id: 'oda-kokusu', name: 'English Home çubuklu oda kokusu, 100 ml', v: [{ sku: 'oda-kokusu', price: 370, cur: 'TRY', img: 'assets/products/oda-kokusu.webp' }] },
    { id: 'mum', name: 'Mudo Home mum, 200 gr', v: [{ sku: 'mum', price: 600, cur: 'TRY', img: 'assets/products/mum.webp' }] },
    { id: 'atki', name: 'Mudo lacivert atkı', v: [{ sku: 'atki', price: 1400, cur: 'TRY', img: 'assets/products/atki.webp?v=2' }] },
    { id: 'fil', name: 'Dekoratif fil ailesi', v: [{ sku: 'fil', price: 345, cur: 'TRY', img: 'assets/products/fil.webp' }] },
    { id: 'nar', name: 'Dekoratif nar seti', v: [{ sku: 'nar', price: 450, cur: 'TRY', img: 'assets/products/nar.webp?v=2' }] },
    { id: 'bilardo', name: 'Mini bilardo oyunu', v: [{ sku: 'bilardo', price: 560, cur: 'TRY', img: 'assets/products/bilardo.webp' }] },
    { id: 'bowling', name: 'Mini ahşap bowling oyunu', v: [{ sku: 'bowling', price: 460, cur: 'TRY', img: 'assets/products/bowling.webp' }] },
    { id: 'corap', name: "Yeni yıl temalı 4'lü çorap", v: [{ sku: 'corap', price: 499, cur: 'TRY', img: 'assets/products/corap.webp' }] },
    {
      id: 'edenred', name: 'Edenred hediye çeki', exclusive: true, segLabel: 'Çek tutarı', v: [
        { sku: 'edenred-2000', label: '2.000 TL', price: 2000, cur: 'TRY', img: 'assets/products/edenred.webp' },
        { sku: 'edenred-3000', label: '3.000 TL', price: 3000, cur: 'TRY', img: 'assets/products/edenred.webp' },
        { sku: 'edenred-4000', label: '4.000 TL', price: 4000, cur: 'TRY', img: 'assets/products/edenred.webp' },
        { sku: 'edenred-5000', label: '5.000 TL', price: 5000, cur: 'TRY', img: 'assets/products/edenred.webp' }
      ]
    }
  ]
};
