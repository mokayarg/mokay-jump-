import { useCallback, useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  signInWithGoogle,
  signOutGoogle,
} from '../firebase';
import {
  PlayerLoadout,
  computeStylePoints,
  getStyleRank,
} from '../data/mokayaData';
import type { FriendProfile } from './useMokayaRealtime';

export interface FirebasePublicProfile {
  uid: string;
  displayName: string;
  searchName: string;
  photoURL: string;
  petId: string;
  petXp: number;
  clanTag: string;
  elo: number;
  wins: number;
  losses: number;
  bestMeters: number;
  styleRank: string;
  online: boolean;
}

export interface FirebaseFriend extends FriendProfile {
  uid: string;
  photoURL?: string;
}

export interface FirebaseDuelInvite {
  inviteId: string;
  fromUid: string;
  fromName: string;
  fromPhotoURL: string;
  fromPetId: string;
  fromClanTag: string;
  toUid: string;
  arenaId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  raceId: string;
}

export interface FirebaseDualRace {
  raceId: string;
  hostUid: string;
  hostName: string;
  hostPetId: string;
  guestUid: string;
  guestName: string;
  guestPetId: string;
  arenaId: string;
  seed: string;
  status: 'active' | 'finished';
  hostMeters: number;
  hostX: number;
  hostAlive: boolean;
  guestMeters: number;
  guestX: number;
  guestAlive: boolean;
  winnerUid: string;
}

function safeName(val: string | null | undefined, fallback = 'Mokayer'): string {
  const trimmed = (val || '').trim().slice(0, 40);
  return trimmed || fallback;
}

function safePhoto(val: string | null | undefined): string {
  return (val || '').slice(0, 500);
}

function safePetId(val: string | null | undefined): string {
  const s = (val || 'mokay-fosforo').trim().slice(0, 40);
  return s || 'mokay-fosforo';
}

function safeClan(val: string | null | undefined): string {
  const s = (val || 'CHISPA').trim().toUpperCase().slice(0, 12);
  return s || 'CHISPA';
}

function safeArenaId(val: string | null | undefined): string {
  const s = (val || 'rhythm-hood').trim().slice(0, 40);
  return s || 'rhythm-hood';
}

