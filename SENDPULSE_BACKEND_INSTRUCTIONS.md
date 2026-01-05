# הוראות Backend - מערכת שליחת קמפיינים דרך SendPulse

## מטרה
מערכת לשליחת קמפיינים (אימייל ווואטסאפ) ללקוחות נבחרים באמצעות API של SendPulse.

## ⚠️ נקודה קריטית - משתנים בוואטסאפ!

**חשוב מאוד:** בשליחת וואטסאפ דרך SendPulse, המשתנים מתנהגים שונה מאשר באימייל:

### אימייל:
- משתנים הם **אובייקט** עם key-value pairs
- דוגמה: `{ "firstName": "יוסי", "eventDate": "15/01/2024" }`
- השם של המשתנה חשוב ומשמש למיקום הנכון בתבנית

### וואטסאפ:
- משתנים הם **מערך מסודר**
- דוגמה: `["יוסי כהן", "15/01/2024", "20:00"]`
- **הסדר קריטי!** האיבר הראשון ישלח כ-{{1}}, השני כ-{{2}}, וכן הלאה
- השם לא משנה, רק הסדר!

לכן ב-Frontend נבנה ממשק שונה:
- לאימייל: זוגות שם+ערך
- לוואטסאפ: רשימה מסודרת עם חצים להזזה

---

## 1. טבלאות נדרשות

### טבלת `campaign_templates`
שמירת תבניות קמפיינים לשימוש חוזר:

```sql
CREATE TABLE campaign_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'email' או 'whatsapp'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index לחיפוש מהיר
CREATE INDEX idx_campaign_templates_type ON campaign_templates(type);
```

### טבלת `campaigns` (אופציונלי - לשמירת היסטוריה)
שמירת היסטוריית קמפיינים שנשלחו:

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  email_template VARCHAR(255),
  whatsapp_template VARCHAR(255),
  email_variables JSONB, -- אובייקט עם key-value pairs
  whatsapp_variables JSONB, -- מערך מסודר של ערכים
  customer_count INTEGER,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'failed'
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
```

**הערה:**
- `email_variables` יישמר כ-JSON object: `{"firstName": "...", "eventDate": "..."}`
- `whatsapp_variables` יישמר כ-JSON array: `["value1", "value2", "value3"]`

### טבלת `campaign_logs` (אופציונלי - ללוג מפורט)
```sql
CREATE TABLE campaign_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  channel VARCHAR(50), -- 'email' או 'whatsapp'
  status VARCHAR(50), -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaign_logs_campaign ON campaign_logs(campaign_id);
