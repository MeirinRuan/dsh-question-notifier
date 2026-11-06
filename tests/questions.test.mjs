import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pendingQuestions, visibleQuestions, pruneAcknowledged} from '../src/questions.mjs';
const pending = (sessionId, key, kind = 'question') => ({sessionId, key, kind, questions: [{id: 'q', question: 'Choose a target?'}]});
test('questions and plan reviews produce reminders; other activity does not', () => {
  const status = new Map([['a', {pendingInteraction: pending('a', '1')}], ['b', {pendingInteraction: pending('b', '2', 'plan-review')}], ['c', {pendingInteraction: pending('c', '3', 'approval')}], ['d', {running: true}]]);
  assert.deepEqual(pendingQuestions(status).map(item => item.sessionId), ['a', 'b']);
});
test('closing a reminder suppresses that request while a new request still alerts', () => {
  const acknowledged = new Map([['a', '1']]);
  assert.deepEqual(visibleQuestions([pending('a', '1')], acknowledged), []);
  assert.equal(visibleQuestions([pending('a', '2')], acknowledged).length, 1);
  assert.equal(visibleQuestions([pending('b', '1')], acknowledged).length, 1);
});
test('answered, cancelled and replaced requests release their acknowledgement', () => {
  const acknowledged = new Map([['a', '1'], ['b', '2'], ['c', '3']]);
  assert.deepEqual([...pruneAcknowledged([pending('b', '2'), pending('c', '4')], acknowledged)], [['b', '2']]);
});
test('multiple sessions remain independently answerable after dismissing one', () => {
  const questions = [pending('a', '1'), pending('b', '2')];
  assert.equal(visibleQuestions(questions, new Map([['a', '1']]))[0].sessionId, 'b');
});
