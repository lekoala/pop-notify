/* Constants */

const DOC = document;
const O = Object;
const BODY = DOC.body;
const NAME = "pop-notify";
const CE = customElements;

/**
 * @typedef Config
 * @property {String} placement Where to position container
 * @property {Boolean} noTransition Disable animation instead of relying on media queries
 * @property {Number} defaultDuration Default duration for autohide in seconds
 * @property {String} closeSelector Selector to find close button
 * @property {String} closeLabel Close label in the template
 * @property {String} classPrefix Prefix for the css classes in the template
 * @property {Function} iconTransformer Icon transformer function
 * @property {Function} template Generator function
 */

/**
 * @type {Config}
 */
const options = {
  placement: "auto",
  noTransition: false,
  defaultDuration: 5,
  closeSelector: ".btn-close,.close,[data-close]",
  closeLabel: "Close",
  classPrefix: "notification",
  iconTransformer: (i) => i,
  template: (o) => {
    const c = options.classPrefix;
    const icon = o.icon ? `<div class="${c}-icon">${options.iconTransformer(o.icon)}</div>` : "";
    const close = o.close ? `<button type="button" class="btn-close" aria-label="${options.closeLabel}'"></button>` : "";
    const actions = o.actions
      ? `<div class="${c}-actions ${c}-actions-${o.actions.length}">${(() => {
          let html = "";
          o.actions.forEach((action) => {
            html += `<button class="${action.class}">${action.label}</button>`;
          });
          return html;
        })()}</div>`
      : "";
    return `<div class="${c} ${o.variant ? `${c}-${o.variant}` : ""}" role="status">
    ${o.header ? `<div class="${c}-header">${icon}<div class="${c}-body">${o.header}</div>${close}</div>` : ""}
      <div class="${c}-content">
      ${o.icon && !o.header ? icon : ""}<div class="${c}-body"><span>${o.body}</span>${actions}</div>${o.close && !o.header ? close : ""}
      </div>
    </div>
   </div>`;
  },
};

function animationReduced() {
  if (options.noTransition) {
    return true;
  }
  return (
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true || window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true
  );
}

function supportsPopover() {
  return typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype === "object" && "popover" in HTMLElement.prototype;
}

/**
 * @param {HTMLElement} container
 * @param {HTMLElement} el
 */
function addToContainer(container, el) {
  if (options.placement.includes("bottom")) {
    container.appendChild(el);
  } else {
    container.prepend(el);
  }
}

function animateFrom() {
  return options.placement.includes("bottom") ? "marginBottom" : "marginTop";
}

function spaceFrom() {
  return options.placement.includes("bottom") ? "marginTop" : "marginBottom";
}

/**
 * @param {HTMLElement} el
 */
function show(el) {
  let [posV, posH] = options.placement.split("-");

  // Single argument
  if (!posH) {
    posH = posV;
    posV = "top";
  }

  // Center means left 50%
  let posUnit = "0";
  if (posH == "center") {
    posUnit = "50%";
    posH = "left";
  }

  // Auto depends on RTL
  if (posH == "auto") {
    posH = BODY.dir == "rtl" ? "left" : "right";
  }

  el.style[posH] = posUnit;
  el.style.transform = posUnit == "50%" ? "translateX(-50%)" : "";
  el.style[posV] = "0";

  // Clear other pos
  const altPosH = posH == "right" ? "left" : "right";
  el.style[altPosH] = "unset";

  const altPosV = posV == "top" ? "bottom" : "top";
  el.style[altPosV] = "unset";

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
  // use overflow hidden to avoid any scrollbar due to negative margin
  // reset browsers popover styles
  // add a healthy margin around the screen border
  el.style.cssText = `position:fixed;overflow:hidden;inset:unset;border:0;margin:var(--pop-notify-spacing, 1rem);max-width:100%;background:transparent;`;
  if (supportsPopover()) {
    el.popover = "manual";
  } else {
    O.assign(el.style, {
      zIndex: "9999",
      display: "none",
    });
  }
  return el;
}

function hideIfEmpty(el) {
  if (!el.querySelectorAll(NAME).length) {
    hide(el);
  }
}

const container = createContainer();
BODY.appendChild(container);

class PopNotify extends HTMLElement {
  constructor() {
    super();

    const styles = {
      display: "block", // required for scale animation
      maxWidth: "100%",
      width: "var(--pop-notify-width, 350px)",
      overflowWrap: "anywhere", // helps to prevent overflow text outside of toast
    };

    if (!animationReduced()) {
      O.assign(styles, {
        willChange: "opacity, transform, " + animateFrom(),
        opacity: "0",
        transform: "scale(0)",
        transition:
          "all var(--pop-notify-duration, 0.5s) cubic-bezier(0.165, 0.84, 0.44, 1), opacity calc(var(--pop-notify-duration, 0.5s) / 2) ease",
      });
      styles[animateFrom()] = "-2rem";
    }

    // The margin for the next toast needs to be there in order to place it easily
    // This has the minor downside that a small space below is not clickable unless we add a last-child rule in css
    styles[spaceFrom()] = "var(--pop-notify-spacer, 1rem)";

    O.assign(this.style, styles);

    this.autohideTo = null;
    this.isClosing = false;
    this.clickHandler = null;
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
      addToContainer(container, this);

      // Return early to avoid firing twice connectedCallback
      return;
    }

