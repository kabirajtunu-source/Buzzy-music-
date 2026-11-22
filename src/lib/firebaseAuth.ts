import {initializeApp} from 'firebase/app';
import {getAuth, GoogleAuthProvider, signInWithPopup} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({prompt: 'select_account'});

export async function signInWithGooglePopup(): Promise<{idToken: string}> {
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return {idToken};
}

export async function firebaseSignOut(): Promise<void> {
  await auth.signOut();
}
