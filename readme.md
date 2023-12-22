# Pop Notify

[![NPM](https://nodei.co/npm/pop-notify.png?mini=true)](https://nodei.co/npm/pop-notify/)
[![Downloads](https://img.shields.io/npm/dt/pop-notify.svg)](https://www.npmjs.com/package/pop-notify)

> A modern custom element to create toast notifications

## Nice features

- Use popover when available in the browser (no more z-index!)
- Inject from anywhere in the dom or in js
- Compatible with any framework
- Fully standalone
- Fully accessible
- Nice animations
- Actions support
- Just 5kb

## How to use

Using simple html:

```html
<body>
  ...

  <pop-notify autohide>
    <div class="notification notification-simple">
      Welcome to pop notify! <button type="button" class="btn-close" aria-label="Close"></button>
    </div>
  </pop-notify>

  ...
</body>
```

Using javascript:

```js
customElements
  .get("pop-notify")
  .notifyHtml(
    `<div class="notification notification-simple">A simple notification! <button type="button" class="btn-close" aria-label="Close"></button></div>`
  );
```

Using javascript with a template, actions, icons...:

```js
customElements.get("pop-notify").notify("My warning message", {
  variant: "warning",
  header: "Sticky!",
  autohide: false,
  icon: "warning",
  actions: [
    {
      label: "Some action",
      class: "btn-warning",
      onclick: (ev, inst) => {
        alert("You clicked on some action");
      },
    },
    {
      label: "Just close",
      class: "btn-dark",
      onclick: (ev, inst) => {
        inst.close();
      },
    },
  ],
});
```

## Fit any style

pop-notify doesn't come with any style, but you are free to use the default styles if you want to. It works
quite nicely for example with bootstrap toasts, without any javascript from bootstrap itself.

You can check the config for the available options, but you might want to:

### Override the default html

Simply set a new template generator function using `configure`.

```js
customElements.get("pop-notify").configure({
  template: (opts) => {
    const html = opts.body;
    return html;
  },
});
```

### Customize how icons are displayed

By default, icons are injected "as-is" (eg: if you pass svg icons). You might want to adjus this to your own
framework, for example here with materials symbols:

```js
customElements.get("pop-notify").configure({
  iconTransformer: (icon) => {
    return `<span class="material-symbols-outlined">${icon}</span>`;
  },
});
```

## Good friend with htmx

If you happen to use htmx, or any kind of library that injects content dynamically in the page, you might want to notify
your user of the update (think, some kind of polling script that might or might not update the page).

Since pop-notify is a regular html element, you can simply inject it anywhere you want and it will automatically be moved
to the toast container and displayed accordingly.

## Config

Simply call the static `configure` method.

```js
customElements.whenDefined("pop-notify").then(() => {
  customElements.get("pop-notify").configure({});
});
```

| Name | Type | Description |
| --- | --- | --- |
| placement | <code>String</code> | Where to position container |
| noTransition | <code>Boolean</code> | Disable animation instead of relying on media queries |
| defaultDuration | <code>Number</code> | Default duration for autohide in seconds |
| closeSelector | <code>String</code> | Selector to find close button |
| closeLabel | <code>String</code> | Close label in the template |
| classPrefix | <code>String</code> | Prefix for the css classes in the template |
| buttonClass | <code>String</code> | Base class for buttons |
| iconTransformer | <code>function</code> | Icon transformer function |
| template | <code>function</code> | Generator function |

## Demo

Check out demo.html or a simple code pen below

https://codepen.io/lekoalabe/pen/NWoXRaV

## Browser supports

Modern browsers (edge, chrome, firefox, safari... not IE11). [Add a warning if necessary](https://github.com/lekoala/nomodule-browser-warning.js/).
