/**
 * XSS Security Testing for search-engine.js
 * Tests that all user-controlled data is properly escaped
 */

import { escapeHTML } from '../js/utils/safe-dom.js';

// XSS Test Payloads
const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '"><script>alert("XSS")</script>',
  "javascript:alert('XSS')",
  '<svg onload=alert("XSS")>',
  '<iframe src="javascript:alert(\'XSS\')">',
  '&lt;script&gt;alert("XSS")&lt;/script&gt;',
  '<body onload=alert("XSS")>',
  '<input onfocus=alert("XSS") autofocus>',
  '<marquee onstart=alert("XSS")>'
];

// Test escapeHTML function
function testEscapeHTML() {
  console.log('\n🧪 Testing escapeHTML function...\n');

  const tests = [
    { input: '<script>alert("XSS")</script>', expected: '&lt;script&gt;alert("XSS")&lt;/script&gt;' },
    { input: '<img src=x onerror=alert(1)>', expected: '&lt;img src=x onerror=alert(1)&gt;' },
    { input: '"><script>alert(1)</script>', expected: '"&gt;&lt;script&gt;alert(1)&lt;/script&gt;' },
    { input: "';alert(1);//", expected: "';alert(1);&#x2F;&#x2F;" },
    { input: '<a href="javascript:alert(1)">click</a>', expected: '&lt;a href="javascript:alert(1)"&gt;click&lt;&#x2F;a&gt;' }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach((test, index) => {
    const result = escapeHTML(test.input);
    const safe = !result.includes('<script') && !result.includes('onerror=') && !result.includes('javascript:');

    if (safe) {
      console.log(`✅ Test ${index + 1} PASSED: "${test.input}" → "${result}"`);
      passed++;
    } else {
      console.error(`❌ Test ${index + 1} FAILED: "${test.input}" → "${result}"`);
      failed++;
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// Test that XSS payloads are properly escaped in search queries
function testSearchQueryEscaping() {
  console.log('🧪 Testing search query escaping...\n');

  let passed = 0;
  let failed = 0;

  XSS_PAYLOADS.forEach((payload, index) => {
    const escaped = escapeHTML(payload);
    const containsXSS = escaped.includes('<script') ||
                        escaped.includes('onerror=') ||
                        escaped.includes('javascript:') ||
                        escaped.includes('onload=') ||
                        escaped.includes('onfocus=') ||
                        escaped.includes('onstart=');

    if (!containsXSS) {
      console.log(`✅ Payload ${index + 1} properly escaped`);
      passed++;
    } else {
      console.error(`❌ Payload ${index + 1} NOT properly escaped: ${escaped}`);
      failed++;
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// Test that document fields are properly escaped
function testDocumentFieldEscaping() {
  console.log('🧪 Testing document field escaping...\n');

  const maliciousDoc = {
    type: '<script>alert("type")</script>',
    url: 'javascript:alert("url")',
    title: '<img src=x onerror=alert("title")>',
    summary: '<svg onload=alert("summary")>',
    category: '<iframe src="javascript:alert(\'category\')">',
    difficulty: '<body onload=alert("difficulty")>',
    tags: ['<script>tag1</script>', '<img src=x onerror=alert("tag2")>']
  };

  const fields = ['type', 'url', 'title', 'summary', 'category', 'difficulty'];
  let passed = 0;
  let failed = 0;

  fields.forEach(field => {
    const escaped = escapeHTML(maliciousDoc[field]);
    const containsXSS = escaped.includes('<script') ||
                        escaped.includes('javascript:') ||
                        escaped.includes('onerror=') ||
                        escaped.includes('onload=') ||
                        escaped.includes('<iframe') ||
                        escaped.includes('<svg') ||
                        escaped.includes('<img');

    if (!containsXSS) {
      console.log(`✅ Field "${field}" properly escaped`);
      passed++;
    } else {
      console.error(`❌ Field "${field}" NOT properly escaped: ${escaped}`);
      failed++;
    }
  });

  // Test tags array
  maliciousDoc.tags.forEach((tag, index) => {
    const escaped = escapeHTML(tag);
    const containsXSS = escaped.includes('<script') || escaped.includes('onerror=');

    if (!containsXSS) {
      console.log(`✅ Tag ${index + 1} properly escaped`);
      passed++;
    } else {
      console.error(`❌ Tag ${index + 1} NOT properly escaped: ${escaped}`);
      failed++;
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// Run all tests
function runAllTests() {
  console.log('🔒 XSS Security Test Suite\n');
  console.log('=' .repeat(60));

  const results = {
    escapeHTML: testEscapeHTML(),
    searchQuery: testSearchQueryEscaping(),
    documentFields: testDocumentFieldEscaping()
  };

  console.log('=' .repeat(60));
  console.log('\n📋 Final Results:\n');

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${test}`);
  });

  const allPassed = Object.values(results).every(result => result === true);

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('\n🎉 All XSS security tests PASSED!');
    console.log('✅ The search-engine.js module is properly protected against XSS attacks.\n');
    return 0;
  } else {
    console.error('\n❌ Some XSS security tests FAILED!');
    console.error('⚠️  XSS vulnerabilities may still exist.\n');
    return 1;
  }
}

// Execute tests
const exitCode = runAllTests();
process.exit(exitCode);
