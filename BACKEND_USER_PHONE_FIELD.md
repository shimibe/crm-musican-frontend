# עדכון - שדה טלפון למשתמשים

## סקירה
הוספנו שדה מספר טלפון למשתמשים כדי לאפשר שליחת קמפיין ניסיון גם לוואטסאפ ולא רק לאימייל.

---

## שינויים במסד הנתונים

### הוספת עמודה לטבלת Users

```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

**הערות:**
- השדה אופציונלי (nullable)
- פורמט מומלץ: `972501234567` (קוד מדינה + מספר ללא מקפים/רווחים)

---

## עדכונים נדרשים ב-API

### 1. עדכון endpoint הרשמה
```
POST /auth/register
```

**Request Body מעודכן:**
```json
{
  "username": "john_doe",
  "password": "password123",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "972501234567",
  "role": "employee"
}
```

**הערה:** השדה `phone` אופציונלי

---

### 2. עדכון endpoint עדכון משתמש
```
PUT /users/:id
```

**Request Body מעודכן:**
```json
{
  "full_name": "John Doe Updated",
  "email": "john.updated@example.com",
  "phone": "972509876543",
  "role": "manager"
}
```

**הערה:** השדה `phone` אופציונלי, אפשר לעדכן אותו או להשאיר ריק

---

### 3. עדכון response של GET /users

**Response מעודכן:**
```json
[
  {
    "id": "uuid",
    "username": "john_doe",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "972501234567",
    "role": "employee",
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

## עדכון endpoint קמפיין ניסיון

### `POST /campaigns/send-test`

**לפני:**
שלח רק לאימייל של המשתמש המחובר

**אחרי:**
שלח גם לאימייל וגם לוואטסאפ (אם יש מספר טלפון)

**דוגמת קוד מעודכנת:**
```javascript
async function sendTestCampaign(req, res) {
  const userId = req.user.userId;
  const { emailTemplate, emailSubject, whatsappTemplate, emailVariables, whatsappVariables } = req.body;

  try {
    // שלוף את פרטי המשתמש
    const user = await db.query('SELECT email, phone FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    const results = {
      emailSent: false,
      whatsappSent: false,
      errors: []
    };

    // שלח אימייל אם יש תבנית
    if (emailTemplate && user.email) {
      try {
        await sendPulse.sendEmail({
          to: user.email,
          template: emailTemplate,
          subject: emailSubject,
          variables: emailVariables
        });
        results.emailSent = true;
      } catch (error) {
        console.error('Email test send error:', error);
        results.errors.push(`שגיאה באימייל: ${error.message}`);
      }
    }

    // שלח וואטסאפ אם יש תבנית ומספר טלפון
    if (whatsappTemplate && user.phone) {
      try {
        await sendPulse.sendWhatsApp({
          to: user.phone,
          template: whatsappTemplate,
          variables: whatsappVariables
        });
        results.whatsappSent = true;
      } catch (error) {
        console.error('WhatsApp test send error:', error);
        results.errors.push(`שגיאה בוואטסאפ: ${error.message}`);
      }
    }

    // הודעת הצלחה
    const messages = [];
    if (results.emailSent) messages.push('אימייל נשלח');
    if (results.whatsappSent) messages.push('וואטסאפ נשלח');
    if (!results.emailSent && !user.email) messages.push('אין אימייל במערכת');
    if (!results.whatsappSent && !user.phone && whatsappTemplate) {
      messages.push('אין מספר טלפון במערכת - לא ניתן לשלוח וואטסאפ');
    }

    return res.json({
      success: true,
      message: messages.join(', '),
      details: results
    });
  } catch (error) {
    console.error('Error sending test campaign:', error);
    return res.status(500).json({ error: 'שגיאה בשליחת קמפיין ניסיון' });
  }
}
```

---

## התנהגות מומלצת

### כשאין מספר טלפון:
- אם המשתמש לא הזין מספר טלפון, לא תשלח הודעת וואטסאפ
- התראה ידידותית ב-response: "אין מספר טלפון - לא נשלח וואטסאפ"

### כשיש מספר טלפון לא תקין:
- SendPulse יחזיר שגיאה - תפוס אותה ותחזיר הודעה ברורה
- דוגמה: "מספר הטלפון אינו תקין או לא רשום בוואטסאפ"

---

## בדיקות

### הוספת משתמש עם טלפון:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "password": "password123",
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "972501234567",
    "role": "employee"
  }'
```

### עדכון טלפון של משתמש:
```bash
curl -X PUT http://localhost:3000/api/users/UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "972509876543"
  }'
```

### שליחת קמפיין ניסיון:
```bash
curl -X POST http://localhost:3000/api/campaigns/send-test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailTemplate": "test-email",
    "emailSubject": "נושא ניסיון",
    "whatsappTemplate": "test-whatsapp",
    "emailVariables": {"name": "John"},
    "whatsappVariables": ["John", "Today"]
  }'
```

התוצאה צריכה להיות:
```json
{
  "success": true,
  "message": "אימייל נשלח, וואטסאפ נשלח",
  "details": {
    "emailSent": true,
    "whatsappSent": true,
    "errors": []
  }
}
```

---

## סיכום השינויים

### Frontend:
- ✅ [Settings.js](src/pages/Settings.js) - הוספת שדה טלפון
- ✅ [Admin.js](src/pages/Admin.js) - הוספת שדה טלפון בניהול משתמשים

### Backend (נדרש):
- ⏳ הוספת עמודה `phone` לטבלת `users`
- ⏳ עדכון `/auth/register` לקבל `phone`
- ⏳ עדכון `PUT /users/:id` לקבל `phone`
- ⏳ עדכון `POST /campaigns/send-test` לשלוח גם וואטסאפ
