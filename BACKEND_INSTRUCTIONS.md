# הוראות לבקאנד - מערכת תחומי עניין (Interests)

## מטרה
להוסיף מערכת תגיות/תחומי עניין ללקוחות, כדי לאפשר סינון ושליחת הזמנות מותאמות אישית לוובינרים.

## דרישות

### 1. טבלאות חדשות
- **interests** - טבלת תחומי עניין
  - `id` (UUID, primary key)
  - `name` (string, שם תחום העניין)
  - `description` (text, אופציונלי - תיאור)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

- **customer_interests** - טבלת קשר Many-to-Many
  - `id` (UUID, primary key)
  - `customer_id` (UUID, foreign key -> customers.id)
  - `interest_id` (UUID, foreign key -> interests.id)
  - `created_at` (timestamp)
  - אינדקס ייחודי על (customer_id, interest_id)

### 2. API Endpoints נדרשים

#### ניהול תחומי עניין
- `GET /interests` - קבלת רשימת כל תחומי העניין
  - Response: `{ interests: [{ id, name, description }] }`

- `POST /interests` - יצירת תחום עניין חדש (מנהל בלבד)
  - Body: `{ name, description? }`

- `PUT /interests/:id` - עדכון תחום עניין (מנהל בלבד)
  - Body: `{ name?, description? }`

- `DELETE /interests/:id` - מחיקת תחום עניין (מנהל בלבד)

#### עדכון Customers API
- `GET /customers` - הוסף פרמטר query חדש:
  - `?interest=<interest_id>` - סינון לפי תחום עניין
  - ה-response צריך לכלול את תחומי העניין של כל לקוח:
    ```json
    {
      "customers": [{
        "id": "...",
        "name": "...",
        "interests": [
          { "id": "...", "name": "..." }
        ]
      }]
    }
    ```

- `POST /customers` ו-`PUT /customers/:id` - קבלת מערך interests:
  - Body: `{ ..., interests: [interest_id1, interest_id2] }`
  - צריך לעדכן את הקשרים ב-customer_interests

- `GET /customers/:id` - להחזיר גם את תחומי העניין

### 3. דרישות נוספות
- כל ה-endpoints צריכים לדרוש authentication
- endpoints של interests (POST/PUT/DELETE) דורשים הרשאת מנהל
- בעדכון/יצירה של לקוח עם interests - לנקות קשרים ישנים וליצור חדשים

## דוגמאות שימוש

```javascript
// יצירת לקוח עם תחומי עניין
POST /customers
{
  "name": "יוסי כהן",
  "email": "yossi@example.com",
  "interests": ["uuid-1", "uuid-2"]
}

// עדכון תחומי עניין של לקוח קיים
PUT /customers/abc-123
{
  "interests": ["uuid-3", "uuid-4", "uuid-5"]
}

// סינון לקוחות לפי תחום עניין
GET /customers?interest=uuid-1

// קבלת רשימת תחומי עניין
GET /interests
```

## הערות
- הפרונט כבר מוכן ומחכה לendpoints האלה
- אם יש שגיאות, להחזיר status code מתאים + הודעת שגיאה ב-JSON
- רצוי לוודא שלא ניתן למחוק interest שמשויך ללקוחות (או למחוק אוטומטית את הקשרים)
