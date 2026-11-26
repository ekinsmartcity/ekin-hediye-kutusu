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
    { id: 'yemek-kabi', name: 'Ekin logolu termoslu yemek kabı', v: [{ sku: 'yemek-kabi', price: 8.15, cur: 'USD', img: 'assets/products/yemek-kabi-liste.webp', boxImg: 'assets/products/yemek-kabi.webp' }] },
    { id: 'bel-cantasi', name: 'Ekin logolu bel çantası', v: [{ sku: 'bel-cantasi', price: 1.89, cur: 'USD', img: 'assets/products/bel-cantasi.webp' }] },
    { id: 'pasaport', name: 'Ekin logolu pasaport kılıfı', v: [{ sku: 'pasaport', price: 2.5, cur: 'USD', img: 'assets/products/pasaport.webp' }] },
    { id: 'saklama', name: 'Ekin logolu saklama kabı', v: [{ sku: 'saklama', price: 2.27, cur: 'USD', img: 'assets/products/saklama.webp', boxImg: 'assets/products/saklama-kutu.webp' }] },
    { id: 'misir', name: 'Patlamış mısır kasesi ve patlamış mısır', v: [{ sku: 'misir', price: 500, cur: 'TRY', img: 'assets/products/misir.webp' }] },
    { id: 'cikolata', name: 'Kahve Dünyası sıcak çikolata paketi', v: [{ sku: 'cikolata', price: 250, cur: 'TRY', img: 'assets/products/cikolata.webp' }] },
    { id: 'kd-spesiyal-5x5', name: 'Kahve Dünyası Spesiyal Kutu Yılbaşı 5x5', v: [{ sku: 'kd-spesiyal-5x5', price: 570, cur: 'TRY', img: 'assets/products/kd-spesiyal-5x5.webp' }] },
    { id: 'kd-lavi-500', name: 'Kahve Dünyası Lavi Yılbaşı Kutulu, 500 gr', v: [{ sku: 'kd-lavi-500', price: 600, cur: 'TRY', img: 'assets/products/kd-lavi-500.webp' }] },
    { id: 'kd-roche-700', name: 'Kahve Dünyası Roche fıstıklı sütlü-bitter çikolata, 700 gr', v: [{ sku: 'kd-roche-700', price: 1750, cur: 'TRY', img: 'assets/products/kd-roche-700.webp' }] },
    { id: 'godiva-cello', name: 'Godiva Mini Napoliten Cello, 20 adet', v: [{ sku: 'godiva-cello', price: 525, cur: 'TRY', img: 'assets/products/godiva-cello.webp' }] },
    { id: 'melodi-1957', name: 'Melodi 1957 Atölye Serisi çikolata, 320 gr', v: [{ sku: 'melodi-1957', price: 775, cur: 'TRY', img: 'assets/products/melodi-1957.webp' }] },
    { id: 'melodi-pralin', name: 'Melodi Pralin metal kutu spesiyal çikolata, 250 gr', v: [{ sku: 'melodi-pralin', price: 700, cur: 'TRY', img: 'assets/products/melodi-pralin.webp' }] },
    {
      id: 'kuruyemis', name: 'Kuruyemiş paketi', segLabel: 'Kuruyemiş seçeneği', v: [
        { sku: 'kuruyemis-3', label: '3 bölmeli ahşap kutu', price: 565, cur: 'TRY', img: 'assets/products/kuruyemis-3.webp' },
        { sku: 'kuruyemis-7', label: '7 bölmeli ahşap kutu', price: 1110, cur: 'TRY', img: 'assets/products/kuruyemis-7.webp' }
      ]
    },
    { id: 'oda-kokusu', name: 'English Home çubuklu oda kokusu, 100 ml', v: [{ sku: 'oda-kokusu', price: 370, cur: 'TRY', img: 'assets/products/oda-kokusu.webp' }] },
    { id: 'nar', name: 'Dekoratif nar seti', v: [{ sku: 'nar', price: 450, cur: 'TRY', img: 'assets/products/nar.webp?v=2' }] },
    { id: 'bowling', name: 'Mini ahşap bowling oyunu', v: [{ sku: 'bowling', price: 460, cur: 'TRY', img: 'assets/products/bowling.webp' }] },
    {
      id: 'edenred', name: 'Edenred hediye çeki', exclusive: true, segLabel: 'Çek tutarı', v: [
        { sku: 'edenred-3000', label: '3.000 TL', price: 3000, cur: 'TRY', img: 'assets/products/edenred.webp' },
        { sku: 'edenred-4000', label: '4.000 TL', price: 4000, cur: 'TRY', img: 'assets/products/edenred.webp' },
        { sku: 'edenred-5000', label: '5.000 TL', price: 5000, cur: 'TRY', img: 'assets/products/edenred.webp' }
      ]
    }
  ]
};
