/**
 * scripts/provision-roles.js
 *
 * Secure Firebase Role Provisioning Script for CampusFind.
 * Run this trusted server-side script using the Firebase Admin SDK to:
 *   1. Assign custom claims ({ admin: true } or { authority: true })
 *   2. Synchronize role in Firestore ('users/{uid}')
 *   3. Optionally create the account if it does not yet exist in Firebase Auth.
 *
 * Usage:
 *   1. Place your serviceAccountKey.json in the project root folder.
 *   2. To grant Admin role to an existing user:
 *      node scripts/provision-roles.js --role=admin --email=admin@vignan.ac.in
 *
 *   3. To grant Authority role to an existing user:
 *      node scripts/provision-roles.js --role=authority --email=security.staff@vignan.ac.in
 *
 *   4. To create a new account securely (passwords read from environment variables):
 *      $env:SETUP_PASSWORD="YourSecurePasswordHere"
 *      node scripts/provision-roles.js --role=admin --email=admin@vignan.ac.in --create
 *      node scripts/provision-roles.js --role=authority --email=security.staff@vignan.ac.in --create
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (arg) return arg.slice(prefix.length).trim();
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1].trim();
  }
  return null;
}

async function main() {
  const roleArg = (getArg('role') || '').toLowerCase();
  const emailArg = getArg('email') || process.env.ADMIN_EMAIL || process.env.AUTHORITY_EMAIL;
  const isCreate = process.argv.includes('--create');
  const passwordArg = getArg('password') || process.env.SETUP_PASSWORD || process.env.INITIAL_PASSWORD;

  if (!['admin', 'authority'].includes(roleArg)) {
    console.error('\n❌ Error: Please specify a valid role using --role=admin or --role=authority');
    console.log('Example: node scripts/provision-roles.js --role=admin --email=admin@vignan.ac.in\n');
    process.exit(1);
  }

  if (!emailArg) {
    console.error('\n❌ Error: Please specify the target email using --email=<address> or environment variables.');
    console.log('Example: node scripts/provision-roles.js --role=authority --email=security@vignan.ac.in\n');
    process.exit(1);
  }

  const serviceAccountPath = resolve(process.cwd(), 'serviceAccountKey.json');
  if (!existsSync(serviceAccountPath)) {
    console.error('\n❌ Service Account key not found at: ' + serviceAccountPath);
    console.log('\nTo configure your administrator or staff account securely:');
    console.log('1. Open Firebase Console: https://console.firebase.google.com/');
    console.log('2. Select project: campusfind-86f7a');
    console.log('3. Go to Project Settings (gear icon) > "Service accounts" tab.');
    console.log('4. Click "Generate new private key" and download the JSON file.');
    console.log('5. Rename the file to `serviceAccountKey.json` and save in this project root.');
    console.log('6. Re-run this script.\n');
    process.exit(1);
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch {
    console.error('\n❌ firebase-admin package is not installed.');
    console.log('Please run: npm install --save-dev firebase-admin');
    console.log('Then re-run this script.\n');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    const auth = admin.auth();
    const db = admin.firestore();

    let user;
    try {
      user = await auth.getUserByEmail(emailArg);
      console.log(`\nFound existing Firebase Auth user for: ${emailArg} (UID: ${user.uid})`);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        if (!isCreate) {
          console.error(`\n❌ User ${emailArg} was not found in Firebase Authentication.`);
          console.log('To create this account now, add the --create flag and specify a secure password:');
          console.log('  $env:SETUP_PASSWORD="YourSecretPassword"');
          console.log(`  node scripts/provision-roles.js --role=${roleArg} --email=${emailArg} --create\n`);
          process.exit(1);
        }

        if (!passwordArg || passwordArg.length < 6) {
          console.error('\n❌ Error: Creating a new account requires a password of at least 6 characters.');
          console.log('Please set the SETUP_PASSWORD environment variable or pass --password=<secret>.\n');
          process.exit(1);
        }

        console.log(`Creating new Firebase user for ${emailArg}...`);
        user = await auth.createUser({
          email: emailArg,
          password: passwordArg,
          displayName: roleArg === 'admin' ? 'University Administrator' : 'Campus Security Staff',
          emailVerified: true
        });
        console.log(`✅ Created new user with UID: ${user.uid}`);
      } else {
        throw authErr;
      }
    }

    // Set custom user claims
    const existingClaims = user.customClaims || {};
    const newClaims = {
      ...existingClaims,
      admin: roleArg === 'admin',
      authority: roleArg === 'authority' || roleArg === 'admin',
      role: roleArg
    };

    await auth.setCustomUserClaims(user.uid, newClaims);

    // Sync Firestore document
    await db.collection('users').doc(user.uid).set(
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || (roleArg === 'admin' ? 'Campus Administrator' : 'Campus Authority'),
        role: roleArg,
        authProvider: 'password',
        roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // Record in auditLogs
    await db.collection('auditLogs').add({
      actorUid: 'system-provisioning-cli',
      actorEmail: 'system',
      actorRole: 'admin',
      action: 'ROLE_PROVISIONED',
      targetType: 'user',
      targetId: user.uid,
      details: `Provisioned role "${roleArg}" and custom claims for ${user.email} (UID: ${user.uid})`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('\n==========================================================');
    console.log(`✅ SUCCESS: Role "${roleArg.toUpperCase()}" provisioned successfully!`);
    console.log('==========================================================');
    console.log(`Account Email:   ${user.email}`);
    console.log(`Account UID:     ${user.uid}`);
    console.log(`Assigned Role:   ${roleArg}`);
    console.log(`Custom Claims:   ${JSON.stringify(newClaims)}`);
    console.log('Firestore Sync:  users/' + user.uid + ' updated with role=' + roleArg);
    console.log('==========================================================');
    console.log('\nLogin Locations:');
    if (roleArg === 'admin') {
      console.log('  Admin Portal:      http://localhost:5173/admin/login');
    } else {
      console.log('  Authority Portal:  http://localhost:5173/authority/login');
    }
    console.log('  Student Portal:    http://localhost:5173/login');
    console.log('\n(Note: If the user was already signed in, they should sign out and sign back in to refresh token claims.)\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Provisioning failed:', err.message);
    process.exit(1);
  }
}

main();
