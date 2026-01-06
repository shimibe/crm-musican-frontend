# דרישות Backend סופיות - מערכת קמפיינים

## סיכום כל ה-API Endpoints הנדרשים

### 1. ✅ קיים - שליחת קמפיין
```
POST /campaigns/send
```

**Request Body שעודכן:**
```json
{
  "customerIds": ["uuid1", "uuid2"],
  "emailTemplate": "template-name",
  "emailSubject": "נושא האימייל - חובה!",
  "whatsappTemplate": "template-name",
  "emailVariables": {
    "firstName": "{{customer.name}}",
    "eventDate": "15/01/2024"
  },
  "whatsappVariables": [
    "{{customer.name}}",
    "15/01/2024",
    "20:00"
  ]
}
```

**Response מעודכן:**
```json
{
  "success": true,
  "campaignId": "uuid",
  "stats": {
    "totalCustomers": 50,
    "emailsSent": 45,
    "whatsappSent": 48,
    "failed": 2
  }
}
```

**Validation:**
- אם יש `emailTemplate` - `emailSubject` הוא חובה!
```javascript
if (emailTemplate && !emailSubject) {
  return res.status(400).json({ error: 'נושא האימייל הוא שדה חובה' });
}
```

**שינויים בשמירה:**
```javascript
await createCampaign({
  userId,
  emailTemplate,
  emailSubject,  // 🆕 חדש
  whatsappTemplate,
  emailVariables,
  whatsappVariables,
  customerCount: customers.length,
  emailsSent: 0,      // 🆕 חדש
  whatsappSent: 0,    // 🆕 חדש
  failedCount: 0,     // 🆕 חדש
  status: 'sending'
});

// לאחר שליחה - עדכן:
await updateCampaign(campaign.id, {
  emailsSent: results.emailsSent,
  whatsappSent: results.whatsappSent,
  failedCount: results.failed,
  status: 'completed'
});
```

---

### 2. 🆕 חדש - היסטוריית קמפיינים
```
GET /campaigns
```

**Response:**
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "email_template": "webinar-invite",
      "email_subject": "הזמנה לוובינר",
      "whatsapp_template": "reminder",
      "email_variables": {"firstName": "..."},
      "whatsapp_variables": ["...", "..."],
      "customer_count": 50,
      "emails_sent": 45,
      "whatsapp_sent": 48,
      "failed_count": 2,
      "status": "completed",
      "created_at": "2024-01-15T10:00:00Z",
      "sent_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

**SQL:**
```sql
SELECT * FROM campaigns
WHERE user_id = ?  -- או כל המשתמשים אם אדמין
ORDER BY created_at DESC
LIMIT 100
```

---

### 3. 🆕 חדש - לקוחות שנכשלו
```
GET /campaigns/:id/failed-customers
```

**Response:**
```json
{
  "customers": [
    {
      "id": "uuid",
      "name": "יוסי כהן",
      "email": "yossi@example.com",
      "phone": "050-1234567",
      "error": "Invalid email address"
    }
  ]
}
```

**SQL:**
```sql
SELECT
  c.id,
  c.name,
  c.email,
  c.phone,
  cl.error_message as error
FROM customers c
JOIN campaign_logs cl ON c.id = cl.customer_id
WHERE cl.campaign_id = ? AND cl.status = 'failed'
```

---

### 4. 🆕 חדש - טעינת משתנים מקמפיין אחרון
```
GET /campaigns/last-variables?type=email&template=webinar-invite
```

**Response:**
```json
{
  "campaign": {
    "email_subject": "הזמנה לוובינר - כלים חדשים",
    "email_variables": {
      "firstName": "{{customer.name}}",
      "eventDate": "15/01/2024"
    },
    "whatsapp_variables": [
      "{{customer.name}}",
      "15/01/2024",
      "20:00"
    ]
  }
}
```

**או אם אין קמפיין קודם:**
```json
{
  "campaign": null
}
```

**SQL:**
```sql
SELECT
  email_subject,
  email_variables,
  whatsapp_variables
FROM campaigns
WHERE
  (
    (? = 'email' AND email_template = ?)
    OR
    (? = 'whatsapp' AND whatsapp_template = ?)
  )
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 1
```

**דוגמה:**
```javascript
async function getLastCampaignVariables(req, res) {
  const { type, template } = req.query;

  try {
    let campaign;

    if (type === 'email') {
      campaign = await db.query(
        'SELECT email_subject, email_variables FROM campaigns WHERE email_template = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
        [template, 'completed']
      );
    } else {
      campaign = await db.query(
        'SELECT whatsapp_variables FROM campaigns WHERE whatsapp_template = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
        [template, 'completed']
      );
    }

    return res.json({
      campaign: campaign ? campaign : null
    });
  } catch (error) {
    console.error('Error fetching last campaign variables:', error);
    return res.status(500).json({ error: 'שגיאה בטעינת משתנים' });
  }
}
```

---

### 5. 🆕 חדש - שליחת קמפיין ניסיון (לאדמין)
```
POST /campaigns/send-test
```

