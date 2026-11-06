# User and developer guide

[中文](guide.zh.md) · [README](../README.md) · [License](../LICENSE)

## Compatibility

This bundle supports DSH `0.2.2-rc.1` exactly. It uses DSH's existing client session status, workspace navigation, locale dictionaries and UI slots. Other DSH releases require compatibility review before changing the declared engine. Node.js must satisfy `^22.19.0 || >=24.0.0`.

## Installation

Download `dsh-question-notifier.tgz` from [GitHub Releases](https://github.com/MeirinRuan/dsh-question-notifier/releases). In DSH's plugin management, install the bundle using the downloaded archive's absolute path, then enable it. Reload the DSH page after installation or an update if the client has not refreshed.

Disable or remove the older `@local/dsh-question-notifier` bundle before enabling this public bundle. They share UI and locale registrations and must not be enabled together. The public package name is `dsh-question-notifier`.

Use plugin management to disable or remove the bundle. Disabling unloads its reminder, settings controls, dictionaries, styles and system notifications created by the current instance.

## Reminder behavior

When the client receives a pending question or plan review, a small card appears in the bottom-right corner. It shows the conversation title, a three-line excerpt of the first question and the question count when there is more than one. The card is at most 360 pixels wide, leaves the rest of the page interactive and does not take keyboard focus.

Choose **Answer now** to open the corresponding conversation. **Later**, the close button, or Escape while focus is inside the card dismisses only that reminder. The question stays pending. During the current client mount, the same dismissed request stays hidden and a new request can alert again; multiple conversations are shown one at a time. Answering, cancelling or ending a request removes its reminder. Reloading or re-enabling the plugin resets dismissals.

## Settings and system notifications

Under **Settings → General**, **Test question reminder** previews the card without creating a question. **Enable system notifications** requests notification permission. The in-app card works without this permission.

If permission is already granted, new pending requests also create a system notification when the DSH page is hidden or lacks focus. Clicking it attempts to focus DSH and open the conversation. Notifications are generated when the request is first observed; switching away after it was observed in the foreground does not generate a delayed notification. Browser support, OS permissions and do-not-disturb settings control actual delivery.

## Privacy

The in-app card displays a conversation title and question excerpt. A system notification includes the first question's text, which can be visible in the OS notification center, on a lock screen or during screen sharing, depending on system settings. Only grant notification permission when that exposure is appropriate. Revoke permission in the browser or OS settings to stop system notifications; disabling the bundle also stops this instance.

The plugin reads client-side status already supplied by DSH and keeps dismissal state in memory. It adds no telemetry, external network requests or persistent question storage. Notification permission is saved by the browser or desktop origin, and the operating system may retain notification history. It does not add model prompts, tokens or session events, submit answers, automatically resume work or change question timeouts.

## Development

Use Node.js in the supported range and pnpm `11.28.5`. From a source checkout:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm pack --out /absolute/path/outside/checkout/dsh-question-notifier.tgz
```

`prepack` builds the client automatically. The workspace allows the esbuild install build. The release archive includes the host entry, built client, bundle patch, both READMEs, guides and license. It does not require a build during installation. Build scripts, client source and tests are available in the [GitHub source repository](https://github.com/MeirinRuan/dsh-question-notifier).

The four existing state-projection tests cover question and plan-review selection, dismissal deduplication, acknowledgement cleanup and independent conversations. They do not exercise real browser rendering or OS notification delivery.

The repository includes a marketplace submission draft. Submission is separate from releasing: the GitHub repository must be at least one day old before submission, and the release archive must be available at its configured URL.

## Limitations

Reminders cover only pending state that the open DSH client has received. They cannot monitor questions while DSH is closed or the page is unloaded. System notifications require a supported notification API and may be blocked by platform policy. Client APIs are pre-stable, so compatibility with another DSH version is not implied by a successful JavaScript build.
