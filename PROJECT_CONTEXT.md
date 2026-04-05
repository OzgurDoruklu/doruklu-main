# Proje Bağlamı (Project Context)

**Domain:** `doruklu.com`
**Platform:** GitHub Pages
**DNS Yönetimi:** GoDaddy

## Bugüne Kadar Yapılanlar
- Proje başlangıcında ana domain (`doruklu.com`) için A record IP adresleri (185.199.108.153 - 111.153) GoDaddy tarafına girildi.
- GitHub Pages'in birden fazla alt alan adını tek repodan çalıştıramama kısıtlamasından dolayı bu domain için `doruklu-main` isimli özel repo açıldı. 
- Arayüz, `index.html` içerisinde Vanilla CSS kullanılarak inşa edildi. Tailwind kullanılmadı. Tasarım dili olarak; Glassmorphism (cam yansımaları), koyu mod, arka planda yavaşça hareket eden büyük bulanık yuvarlaklar (blob animasyonları) tercih edildi.

## Gelecekteki Etkileşimler İçin Talimatlar
- Yeni bir sayfa veya component eklendiğinde **zaten mevcut olan `index.html` içerisindeki CSS mimarisi (CSS Variables vb.)** kullanılmalı, yeni stiller uyumlu bir şekilde eklenmelidir. Açık renklerden kaçınılmalı, sitenin zengin (premium) görüntüsü bozulmamalıdır.
- GitHub Pages'da SSL kuralı olduğu için dışardan bir kütüphane dahil edilecekse HTTPS olmak zorundadır.
- Bu repo sadece ana alan adı ile ilgilidir (doruklu.com). Subdomain geliştirmeleri için `doruklu-toprak`, `doruklu-ozgur` gibi diğer klasörlere gidilmelidir.
