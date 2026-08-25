-- SCH-01: Add SchoolConfig table for database-backed school configuration.
-- Replaces fs.writeFileSync on src/data/school.json (silently fails on Vercel).
--
-- Single-row pattern: one record with id='singleton'.
-- Seeds the initial row from the content of src/data/school.json (values known
-- at migration time). On first GET after deployment, the API upserts from the
-- JSON fallback if the row is absent.

CREATE TABLE IF NOT EXISTS "SchoolConfig" (
  "id"        TEXT        NOT NULL DEFAULT 'singleton',
  "data"      JSONB       NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "SchoolConfig_pkey" PRIMARY KEY ("id")
);

-- Seed with the current school.json values so existing deployments work immediately.
-- If the row already exists (re-run safety), do nothing.
INSERT INTO "SchoolConfig" ("id", "data", "updatedAt")
VALUES (
  'singleton',
  '{
    "name": "St. GNG School",
    "address": "Salarpur, Rasulgarh, Varanasi - 221007",
    "phone": "9452824318",
    "alternatePhone": "9452824318",
    "whatsappNumber": "9452824318",
    "schoolTimings": "8:00 AM - 1:30 PM (Mon - Sat)",
    "admissionSession": "2026-2027",
    "admissionStatus": "OPEN",
    "admissionClasses": "Nursery to 8th",
    "marqueeText": "Admissions Open for Session 2026-2027 (Nursery to Class 8th) \u2022 Limited Seats Available \u2022 Call: 9452824318 \u2022 Office Hours: 8:00 AM - 1:30 PM",
    "googleMapsUrl": "https://maps.google.com/?q=St+GNG+School+Salarpur+Rasulgarh+Varanasi",
    "youtubeUrl": "https://www.youtube.com/@stgngschool",
    "facebookUrl": "",
    "instagramUrl": "",
    "email": "stgng2005@gmail.com",
    "udiseCode": "09670707502",
    "upiId": "8423926608@upi",
    "upiMerchantName": "St. GNG School",
    "enableTransport": false,
    "enableLateFee": false,
    "lateFeeGraceDays": 10,
    "lateFeeAmount": 50,
    "lateFeeType": "FLAT",
    "exams": ["Unit-1", "Half Yearly", "Unit-2", "Annual"],
    "examConfig": {
      "Unit-1":      { "isSplit": true,  "maxMarks": 20, "components": [{"name":"Note Book","max":5},{"name":"Sub. Enrich.","max":5},{"name":"Pr. Act.","max":10}] },
      "Half Yearly": { "isSplit": false, "maxMarks": 80 },
      "Unit-2":      { "isSplit": true,  "maxMarks": 20, "components": [{"name":"Note Book","max":5},{"name":"Sub. Enrich.","max":5},{"name":"Pr. Act.","max":10}] },
      "Annual":      { "isSplit": false, "maxMarks": 80 }
    }
  }',
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
