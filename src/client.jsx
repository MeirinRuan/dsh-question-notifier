import React, {useEffect, useRef, useState} from 'react';
import {Button} from '@deepseek-ai/dsh-client-ui-primitives';
import {createPortal} from 'react-dom';
import {pendingQuestions, visibleQuestions, pruneAcknowledged} from './questions.mjs';

export const name = 'question-notifier-client';
export const inject = ['slots', 'locale', 'uiWorkspace'];
const NS = 'questionNotifier';
const dictionaries = {
  zh: {
    title: '有对话正在等待你回答', description: '回答后，助手才能继续处理。关闭此提醒不会取消问题。',
    close: '关闭提醒', later: '稍后处理', answer: '去回答', untitled: '未命名对话',
    plan: '需要你审阅计划', question: '需要你回答问题', count: '共 {count} 个问题',
    notifications: '启用系统通知', enabled: '系统通知已启用', denied: '系统通知未获允许，页面弹窗仍然有效',
    unavailable: '此环境不支持系统通知，页面弹窗仍然有效', failed: '无法启用系统通知，页面弹窗仍然有效',
    test: '测试询问提醒', testTitle: '询问提醒测试', testBody: '出现真实询问时会在右下角显示这样的小浮窗，点击“去回答”可回到对应对话。',
  },
  en: {
    title: 'A conversation is waiting for your answer', description: 'The assistant needs your answer to continue. Closing this reminder keeps the question pending.',
    close: 'Close reminder', later: 'Later', answer: 'Answer now', untitled: 'Untitled conversation',
    plan: 'Plan review needed', question: 'Answer needed', count: '{count} questions',
    notifications: 'Enable system notifications', enabled: 'System notifications enabled', denied: 'System notifications denied; in-app reminders remain available',
    unavailable: 'System notifications are unavailable; in-app reminders remain available', failed: 'Could not enable system notifications; in-app reminders remain available',
    test: 'Test question reminder', testTitle: 'Question reminder test', testBody: 'Real questions show this small notification in the bottom-right corner. Choose Answer now to return to the conversation.',
  },
};
const css = `.dsh-question-notifier-card{position:fixed;right:16px;bottom:16px;width:min(360px,calc(100vw - 32px));max-height:min(340px,calc(100dvh - 32px));box-sizing:border-box;z-index:1800;display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 8px 28px color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);font:13px/1.6 system-ui,sans-serif;pointer-events:auto}.dsh-question-notifier-header{display:flex;align-items:center;justify-content:space-between;gap:8px}.dsh-question-notifier-header strong{font-size:14px}.dsh-question-notifier-card p{margin:0}.dsh-question-notifier-description,.dsh-question-notifier-summary small{color:var(--dsw-alias-label-secondary);font-size:12px}.dsh-question-notifier-summary{min-height:0;overflow:auto;overflow-wrap:anywhere}.dsh-question-notifier-session{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-question-notifier-excerpt{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap}.dsh-question-notifier-actions{display:flex;justify-content:flex-end;gap:8px}.dsh-question-notifier-setting{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.dsh-question-notifier-setting span{color:var(--dsw-alias-label-secondary);font-size:12px}`;

/** A non-modal corner card leaves focus and pointer interaction with the rest of the page. */
function CornerNotice({title, description, closeLabel, onClose, children, footer}) {
  return createPortal(<section className="dsh-question-notifier-card" role="region" aria-label={title} aria-live="polite" onKeyDown={event => {
    if (event.key === 'Escape') {event.stopPropagation(); onClose();}
  }}>
    <div className="dsh-question-notifier-header"><strong>{title}</strong><Button variant="ghost" aria-label={closeLabel} onClick={onClose}><span aria-hidden="true">×</span></Button></div>
    {description && <p className="dsh-question-notifier-description">{description}</p>}
    {children}
    {footer && <div className="dsh-question-notifier-actions">{footer}</div>}
  </section>, document.body);
}

