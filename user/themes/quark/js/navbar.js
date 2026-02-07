// Desktop navbar: single-open dropdown + submenu behavior
(function() {
  'use strict';

  function initNavbar() {
    var header = document.getElementById('custom-header');
    if (!header) return;

    var OPEN_DELAY = 80;
    var CLOSE_DELAY = 140;

    var topItems = Array.prototype.slice.call(
      header.querySelectorAll('.navbar-item.has-children')
    );
    var subItems = Array.prototype.slice.call(
      header.querySelectorAll('.navbar-dropdown-item.has-submenu')
    );

    var closeTimer = null;

    function setOpen(item, isOpen) {
      item.classList.toggle('is-open', isOpen);
      var link = item.querySelector(':scope > .navbar-link');
      if (link) {
        link.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    }

    function setSubOpen(item, isOpen) {
      item.classList.toggle('is-open', isOpen);
      var link = item.querySelector(':scope > .navbar-dropdown-link');
      if (link) {
        link.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    }

    function closeAll() {
      topItems.forEach(function(item) { setOpen(item, false); });
      subItems.forEach(function(item) { setSubOpen(item, false); });
    }

    function closeTopSiblings(activeItem) {
      topItems.forEach(function(item) {
        if (item !== activeItem) setOpen(item, false);
      });
    }

    function closeSubSiblings(activeItem) {
      subItems.forEach(function(item) {
        if (item !== activeItem) setSubOpen(item, false);
      });
    }

    topItems.forEach(function(item) {
      var openTimer = null;
      item.addEventListener('mouseenter', function() {
        clearTimeout(closeTimer);
        clearTimeout(openTimer);
        openTimer = setTimeout(function() {
          closeTopSiblings(item);
          setOpen(item, true);
        }, OPEN_DELAY);
      });
      item.addEventListener('mouseleave', function() {
        clearTimeout(openTimer);
        closeTimer = setTimeout(function() {
          setOpen(item, false);
        }, CLOSE_DELAY);
      });
      item.addEventListener('focusin', function() {
        closeTopSiblings(item);
        setOpen(item, true);
      });
      item.addEventListener('focusout', function(e) {
        if (!item.contains(e.relatedTarget)) {
          setOpen(item, false);
        }
      });
    });

    subItems.forEach(function(item) {
      var subTimer = null;
      item.addEventListener('mouseenter', function() {
        clearTimeout(subTimer);
        closeSubSiblings(item);
        setSubOpen(item, true);
        var submenu = item.querySelector(':scope > .navbar-submenu');
        if (submenu) {
          var rect = submenu.getBoundingClientRect();
          var overflowRight = rect.right > window.innerWidth - 8;
          item.classList.toggle('flip-left', overflowRight);
        }
      });
      item.addEventListener('mouseleave', function() {
        subTimer = setTimeout(function() {
          setSubOpen(item, false);
        }, CLOSE_DELAY);
      });
      item.addEventListener('focusin', function() {
        closeSubSiblings(item);
        setSubOpen(item, true);
      });
      item.addEventListener('focusout', function(e) {
        if (!item.contains(e.relatedTarget)) {
          setSubOpen(item, false);
        }
      });
    });

    header.addEventListener('mouseleave', function() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function() {
        closeAll();
      }, CLOSE_DELAY);
    });

    document.addEventListener('click', function(e) {
      if (!header.contains(e.target)) {
        closeAll();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeAll();
        if (header.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      }
    });

    function updateScrollState() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    }
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
  } else {
    initNavbar();
  }
})();
