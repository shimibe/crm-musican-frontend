# CRM Musican - Frontend

ממשק משתמש עבור מערכת CRM, בנוי עם React + Tailwind CSS.

## התקנה

1. **העתק את הקבצים** לתיקיית הפרויקט שיצרת:
```bash
cd "/Users/musican/dev works/crm-musican-frontend/src"
```

2. **העתק את כל הקבצים** מהתיקייה שהורדת למיקום הנכון

3. **צור קובץ .env**:
```bash
cp .env.example .env
```

4. **ודא שכל התלויות מותקנות**:
```bash
cd "/Users/musican/dev works/crm-musican-frontend"
npm install
```

## הרצה

### מצב פיתוח:
```bash
npm start
```
הממשק יהיה זמין ב: http://localhost:3000

### Build לייצור:
```bash
npm run build
```

## פרטי התחברות ראשוניים

- **שם משתמש:** admin
- **סיסמה:** admin123

**⚠️ חשוב:** שנה את הסיסמה אחרי הכניסה הראשונה!

## תכונות

- ✅ RTL (עברית)
- ✅ Dark Mode
- ✅ ניהול לקוחות מלא
- ✅ ניהול משימות
- ✅ Activity Log
- ✅ ממשק Admin
- ✅ Responsive Design

## מבנה הקבצים

```
src/
├── components/
│   ├── auth/
│   │   └── Login.js
│   └── layout/
│       └── Layout.js
├── contexts/
│   ├── AuthContext.js
│   └── DarkModeContext.js
├── pages/
│   ├── Dashboard.js
│   ├── Customers.js
│   ├── Tasks.js
│   ├── Activity.js
│   ├── Settings.js
│   └── Admin.js
├── utils/
│   └── api.js
├── App.js
├── index.js
└── index.css
```

## תמיכה

לבעיות או שאלות, פנה למפתח המערכת.
