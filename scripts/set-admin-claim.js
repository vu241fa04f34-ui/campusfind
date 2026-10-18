/**
 * scripts/set-admin-claim.js
 *
 * Secure Firebase Custom Claims Provisioning Script for CampusFind.
 * Run this trusted script in a server-side or local developer environment
 * to assign { admin: true } custom claims to an authorized administrator.
 *
 * Usage:
 *   1. Download your Firebase Service Account JSON from:
 *      Firebase Console > Project settings > Service accounts > "Generate new private key".
 *   2. Save the file in the project root as `serviceAccountKey.json` (Ensure it is in .gitignore).
 *   3. Run:
 *      node scripts/set-admin-claim.js <admin-email-or-uid>
 *
 * Example:
 *   node scripts/set-admin-claim.js admin@vignan.ac.in
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const targetIdentifier = process.argv[2];

  if (!targetIdentifier) {
    console.error('\n❌ Error: Please specify the administrator email or UID.');
    console.log('Usage: node scripts/set-admin-claim.js <admin-email-or-uid>');
    console.log('Example: node scripts/set-admin-claim.js admin@vignan.ac.in\n');
    process.exit(1);
  }

  // Look for service account key
  const serviceAccountPath = resolve(process.cwd(), 'serviceAccountKey.json');

  if (!existsSync(serviceAccountPath)) {
    console.error('\n❌ Service Account key not found at: ' + serviceAccountPath);
    console.log('\nTo configure your administrator account securely:');
    console.log('1. Open Firebase Console: https://console.firebase.google.com/');
    console.log('2. Select your project: campusfind-86f7a');
    console.log('3. Go to Project Settings (gear icon) > "Service accounts" tab.');
    console.log('4. Click "Generate new private key" and download the JSON file.');
    console.log('5. Rename the file to `serviceAccountKey.json` and place it in the project root folder.');
    console.log('6. Re-run: node scripts/set-admin-claim.js ' + targetIdentifier + '\n');
    process.exit(1);
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch {
    console.error('\n❌ firebase-admin is not installed.');
    console.log('Please run: npm install --save-dev firebase-admin');
    console.log('Then re-run this script.\n');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    let user;
    if (targetIdentifier.includes('@')) {
      user = await admin.auth().getUserByEmail(targetIdentifier.trim());
    } else {
      user = await admin.auth().getUser(targetIdentifier.trim());
    }

    // Set custom user claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    console.log('\n======================================================');
    console.log('✅ SUCCESS: Administrator privileges assigned!');
    console.log('======================================================');
    console.log(`User UID:       ${user.uid}`);
    console.log(`User Email:     ${user.email}`);
    console.log(`Custom Claims:  { admin: true }`);
    console.log('======================================================');
    console.log('Next steps:');
    console.log('1. The administrator can now log in at: http://localhost:5173/admin/login');
    console.log('2. If the administrator was already signed in, have them sign out and sign back in to refresh their security token.\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Failed to set administrator claims:', err.message);
    process.exit(1);
  }
}

main();