CREATE INDEX idx_campaign_logs_customer ON campaign_logs(customer_id);
```

---

## 2. API Endpoints נדרשים

### ניהול תבניות קמפיין

#### `GET /campaign-templates`
קבלת רשימת כל התבניות

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "webinar-invitation",
      "type": "email",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "special-offer",
      "type": "whatsapp",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `POST /campaign-templates`
יצירת תבנית חדשה

**Request Body:**
```json
{
  "name": "webinar-invitation",
  "type": "email"
}
```

**Response:**
```json
{
  "template": {
    "id": "uuid",
    "name": "webinar-invitation",
    "type": "email",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### `DELETE /campaign-templates/:id`
מחיקת תבנית (מנהלים בלבד)

---

### שליחת קמפיינים

#### `POST /campaigns/send`
שליחת קמפיין ללקוחות נבחרים

**Request Body:**
```json
{
  "customerIds": ["uuid1", "uuid2", "uuid3"],
  "emailTemplate": "webinar-invitation",
  "whatsappTemplate": "webinar-reminder",
  "emailVariables": {
    "webinarDate": "15/01/2024",
    "webinarTime": "20:00",
    "registrationLink": "https://example.com/register"
  },
  "whatsappVariables": [
    "{{customer.name}}",
    "15/01/2024",
    "20:00",
    "https://example.com/register"
  ]
}
```

**⚠️ חשוב מאוד להבין את ההבדל:**
- **emailVariables** (אובייקט) - זוגות key-value. השם של המשתנה חשוב ומשמש לאיתור במיקום הנכון בתבנית.
- **whatsappVariables** (מערך) - **הסדר קריטי!** האיבר הראשון במערך ישלח כ-{{1}}, השני כ-{{2}}, השלישי כ-{{3}}, וכן הלאה. השם לא משנה, רק הסדר!

**Response:**
```json
{
  "success": true,
  "campaignId": "uuid",
  "stats": {
    "totalCustomers": 3,
    "emailsSent": 2,
    "whatsappSent": 3,
    "failed": 0
  }
}
```

**שגיאות אפשריות:**
- 400: חסרים פרמטרים נדרשים
- 401: לא מורשה
- 500: שגיאה בשליחה

---

## 3. אינטגרציה עם SendPulse API

### הגדרת credentials
צור קובץ `.env` או שמור ב-database:

```env
SENDPULSE_API_USER_ID=your_user_id
SENDPULSE_API_SECRET=your_secret
SENDPULSE_EMAIL_FROM=noreply@musican.me
SENDPULSE_EMAIL_FROM_NAME=Musican
```

### פונקציות מומלצות לשירות SendPulse

צור קובץ `services/sendpulse.js` או `sendpulse.service.js`:

#### פונקציות עיקריות:

```javascript
/**
 * אתחול חיבור ל-SendPulse API
 * מקבל access token מה-API של SendPulse
 */
async function initSendPulse()

/**
 * שליחת אימייל בודד ללקוח
 * @param {Object} customer - אובייקט לקוח עם email, name
 * @param {string} templateName - שם התבנית ב-SendPulse
 * @param {Object} variables - משתנים להחלפה בתבנית
 * @returns {Promise<Object>} תוצאת השליחה
 */
async function sendEmail(customer, templateName, variables)

/**
 * שליחת הודעת WhatsApp בודדת ללקוח
 * @param {Object} customer - אובייקט לקוח עם phone, name
 * @param {string} templateName - שם התבנית ב-SendPulse
 * @param {Array<string>} variables - מערך משתנים מסודר! הסדר קריטי!
 * @returns {Promise<Object>} תוצאת השליחה
 *
 * דוגמה:
 * variables = ["יוסי כהן", "15/01/2024", "20:00"]
 * ישלח: {{1}} = "יוסי כהן", {{2}} = "15/01/2024", {{3}} = "20:00"
 */
async function sendWhatsApp(customer, templateName, variables)

/**
 * שליחת קמפיין מלא (אימייל + וואטסאפ) לרשימת לקוחות
 * @param {Array} customers - מערך לקוחות
 * @param {Object} campaignData - נתוני הקמפיין (templates, variables)
 * @returns {Promise<Object>} סטטיסטיקות השליחה
 */
async function sendCampaign(customers, campaignData)

/**
 * טיפול במשתנים לאימייל - החלפת placeholders בערכים אמיתיים
 * @param {Object} emailVariables - משתנים מהמשתמש (object)
 * @param {Object} customer - נתוני לקוח
 * @returns {Object} משתנים מעובדים
 *
 * דוגמה:
 * Input: { firstName: "{{customer.name}}", email: "{{customer.email}}" }
 * Output: { firstName: "יוסי", email: "yossi@example.com" }
 */
function processEmailVariables(emailVariables, customer)

/**
 * טיפול במשתנים לוואטסאפ - החלפת placeholders בערכים אמיתיים
 * @param {Array<string>} whatsappVariables - מערך משתנים מסודר
 * @param {Object} customer - נתוני לקוח
 * @returns {Array<string>} מערך משתנים מעובדים באותו סדר
 *
 * דוגמה:
 * Input: ["{{customer.name}}", "15/01/2024", "{{customer.phone}}"]
 * Output: ["יוסי כהן", "15/01/2024", "050-1234567"]
 *
 * ⚠️ חשוב: הסדר חייב להישמר!
 */
function processWhatsAppVariables(whatsappVariables, customer)
```

### דוגמת התממשקות עם SendPulse API

```javascript
// Example: שליחת אימייל
const response = await fetch('https://api.sendpulse.com/smtp/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: {
      subject: 'Subject here',
      from: { name: 'Musican', email: 'noreply@musican.me' },
      to: [{ name: customer.name, email: customer.email }],
      template: {
        id: templateId,
        variables: processedVariables
      }
    }
  })
});

// Example: שליחת WhatsApp
// ⚠️ חשוב: whatsappVariables הוא מערך מסודר!
const response = await fetch('https://api.sendpulse.com/whatsapp/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phone: customer.phone,
    template: templateName,
    variables: processedWhatsAppVariables // מערך: ["value1", "value2", "value3"]
    // SendPulse ימפה אותם ל: {{1}}, {{2}}, {{3}} לפי הסדר
  })
});
```

---

## 4. לוגיקה מומלצת ל-Endpoint `/campaigns/send`

```javascript
async function sendCampaignHandler(req, res) {
  try {
    const { customerIds, emailTemplate, whatsappTemplate, emailVariables, whatsappVariables } = req.body;
    const userId = req.user.id; // מה-authentication middleware

    // 1. Validation
    if (!customerIds || customerIds.length === 0) {
      return res.status(400).json({ error: 'לא נבחרו לקוחות' });
    }

    if (!emailTemplate && !whatsappTemplate) {
      return res.status(400).json({ error: 'יש לבחור לפחות תבנית אחת' });
    }

    // 2. קבלת נתוני לקוחות
    const customers = await getCustomersByIds(customerIds);

    // 3. יצירת רשומת קמפיין (אופציונלי)
    const campaign = await createCampaign({
      userId,
      emailTemplate,
      whatsappTemplate,
      emailVariables,
      whatsappVariables,
      customerCount: customers.length,
      status: 'sending'
    });

    // 4. שליחת הודעות
    const results = {
      emailsSent: 0,
      whatsappSent: 0,
      failed: 0
    };

    for (const customer of customers) {
      try {
        // שליחת אימייל
        if (emailTemplate && customer.email && emailVariables) {
          const processedEmailVars = processEmailVariables(emailVariables, customer);
          await sendEmail(customer, emailTemplate, processedEmailVars);
          results.emailsSent++;
          // שמירת לוג (אופציונלי)
          await createCampaignLog(campaign.id, customer.id, 'email', 'sent');
        }

        // שליחת WhatsApp
        // ⚠️ חשוב: whatsappVariables הוא מערך מסודר!
        if (whatsappTemplate && customer.phone && whatsappVariables) {
          const processedWhatsAppVars = processWhatsAppVariables(whatsappVariables, customer);
          await sendWhatsApp(customer, whatsappTemplate, processedWhatsAppVars);
          results.whatsappSent++;
          // שמירת לוג (אופציונלי)
          await createCampaignLog(campaign.id, customer.id, 'whatsapp', 'sent');
        }
      } catch (error) {
        console.error(`Failed to send to customer ${customer.id}:`, error);
        results.failed++;
        // שמירת לוג עם שגיאה
        await createCampaignLog(campaign.id, customer.id, 'email', 'failed', error.message);
      }
    }

    // 5. עדכון סטטוס קמפיין
    await updateCampaign(campaign.id, {
      status: 'completed',
      sentAt: new Date()
    });

    // 6. החזרת תוצאה
    return res.json({
      success: true,
      campaignId: campaign.id,
      stats: {
        totalCustomers: customers.length,
        ...results
      }
    });

  } catch (error) {
    console.error('Campaign send error:', error);
    return res.status(500).json({
      error: 'שגיאה בשליחת קמפיין',
      details: error.message
    });
  }
}
```

---

## 5. דרישות אבטחה והרשאות

- כל ה-endpoints דורשים **authentication**
- רק **מנהלים** יכולים למחוק תבניות
- יש לבצע **rate limiting** על שליחת קמפיינים (למשל: מקסימום 5 קמפיינים לשעה למשתמש)
- יש לוודא ש-**לקוחות בעלי סטטוס 'active' בלבד** יקבלו הודעות (לא לשלוח ללקוחות inactive)

---

## 6. שיפורים מומלצים (אופציונלי)

### Queue System
להשתמש ב-Bull/BullMQ או Celery לשליחה אסינכרונית:
```javascript
// במקום לשלוח ישירות, הוסף לתור
await campaignQueue.add('send-campaign', {
  campaignId: campaign.id,
  customers,
  emailTemplate,
  whatsappTemplate,
  variables
});
```

### Webhooks מ-SendPulse
ליצור endpoint לקבלת עדכונים על סטטוס הודעות:
```javascript
POST /webhooks/sendpulse
// עדכון סטטוס בטבלת campaign_logs
```

### טיוטות קמפיינים
אפשרות לשמור קמפיין כטיוטה לפני שליחה:
```javascript
POST /campaigns/draft
GET /campaigns/drafts
PUT /campaigns/:id/send
```

---

## 7. עיבוד משתנים - דוגמאות מפורטות

### דוגמת פונקציה לעיבוד משתנים אימייל:

```javascript
function processEmailVariables(emailVariables, customer) {
  if (!emailVariables) return {};

  const processed = {};

  for (const [key, value] of Object.entries(emailVariables)) {
    // החלף {{customer.xxx}} בערך האמיתי
    let processedValue = value;

    processedValue = processedValue.replace(/\{\{customer\.name\}\}/g, customer.name || '');
    processedValue = processedValue.replace(/\{\{customer\.email\}\}/g, customer.email || '');
    processedValue = processedValue.replace(/\{\{customer\.phone\}\}/g, customer.phone || '');

    // ניתן להוסיף עוד replacements לפי הצורך

    processed[key] = processedValue;
  }

  return processed;
}

// דוגמת שימוש:
const emailVariables = {
  firstName: "{{customer.name}}",
  userEmail: "{{customer.email}}",
  eventDate: "15/01/2024"
};

const customer = {
  name: "יוסי כהן",
  email: "yossi@example.com",
  phone: "050-1234567"
};

const result = processEmailVariables(emailVariables, customer);
// result = {
//   firstName: "יוסי כהן",
//   userEmail: "yossi@example.com",
//   eventDate: "15/01/2024"
// }
```

### דוגמת פונקציה לעיבוד משתנים וואטסאפ:

```javascript
function processWhatsAppVariables(whatsappVariables, customer) {
  if (!whatsappVariables || !Array.isArray(whatsappVariables)) return [];

  return whatsappVariables.map(value => {
    let processedValue = value;

    // החלף {{customer.xxx}} בערך האמיתי
    processedValue = processedValue.replace(/\{\{customer\.name\}\}/g, customer.name || '');
    processedValue = processedValue.replace(/\{\{customer\.email\}\}/g, customer.email || '');
    processedValue = processedValue.replace(/\{\{customer\.phone\}\}/g, customer.phone || '');

    return processedValue;
  });
}

// דוגמת שימוש:
const whatsappVariables = [
  "{{customer.name}}",      // {{1}} בתבנית
  "15/01/2024",             // {{2}} בתבנית
  "20:00",                  // {{3}} בתבנית
  "{{customer.phone}}"      // {{4}} בתבנית
];

const customer = {
  name: "יוסי כהן",
  email: "yossi@example.com",
  phone: "050-1234567"
};

const result = processWhatsAppVariables(whatsappVariables, customer);
// result = [
//   "יוסי כהן",    // ישלח כ-{{1}}
//   "15/01/2024",   // ישלח כ-{{2}}
//   "20:00",        // ישלח כ-{{3}}
//   "050-1234567"   // ישלח כ-{{4}}
// ]
```

### דוגמת תבנית וואטסאפ ב-SendPulse:

```
שלום {{1}},
מזמינים אותך לוובינר בתאריך {{2}} בשעה {{3}}.
לפרטים נוספים צור קשר: {{4}}
```

אחרי עיבוד עם המערך `["יוסי כהן", "15/01/2024", "20:00", "050-1234567"]`:

```
שלום יוסי כהן,
מזמינים אותך לוובינר בתאריך 15/01/2024 בשעה 20:00.
לפרטים נוספים צור קשר: 050-1234567
```

---

## 8. טיפים נוספים

### משתנים נפוצים שכדאי לתמוך בהם:
- `{{customer.name}}` - שם הלקוח
- `{{customer.email}}` - אימייל הלקוח
- `{{customer.phone}}` - טלפון הלקוח
- `{{customer.firstName}}` - שם פרטי (אם יש split)
- `{{customer.lastName}}` - שם משפחה
- כל משתנה custom שהמשתמש מגדיר

### Error Handling
- אם לקוח לא מכיל email - דלג על שליחת אימייל אבל שלח WhatsApp
- אם לקוח לא מכיל phone - דלג על שליחת WhatsApp אבל שלח אימייל
- שמור לוגים מפורטים לצורך debugging

### Performance
- שלח הודעות ב-batches (למשל 50 בכל פעם) כדי לא לעמוס על ה-API
- השתמש ב-Promise.all() לשליחה מקבילית (אבל שמור על rate limits)

---

## 8. דוגמת Response מה-Frontend

כאשר המשתמש שולח קמפיין, הוא יקבל:
```json
{
  "success": true,
  "campaignId": "abc-123",
  "stats": {
    "totalCustomers": 50,
    "emailsSent": 45,
    "whatsappSent": 48,
    "failed": 2
  }
}
```

במקרה של שגיאה:
```json
{
  "error": "שגיאה בשליחת קמפיין",
  "details": "SendPulse API returned 429 Too Many Requests"
}
```

---

## 9. Testing המערכת

### בדיקות מומלצות:
1. **שליחת קמפיין אימייל בלבד** - וודא שרק אימיילים נשלחים
2. **שליחת קמפיין WhatsApp בלבד** - וודא שרק WhatsApp נשלח
3. **שליחה משולבת** - אימייל + WhatsApp יחד
4. **לקוחות ללא אימייל/טלפון** - המערכת לא תקרוס
5. **משתנים** - וודא שהמשתנים מוחלפים נכון
6. **תבניות שלא קיימות ב-SendPulse** - טיפול בשגיאה

---

## קישורים שימושיים

- [SendPulse API Documentation](https://sendpulse.com/integrations/api)
- [SendPulse SMTP API](https://sendpulse.com/integrations/api/smtp)
- [SendPulse WhatsApp API](https://sendpulse.com/integrations/api/whatsapp)

---

**הערה חשובה:** קובץ זה מכיל המלצות והנחיות. יש להתאים את המימוש לארכיטקטורה הספציפית של הפרויקט שלך (Node.js/Python/Go וכו').
