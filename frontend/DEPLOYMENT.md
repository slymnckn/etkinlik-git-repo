# Production Deployment Rehberi

Bu rehber, frontend değişikliklerini production ortamına nasıl uygulayacağınızı açıklar.

## 1. Production Build Oluşturma

### Adım 1: Değişiklikleri Test Edin
```bash
# Geliştirme sunucusunu başlatın ve test edin
npm run dev
```

### Adım 2: Production Build Oluşturun
```bash
# TypeScript kontrolü ve optimized build
npm run build
```

Bu komut:
- TypeScript kodunu kontrol eder
- Vite ile optimized build oluşturur
- `dist/` klasörüne production dosyaları çıkarır

### Adım 3: Build'i Önizleyin (Opsiyonel)
```bash
# Local'de production build'i test edin
npm run preview
```

## 2. Production Deployment Seçenekleri

### Seçenek A: Geleneksel Web Server (Apache/Nginx)

1. **Build dosyalarını upload edin:**
   ```bash
   # dist/ klasörü içeriğini web server'a kopyalayın
   scp -r dist/* user@your-server:/path/to/web/directory/
   ```

2. **Web server konfigürasyonu (Nginx örneği):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/web/directory;
       index index.html;
       
       # SPA routing için
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # API isteklerini backend'e yönlendir
       location /api/ {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Seçenek B: Vercel (Önerilen)

1. **GitHub'a push edin:**
   ```bash
   git add .
   git commit -m "Production ready changes"
   git push origin main
   ```

2. **Vercel'de deploy edin:**
   - https://vercel.com/ adresine gidin
   - GitHub repository'nizi bağlayın
   - Otomatik deploy edilir

3. **Environment Variables (Vercel):**
   - Dashboard'da Environment Variables ekleyin:
     - `VITE_API_URL`: `https://your-backend-url.com/api`

### Seçenek C: Netlify

1. **GitHub'a push edin**
2. **Netlify'da deploy edin:**
   - https://netlify.com/ adresine gidin
   - Repository'yi bağlayın
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`

### Seçenek D: GitHub Pages

1. **GitHub Actions workflow oluşturun:**
   ```bash
   mkdir -p .github/workflows
   ```

2. **Deploy workflow'u ekleyin** (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
       - uses: actions/checkout@v2
       - uses: actions/setup-node@v3
         with:
           node-version: '18'
       - run: npm ci
       - run: npm run build
       - uses: peaceiris/actions-gh-pages@v3
         with:
           github_token: ${{ secrets.GITHUB_TOKEN }}
           publish_dir: ./dist
   ```

## 3. Environment Variables

Production için environment variable'ları ayarlayın:

### `.env.production` dosyası oluşturun:
```env
VITE_API_URL=https://etkinlik.app/api
VITE_APP_NAME=Eğitim Oyun Platformu
```

### Build time'da kullanım:
```bash
# Production environment ile build
NODE_ENV=production npm run build
```

## 4. CI/CD Pipeline (Otomatik Deployment)

### GitHub Actions ile Otomatik Deploy:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
      env:
        VITE_API_URL: ${{ secrets.VITE_API_URL }}
    
    - name: Deploy to server
      run: |
        # Server'a deployment script'i
        scp -r dist/* ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/var/www/html/
```

## 5. Production Checklist

### Deploy öncesi kontroller:
- [ ] Tüm testler geçiyor
- [ ] Build başarılı
- [ ] Environment variables ayarlanmış
- [ ] API endpoint'leri doğru
- [ ] HTTPS konfigürasyonu yapılmış

### Deploy sonrası kontroller:
- [ ] Site açılıyor
- [ ] Login çalışıyor
- [ ] API bağlantıları çalışıyor
- [ ] Routing doğru çalışıyor
- [ ] Mobile responsive

## 6. Rollback Stratejisi

Sorun durumunda geri alma:

```bash
# Önceki commit'e geri dön
git revert HEAD
git push origin main

# Veya önceki versiyon'u manuel deploy et
git checkout previous-working-commit
npm run build
# Build'i server'a upload et
```

## 7. Monitoring ve Logs

- Browser Console error'larını izleyin
- Network tab'da API error'larını kontrol edin
- Server logs'ları takip edin
- Performance monitoring ekleyin

---

**Not:** Bu rehber genel deployment stratejilerini içerir. Kendi infrastructure'nıza göre uyarlayın.
