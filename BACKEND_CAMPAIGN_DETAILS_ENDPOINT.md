# הוראות לבקאנד - Endpoint לפירוט משלוחים ללקוחות

## מטרה
להוסיף endpoint שמחזיר פירוט מפורט של כל לקוח בקמפיין - האם קיבל אימייל/וואטסאפ והאם השליחה הצליחה או נכשלה.

## Endpoint חדש

### `GET /campaigns/:id/details`

מחזיר את הפירוט המלא של הקמפיין כולל סטטוס שליחה לכל לקוח.

**דרישות:**
- נדרש authentication
- `:id` - מזהה הקמפיין

**Response:**
```json
{
  "customers": [
    {
      "customer_id": "uuid",
      "customer_name": "שם הלקוח",
      "email_status": "sent" | "failed" | null,
      "whatsapp_status": "sent" | "failed" | null,
      "error_message": "הודעת שגיאה אם יש, null אחרת"
    }
  ]
}
```

**הסבר על השדות:**
- `email_status`:
  - `"sent"` - אימייל נשלח בהצלחה
  - `"failed"` - אימייל נכשל
  - `null` - לא נשלח אימייל (הקמפיין לא כלל אימייל או ללקוח אין אימייל)

- `whatsapp_status`:
  - `"sent"` - וואטסאפ נשלח בהצלחה
  - `"failed"` - וואטסאפ נכשל
  - `null` - לא נשלח וואטסאפ (הקמפיין לא כלל וואטסאפ או ללקוח אין טלפון)

- `error_message`: הודעת השגיאה מ-SendPulse או מההיגיון הפנימי. רק ללקוחות עם סטטוס "failed".

## איך לקבל את המידע?

הנתונים האלה צריכים להישמר בטבלת `campaign_logs` שכבר קיימת או צריכה להיווצר.

### מבנה מומלץ לטבלת `campaign_logs`:
```sql
CREATE TABLE campaign_logs (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  customer_id UUID REFERENCES customers(id),
  channel VARCHAR(20), -- 'email' או 'whatsapp'
  status VARCHAR(20), -- 'sent' או 'failed'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- אינדקס לחיפוש מהיר
CREATE INDEX idx_campaign_logs_campaign_id ON campaign_logs(campaign_id);
```

## דוגמת שימוש

```javascript
// Frontend קורא ל:
GET /campaigns/abc-123/details

// Backend מחזיר:
{
  "customers": [
    {
      "customer_id": "customer-1",
      "customer_name": "יוסי כהן",
      "email_status": "sent",
      "whatsapp_status": "sent",
      "error_message": null
    },
    {
      "customer_id": "customer-2",
      "customer_name": "שרה לוי",
      "email_status": "failed",
      "whatsapp_status": null,
      "error_message": "Invalid email format"
    },
    {
      "customer_id": "customer-3",
      "customer_name": "דוד מזרחי",
      "email_status": null,
      "whatsapp_status": "failed",
      "error_message": "Phone number not registered with WhatsApp"
    }
  ]
}
```

## הערות
- בעת שליחת קמפיין, יש לשמור ב-`campaign_logs` רשומה לכל ניסיון שליחה (בין אם הצליח או נכשל)
- אם ללקוח אין אימייל והקמפיין כולל אימייל - `email_status` יהיה `null`
- אם ללקוח אין טלפון והקמפיין כולל וואטסאפ - `whatsapp_status` יהיה `null`
- ה-Frontend כבר מוכן להציג את המידע בטבלה מפורטת
