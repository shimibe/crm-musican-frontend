# עדכון דחוף - שינוי מבנה המשתנים בקמפיינים

## מה השתנה?

ה-Frontend עודכן לתמוך בהבדל בין משתנים של **אימייל** ל**וואטסאפ**.

**הסיבה:** בוואטסאפ של SendPulse, הסדר של המשתנים הוא קריטי! המערכת משתמשת ב-{{1}}, {{2}}, {{3}} ולא בשמות משתנים.

---

## שינויים נדרשים בקוד

### 1. עדכון טבלת `campaigns`

**לפני:**
```sql
variables JSONB
```

**אחרי:**
```sql
email_variables JSONB,     -- אובייקט: {"firstName": "...", "date": "..."}
whatsapp_variables JSONB   -- מערך: ["value1", "value2", "value3"]
```

**SQL לעדכון:**
```sql
ALTER TABLE campaigns RENAME COLUMN variables TO email_variables;
ALTER TABLE campaigns ADD COLUMN whatsapp_variables JSONB;
```

או אם אתה רוצה migration נקי:
```sql
ALTER TABLE campaigns DROP COLUMN variables;
ALTER TABLE campaigns ADD COLUMN email_variables JSONB;
ALTER TABLE campaigns ADD COLUMN whatsapp_variables JSONB;
```

---

### 2. עדכון endpoint `POST /campaigns/send`

#### Request Body - לפני:
```json
{
  "customerIds": ["uuid1", "uuid2"],
  "emailTemplate": "template-name",
  "whatsappTemplate": "template-name",
  "variables": {
    "firstName": "{{customer.name}}",
    "eventDate": "15/01/2024"
  }
}
```

