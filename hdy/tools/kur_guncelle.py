"""TCMB'nin günlük kur bülteninden USD döviz satış kurunu alır ve data/kur.json dosyasına yazar.

GitHub Actions (.github/workflows/kur.yml) her iş günü bu dosyayı çalıştırır.
Elle denemek için:  python tools/kur_guncelle.py
"""
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

URL = 'https://www.tcmb.gov.tr/kurlar/today.xml'
OUT = Path(__file__).resolve().parent.parent / 'data' / 'kur.json'


def parse(xml_bytes):
    root = ET.fromstring(xml_bytes)
    tarih = root.attrib.get('Tarih')           # "27.10.2026"
    usd = None
    for c in root.findall('Currency'):
        if c.attrib.get('CurrencyCode') == 'USD' or c.attrib.get('Kod') == 'USD':
            usd = c
            break
    if usd is None:
        raise ValueError('Bültende USD bulunamadı')
    unit = int((usd.findtext('Unit') or '1').strip() or 1)
    selling = (usd.findtext('ForexSelling') or '').strip()
    if not selling:
        raise ValueError('USD döviz satış kuru boş')
    value = float(selling.replace(',', '.')) / unit
    g, a, y = tarih.split('.')
    return {
        'usdSelling': round(value, 4),
        'date': f'{y}-{a}-{g}',
        'source': 'TCMB gösterge niteliğindeki kurlar · USD döviz satış',
        'url': URL,
    }


def main():
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0 (ekin-hediye-paketi kur güncelleyici)'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = parse(r.read())
    old = json.loads(OUT.read_text('utf-8')) if OUT.exists() else None
    if old and old.get('date') == data['date'] and old.get('usdSelling') == data['usdSelling']:
        print('Kur değişmedi:', data['date'], data['usdSelling'])
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print('Kur güncellendi:', data['date'], data['usdSelling'])


if __name__ == '__main__':
    try:
        main()
    except Exception as e:  # iş akışı kırmızı görünsün ki fark edilsin; site son bilinen kurla çalışmaya devam eder
        print('Kur alınamadı:', e, file=sys.stderr)
        sys.exit(1)
