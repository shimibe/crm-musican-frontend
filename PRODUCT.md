# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Internal team at a music school/studio business — employees (teachers, technicians), managers, admins, and freelancers. Used daily in-office and remotely on desktop. Hebrew is the primary language.

## Product Purpose

CRM for managing customers, tasks, repairs, sales, attendance, studio billing, and freelance projects at a music-related business. Success means staff can quickly find a customer, update a task or repair, check their shift status, and see their sales — all in one place.

## Positioning

A private internal CRM built specifically for this music business's workflows. The differentiation is tight fit: it knows about repairs by type, studio billing sessions, freelancer attendance, and WhatsApp/email campaigns — all in Hebrew.

## Operating Context

Used from office desks and sometimes mobile. Dark mode is a real need (studio environments can be dim). RTL Hebrew throughout. Multiple roles: admin, manager, employee, freelancer.

## Capabilities and Constraints

- React 19 + Tailwind CSS 3 + React Router v7
- RTL (`direction: rtl` global)
- Class-based dark mode via `DarkModeContext`
- JWT auth via `AuthContext`
- No Redux — Context API only
- Primary color token in tailwind.config.js (`primary`) drives most brand color usage
- All business logic in pages/components must remain untouched

## Brand Commitments

- Name: CRM Musican
- Language: Hebrew (RTL)
- No external brand identity constraints established

## Product Principles

1. Speed over decoration — employees need data fast, not a show.
2. Hebrew-native — every affordance assumes RTL and Israeli conventions.
3. Role-appropriate — admins, workers, and freelancers each see only what they need.
