# Mokay Jump — Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **PII Isolation**: User email addresses exist exclusively in `/users/{uid}` and are readable/writable only by the verified owner (`request.auth.uid == uid`). Public gamer cards live in `/publicProfiles/{uid}` and NEVER contain email, phone, or physical address fields.
2. **Identity Integrity**: Every document created by a player enforces that `uid`, `fromUid`, or participant UID matches `request.auth.uid` and `request.auth.token.email_verified == true`.
3. **Referential Integrity**: A `FriendLink` under `/publicProfiles/{uid}/friends/{friendUid}` cannot exist unless both `/publicProfiles/{uid}` and `/publicProfiles/{friendUid}` exist and `friendUid != uid`. A `DuelInvite` cannot target a non-existent profile or `fromUid == toUid`.
4. **Atomic Race Acceptance**: Accepting a `DuelInvite` (`status: 'accepted'`) requires a non-empty `raceId` and `existsAfter(/databases/$(database)/documents/dualRaces/$(incoming().raceId))` in the same atomic batch.
5. **Participant Partitioning & Terminal Locking**: During an active `DualRace`, the host may only update `hostMeters`, `hostX`, `hostAlive`, `status`, `winnerUid`, `updatedAt`, and the guest may only update `guestMeters`, `guestX`, `guestAlive`, `status`, `winnerUid`, `updatedAt`. Once `status == 'finished'`, the race document is permanently immutable.

## 2. The "Dirty Dozen" Attack Payloads
1. **PII Cross-Read (`GET /users/victimUid`)**: Signed-in attacker attempts to read another user's private `/users/{uid}` document containing email. -> **MUST DENY**.
2. **Email Unverified Write (`CREATE /publicProfiles/attackerUid`)**: Caller with `email_verified: false` tries to create a profile. -> **MUST DENY**.
3. **Shadow Field Injection (`CREATE /publicProfiles/attackerUid`)**: Payload adds ghost field `isAdmin: true` or `role: 'admin'`. -> **MUST DENY**.
4. **Identity Spoofing (`CREATE /duelInvites/inv1`)**: Attacker sets `fromUid: 'victimUid'` while authenticated as `attackerUid`. -> **MUST DENY**.
5. **Self-Challenge / Orphan Target (`CREATE /duelInvites/inv2`)**: Payload sets `toUid == fromUid` or references a non-existent `toUid`. -> **MUST DENY**.
6. **ID Poisoning (`CREATE /publicProfiles/<200-char invalid id!>`)**: Document ID exceeds 128 chars or contains invalid characters (`/` or `$` or spaces). -> **MUST DENY**.
7. **Timestamp Forgery (`CREATE /publicProfiles/attackerUid`)**: `createdAt` or `updatedAt` uses a client-fabricated past/future date instead of `request.time`. -> **MUST DENY**.
8. **Immutable Field Mutation (`UPDATE /publicProfiles/attackerUid`)**: Owner changes `createdAt` or `uid` on update. -> **MUST DENY**.
9. **Unauthorized Invite Hijack (`UPDATE /duelInvites/inv1`)**: Sender (`fromUid`) attempts to set `status: 'accepted'` on their own invite instead of the recipient (`toUid`). -> **MUST DENY**.
10. **Non-Atomic Invite Acceptance (`UPDATE /duelInvites/inv1`)**: Recipient marks `status: 'accepted'` without atomically creating `/dualRaces/{raceId}`. -> **MUST DENY**.
11. **Rival Sabotage (`UPDATE /dualRaces/race1`)**: Host tries to overwrite `guestMeters` or `guestAlive: false` in the same race. -> **MUST DENY**.
12. **Terminal State Replay (`UPDATE /dualRaces/race1`)**: A participant tries to modify `winnerUid` or `status` after `existing().status == 'finished'`. -> **MUST DENY**.

## 3. Verification Runner
See `/firestore.rules.test.ts` for the automated emulator test suite asserting `PERMISSION_DENIED` on all 12 Dirty Dozen payloads and valid behavior for legitimate operations.