/** Global reminder consumes framework-provided snapshots and keeps only presentation acknowledgements. */
function Reminder({useSessionStatus, useSessions, t, openSession, notify, closeNotifications}) {
  const statuses = useSessionStatus(value => value);
  const byId = useSessions(value => value.byId);
  const pending = React.useMemo(() => pendingQuestions(statuses), [statuses]);
  const [acknowledged, setAcknowledged] = useState(() => new Map());
  const announced = useRef(new Map());
  const visible = visibleQuestions(pending, acknowledged);
  const current = visible[0];
  useEffect(() => {
    setAcknowledged(previous => {
      const next = pruneAcknowledged(pending, previous);
      return next.size === previous.size ? previous : next;
    });
    const active = new Map(pending.map(item => [item.sessionId, item.key]));
    for (const [id, key] of announced.current) {
      if (active.get(id) !== key) {
        closeNotifications(id);
        announced.current.delete(id);
      }
    }
    for (const item of pending) {
      if (announced.current.get(item.sessionId) === item.key) continue;
      announced.current.set(item.sessionId, item.key);
      notify(item);
    }
  }, [pending, notify, closeNotifications]);
  function dismiss() {
    if (!current) return;
    closeNotifications(current.sessionId);
    setAcknowledged(previous => new Map(previous).set(current.sessionId, current.key));
  }
  const title = byId[current?.sessionId]?.title || t('untitled');
  if (!current) return null;
  return <CornerNotice title={t('title')} closeLabel={t('close')} onClose={dismiss}
    footer={<><Button variant="outline" onClick={dismiss}>{t('later')}</Button><Button variant="primary" onClick={() => {openSession(current.sessionId); dismiss();}}>{t('answer')}</Button></>}>
    <div className="dsh-question-notifier-summary"><strong className="dsh-question-notifier-session" title={title}>{title}</strong><p><small>{t(current.kind === 'plan-review' ? 'plan' : 'question')}</small></p>
      <p className="dsh-question-notifier-excerpt">{current.questions[0]?.question}</p>
      {current.questions.length > 1 && <small>{t('count', {count: current.questions.length})}</small>}
    </div>
  </CornerNotice>;
}

/** An explicit user gesture enables OS notifications and offers a harmless preview. */
function Setting({t, requestPermission}) {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  return <><div className="dsh-question-notifier-setting"><Button variant="outline" onClick={async () => setStatus(await requestPermission())}>{t('notifications')}</Button>
    <Button variant="ghost" onClick={() => setTesting(true)}>{t('test')}</Button>{status && <span role="status">{t(status)}</span>}</div>
    {testing && <CornerNotice title={t('testTitle')} closeLabel={t('close')} description={t('testBody')} onClose={() => setTesting(false)} footer={<Button variant="primary" onClick={() => setTesting(false)}>{t('close')}</Button>}/>}</>;
}

/** Register additive UI, dictionaries, styles and disposable OS notifications. */
export function apply(ctx) {
  const notifications = new Map();
  const translate = ctx.locale.bind(NS);
  const openSession = id => {window.focus(); ctx.uiWorkspace.openSession(id);};
  const closeNotifications = id => {notifications.get(id)?.close(); notifications.delete(id);};
  const notify = item => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    // Foreground reminders already notify the user; OS notifications cover other applications/tabs.
    if (document.visibilityState === 'visible' && document.hasFocus()) return;
    try {
      const notification = new Notification(translate('title'), {body: item.questions[0]?.question || translate('question'), tag: `${name}:${item.sessionId}`, silent: false});
      closeNotifications(item.sessionId);
      notifications.set(item.sessionId, notification);
      notification.onclick = () => {openSession(item.sessionId); closeNotifications(item.sessionId);};
      notification.onclose = () => {if (notifications.get(item.sessionId) === notification) notifications.delete(item.sessionId);};
    } catch (error) {
      console.warn('question-notifier: OS notification unavailable; in-app reminder remains active', error);
    }
  };
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return 'unavailable';
    try {return await Notification.requestPermission() === 'granted' ? 'enabled' : 'denied';}
    catch (error) {console.warn('question-notifier: notification permission failed', error); return 'failed';}
  };
  ctx.effect(() => ctx.locale.register(NS, dictionaries));
  ctx.effect(() => {
    const style = document.createElement('style'); style.dataset.plugin = name; style.textContent = css; document.head.append(style);
    return () => style.remove();
  });
  ctx.effect(() => () => {for (const id of [...notifications.keys()]) closeNotifications(id);});
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({name: 'shell.overlay', id: 'dsh-question-notifier:reminder', order: 550, locale: NS,
    inject: () => ({openSession, notify, closeNotifications})}, Reminder));
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({name: 'settings.general.item', id: 'dsh-question-notifier:setting', order: 550, locale: NS,
    inject: () => ({requestPermission})}, Setting));
}