function safeIdToken(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const BEST_METERS_KEY = 'mokaya_jump_best_meters_v1';

function readLocalBestMeters(): number {
  try {
    return Math.max(0, Math.min(1000000, Number(localStorage.getItem(BEST_METERS_KEY) || '0') || 0));
  } catch {
    return 0;
  }
}

export function useFirebaseSocial(
  loadout: PlayerLoadout,
  onSyncDisplayNameFromGoogle?: (googleName: string) => void
) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [publicProfiles, setPublicProfiles] = useState<FirebasePublicProfile[]>([]);
  const [friendLinks, setFriendLinks] = useState<
    {
      friendUid: string;
      friendName: string;
      friendPhotoURL: string;
      friendPetId: string;
      friendClanTag: string;
    }[]
  >([]);
  const [incomingInvites, setIncomingInvites] = useState<FirebaseDuelInvite[]>([]);
  const [outgoingNotice, setOutgoingNotice] = useState<string | null>(null);
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null);
  const [activeRace, setActiveRace] = useState<FirebaseDualRace | null>(null);

  const loadoutRef = useRef(loadout);
  loadoutRef.current = loadout;

  const activeRaceRef = useRef<FirebaseDualRace | null>(null);
  activeRaceRef.current = activeRace;

  const lastProgressSentRef = useRef<number>(0);
  const handledAcceptedInvitesRef = useRef<Set<string>>(new Set());
  const onSyncNameRef = useRef(onSyncDisplayNameFromGoogle);
  onSyncNameRef.current = onSyncDisplayNameFromGoogle;

  // 1. Track Firebase Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      setAuthReady(true);
      if (!u) {
        setProfileReady(false);
        setPublicProfiles([]);
        setFriendLinks([]);
        setIncomingInvites([]);
        setActiveRaceId(null);
        setActiveRace(null);
      }
    });
    return () => unsub();
  }, []);

  // 2. Ensure private /users/{uid} and public /publicProfiles/{uid} on login
  useEffect(() => {
    if (!authReady || !authUser || !authUser.emailVerified) return;

    let cancelled = false;
    const ensureDocs = async () => {
      const uid = authUser.uid;
      const currentLoadout = loadoutRef.current;
      const chosenName =
        currentLoadout.playerName === 'MokayerPro' && authUser.displayName
          ? safeName(authUser.displayName)
          : safeName(currentLoadout.playerName || authUser.displayName);

      if (currentLoadout.playerName === 'MokayerPro' && authUser.displayName) {
        onSyncNameRef.current?.(chosenName);
      }

      const styleRankName = getStyleRank(computeStylePoints(currentLoadout.clothes)).name.slice(0, 50);
      const userPath = `users/${uid}`;
      const userRef = doc(db, 'users', uid);

      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid,
            email: (authUser.email || '').slice(0, 254),
            displayName: safeName(authUser.displayName || chosenName),
            photoURL: safePhoto(authUser.photoURL),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(userRef, {
            email: (authUser.email || '').slice(0, 254),
            displayName: safeName(authUser.displayName || chosenName),
            photoURL: safePhoto(authUser.photoURL),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }

      const pubPath = `publicProfiles/${uid}`;
      const pubRef = doc(db, 'publicProfiles', uid);
      try {
        const pubSnap = await getDoc(pubRef);
        const bestMeters = readLocalBestMeters();
        if (!pubSnap.exists()) {
          await setDoc(pubRef, {
            uid,
            displayName: chosenName,
            searchName: chosenName.toLowerCase(),
            photoURL: safePhoto(authUser.photoURL),
            petId: safePetId(currentLoadout.petId),
            petXp: Math.max(0, Math.min(10000000, currentLoadout.petXp)),
            clanTag: safeClan(currentLoadout.clanTag),
            elo: Math.max(0, Math.min(100000, currentLoadout.elo)),
            wins: Math.max(0, Math.min(1000000, currentLoadout.wins)),
            losses: Math.max(0, Math.min(1000000, currentLoadout.losses)),
            bestMeters,
            styleRank: styleRankName,
            online: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(pubRef, {
            displayName: chosenName,
            searchName: chosenName.toLowerCase(),
            photoURL: safePhoto(authUser.photoURL),
            petId: safePetId(currentLoadout.petId),
            petXp: Math.max(0, Math.min(10000000, currentLoadout.petXp)),
            clanTag: safeClan(currentLoadout.clanTag),
            elo: Math.max(0, Math.min(100000, currentLoadout.elo)),
            wins: Math.max(0, Math.min(1000000, currentLoadout.wins)),
            losses: Math.max(0, Math.min(1000000, currentLoadout.losses)),
            bestMeters: Math.max(bestMeters, Number(pubSnap.data().bestMeters || 0)),
            styleRank: styleRankName,
            online: true,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pubPath);
      }

      if (!cancelled) {
        setProfileReady(true);
      }
    };

    void ensureDocs();

    return () => {
      cancelled = true;
    };
  }, [authReady, authUser]);

  // 3. Sync loadout changes (character, ELO, clan, record) to publicProfiles/{uid}
  useEffect(() => {
    if (!authReady || !authUser || !authUser.emailVerified || !profileReady) return;
    const timer = window.setTimeout(() => {
      const uid = authUser.uid;
      const pubPath = `publicProfiles/${uid}`;
      const chosenName = safeName(loadout.playerName || authUser.displayName);
      const styleRankName = getStyleRank(computeStylePoints(loadout.clothes)).name.slice(0, 50);
      updateDoc(doc(db, 'publicProfiles', uid), {
        displayName: chosenName,
        searchName: chosenName.toLowerCase(),
        photoURL: safePhoto(authUser.photoURL),
        petId: safePetId(loadout.petId),
        petXp: Math.max(0, Math.min(10000000, loadout.petXp)),
        clanTag: safeClan(loadout.clanTag),
        elo: Math.max(0, Math.min(100000, loadout.elo)),
        wins: Math.max(0, Math.min(1000000, loadout.wins)),
        losses: Math.max(0, Math.min(1000000, loadout.losses)),
        bestMeters: readLocalBestMeters(),
        styleRank: styleRankName,
        online: true,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, pubPath);
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [authReady, authUser, loadout, profileReady]);

  // 4. Attach Firestore real-time listeners ONLY when authenticated & profileReady
  useEffect(() => {
    if (!authReady || !authUser || !authUser.emailVerified || !profileReady) return;

    const uid = authUser.uid;

    // 4a. Public gamer profiles (used for friend online status & discovery)
    const profilesQuery = query(
      collection(db, 'publicProfiles'),
      where('uid', '>', ''),
      limit(50)
    );
    const unsubProfiles = onSnapshot(
      profilesQuery,
      (snap) => {
        const list: FirebasePublicProfile[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            uid: String(data.uid || d.id),
            displayName: String(data.displayName || 'Mokayer'),
            searchName: String(data.searchName || ''),
            photoURL: String(data.photoURL || ''),
            petId: String(data.petId || 'mokay-fosforo'),
            petXp: Number(data.petXp || 0),
            clanTag: String(data.clanTag || 'CHISPA'),
            elo: Number(data.elo || 1000),
            wins: Number(data.wins || 0),
            losses: Number(data.losses || 0),
            bestMeters: Number(data.bestMeters || 0),
            styleRank: String(data.styleRank || 'Novato del Barrio'),
            online: Boolean(data.online),
          });
        });
        setPublicProfiles(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'publicProfiles')
    );

    // 4b. My saved friends subcollection
    const friendsPath = `publicProfiles/${uid}/friends`;
    const friendsQuery = query(
      collection(db, 'publicProfiles', uid, 'friends'),
      where('uid', '==', uid)
    );
    const unsubFriends = onSnapshot(
      friendsQuery,
      (snap) => {
        const links: typeof friendLinks = [];
        snap.forEach((d) => {
          const data = d.data();
          links.push({
            friendUid: String(data.friendUid || d.id),
            friendName: String(data.friendName || 'Amigo'),
            friendPhotoURL: String(data.friendPhotoURL || ''),
            friendPetId: String(data.friendPetId || 'mokay-fosforo'),
            friendClanTag: String(data.friendClanTag || 'CHISPA'),
          });
        });
        setFriendLinks(links);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, friendsPath)
    );

    // 4c. Incoming pending 1v1 duel invites
    const incomingQuery = query(
      collection(db, 'duelInvites'),
      where('toUid', '==', uid),
      where('status', '==', 'pending')
    );
    const unsubIncoming = onSnapshot(
      incomingQuery,
      (snap) => {
        const list: FirebaseDuelInvite[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            inviteId: d.id,
            fromUid: String(data.fromUid),
            fromName: String(data.fromName || 'Amigo'),
            fromPhotoURL: String(data.fromPhotoURL || ''),
            fromPetId: String(data.fromPetId || 'mokay-fosforo'),
            fromClanTag: String(data.fromClanTag || 'CHISPA'),
            toUid: String(data.toUid),
            arenaId: String(data.arenaId || 'rhythm-hood'),
            status: 'pending',
            raceId: String(data.raceId || ''),
          });
        });
        setIncomingInvites(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'duelInvites')
    );

    // 4d. Outgoing invites watcher -> auto-launch Dual Race when friend accepts!
    const outgoingQuery = query(
      collection(db, 'duelInvites'),
      where('fromUid', '==', uid)
    );
    const unsubOutgoing = onSnapshot(
      outgoingQuery,
      (snap) => {
        snap.docChanges().forEach((change) => {
          const data = change.doc.data();
          const invId = change.doc.id;
          if (
            data.status === 'accepted' &&
            typeof data.raceId === 'string' &&
            data.raceId.length > 0 &&
            !handledAcceptedInvitesRef.current.has(invId)
          ) {
            handledAcceptedInvitesRef.current.add(invId);
            setOutgoingNotice(null);
            setActiveRaceId(data.raceId);
          } else if (
            change.type === 'modified' &&
            data.status === 'declined' &&
            !handledAcceptedInvitesRef.current.has(invId)
          ) {
            handledAcceptedInvitesRef.current.add(invId);
            setOutgoingNotice('Tu amigo rechazó la carrera por ahora.');
          }
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'duelInvites')
    );

    return () => {
      unsubProfiles();
      unsubFriends();
      unsubIncoming();
      unsubOutgoing();
    };
  }, [authReady, authUser, profileReady]);

  // 5. Subscribe to the active 1v1 Dual Race room document
  useEffect(() => {
    if (!authReady || !authUser || !activeRaceId) {
      setActiveRace(null);
      return;
    }

    const racePath = `dualRaces/${activeRaceId}`;
    const unsub = onSnapshot(
      doc(db, 'dualRaces', activeRaceId),
      (snap) => {
        if (!snap.exists()) {
          setActiveRace(null);
          return;
        }
        const d = snap.data();
        setActiveRace({
          raceId: snap.id,
          hostUid: String(d.hostUid),
          hostName: String(d.hostName),
          hostPetId: String(d.hostPetId),
          guestUid: String(d.guestUid),
          guestName: String(d.guestName),
          guestPetId: String(d.guestPetId),
          arenaId: String(d.arenaId),
          seed: String(d.seed),
          status: d.status === 'finished' ? 'finished' : 'active',
          hostMeters: Number(d.hostMeters || 0),
          hostX: Number(d.hostX || 220),
          hostAlive: Boolean(d.hostAlive),
          guestMeters: Number(d.guestMeters || 0),
          guestX: Number(d.guestX || 220),
          guestAlive: Boolean(d.guestAlive),
          winnerUid: String(d.winnerUid || ''),
        });
      },
      (err) => handleFirestoreError(err, OperationType.GET, racePath)
    );

    return () => unsub();
  }, [activeRaceId, authReady, authUser]);

  // Combine saved friend links with live publicProfiles data
  const friends: FirebaseFriend[] = friendLinks.map((fl) => {
    const live = publicProfiles.find((p) => p.uid === fl.friendUid);
    return {
      uid: fl.friendUid,
      playerName: live?.displayName || fl.friendName,
      photoURL: live?.photoURL || fl.friendPhotoURL,
      online: live?.online ?? false,
      clientId: live?.uid || fl.friendUid,
      inRoom: false,
      clanTag: live?.clanTag || fl.friendClanTag,
      petId: live?.petId || fl.friendPetId,
      elo: live?.elo ?? 1200,
      wins: live?.wins ?? 0,
    };
  });

  const discoveryPlayers = publicProfiles.filter(
    (p) => p.uid !== authUser?.uid && !friendLinks.some((f) => f.friendUid === p.uid)
  );

  const loginWithGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Cerraste la ventana de Google antes de completar el ingreso.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Tu navegador bloqueó la ventana emergente de Google. Permite popups e intenta de nuevo.');
      } else {
        setAuthError('No se pudo iniciar sesión con Google. Revisa tu conexión.');
      }
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const logoutGoogle = useCallback(async () => {
    if (authUser && authUser.emailVerified && profileReady) {
      try {
        await updateDoc(doc(db, 'publicProfiles', authUser.uid), {
          online: false,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignore offline errors on sign out
      }
    }
    setActiveRaceId(null);
    setActiveRace(null);
    await signOutGoogle();
  }, [authUser, profileReady]);

  const addFriendBySearch = useCallback(
    async (inputNameOrUid: string): Promise<{ ok: boolean; error?: string }> => {
      if (!authUser || !authUser.emailVerified) {
        return { ok: false, error: 'Inicia sesión con Google primero.' };
      }
      const term = inputNameOrUid.trim();
      if (!term) return { ok: false, error: 'Escribe el nombre de tu amigo.' };

      const termLower = term.toLowerCase();
      let target = publicProfiles.find(
        (p) =>
          p.uid !== authUser.uid &&
          (p.uid === term || p.searchName === termLower || p.displayName.toLowerCase() === termLower)
      );

      if (!target) {
        try {
          const snap = await getDocs(
            query(collection(db, 'publicProfiles'), where('searchName', '==', termLower), limit(3))
          );
          snap.forEach((d) => {
            if (!target && d.id !== authUser.uid) {
              const data = d.data();
              target = {
                uid: String(data.uid || d.id),
                displayName: String(data.displayName || 'Mokayer'),
                searchName: String(data.searchName || ''),
                photoURL: String(data.photoURL || ''),
                petId: String(data.petId || 'mokay-fosforo'),
                petXp: Number(data.petXp || 0),
                clanTag: String(data.clanTag || 'CHISPA'),
                elo: Number(data.elo || 1000),
                wins: Number(data.wins || 0),
                losses: Number(data.losses || 0),
                bestMeters: Number(data.bestMeters || 0),
                styleRank: String(data.styleRank || 'Novato del Barrio'),
                online: Boolean(data.online),
              };
            }
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'publicProfiles');
        }
      }

      if (!target) {
        return {
          ok: false,
          error: 'No encontramos a ese jugador aún. Pídele que entre con Google al link.',
        };
      }

      const friendPath = `publicProfiles/${authUser.uid}/friends/${target.uid}`;
      try {
        await setDoc(doc(db, 'publicProfiles', authUser.uid, 'friends', target.uid), {
          uid: authUser.uid,
          friendUid: target.uid,
          friendName: safeName(target.displayName),
          friendPhotoURL: safePhoto(target.photoURL),
          friendPetId: safePetId(target.petId),
          friendClanTag: safeClan(target.clanTag),
          createdAt: serverTimestamp(),
        });
        return { ok: true };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, friendPath);
      }
    },
    [authUser, publicProfiles]
  );

  const removeFirebaseFriend = useCallback(
    async (friendUid: string) => {
      if (!authUser) return;
      const path = `publicProfiles/${authUser.uid}/friends/${friendUid}`;
      try {
        await deleteDoc(doc(db, 'publicProfiles', authUser.uid, 'friends', friendUid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [authUser]
  );

  const sendFirebaseDuelInvite = useCallback(
    async (toUid: string, toName: string, arenaId: string) => {
      if (!authUser || !authUser.emailVerified) return;
      if (!toUid || toUid === authUser.uid) return;
      const inviteId = `inv_${safeIdToken()}`;
      const invitePath = `duelInvites/${inviteId}`;
      try {
        await setDoc(doc(db, 'duelInvites', inviteId), {
          fromUid: authUser.uid,
          fromName: safeName(loadoutRef.current.playerName || authUser.displayName),
          fromPhotoURL: safePhoto(authUser.photoURL),
          fromPetId: safePetId(loadoutRef.current.petId),
          fromClanTag: safeClan(loadoutRef.current.clanTag),
          toUid,
          arenaId: safeArenaId(arenaId),
          status: 'pending',
          raceId: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setOutgoingNotice(`Reto enviado a ${toName}. Esperando que acepte...`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, invitePath);
      }
    },
    [authUser]
  );

  const acceptFirebaseDuelInvite = useCallback(
    async (invite: FirebaseDuelInvite) => {
      if (!authUser || !authUser.emailVerified) return;
      const raceId = `race_${safeIdToken()}`;
      const batch = writeBatch(db);
      const raceRef = doc(db, 'dualRaces', raceId);
      const invRef = doc(db, 'duelInvites', invite.inviteId);

      batch.set(raceRef, {
        hostUid: invite.fromUid,
        hostName: safeName(invite.fromName),
        hostPetId: safePetId(invite.fromPetId),
        guestUid: authUser.uid,
        guestName: safeName(loadoutRef.current.playerName || authUser.displayName),
        guestPetId: safePetId(loadoutRef.current.petId),
        arenaId: safeArenaId(invite.arenaId),
        seed: raceId,
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

      batch.update(invRef, {
        status: 'accepted',
        raceId,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
        setOutgoingNotice(null);
        setActiveRaceId(raceId);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `duelInvites/${invite.inviteId}`);
      }
    },
    [authUser]
  );

  const declineFirebaseDuelInvite = useCallback(
    async (invite: FirebaseDuelInvite) => {
      if (!authUser) return;
      const invPath = `duelInvites/${invite.inviteId}`;
      try {
        await updateDoc(doc(db, 'duelInvites', invite.inviteId), {
          status: 'declined',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, invPath);
      }
    },
    [authUser]
  );

  const updateDualRaceProgress = useCallback(
    (meters: number, x: number, alive: boolean) => {
      const race = activeRaceRef.current;
      const u = authUser;
      if (!race || !u || race.status === 'finished') return;

      const now = performance.now();
      if (alive && now - lastProgressSentRef.current < 140) return;
      lastProgressSentRef.current = now;

      const isHost = race.hostUid === u.uid;
      const isGuest = race.guestUid === u.uid;
      if (!isHost && !isGuest) return;

      const safeM = Math.max(0, Math.min(1000000, Math.round(meters)));
      const clampedX = Math.max(-90, Math.min(550, Math.round(x * 10) / 10));

      const rivalUid = isHost ? race.guestUid : race.hostUid;
      const rivalMeters = isHost ? race.guestMeters : race.hostMeters;
      const rivalAlive = isHost ? race.guestAlive : race.hostAlive;

      let nextStatus: 'active' | 'finished' = 'active';
      let nextWinnerUid = '';

      if (!alive) {
        if (!rivalAlive) {
          nextStatus = 'finished';
          nextWinnerUid = safeM >= rivalMeters ? u.uid : rivalUid;
        } else if (rivalMeters > safeM) {
          nextStatus = 'finished';
          nextWinnerUid = rivalUid;
        }
      } else if (!rivalAlive && safeM > rivalMeters) {
        nextStatus = 'finished';
        nextWinnerUid = u.uid;
      }

      const payload = isHost
        ? {
            hostMeters: safeM,
            hostX: clampedX,
            hostAlive: alive,
            status: nextStatus,
            winnerUid: nextWinnerUid,
            updatedAt: serverTimestamp(),
          }
        : {
            guestMeters: safeM,
            guestX: clampedX,
            guestAlive: alive,
            status: nextStatus,
            winnerUid: nextWinnerUid,
            updatedAt: serverTimestamp(),
          };

      const racePath = `dualRaces/${race.raceId}`;
      updateDoc(doc(db, 'dualRaces', race.raceId), payload).catch((err) => {
        // If rival finalized the race milliseconds earlier, terminal state rule denies further updates
        const msg = err instanceof Error ? err.message : String(err);
        if (activeRaceRef.current?.status === 'finished' || msg.includes('PERMISSION_DENIED')) {
          return;
        }
        handleFirestoreError(err, OperationType.UPDATE, racePath);
      });
    },
    [authUser]
  );

  const leaveFirebaseRace = useCallback(async () => {
    const race = activeRaceRef.current;
    const u = authUser;
    if (race && u && race.status === 'active') {
      const isHost = race.hostUid === u.uid;
      const rivalUid = isHost ? race.guestUid : race.hostUid;
      const racePath = `dualRaces/${race.raceId}`;
      try {
        await updateDoc(doc(db, 'dualRaces', race.raceId), {
          ...(isHost ? { hostAlive: false } : { guestAlive: false }),
          status: 'finished',
          winnerUid: rivalUid,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignore if rival already finished it
      }
    }
    setActiveRaceId(null);
    setActiveRace(null);
  }, [authUser]);

  return {
    authUser,
    authReady,
    profileReady,
    authBusy,
    authError,
    isGoogleSignedIn: Boolean(authUser && authUser.emailVerified),
    publicProfiles,
    discoveryPlayers,
    friends,
    incomingInvites,
    outgoingNotice,
    clearOutgoingNotice: () => setOutgoingNotice(null),
    activeRace,
    loginWithGoogle,
    logoutGoogle,
    addFriendBySearch,
    removeFirebaseFriend,
    sendFirebaseDuelInvite,
    acceptFirebaseDuelInvite,
    declineFirebaseDuelInvite,
    updateDualRaceProgress,
    leaveFirebaseRace,
  };
}
