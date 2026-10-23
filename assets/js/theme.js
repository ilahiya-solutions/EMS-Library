/*==================== THEME (single source of truth) ====================
  Pairs with the inline bootstrap snippet in each page's <head>, which
  applies the saved/system theme to <html> before first paint to avoid a
  flash of the wrong theme. This file only wires up the toggle button and
  keeps it in sync afterwards. ====================*/
(function () {
  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function isDark() {
    return root.classList.contains("dark-theme");
  }

  function paint(dark) {
    root.classList.toggle("dark-theme", dark);
    root.classList.toggle("light-theme", !dark);
    root.style.colorScheme = dark ? "dark" : "light";

    var btn = document.getElementById("theme-button");
    if (btn) {
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
  }

  // Sync UI with whatever the inline head script already applied.
  paint(isDark());

  var btn = document.getElementById("theme-button");
  if (btn) {
    btn.addEventListener("click", function () {
      var dark = !isDark();
      paint(dark);
      try {
        localStorage.setItem("selected-theme", dark ? "dark" : "light");
      } catch (e) {}
    });
  }

  // Live-update when the user hasn't made an explicit choice.
  media.addEventListener("change", function (e) {
    var stored;
    try {
      stored = localStorage.getItem("selected-theme");
    } catch (err) {
      stored = null;
    }
    if (!stored) paint(e.matches);
  });
})();