#### Request Body - אחרי:
```json
{
  "customerIds": ["uuid1", "uuid2"],
  "emailTemplate": "template-name",
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

#### שינוי בקוד:

**לפני:**
```javascript
const { customerIds, emailTemplate, whatsappTemplate, variables } = req.body;
```

**אחרי:**
```javascript
const { customerIds, emailTemplate, whatsappTemplate, emailVariables, whatsappVariables } = req.body;
```

---

### 3. פונקציית עיבוד משתנים

צריך **שתי פונקציות נפרדות**:

#### פונקציה 1: עיבוד משתנים לאימייל (אובייקט)
```javascript
function processEmailVariables(emailVariables, customer) {
  if (!emailVariables) return {};

  const processed = {};
  for (const [key, value] of Object.entries(emailVariables)) {
    let processedValue = value;
    processedValue = processedValue.replace(/\{\{customer\.name\}\}/g, customer.name || '');
    processedValue = processedValue.replace(/\{\{customer\.email\}\}/g, customer.email || '');
    processedValue = processedValue.replace(/\{\{customer\.phone\}\}/g, customer.phone || '');
    processed[key] = processedValue;
  }
  return processed;
}
```

#### פונקציה 2: עיבוד משתנים לוואטסאפ (מערך - שומר סדר!)
```javascript
function processWhatsAppVariables(whatsappVariables, customer) {
  if (!whatsappVariables || !Array.isArray(whatsappVariables)) return [];

  return whatsappVariables.map(value => {
    let processedValue = value;
    processedValue = processedValue.replace(/\{\{customer\.name\}\}/g, customer.name || '');
    processedValue = processedValue.replace(/\{\{customer\.email\}\}/g, customer.email || '');
    processedValue = processedValue.replace(/\{\{customer\.phone\}\}/g, customer.phone || '');
    return processedValue;
  });
}
```

⚠️ **חשוב:** הפונקציה לוואטסאפ חייבת להחזיר מערך באותו סדר!

---

### 4. עדכון לוגיקת השליחה

**לפני:**
```javascript
for (const customer of customers) {
  if (emailTemplate && customer.email) {
    await sendEmail(customer, emailTemplate, variables);
  }
  if (whatsappTemplate && customer.phone) {
    await sendWhatsApp(customer, whatsappTemplate, variables);
  }
}
```

**אחרי:**
```javascript
for (const customer of customers) {
  // אימייל - עם אובייקט
  if (emailTemplate && customer.email && emailVariables) {
    const processedEmailVars = processEmailVariables(emailVariables, customer);
    await sendEmail(customer, emailTemplate, processedEmailVars);
  }

  // וואטסאפ - עם מערך מסודר!
  if (whatsappTemplate && customer.phone && whatsappVariables) {
    const processedWhatsAppVars = processWhatsAppVariables(whatsappVariables, customer);
    await sendWhatsApp(customer, whatsappTemplate, processedWhatsAppVars);
  }
}
```

---

### 5. שליחה ל-SendPulse API

#### אימייל (ללא שינוי):
```javascript
await fetch('https://api.sendpulse.com/smtp/emails', {
  method: 'POST',
  body: JSON.stringify({
    email: {
      template: {
        id: templateId,
        variables: processedEmailVars  // אובייקט: { firstName: "...", ... }
      }
    }
  })
});
```

#### וואטסאפ (עכשיו עם מערך):
```javascript
await fetch('https://api.sendpulse.com/whatsapp/messages', {
  method: 'POST',
  body: JSON.stringify({
    phone: customer.phone,
    template: templateName,
    variables: processedWhatsAppVars  // מערך: ["value1", "value2", "value3"]
    // SendPulse ימפה ל: {{1}}, {{2}}, {{3}} לפי הסדר
  })
});
```

---

### 6. עדכון שמירת קמפיין

**לפני:**
```javascript
const campaign = await createCampaign({
  userId,
  emailTemplate,
  whatsappTemplate,
  variables,
  customerCount: customers.length,
  status: 'sending'
});
```

**אחרי:**
```javascript
const campaign = await createCampaign({
  userId,
  emailTemplate,
  whatsappTemplate,
  emailVariables,      // אובייקט
  whatsappVariables,   // מערך
  customerCount: customers.length,
  status: 'sending'
});
```

---

## דוגמה מלאה

### Frontend שולח:
```json
{
  "customerIds": ["uuid-123"],
  "whatsappTemplate": "webinar-invite",
  "whatsappVariables": [
    "{{customer.name}}",
    "15/01/2024",
    "20:00"
  ]
}
```

### Backend מעבד:
```javascript
const customer = { name: "יוסי כהן", phone: "050-1234567" };
const processed = processWhatsAppVariables(whatsappVariables, customer);
// תוצאה: ["יוסי כהן", "15/01/2024", "20:00"]
```

### נשלח ל-SendPulse:
```json
{
  "phone": "050-1234567",
  "template": "webinar-invite",
  "variables": ["יוסי כהן", "15/01/2024", "20:00"]
}
```

### תבנית ב-SendPulse:
```
שלום {{1}},
מזמינים אותך לוובינר בתאריך {{2}} בשעה {{3}}
```

### התוצאה ללקוח:
```
שלום יוסי כהן,
מזמינים אותך לוובינר בתאריך 15/01/2024 בשעה 20:00
```

---

## סיכום מהיר

| לפני | אחרי |
|------|------|
| `variables` (אובייקט בלבד) | `emailVariables` (אובייקט) + `whatsappVariables` (מערך) |
| אותה פונקציה לשניהם | `processEmailVariables()` + `processWhatsAppVariables()` |
| וואטסאפ קיבל אובייקט | וואטסאפ מקבל מערך מסודר |

---

## ⚠️ נקודות קריטיות

1. **אל תשנה את הסדר** של המערך ב-`whatsappVariables`!
2. הפונקציה `processWhatsAppVariables` חייבת להחזיר **מערך** ולא אובייקט
3. הסדר של המערך נשמר במדויק - האיבר הראשון הוא {{1}}, השני {{2}}, וכו'
4. אם אין `whatsappVariables` - דלג על שליחת וואטסאפ
5. אם אין `emailVariables` - דלג על שליחת אימייל

---

זהו! אלו כל השינויים הנדרשים.
