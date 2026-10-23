/*==================== SHOW MENU ====================*/
const showMenu = (toggleId, navId) => {
  const toggle = document.getElementById(toggleId),
    nav = document.getElementById(navId);

  // Validate that variables exist
  if (toggle && nav) {
    const icon = toggle.querySelector("i");

    const setOpen = (isOpen) => {
      nav.classList.toggle("show-menu", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      if (icon) {
        icon.classList.toggle("bx-menu", !isOpen);
        icon.classList.toggle("bx-x", isOpen);
      }
      // Stop the page scrolling behind the full-screen mobile menu.
      document.body.style.overflow = isOpen ? "hidden" : "";
    };
    const toggleMenu = () => setOpen(!nav.classList.contains("show-menu"));

    toggle.addEventListener("click", toggleMenu);
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleMenu();
      }
    });

    // Close on Escape, or by tapping/clicking outside the open panel.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("show-menu")) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (
        nav.classList.contains("show-menu") &&
        !nav.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        setOpen(false);
      }
    });

    showMenu.close = () => setOpen(false);
  }
};
showMenu("nav-toggle", "nav-menu");

/*==================== REMOVE MENU MOBILE ====================*/
const navLink = document.querySelectorAll(".nav__link");

function linkAction() {
  // When we click on each nav__link, we remove the show-menu class
  if (showMenu.close) showMenu.close();
}
navLink.forEach((n) => n.addEventListener("click", linkAction));

/*==================== SCROLL SECTIONS ACTIVE LINK ====================*/
const sections = document.querySelectorAll("section[id]");

function scrollActive() {
  const scrollY = window.pageYOffset;

  sections.forEach((current) => {
    const sectionHeight = current.offsetHeight;
    const sectionTop = current.offsetTop - 50;
    sectionId = current.getAttribute("id");

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      document
        .querySelector(".nav__menu a[href*=" + sectionId + "]")
        .classList.add("active-link");
    } else {
      document
        .querySelector(".nav__menu a[href*=" + sectionId + "]")
        .classList.remove("active-link");
    }
  });
}
window.addEventListener("scroll", scrollActive);

/*==================== CHANGE BACKGROUND HEADER ====================*/
function scrollHeader() {
  const nav = document.getElementById("header");
  // When the scroll is greater than 200 viewport height, add the scroll-header class to the header tag
  if (this.scrollY >= 200) nav.classList.add("scroll-header");
  else nav.classList.remove("scroll-header");
}
window.addEventListener("scroll", scrollHeader);

/*==================== SHOW SCROLL TOP ====================*/
function scrollTop() {
  const scrollTop = document.getElementById("scroll-top");
  // When the scroll is higher than 560 viewport height, add the show-scroll class to the a tag with the scroll-top class
  if (this.scrollY >= 560) scrollTop.classList.add("show-scroll");
  else scrollTop.classList.remove("show-scroll");
}
window.addEventListener("scroll", scrollTop);

/* Theme toggle now lives in assets/js/theme.js (single authoritative
   implementation, shared by every page). */

/*==================== SCROLL REVEAL ANIMATION ====================*/
/*
const sr = ScrollReveal({
    origin: 'top',
    distance: '30px',
    duration: 2000,
    reset: true
});

sr.reveal(`.home__data, .home__img,
            .about__data, .about__img,
            .services__content, .menu__content,
            .app__data, .app__img,
            .contact__data, .contact__button,
            .footer__content`, {
    interval: 200
})

*/

/*==================== CATALOGUE ACCESSIBLE NAMES ====================*/
// Gives every book card's link(s)/image an accessible name derived from its
// title, instead of editing alt="" on ~90 hand-authored cards individually.
document.querySelectorAll(".menu__content").forEach(function (card) {
  var h3 = card.querySelector(".menu__name");
  if (!h3) return;
  var label = h3.textContent.replace(/\s+/g, " ").trim();
  var lang = card.querySelector(".menu__preci");
  var full = lang && lang.textContent.trim() ? label + " (" + lang.textContent.trim() + ")" : label;
  card.querySelectorAll("a").forEach(function (a) {
    if (!a.getAttribute("aria-label")) a.setAttribute("aria-label", "Open " + full);
  });
  var img = card.querySelector(".menu__img");
  if (img && !img.getAttribute("alt")) img.setAttribute("alt", full + " cover");
});

/*==================== OPEN BOOKS IN THE READER ====================*/
(function () {
  var grid = document.getElementById("myUL");
  var searchInput = document.getElementById("myInput");
  if (!grid) return;

  grid.addEventListener("click", function (e) {
    var link = e.target.closest('a[href$=".pdf"]');
    if (!link || !grid.contains(link)) return;
    var card = link.closest(".menu__content");
    var titleEl = card && card.querySelector(".menu__name");
    var langEl = card && card.querySelector(".menu__preci");
    var title = titleEl ? titleEl.textContent.replace(/\s+/g, " ").trim() : "";
    var lang = langEl ? langEl.textContent.trim() : "";

    try {
      sessionStorage.setItem(
        "ems-return-state",
        JSON.stringify({ query: searchInput ? searchInput.value : "", scrollY: window.scrollY })
      );
    } catch (err) {}

    e.preventDefault();
    var url =
      "reader.html?src=" + encodeURIComponent(link.getAttribute("href")) +
      "&title=" + encodeURIComponent(title) +
      "&meta=" + encodeURIComponent(lang);
    window.location.href = url;
  });

  // Restore search query + scroll position when coming back from the reader.
  window.addEventListener("DOMContentLoaded", function () {
    try {
      var saved = JSON.parse(sessionStorage.getItem("ems-return-state") || "null");
      if (saved) {
        if (searchInput && saved.query) {
          searchInput.value = saved.query;
          if (typeof myFunction === "function") myFunction();
        }
        window.scrollTo(0, saved.scrollY || 0);
        sessionStorage.removeItem("ems-return-state");
      }
    } catch (err) {}
  });
})();
