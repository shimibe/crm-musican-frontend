# 🔴 דחוף - תיקון Routing Error

## הבעיה
השגיאה:
```
Get campaign error: error: invalid input syntax for type uuid: "last-variables"
```

## הסיבה
ב-Express, נתיבים נבדקים לפי סדר. אם הקוד נראה כך:

```javascript
// ❌ סדר שגוי
app.get('/campaigns/:id', getCampaignById);           // זה תופס הכל
app.get('/campaigns/last-variables', getLastVariables); // לעולם לא יגיע לכאן
app.get('/campaigns/send-test', sendTest);              // לעולם לא יגיע לכאן
```

אז "last-variables" נתפס כ-`:id` והשרת מנסה לפרסר אותו כ-UUID.

## הפתרון

### אפשרות 1: לשנות סדר הנתיבים (מומלץ)
```javascript
// ✅ סדר נכון - נתיבים ספציפיים לפני נתיבים כלליים
app.get('/campaigns/last-variables', getLastVariables);
app.get('/campaigns/send-test', sendTest);
app.get('/campaigns/:id/details', getCampaignDetails);
app.get('/campaigns/:id/failed-customers', getFailedCustomers);
app.get('/campaigns/:id', getCampaignById);          // כללי - אחרון
app.get('/campaigns', getCampaigns);
```

**חוקי סדר חשובים:**
1. נתיבים בלי פרמטרים (כמו `/campaigns/last-variables`) - ראשונים
2. נתיבים עם פרמטרים וסיומת (כמו `/campaigns/:id/details`) - באמצע
3. נתיבים עם פרמטר בלבד (כמו `/campaigns/:id`) - אחרונים
4. הנתיב הכללי ביותר (כמו `/campaigns`) - אחרון מכולם

### אפשרות 2: להוסיף בדיקת UUID
```javascript
app.get('/campaigns/:id', (req, res, next) => {
  const { id } = req.params;

  // אם זה לא UUID, תעביר הלאה
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return next(); // תעביר לנתיב הבא
  }

  getCampaignById(req, res);
});
```

### אפשרות 3: לשנות את הנתיב ב-Frontend
אם אי אפשר לשנות את ה-Backend, אפשר לשנות את הקריאה ל:
```javascript
// במקום:
api.get('/campaigns/last-variables', { params: { type, template } })

// להשתמש ב:
api.get('/campaigns-variables/last', { params: { type, template } })
```

## המלצה
**אפשרות 1 היא הטובה ביותר** - סדר נכון של נתיבים הוא best practice ומונע בעיות עתידיות.

## סדר מלא מומלץ לכל נתיבי הקמפיינים

```javascript
const express = require('express');
const router = express.Router();

// 1. נתיבים ספציפיים בלי פרמטרים
router.get('/campaigns/last-variables', getLastVariables);
router.post('/campaigns/send', sendCampaign);
router.post('/campaigns/send-test', sendTestCampaign);

// 2. נתיבים עם פרמטרים וסיומת ספציפית
router.get('/campaigns/:id/details', getCampaignDetails);
router.get('/campaigns/:id/failed-customers', getFailedCustomers);

// 3. נתיב עם פרמטר בלבד
router.get('/campaigns/:id', getCampaignById);

// 4. נתיב כללי
router.get('/campaigns', getCampaigns);

module.exports = router;
```

## בדיקה
לאחר התיקון, בדוק:
```bash
curl http://localhost:3000/campaigns/last-variables?type=email&template=test
```

צריך לחזור עם משתנים ולא עם שגיאת UUID.
