#!/usr/bin/env node

/**
 * JWT Token Debugger
 *
 * Usage:
 *   node debug-jwt.js YOUR_JWT_TOKEN_HERE
 *
 * Or to decode from Authorization header:
 *   node debug-jwt.js "Bearer YOUR_JWT_TOKEN_HERE"
 *
 * This script decodes the JWT token and displays:
 * - User ID
 * - Organization ID
 * - Permissions array
 * - Admin access flag
 * - Token expiration info
 */

const token = process.argv[2];

if (!token) {
  console.error('❌ Error: No JWT token provided');
  console.log('\nUsage:');
  console.log('  node debug-jwt.js YOUR_JWT_TOKEN_HERE');
  console.log('  node debug-jwt.js "Bearer YOUR_JWT_TOKEN_HERE"');
  process.exit(1);
}

// Remove "Bearer " prefix if present
const cleanToken = token.replace(/^Bearer\s+/i, '');

try {
  // JWT is base64 encoded in three parts: header.payload.signature
  const parts = cleanToken.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid JWT format. Expected 3 parts separated by dots.');
  }

  // Decode header
  const headerJson = Buffer.from(parts[0], 'base64').toString('utf8');
  const header = JSON.parse(headerJson);

  // Decode payload
  const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
  const payload = JSON.parse(payloadJson);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                   JWT TOKEN DECODED                         ');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📋 HEADER:');
  console.log(JSON.stringify(header, null, 2));
  console.log('\n-----------------------------------------------------------\n');

  console.log('📦 PAYLOAD:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n-----------------------------------------------------------\n');

  console.log('🔍 PERMISSION CHECK:');
  console.log(`   User ID:         ${payload.user_id || 'NOT FOUND'}`);
  console.log(`   Organization ID: ${payload.organization_id || 'NOT FOUND'}`);
  console.log(`   Admin Access:    ${payload.has_admin_access ? 'YES' : 'NO'}`);

  const permissions = payload.permissions || [];
  console.log(`\n   Permissions (${permissions.length}):`);

  if (permissions.length === 0) {
    console.log('   ⚠️  WARNING: User has NO permissions in JWT token!');
    console.log('   This will cause 403 errors on all protected endpoints.');
  } else {
    permissions.forEach((perm, index) => {
      const hasReadUser = perm === 'read_user' ? '✅' : '  ';
      console.log(`   ${hasReadUser} ${index + 1}. ${perm}`);
    });
  }

  console.log('\n-----------------------------------------------------------\n');

  console.log('⏰ TOKEN TIMING:');
  if (payload.iat) {
    const issuedAt = new Date(payload.iat * 1000);
    console.log(`   Issued At:  ${issuedAt.toISOString()} (${issuedAt.toLocaleString()})`);
  }

  if (payload.exp) {
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    const isExpired = now > expiresAt;
    const timeLeft = expiresAt - now;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    console.log(`   Expires At: ${expiresAt.toISOString()} (${expiresAt.toLocaleString()})`);
    console.log(`   Status:     ${isExpired ? '❌ EXPIRED' : `✅ Valid (${hoursLeft}h ${minutesLeft}m remaining)`}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Check for "read_user" permission
  if (!permissions.includes('read_user')) {
    console.log('🚨 ISSUE DETECTED:');
    console.log('   The JWT token does NOT contain "read_user" permission.');
    console.log('   This explains the 403 Forbidden error on GET /users/:id');
    console.log('\n💡 POSSIBLE CAUSES:');
    console.log('   1. User has no role assigned (role_id is NULL)');
    console.log('   2. Permission "read_user" not assigned to user\'s role');
    console.log('   3. Permission is_active=false in role_permissions table');
    console.log('   4. Permission key mismatch (e.g., "read_users" vs "read_user")');
    console.log('\n🔧 SOLUTIONS:');
    console.log('   1. Run: node debug-jwt.js to inspect the token');
    console.log('   2. Run the SQL queries in debug-permissions.sql');
    console.log('   3. Assign "read_user" permission to user\'s role');
    console.log('   4. Set is_active=true for the permission');
    console.log('   5. User must login again to get a new token with updated permissions');
    console.log('\n═══════════════════════════════════════════════════════════\n');
  } else {
    console.log('✅ SUCCESS:');
    console.log('   The JWT token CONTAINS "read_user" permission.');
    console.log('   This user SHOULD be able to access GET /users/:id');
    console.log('\n   If still getting 403, check:');
    console.log('   1. Are you using the latest token? (User must re-login)');
    console.log('   2. Check server logs for the exact error message');
    console.log('   3. Verify JwtAuthGuard is working correctly');
    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

} catch (error) {
  console.error('\n❌ Error decoding JWT token:');
  console.error(`   ${error.message}`);
  console.log('\nMake sure you provided a valid JWT token.');
  console.log('Token should look like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoi...');
  process.exit(1);
}
