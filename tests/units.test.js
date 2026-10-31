// Implementation plan P5.1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundHalfUp, ceilTo, floorTo, fmt, fieldText, parse } from '../src/units.js';

test('roundHalfUp', () => {
  assert.equal(roundHalfUp(7.15, 1), 7.2);
  assert.equal(roundHalfUp(412.75 - 405.6, 1), 7.2);
  assert.equal(roundHalfUp(0.32, 1), 0.3);
});

test('ceilTo and floorTo', () => {
  assert.equal(ceilTo(41.2, 1), 41.2);
  assert.equal(ceilTo(41.138, 1), 41.2);
  assert.equal(floorTo(47.75, 1), 47.7);
});

test('fmt', () => {
  assert.equal(fmt(457.2, 'in'), '18.00 in (457.2 mm)');
  assert.equal(fmt(304.8, 'mm'), '304.8 mm (12.00 in)');
});

test('fieldText', () => {
  assert.equal(fieldText(10, 'in'), '0.394');
  assert.equal(fieldText(7.6, 'mm'), '7.6');
});

test('parse', () => {
  assert.equal(parse('2.5', 'in'), 63.5);
  assert.equal(parse('abc', 'mm'), null);
  assert.equal(parse('2.', 'mm'), null);
});

test('parse: inches convert to clean mm', () => {
  assert.equal(parse('12', 'in'), 304.8);
  assert.equal(parse('1.5', 'in'), 38.1);
  assert.equal(parse('0.75', 'in'), 19.05);
  assert.equal(parse('0.001', 'in'), 0.0254);
});
