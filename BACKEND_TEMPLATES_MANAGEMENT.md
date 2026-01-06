# Backend - ניהול תבניות קמפיינים

## סקירה
דף ניהול תבניות קמפיינים מאפשר למנהלים להוסיף, לערוך ולמחוק תבניות עבור SendPulse.

---

## API Endpoints נדרשים

### 1. ✅ קיים - קבלת רשימת תבניות
```
GET /campaign-templates
```

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "הזמנה לאירוע",
      "type": "email",
      "created_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "תזכורת",
      "type": "whatsapp",
      "created_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

**הערות:**
- ה-endpoint הזה כבר קיים ונקרא מ-CampaignModal
- צריך להחזיר את כל התבניות

---

### 2. ✅ קיים חלקית - הוספת תבנית חדשה
```
POST /campaign-templates
```

**Request Body:**
```json
{
  "name": "הזמנה לוובינר",
  "type": "email"
}
```

**Validation:**
- `name` - חובה, לפחות 2 תווים
- `type` - חובה, רק 'email' או 'whatsapp'
- שם התבנית צריך להיות ייחודי לכל סוג (type)

**Response:**
```json
{
  "success": true,
  "template": {
    "id": "uuid",
    "name": "הזמנה לוובינר",
    "type": "email",
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

**שגיאות אפשריות:**
```json
{
  "error": "תבנית עם שם זה כבר קיימת"
}
```

---

### 3. 🆕 חדש - עדכון תבנית
```
PUT /campaign-templates/:id
```

**Request Body:**
```json
{
  "name": "הזמנה לוובינר - עדכון",
  "type": "email"
}
```

**Validation:**
- אפשר לעדכן רק את ה-`name` (לא את ה-`type`)
- שם התבנית החדש צריך להיות ייחודי

**Response:**
```json
{
  "success": true,
  "template": {
    "id": "uuid",
    "name": "הזמנה לוובינר - עדכון",
    "type": "email",
    "updated_at": "2024-01-15T13:00:00Z"
  }
}
```

**דוגמת קוד:**
```javascript
async function updateTemplate(req, res) {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // בדוק אם התבנית קיימת
    const template = await db.query(
      'SELECT * FROM campaign_templates WHERE id = ?',
      [id]
    );

    if (!template) {
      return res.status(404).json({ error: 'תבנית לא נמצאה' });
    }

    // בדוק אם שם התבנית החדש כבר תפוס
    const existing = await db.query(
      'SELECT * FROM campaign_templates WHERE name = ? AND type = ? AND id != ?',
      [name, template.type, id]
    );

    if (existing) {
      return res.status(400).json({ error: 'תבנית עם שם זה כבר קיימת' });
    }

    // עדכן
    await db.query(
      'UPDATE campaign_templates SET name = ?, updated_at = NOW() WHERE id = ?',
      [name, id]
    );

    const updated = await db.query(
      'SELECT * FROM campaign_templates WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      template: updated
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({ error: 'שגיאה בעדכון תבנית' });
  }
}
```

---

### 4. 🆕 חדש - מחיקת תבנית
```
DELETE /campaign-templates/:id
```

**Response:**
```json
{
  "success": true,
  "message": "התבנית נמחקה בהצלחה"
}
```

**הערות חשובות:**
- לפני מחיקה, כדאי לבדוק אם יש קמפיינים שמשתמשים בתבנית הזו
- אפשרות 1: למנוע מחיקה אם יש קמפיינים
- אפשרות 2: לאפשר מחיקה (הקמפיינים הישנים ישמרו את השם בלבד)

**דוגמת קוד - אפשרות 1 (מומלץ):**
```javascript
async function deleteTemplate(req, res) {
  const { id } = req.params;

  try {
    // בדוק אם יש קמפיינים שמשתמשים בתבנית
    const campaigns = await db.query(
      'SELECT COUNT(*) as count FROM campaigns WHERE email_template = (SELECT name FROM campaign_templates WHERE id = ?) OR whatsapp_template = (SELECT name FROM campaign_templates WHERE id = ?)',
      [id, id]
    );

    if (campaigns.count > 0) {
      return res.status(400).json({
        error: `לא ניתן למחוק תבנית שמשמשת ${campaigns.count} קמפיינים קיימים`
      });
    }

    // מחק את התבנית
    const result = await db.query(
      'DELETE FROM campaign_templates WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'תבנית לא נמצאה' });
    }

    return res.json({
      success: true,
      message: 'התבנית נמחקה בהצלחה'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ error: 'שגיאה במחיקת תבנית' });
  }
}
```

---

## מבנה טבלה (אם עדיין לא קיים)

```sql
CREATE TABLE campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'whatsapp')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (name, type)
);

-- אינדקס לחיפוש מהיר
CREATE INDEX idx_templates_type ON campaign_templates(type);
```

---

## הרשאות
כל ה-endpoints האלה צריכים לדרוש:
- ✅ Authentication (משתמש מחובר)
- ✅ Admin role (רק מנהלים יכולים לנהל תבניות)

```javascript
// Middleware לבדיקת הרשאות
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה זו' });
  }
  next();
}

// שימוש:
router.post('/campaign-templates', authenticate, requireAdmin, createTemplate);
router.put('/campaign-templates/:id', authenticate, requireAdmin, updateTemplate);
router.delete('/campaign-templates/:id', authenticate, requireAdmin, deleteTemplate);
```

---

## סיכום Routes

```javascript
const express = require('express');
const router = express.Router();

// Templates management
router.get('/campaign-templates', authenticate, getTemplates);
router.post('/campaign-templates', authenticate, requireAdmin, createTemplate);
router.put('/campaign-templates/:id', authenticate, requireAdmin, updateTemplate);
router.delete('/campaign-templates/:id', authenticate, requireAdmin, deleteTemplate);

module.exports = router;
```

---

## בדיקות מומלצות

### הוספת תבנית:
```bash
curl -X POST http://localhost:3000/api/campaign-templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-template", "type": "email"}'
```

### עדכון תבנית:
```bash
curl -X PUT http://localhost:3000/api/campaign-templates/UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-template-updated", "type": "email"}'
```

### מחיקת תבנית:
```bash
curl -X DELETE http://localhost:3000/api/campaign-templates/UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```
