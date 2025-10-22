# Eğitim Oyun Admin Paneli

Bu proje React + TypeScript + Vite kullanarak geliştirilmiş bir eğitim oyun yönetim sistemidir.

## Kurulum ve Çalıştırma

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

3. Tarayıcınızda http://localhost:5173/ adresine gidin.

## Giriş Yapma

Uygulamaya giriş yapmak için:

1. http://localhost:5173/ adresine gidin
2. Login sayfasına yönlendirileceksiniz
3. **İlk kullanım için bir admin hesabı oluşturmanız gerekir**

### İlk Admin Hesabı Oluşturma

Sistem ilk kurulumda herhangi bir varsayılan kullanıcı içermez. İlk admin hesabınızı oluşturmak için:

1. Backend API'nizin çalıştığından emin olun
2. API üzerinden bir admin kullanıcı oluşturun
3. Veya eğer backend'de seed verisi varsa onu kullanın

### Test Hesapları

Backend API'nizde test kullanıcıları tanımlanmışsa, genellikle şu bilgilerle giriş yapabilirsiniz:
- E-mail: admin@example.com
- Şifre: password

*Not: Bu bilgiler backend konfigürasyonunuza göre değişebilir.*

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
