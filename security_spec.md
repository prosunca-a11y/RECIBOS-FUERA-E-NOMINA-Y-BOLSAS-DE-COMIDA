# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Any path not explicitly matched in `/companies/{companyId}`, `/employees/{employeeId}`, `/receipts/{receiptId}`, `/invoices/{invoiceId}`, or `/cloud_files/{fileId}` is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Invariant**: All write operations (`create`, `update`, `delete`) require an authenticated user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
3. **Strict Ownership Invariant**: Every document in `/companies`, `/employees`, `/receipts`, `/invoices`, and `/cloud_files` is strictly isolated to its owner (`ownerId == request.auth.uid`). No blanket reads (`allow read: if isSignedIn()`) are permitted; `get` and `list` explicitly enforce `resource.data.ownerId == request.auth.uid`.
4. **Path Variable Hardening**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates the document ID against `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, length 1..128) and verifies that the document's internal ID field matches the path variable.
5. **Anti-Update-Gap & Immutable Fields**: Every `create` and `update` invokes `isValid[Entity](incoming())`, enforcing exact key allowlists (`hasAll` and `hasOnly`), string `.size()` bounds, numeric bounds, and immutability of `ownerId`, the primary ID field, and `createdAt`.
6. **Temporal Integrity**: On `create`, `incoming().createdAt == request.time && incoming().updatedAt == request.time`. On `update`, `incoming().createdAt == existing().createdAt && incoming().updatedAt == request.time`.

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection**: Creating a `CompanyDoc` with an extra field `isAdmin: true`. Rejected by `data.keys().hasOnly(...)`.
2. **Identity Spoofing on Create**: Creating a `ReceiptDoc` where `ownerId: "victim-uid"` while authenticated as `"attacker-uid"`. Rejected by `data.ownerId == request.auth.uid`.
3. **Unverified Email Write**: Attempting `create` on `/cloud_files/file-1` with `request.auth.token.email_verified == false`. Rejected by `isVerifiedUser()`.
4. **Ownership Hijack on Update**: Updating `ownerId` on an existing `EmployeeDoc` to transfer ownership. Rejected by `incoming().ownerId == existing().ownerId` and `affectedKeys().hasOnly(...)`.
5. **Timestamp Forgery on Create**: Providing a past client timestamp for `createdAt` instead of `request.time`. Rejected by `incoming().createdAt == request.time`.
6. **Immutable Timestamp Mutation**: Modifying `createdAt` during an `update` on `/receipts/{receiptId}`. Rejected by `incoming().createdAt == existing().createdAt`.
7. **Denial-of-Wallet Oversized Payload**: Sending a 2MB string in `CloudFileDoc.dataUrl` (exceeding `size() <= 900000`). Rejected by `data.dataUrl.size() <= 900000`.
8. **ID Poisoning Attack**: Creating a document with path ID containing spaces or special characters (`../admin`). Rejected by `isValidId(id)`.
9. **Path-to-Body ID Mismatch**: Creating `/companies/comp-1` with body `companyId: "comp-2"`. Rejected by `incoming().companyId == companyId`.
10. **Cross-Tenant PII Read (`get`)**: Authenticated user `"user-b"` attempting `get` on `/employees/emp-1` owned by `"user-a"`. Rejected by `existing().ownerId == request.auth.uid`.
11. **Unfiltered Collection Scraping (`list`)**: Authenticated user executing an unconstrained `list` query on `/receipts` without `where('ownerId', '==', request.auth.uid)`. Rejected by `resource.data.ownerId == request.auth.uid`.
12. **Value Poisoning on Update**: Updating `tasaBCV` on `/companies/comp-1` with a negative number or string. Rejected by `isValidCompany(incoming())` wrapping the `update` rule.

## 3. The Test Runner (`firestore.rules.test.ts` specification)

All 12 adversarial payloads above are asserted to return `PERMISSION_DENIED` when evaluated against `firestore.rules`.