    ["click", "mouseenter", "mouseleave"].forEach((type) => {
      this.addEventListener(type, this);
    });

    // Make sure we got the opportunity to run configure before this
    requestAnimationFrame(() => {
      // Wrap content in template if no html is set
      if (!this.querySelector(":scope > div") && this.textContent) {
        this.innerHTML = options.template({
          variant: this.variant,
          icon: this.icon,
          body: this.innerHTML,
          close: !this.autohide,
        });
      }

      this.open();
    });
  }

  disconnectedCallback() {
    ["click", "mouseenter", "mouseleave"].forEach((type) => {
      this.removeEventListener(type, this);
    });
    if (this.autohideTo) {
      clearTimeout(this.autohideTo);
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

  get variant() {
    return this.getAttribute("variant") || "default";
  }

  set variant(v) {
    this._setrm("variant", v);
  }

  get icon() {
    return this.getAttribute("icon");
  }

  set icon(v) {
    this._setrm("icon", v);
  }

  handleEvent(ev) {
    this[`on${ev.type}`](ev);
  }

  /**
   * @param {Event|MouseEvent} ev
   */
  onclick(ev) {
    // Did we click on any close button ?
    this._closeTriggers().forEach((closeTrigger) => {
      if (closeTrigger && ev.composedPath().includes(closeTrigger)) {
        this.close();
        ev.preventDefault();
      }
    });
    if (ev.defaultPrevented) {
      return;
    }

    // Action click?
    if (this.clickHandler && ev.target.matches("a,button")) {
      this.clickHandler(ev, this);
    }
  }

  /**
   * @returns {NodeListOf}
   */
  _closeTriggers() {
    return this.querySelectorAll(options.closeSelector);
  }

  /**
   * @param {Event|MouseEvent} ev
   */
  onmouseenter(ev) {
    // Keep it around while user interacts with it
    if (this.autohideTo) {
      clearTimeout(this.autohideTo);
    }
  }
  /**
   * @param {Event|MouseEvent} ev
   */
  onmouseleave(ev) {
    // Restore autohide timeout
    this._createAutohideTimeout();
  }

  _createAutohideTimeout() {
    // We don't autohide and there is a close button available, return
    if (!this.autohide && this._closeTriggers().length > 0) {
      return;
    }
    // If we have links, it should stay longer
    let delay = this.delay * 1000 * (this.querySelectorAll("a").length + 1);
    this.autohideTo = setTimeout(() => {
      this.close();
    }, delay);
  }

  setClickHandler(fn) {
    this.clickHandler = fn;
  }

  open() {
    if (!animationReduced()) {
      // This is needed in order to play the animation and make sure the layout is computed
      requestAnimationFrame(() => {
        const styles = {
          opacity: `1`,
          transform: `scale(1)`,
        };
        styles[animateFrom()] = "0";
        O.assign(this.style, styles);
      });
    }
    this._createAutohideTimeout();
  }

  close() {
    if (this.isClosing) {
      return;
    }
    this.isClosing = true;

    const cb = () => {
      this.remove();
      hideIfEmpty(container);
    };

    if (!animationReduced()) {
      // Close when animation finishes
      this.addEventListener(
        "transitionend",
        (ev) => {
          cb();
        },
        {
          once: true,
        }
      );

      const styles = {
        opacity: `0`,
        transform: `scale(0)`,
      };
      // We need to exact height (including the two margins) for a smooth transition
      styles[animateFrom()] = `-${getAbsoluteHeight(this)}px`;
      O.assign(this.style, styles);
    } else {
      cb();
    }
  }

  /**
   * Add raw html as a notification
   *
   * @param {String} html
   * @param {Boolean} autohide
   * @returns {PopNotify}
   */
  static notifyHtml(html, autohide = true) {
    const el = new PopNotify();
    el.innerHTML = html;
    el.autohide = autohide;
    addToContainer(container, el);
    return el;
  }

  /**
   * Creates a notification using the template helper
   *
   * @param {String} msg
   * @param {Object} opts
   */
  static notify(msg, opts = {}) {
    // Shortcut to set body
    if (typeof msg === "string") {
      opts = O.assign(opts, {
        body: msg,
      });
    }
    // Autohide by default
    opts.autohide = typeof opts.autohide === "undefined" ? true : !!opts.autohide;
    // Show close by default
    opts.close = typeof opts.close === "undefined" ? true : !!opts.close;
    const inst = PopNotify.notifyHtml(options.template(opts), opts.autohide);
    // Create some generic actions handler
    if (opts.actions) {
      opts.onclick = (ev, inst) => {
        const idx = [...ev.target.parentElement.children].indexOf(ev.target);
        if (opts.actions[idx].onclick) {
          opts.actions[idx].onclick(ev, inst);
        } else {
          throw `Unhandled action on button ${idx}`;
        }
      };
    }
    if (opts.onclick) {
      inst.setClickHandler(opts.onclick);
    }
  }

  static configure(opts) {
    O.assign(options, opts);
  }
}

if (!CE.get(NAME)) {
  CE.define(NAME, PopNotify);
}

export default PopNotify;
