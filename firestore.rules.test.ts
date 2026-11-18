/**
 * Firestore Security Rules Verification Suite (Dirty Dozen + Legitimate Flows)
 * Run against Firebase Firestore Emulator with @firebase/rules-unit-testing when emulators are active.
 */
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

export async function runDirtyDozenSuite() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'gen-lang-client-0661245171',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  const alice = testEnv.authenticatedContext('alice_uid', {
    email: 'alice@example.com',
    email_verified: true,
  });
  const bob = testEnv.authenticatedContext('bob_uid', {
    email: 'bob@example.com',
    email_verified: true,
  });
  const unverified = testEnv.authenticatedContext('unverified_uid', {
    email: 'unverified@example.com',
    email_verified: false,
  });

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', 'alice_uid'), {
      uid: 'alice_uid',
      email: 'alice@example.com',
      displayName: 'Alice',
      photoURL: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'publicProfiles', 'alice_uid'), {
      uid: 'alice_uid',
      displayName: 'Alice',
      searchName: 'alice',
      photoURL: '',
      petId: 'mokay-fosforo',
      petXp: 100,
      clanTag: 'CHISPA',
      elo: 1200,
      wins: 1,
      losses: 0,
      bestMeters: 420,
      styleRank: 'Novato del Barrio',
      online: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'publicProfiles', 'bob_uid'), {
      uid: 'bob_uid',
      displayName: 'Bob',
      searchName: 'bob',
      photoURL: '',
      petId: 'street-dino',
      petXp: 120,
      clanTag: 'FLOW',
      elo: 1250,
      wins: 2,
      losses: 1,
      bestMeters: 510,
      styleRank: 'Estilo Fresco',
      online: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  const bobDb = bob.firestore();
  const aliceDb = alice.firestore();
  const unverifiedDb = unverified.firestore();

  // 1. PII Cross-Read
  await assertFails(getDoc(doc(bobDb, 'users', 'alice_uid')));

  // 2. Email Unverified Write
  await assertFails(
    setDoc(doc(unverifiedDb, 'publicProfiles', 'unverified_uid'), {
      uid: 'unverified_uid',
      displayName: 'Anon',
      searchName: 'anon',
      photoURL: '',
      petId: 'mokay-fosforo',
      petXp: 0,
      clanTag: 'CHISPA',
      elo: 1000,
      wins: 0,
      losses: 0,
      bestMeters: 0,
      styleRank: 'Novato del Barrio',
      online: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 3. Shadow Field Injection
  await assertFails(
    setDoc(doc(aliceDb, 'publicProfiles', 'alice_uid'), {
      uid: 'alice_uid',
      displayName: 'Alice',
      searchName: 'alice',
      photoURL: '',
      petId: 'mokay-fosforo',
      petXp: 100,
      clanTag: 'CHISPA',
      elo: 1200,
      wins: 1,
      losses: 0,
      bestMeters: 420,
      styleRank: 'Novato del Barrio',
      online: true,
      isAdmin: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 4. Identity Spoofing on DuelInvite
  await assertFails(
    setDoc(doc(bobDb, 'duelInvites', 'inv_spoof'), {
      fromUid: 'alice_uid',
      fromName: 'Alice',
      fromPhotoURL: '',
      fromPetId: 'mokay-fosforo',
      fromClanTag: 'CHISPA',
      toUid: 'bob_uid',
      arenaId: 'rhythm-hood',
      status: 'pending',
      raceId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 5. Self-Challenge / Orphan Target
  await assertFails(
    setDoc(doc(aliceDb, 'duelInvites', 'inv_self'), {
      fromUid: 'alice_uid',
      fromName: 'Alice',
      fromPhotoURL: '',
      fromPetId: 'mokay-fosforo',
      fromClanTag: 'CHISPA',
      toUid: 'alice_uid',
      arenaId: 'rhythm-hood',
      status: 'pending',
      raceId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 6. ID Poisoning
  await assertFails(getDoc(doc(aliceDb, 'duelInvites', 'bad$id!with@chars')));

  // 7. Timestamp Forgery
  await assertFails(
    setDoc(doc(aliceDb, 'duelInvites', 'inv_fake_ts'), {
      fromUid: 'alice_uid',
      fromName: 'Alice',
      fromPhotoURL: '',
      fromPetId: 'mokay-fosforo',
      fromClanTag: 'CHISPA',
      toUid: 'bob_uid',
      arenaId: 'rhythm-hood',
      status: 'pending',
      raceId: '',
      createdAt: new Date('2020-01-01T00:00:00Z'),
      updatedAt: serverTimestamp(),
    })
  );

  // 8. Immutable Field Mutation
  await assertFails(
    updateDoc(doc(aliceDb, 'publicProfiles', 'alice_uid'), {
      uid: 'bob_uid',
      updatedAt: serverTimestamp(),
    })
  );

  // Create legitimate pending invite for tests 9-12
  await assertSucceeds(
    setDoc(doc(aliceDb, 'duelInvites', 'inv_legit'), {
      fromUid: 'alice_uid',
      fromName: 'Alice',
      fromPhotoURL: '',
      fromPetId: 'mokay-fosforo',
      fromClanTag: 'CHISPA',
      toUid: 'bob_uid',
      arenaId: 'rhythm-hood',
      status: 'pending',
      raceId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 9. Unauthorized Invite Hijack (sender accepting own invite)
  await assertFails(
    updateDoc(doc(aliceDb, 'duelInvites', 'inv_legit'), {
      status: 'accepted',
      raceId: 'race_1',
      updatedAt: serverTimestamp(),
    })
  );

  // 10. Non-Atomic Invite Acceptance (missing dualRaces doc creation)
  await assertFails(
    updateDoc(doc(bobDb, 'duelInvites', 'inv_legit'), {
      status: 'accepted',
      raceId: 'race_missing',
      updatedAt: serverTimestamp(),
    })
  );

  // Legitimate Atomic Batch Accept
  const acceptBatch = writeBatch(bobDb);
  acceptBatch.set(doc(bobDb, 'dualRaces', 'race_1'), {
    hostUid: 'alice_uid',
    hostName: 'Alice',
    hostPetId: 'mokay-fosforo',
    guestUid: 'bob_uid',
    guestName: 'Bob',
    guestPetId: 'street-dino',
    arenaId: 'rhythm-hood',
    seed: 'race_1',
    status: 'active',
    hostMeters: 0,
    hostX: 220,
    hostAlive: true,
    guestMeters: 0,
    guestX: 220,
    guestAlive: true,
    winnerUid: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  acceptBatch.update(doc(bobDb, 'duelInvites', 'inv_legit'), {
    status: 'accepted',
    raceId: 'race_1',
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(acceptBatch.commit());

  // 11. Rival Sabotage (host updating guestMeters)
  await assertFails(
    updateDoc(doc(aliceDb, 'dualRaces', 'race_1'), {
      guestMeters: 0,
      guestAlive: false,
      updatedAt: serverTimestamp(),
    })
  );

  // Finish race legitimately
  await assertSucceeds(
    updateDoc(doc(aliceDb, 'dualRaces', 'race_1'), {
      hostMeters: 920,
      hostX: 210,
      hostAlive: true,
      status: 'finished',
      winnerUid: 'alice_uid',
      updatedAt: serverTimestamp(),
    })
  );

  // 12. Terminal State Replay
  await assertFails(
    updateDoc(doc(bobDb, 'dualRaces', 'race_1'), {
      guestMeters: 1000,
      status: 'finished',
      winnerUid: 'bob_uid',
      updatedAt: serverTimestamp(),
    })
  );

  await testEnv.cleanup();
}
