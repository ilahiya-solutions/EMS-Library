/*==================== THEME (single source of truth) ====================
  Pairs with the inline bootstrap snippet in each page's <head>, which
  applies a *previously saved* theme to <html> before first paint to avoid
  a flash of the wrong theme. If the user has never chosen explicitly, no
  class is added anywhere and the page simply follows the OS/browser
  `prefers-color-scheme`, via CSS alone. This file:
    - keeps the toggle button's icon/aria-state in sync with whatever is
      *effectively* showing (an explicit class, or the system preference)
    - only ever writes dark-theme/light-theme classes in response to an
      actual click - never on load - so the system-preference fallback in
      styles.css (`:root:not(.light-theme)` under the media query) keeps
      working for anyone who hasn't made a choice yet.
  ====================*/
(function () {
  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function hasExplicitChoice() {
    return (
      root.classList.contains("dark-theme") ||
      root.classList.contains("light-theme")
    );
  }

  function effectiveDark() {
    if (root.classList.contains("dark-theme")) return true;
    if (root.classList.contains("light-theme")) return false;
    return media.matches;
  }

  function syncButton(dark) {
    var btn = document.getElementById("theme-button");
    if (!btn) return;
    var icon = btn.querySelector("i");
    if (icon) {
      icon.classList.toggle("bx-sun", dark);
      icon.classList.toggle("bx-moon", !dark);
    }
    btn.setAttribute("aria-pressed", String(dark));
    btn.setAttribute(
      "aria-label",
      dark ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  function applyExplicit(dark) {
    root.classList.toggle("dark-theme", dark);
    root.classList.toggle("light-theme", !dark);
    root.style.colorScheme = dark ? "dark" : "light";
    syncButton(dark);
  }

  // Initial sync: reflect reality, don't force a choice nobody made.
  root.style.colorScheme = effectiveDark() ? "dark" : "light";
  syncButton(effectiveDark());

  var btn = document.getElementById("theme-button");
  if (btn) {
    btn.addEventListener("click", function () {
      var dark = !effectiveDark();
      applyExplicit(dark);
      try {
        localStorage.setItem("selected-theme", dark ? "dark" : "light");
      } catch (e) {}
    });
  }

  // Live-update when the user hasn't made an explicit choice.
  media.addEventListener("change", function (e) {
    if (!hasExplicitChoice()) {
      root.style.colorScheme = e.matches ? "dark" : "light";
      syncButton(e.matches);
    }
  });
})();
