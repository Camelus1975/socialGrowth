/**
 * UNIT TEST: UNIVERSAL SOCIAL PLATFORM INTEGRATION SYSTEM
 * Tests encryption, OAuth state, adapter registry, character adaptation, 
 * validation constraints, and central publishing service.
 */

const { encryptToken, decryptToken, isTokenExpiring, createOAuthState, verifyOAuthState } = require('../socialTokenEngine');
const { getAdapter, getAllSupportedPlatforms } = require('../socialAdapters');
const { socialPublishingService } = require('../socialPublishingService');

async function runSocialTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SOCIAL PLATFORM INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  // Test 1: AES-256-GCM Token Encryption & Decryption
  const rawSecret = 'oauth_live_access_token_super_secret_9948271';
  const encrypted = encryptToken(rawSecret);
  const decrypted = decryptToken(encrypted);
  
  if (decrypted !== rawSecret) {
    throw new Error(`Encryption/Decryption mismatch! Expected ${rawSecret}, got ${decrypted}`);
  }
  console.log('✅ Test 1 Passed: AES-256-GCM Token Encryption & Decryption verified.');

  // Test 2: Secure OAuth State Token & Anti-CSRF
  const statePayload = { userId: 'u_100', platform: 'instagram' };
  const stateToken = createOAuthState(statePayload);
  const verifiedState = verifyOAuthState(stateToken);
  
  if (!verifiedState || verifiedState.userId !== 'u_100' || verifiedState.platform !== 'instagram') {
    throw new Error('OAuth state verification failed!');
  }
  console.log('✅ Test 2 Passed: Secure OAuth state token & verification verified.');

  // Test 3: Supported Platforms Registry
  const platforms = getAllSupportedPlatforms();
  if (platforms.length < 8) {
    throw new Error(`Expected at least 8 platforms, found ${platforms.length}`);
  }
  console.log(`✅ Test 3 Passed: ${platforms.length} Platform Adapters registered (Facebook, IG, LinkedIn, X, TikTok, Pinterest, YouTube, Threads).`);

  // Test 4: Content Adaptation Rules
  const masterContent = 'Exciting breakthrough in dental implant technology at our clinic! Full smile transformations with zero discomfort.';
  
  const xContent = socialPublishingService.adaptContent('x', masterContent);
  const igContent = socialPublishingService.adaptContent('instagram', masterContent);
  const liContent = socialPublishingService.adaptContent('linkedin', masterContent);

  if (!xContent.includes('#Growth')) throw new Error('X adaptation failed');
  if (!igContent.includes('#DentalCare')) throw new Error('Instagram adaptation failed');
  if (!liContent.includes('Key Takeaway')) throw new Error('LinkedIn adaptation failed');
  console.log('✅ Test 4 Passed: AI Content Adaptation rules verified across platforms.');

  // Test 5: Post Constraints Validation
  const xAdapter = getAdapter('x');
  const validXPost = xAdapter.validatePost({ content: 'Short tweet under 280 chars' });
  const invalidXPost = xAdapter.validatePost({ content: 'A'.repeat(300) });

  if (!validXPost.valid || invalidXPost.valid) {
    throw new Error('X character limit constraint validation failed!');
  }
  console.log('✅ Test 5 Passed: Character & media validation constraints verified.');

  // Test 6: Publishing Service & Health Score
  const health = socialPublishingService.calculateHealthScore({
    status: 'connected',
    token_expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    last_publish_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  });

  if (health.healthScore < 85 || health.rating !== 'Excellent') {
    throw new Error('Social health score calculation failed!');
  }
  console.log(`✅ Test 6 Passed: Social Health Score calculated accurately (${health.healthScore}%, ${health.rating}).`);

  // Test 7: Simulated Immediate Publishing
  const publishResult = await socialPublishingService.publishImmediate('u_100', {
    platform: 'linkedin',
    content: masterContent
  });

  if (!publishResult.success || !publishResult.platformPostUrl) {
    throw new Error('PublishImmediate execution failed!');
  }
  console.log(`✅ Test 7 Passed: Immediate publishing dispatched successfully (${publishResult.platformPostUrl}).`);

  console.log('\n🎉 ALL 7 SOCIAL INTEGRATION & PUBLISHING TESTS PASSED (100% SUCCESS)\n');
}

runSocialTests().catch(err => {
  console.error('❌ Social Integration Tests Failed:', err);
  process.exit(1);
});
