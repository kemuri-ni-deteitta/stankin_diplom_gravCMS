// Desktop navbar: single-open mega dropdown behavior
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

    var closeTimer = null;

    function setOpen(item, isOpen) {
      item.classList.toggle('is-open', isOpen);
      var link = item.querySelector(':scope > .navbar-link');
      if (link) {
        link.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    }

    function closeAll() {
      topItems.forEach(function(item) { setOpen(item, false); });
    }

    function closeTopSiblings(activeItem) {
      topItems.forEach(function(item) {
        if (item !== activeItem) setOpen(item, false);
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

      var link = item.querySelector(':scope > .navbar-link');
      if (link) {
        link.addEventListener('click', function(e) {
          var isOpen = item.classList.contains('is-open');
          e.preventDefault();
          closeAll();
          setOpen(item, !isOpen);
        });

        link.addEventListener('keydown', function(e) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            closeTopSiblings(item);
            setOpen(item, true);
            var firstMegaLink = item.querySelector('.navbar-mega-link');
            if (firstMegaLink) {
              firstMegaLink.focus();
            }
          }
        });
      }
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

    header.addEventListener('mouseleave', function() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function() {
        closeAll();
      }, CLOSE_DELAY);
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