**Request Body:**
```json
{
  "emailTemplate": "webinar-invite",
  "emailSubject": "נושא האימייל",
  "whatsappTemplate": "reminder",
  "emailVariables": {...},
  "whatsappVariables": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "קמפיין ניסיון נשלח",
  "stats": {
    "emailsSent": 1,
    "whatsappSent": 1,
    "failed": 0
  }
}
```

**Implementation:**
```javascript
async function sendTestCampaignHandler(req, res) {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId);

    // ודא שיש אימייל/טלפון
    if (!user.email && !user.phone) {
      return res.status(400).json({
        error: 'למשתמש שלך אין אימייל או טלפון מוגדרים'
      });
    }

    // צור "לקוח" מהמשתמש
    const testCustomer = {
      id: user.id,
      name: user.fullName || user.username,
      email: user.email,
      phone: user.phone
    };

    const results = {
      emailsSent: 0,
      whatsappSent: 0,
      failed: 0
    };

    // שלח אימייל אם יש
    if (req.body.emailTemplate && user.email) {
      try {
        const processedEmailVars = processEmailVariables(
          req.body.emailVariables,
          testCustomer
        );
        await sendEmail(
          testCustomer,
          req.body.emailTemplate,
          req.body.emailSubject,
          processedEmailVars
        );
        results.emailsSent = 1;
      } catch (error) {
        console.error('Test email failed:', error);
        results.failed++;
      }
    }

    // שלח וואטסאפ אם יש
    if (req.body.whatsappTemplate && user.phone) {
      try {
        const processedWhatsAppVars = processWhatsAppVariables(
          req.body.whatsappVariables,
          testCustomer
        );
        await sendWhatsApp(
          testCustomer,
          req.body.whatsappTemplate,
          processedWhatsAppVars
        );
        results.whatsappSent = 1;
      } catch (error) {
        console.error('Test WhatsApp failed:', error);
        results.failed++;
      }
    }

    return res.json({
      success: true,
      message: 'קמפיין ניסיון נשלח',
      stats: results
    });
  } catch (error) {
    console.error('Test campaign error:', error);
    return res.status(500).json({ error: 'שגיאה בשליחת קמפיין ניסיון' });
  }
}
```

---

## עדכוני טבלאות נדרשים

### טבלת `campaigns`

```sql
-- הוסף עמודות חדשות:
ALTER TABLE campaigns ADD COLUMN email_subject TEXT;
ALTER TABLE campaigns ADD COLUMN emails_sent INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN whatsapp_sent INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN failed_count INTEGER DEFAULT 0;

-- אם עדיין לא עשית - שנה variables לשני שדות:
ALTER TABLE campaigns RENAME COLUMN variables TO email_variables;
ALTER TABLE campaigns ADD COLUMN whatsapp_variables JSONB;
```

**מבנה מלא:**
```sql
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  email_template VARCHAR(255),
  email_subject TEXT,              -- 🆕
  whatsapp_template VARCHAR(255),
  email_variables JSONB,            -- אובייקט
  whatsapp_variables JSONB,         -- מערך
  customer_count INTEGER,
  emails_sent INTEGER DEFAULT 0,    -- 🆕
  whatsapp_sent INTEGER DEFAULT 0,  -- 🆕
  failed_count INTEGER DEFAULT 0,   -- 🆕
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## שיפורים מומלצים

### 1. Delay בין הודעות (חשוב!)
```javascript
for (const customer of customers) {
  try {
    if (emailTemplate && customer.email) {
      await sendEmail(customer, emailTemplate, emailSubject, emailVars);
      results.emailsSent++;
    }

    if (whatsappTemplate && customer.phone) {
      await sendWhatsApp(customer, whatsappTemplate, whatsappVars);
      results.whatsappSent++;
    }

    // ⚠️ חשוב: DELAY למניעת spam/block
    await new Promise(resolve => setTimeout(resolve, 200)); // 200ms
  } catch (error) {
    results.failed++;
    await createCampaignLog(campaign.id, customer.id, 'failed', error.message);
  }
}
```

### 2. שמירת logs מפורטים
וודא ש-`campaign_logs` נשמר עבור כל שליחה:

```javascript
// הצלחה:
await createCampaignLog(campaign.id, customer.id, 'email', 'sent');

// כשלון:
await createCampaignLog(campaign.id, customer.id, 'email', 'failed', error.message);
```

---

## סיכום Routes

```javascript
// routes/campaigns.js
router.get('/campaigns', authMiddleware, getCampaigns);
router.get('/campaigns/last-variables', authMiddleware, getLastCampaignVariables);
router.get('/campaigns/:id/failed-customers', authMiddleware, getFailedCustomers);
router.post('/campaigns/send', authMiddleware, sendCampaign);
router.post('/campaigns/send-test', authMiddleware, sendTestCampaign);
```

---

## טיפים לדיבוג

1. **לוג כל שליחה:** שמור logs מפורטים כדי לדעת מה נכשל
2. **בדוק SendPulse limits:** יש להם rate limits
3. **טפל בשגיאות:** אם SendPulse מחזיר 429 - המתן וחזור
4. **ולידציות:** בדוק שלקוח יש לו אימייל/טלפון לפני שליחה

---

זהו! כל ה-endpoints מפורטים עם דוגמאות קוד מלאות.
