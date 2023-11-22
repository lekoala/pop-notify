const DOC = document;
const O = Object;
const BODY = DOC.body;
const NAME = "pop-notify";
const CE = customElements;

function animationReduced() {
  return (
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true || window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true
  );
}

function supportsPopover() {
  return typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype === "object" && "popover" in HTMLElement.prototype;
}

/**
 * @param {HTMLElement} el
 */
function show(el) {
  if (supportsPopover()) {
    el.showPopover();
  } else if (el.style.display != "block") {
    el.style.display = "block";
  }
}

/**
 * @param {HTMLElement} el
 */
function hide(el) {
  if (supportsPopover()) {
    el.hidePopover();
  } else if (el.style.display != "none") {
    el.style.display = "none";
  }
}

/**
 * @param {HTMLElement} el
 * @param {String} n
 * @param {String|null} v
 */
function attr(el, n, v) {
  if (v === null) {
    el.removeAttribute(n);
  } else {
    el.setAttribute(n, v);
  }
}

/**
 * @param {HTMLElement} el
 * @returns {Number}
 */
function getAbsoluteHeight(el) {
  const styles = window.getComputedStyle(el);
  const margin = parseFloat(styles["marginTop"]) + parseFloat(styles["marginBottom"]);
  return Math.ceil(el.offsetHeight + margin);
}

function createContainer() {
  const el = DOC.createElement("div");
  el.id = "pop-notify-container";
  attr(el, "aria-live", "polite");
  attr(el, "aria-relevant", "additions");
  el.style.cssText = `position:fixed;overflow:hidden;inset:unset;border:0;padding:var(--pop-notify-spacing, 1rem);max-width:100%;background:transparent;`;
  if (supportsPopover()) {
    el.popover = "manual";
  } else {
    O.assign(el.style, {
      zIndex: "9999",
      display: "none",
      pointerEvents: "none",
    });
  }
  const pos = BODY.dir == "rtl" ? "left" : "right";
  el.style.top = "0px";
  el.style[pos] = "0px";
  return el;
}

function hideIfEmpty(el) {
  if (!el.querySelectorAll(NAME).length) {
    hide(el);
  }
}

/**
 * @typedef Config
 * @property {Number} openTime Time to open in seconds
 * @property {Number} closeTime Time to close in seconds
 * @property {Number} defaultDuration Default duration for autohide in seconds
 * @property {String} closeSelector Selector to find close button
 * @property {String} closeLabel Close label in the template
 * @property {String} classPrefix Prefix for the css classes in the template
 * @property {Function} template Generator function

 */

/**
 * @type {Config}
 */
const options = {
  openTime: 0.5,
  closeTime: 1,
  defaultDuration: 5,
  closeSelector: ".btn-close,.close,[data-close]",
  closeLabel: "Close",
  classPrefix: "notification",
  template: (o) => {
    return `<div class="notification ${o.variant ? `notification-${o.variant}` : ""}" role="status">
    ${o.header ? `<div class="notification-header">${o.header}</div>` : ""}
    <div class="notification-body">${o.body}</div>
   ${o.close ? `<button type="button" class="btn-close" aria-label="${options.closeLabel}'"></button>` : ""}
   </div>
   </div>`;
  },
};

const container = createContainer();
BODY.appendChild(container);

class PopNotify extends HTMLElement {
  constructor() {
    super();

    // Required for animation
    O.assign(this.style, {
      display: "block", // required for scale animation
      marginBottom: "var(--pop-notify-spacing, 1rem)",
      marginTop: "-48px",
      maxWidth: "100%",
      width: "var(--pop-notify-width, 350px)",
      opacity: "0",
      transform: "scale(0)",
      pointerEvents: "all",
    });

    this.autohideTo = null;
    this.closeTo = null;
    this.openTo = null;
  }

  _setrm(n, v = "") {
    if (v) {
      attr(this, n, v);
    } else {
      attr(this, n, null);
    }
  }

  connectedCallback() {
    show(container);

    // It will move to the container
    if (!container.contains(this)) {
      container.prepend(this);
    }

    this.addEventListener("click", this);

    if (this.autohide) {
      this.autohideTo = setTimeout(() => {
        this.close();
      }, this.delay * 1000);
    }

    this.open();
  }

  disconnectedCallback() {
    this.removeEventListener("click", this);
    if (this.autohideTo) {
      clearTimeout(this.autohideTo);
    }
    if (this.openTo) {
      clearTimeout(this.openTo);
    }
    if (this.closeTo) {
      clearTimeout(this.closeTo);
    }
  }

  get delay() {
    return this.getAttribute("delay") || options.defaultDuration;
  }

  set delay(v) {
    this._setrm("delay", v);
  }

  get autohide() {
    return this.hasAttribute("autohide");
  }

  set autohide(v) {
    this._setrm("autohide", v);
  }

  handleEvent(ev) {
    this[`on${ev.type}`](ev);
  }

  /**
   * @param {Event|MouseEvent} ev
   */
  onclick(ev) {
    const closeTrigger = this.querySelector(options.closeSelector);
    if (closeTrigger && ev.composedPath().includes(closeTrigger)) {
      this.close();
    }
  }

  open() {
    if (!animationReduced()) {
      // The setTimeout is actually needed in order to play the animation and make sure the layout is computed
      this.openTo = setTimeout(() => {
        let ms = options.openTime * 500;
        O.assign(this.style, {
          transition: `all ${ms}ms cubic-bezier(0.165, 0.84, 0.44, 1), opacity ${ms / 2}ms ease`,
          opacity: `1`,
          transform: `scale(1)`,
          marginTop: `0px`,
        });
      }, 12);
    }
  }

  close() {
    if (this.closeTo) {
      return;
    }

    let ms = 0;
    if (!animationReduced()) {
      ms = options.closeTime * 1000;
      O.assign(this.style, {
        transition: `all ${ms}ms cubic-bezier(0.165, 0.84, 0.44, 1), opacity ${ms / 4}ms ease`,
        opacity: `0`,
        transform: `scale(0)`,
        marginTop: `-${getAbsoluteHeight(this)}px`,
      });
    }

    this.closeTo = setTimeout(() => {
      this.remove();
      hideIfEmpty(container);
    }, ms);
  }

  static notifyHtml(html, autohide = true) {
    const el = new PopNotify();
    el.innerHTML = html;
    el.autohide = autohide;
    container.prepend(el);

    return el;
  }

  static notify(msg, opts = {}) {
    if (typeof msg === "string") {
      opts = O.assign(opts, {
        body: msg,
      });
    }
    opts.autohide = typeof opts.autohide === "undefined" ? true : !!opts.autohide;
    opts.close = typeof opts.close === "undefined" ? !opts.autohide : !!opts.close;
    PopNotify.notifyHtml(options.template(opts), opts.autohide);
  }

  static configure(opts) {
    O.assign(options, opts);
  }
}

if (!CE.get(NAME)) {
  CE.define(NAME, PopNotify);
}

export default PopNotify;
