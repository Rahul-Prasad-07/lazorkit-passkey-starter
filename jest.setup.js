require('@testing-library/jest-dom');

// Polyfills for libs used by @solana/web3.js
const util = require('util');
if (typeof global.TextEncoder === 'undefined') {
	global.TextEncoder = util.TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
	global.TextDecoder = util.TextDecoder;
}
// Polyfill alert for jsdom (tests may call alert)
if (typeof global.alert === 'undefined') {
	global.alert = () => {};
}

// Ensure window.alert exists for jsdom
if (typeof window !== 'undefined' && typeof window.alert === 'undefined') {
	window.alert = global.alert;
}