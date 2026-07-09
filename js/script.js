/* ==========================================================================
   The House of Minds - Main JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');

  if (menuToggle && navMenu) {
    const bars = menuToggle.querySelectorAll('.bar');

    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      menuToggle.classList.toggle('active');

      if (menuToggle.classList.contains('active')) {
        bars[0].style.transform = 'translateY(8px) rotate(45deg)';
        bars[1].style.opacity = '0';
        bars[2].style.transform = 'translateY(-8px) rotate(-45deg)';
      } else {
        bars[0].style.transform = 'none';
        bars[1].style.opacity = '1';
        bars[2].style.transform = 'none';
      }
    });

    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        menuToggle.classList.remove('active');
        bars.forEach((bar) => (bar.style.transform = 'none'));
        bars[1].style.opacity = '1';
      });
    });
  }

  // 2. Sticky Header Scroll Effect
  const header = document.querySelector('.main-header');
  const handleScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll);
  handleScroll();

  // 2b. Active nav state based on the current page URL
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const normalizeHref = (href) => {
    try {
      const url = new URL(href, window.location.href);
      return url.pathname.split('/').pop() || 'index.html';
    } catch {
      return href;
    }
  };

  document.querySelectorAll('.nav-menu a, .footer-links a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const targetPath = normalizeHref(href);
    if (targetPath === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 3. GSAP stacked section overlay
  // The browser still owns scrolling; ScrollTrigger only pins the panel rail
  // while each section slides upward exactly one viewport height.
  const hasGsap = typeof window.gsap !== 'undefined';
  const hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';
  const stackRail = document.querySelector('.stack-stack');
  const stackPanels = stackRail ? Array.from(stackRail.querySelectorAll('.stack-section')) : [];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktopQuery = window.matchMedia('(min-width: 1025px)');

  let stackTrigger = null;
  let stackScrollTween = null;
  let stackLocked = false;
  let isAnimating = false;
  let stackEnabled = false;
  let stackStartY = 0;
  let stackStepY = window.innerHeight;
  let stackMaxY = 0;
  const scrollProxy = { y: window.scrollY };
  let activeIndex = 0;
  let unlockTimer = null;
  let animationFinished = false;
  const inputQuietMs = 180;
  const transitionDuration = 0.58;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const getPanelIndex = () => clamp(activeIndex, 0, stackPanels.length - 1);
  const isInStackRange = () => window.scrollY >= stackStartY - 2 && window.scrollY <= stackMaxY + 2;

  const destroyStack = () => {
    window.removeEventListener('wheel', handleStackWheel, { capture: true });
    window.removeEventListener('touchstart', handleStackTouchStart);
    window.removeEventListener('touchmove', handleStackTouchMove, { capture: true });
    window.removeEventListener('touchend', handleStackTouchEnd);
    window.removeEventListener('touchcancel', handleStackTouchEnd);
    stackEnabled = false;

    if (stackTrigger) {
      const stackAnimation = stackTrigger.animation;
      stackTrigger.kill();
      if (stackAnimation) stackAnimation.kill();
      stackTrigger = null;
    }

    if (stackRail) {
      stackRail.classList.remove('gsap-stack-active');
    }

    if (stackScrollTween) {
      stackScrollTween.kill();
      stackScrollTween = null;
    }

    if (unlockTimer) {
      clearTimeout(unlockTimer);
      unlockTimer = null;
    }

    stackLocked = false;
    isAnimating = false;
    animationFinished = false;
    activeIndex = 0;

    stackPanels.forEach((panel) => {
      panel.style.zIndex = '';
      panel.style.transform = '';
      panel.style.position = '';
      panel.style.inset = '';
      panel.style.top = '';
      panel.style.left = '';
      panel.style.width = '';
      panel.style.height = '';
    });
  };

  const animateScrollTo = (targetY) => {
    if (stackScrollTween) {
      stackScrollTween.kill();
      stackScrollTween = null;
    }

    stackLocked = true;
    isAnimating = true;
    animationFinished = false;
    if (unlockTimer) clearTimeout(unlockTimer);
    scrollProxy.y = window.scrollY;
    stackScrollTween = gsap.to(scrollProxy, {
      duration: transitionDuration,
      ease: 'power4.out',
      y: targetY,
      onUpdate: () => {
        window.scrollTo(0, scrollProxy.y);
      },
      onComplete: () => {
        isAnimating = false;
        animationFinished = true;
        stackScrollTween = null;
        scheduleGestureUnlock();
      },
    });
  };

  const scheduleGestureUnlock = () => {
    if (!animationFinished) return;
    if (unlockTimer) clearTimeout(unlockTimer);

    unlockTimer = window.setTimeout(() => {
      stackLocked = false;
      animationFinished = false;
      unlockTimer = null;
    }, inputQuietMs);
  };

  const absorbGestureEvent = (event) => {
    event.preventDefault();
    if (stackLocked && animationFinished) {
      scheduleGestureUnlock();
    }
  };

  const buildStack = () => {
    if (!hasGsap || !hasScrollTrigger || !desktopQuery.matches || !stackRail || !stackPanels.length || prefersReducedMotion) {
      destroyStack();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    destroyStack();

    gsap.set(stackPanels, { clearProps: 'all' });
    stackPanels.forEach((panel, index) => {
      panel.style.zIndex = String(index + 1);
      gsap.set(panel, {
        yPercent: index === 0 ? 0 : 100,
      });
    });
    stackRail.classList.add('gsap-stack-active');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stackRail,
        start: 'top top',
        end: () => `+=${window.innerHeight * (stackPanels.length - 1)}`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    stackPanels.forEach((panel, index) => {
      if (index === 0) return;
      tl.to(
        panel,
        {
          yPercent: 0,
          ease: 'none',
          duration: 1,
        },
        index - 1
      );
    });

    stackTrigger = tl.scrollTrigger;
    stackStartY = stackRail.offsetTop;
    stackStepY = window.innerHeight;
    stackMaxY = stackStartY + stackStepY * (stackPanels.length - 1);
    activeIndex = clamp(Math.round((window.scrollY - stackStartY) / stackStepY), 0, stackPanels.length - 1);
    stackEnabled = true;
    window.addEventListener('wheel', handleStackWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', handleStackTouchStart, { passive: true });
    window.addEventListener('touchmove', handleStackTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleStackTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleStackTouchEnd, { passive: true });
    ScrollTrigger.refresh();
  };

  buildStack();
  window.addEventListener('resize', () => {
    handleScroll();
    buildStack();
  });
  window.addEventListener('load', () => {
    if (window.ScrollTrigger) {
      ScrollTrigger.refresh();
    }
  });

  const onStackGesture = (direction) => {
    if (!stackPanels.length || stackLocked || isAnimating || !isInStackRange()) return false;

    const currentIndex = getPanelIndex();
    const atFirst = currentIndex <= 0;
    const atLast = currentIndex >= stackPanels.length - 1;

    if (direction > 0 && atLast) {
      return false;
    }

    if (direction < 0 && atFirst) {
      return false;
    }

    const nextIndex = clamp(currentIndex + direction, 0, stackPanels.length - 1);
    const targetY = stackStartY + nextIndex * stackStepY;
    activeIndex = nextIndex;
    animateScrollTo(targetY);
    return true;
  };

  function handleStackWheel(event) {
    if (!stackEnabled || !stackPanels.length || prefersReducedMotion || !isInStackRange()) return;
    const direction = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
    if (!direction) return;

    const currentIndex = getPanelIndex();
    if (direction > 0 && currentIndex >= stackPanels.length - 1 && !stackLocked) {
      return;
    }

    if (stackLocked || isAnimating) {
      absorbGestureEvent(event);
      return;
    }

    event.preventDefault();
    onStackGesture(direction);
  }

  let touchStartY = null;
  let touchGestureHandled = false;
  function handleStackTouchStart(event) {
    if (!stackEnabled) return;
    if (!isInStackRange()) return;
    touchStartY = event.touches[0]?.clientY ?? null;
    touchGestureHandled = false;
  }

  function handleStackTouchMove(event) {
    if (!stackEnabled || !stackPanels.length || prefersReducedMotion || touchStartY === null || !isInStackRange()) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? touchStartY;
    const delta = touchStartY - currentY;
    if (Math.abs(delta) < 8) return;

    const direction = delta > 0 ? 1 : -1;
    const currentIndex = getPanelIndex();

    if (direction > 0 && currentIndex >= stackPanels.length - 1 && !stackLocked) {
      return;
    }

    event.preventDefault();

    if (touchGestureHandled || stackLocked || isAnimating) return;
    touchGestureHandled = true;
    onStackGesture(direction);
  }

  function handleStackTouchEnd() {
    touchStartY = null;
    touchGestureHandled = false;
  }

  // 4. Reveal Animations
  const animateElements = document.querySelectorAll('.animate-on-scroll');
  if (hasGsap && hasScrollTrigger) {
    animateElements.forEach((el) => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  } else if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('appear');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    animateElements.forEach((el) => observer.observe(el));
  } else {
    animateElements.forEach((el) => el.classList.add('appear'));
  }

  // 5. Newsletter Signup Mock Submission
  const newsletterForm = document.getElementById('newsletterForm');
  const feedback = document.getElementById('newsletterFeedback');

  if (newsletterForm && feedback) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = newsletterForm.querySelector('input[type="email"]');
      const email = emailInput ? emailInput.value.trim() : '';

      if (email) {
        feedback.textContent = 'Subscribing...';
        feedback.className = 'newsletter-feedback';

        setTimeout(() => {
          feedback.textContent = 'Thank you for connecting with us!';
          feedback.className = 'newsletter-feedback success';
          if (emailInput) emailInput.value = '';

          setTimeout(() => {
            feedback.textContent = '';
            feedback.className = 'newsletter-feedback';
          }, 4000);
        }, 800);
      }
    });
  }

  // 6. FAQ Accordion Toggle
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach((otherItem) => {
        if (otherItem !== item) otherItem.classList.remove('open');
      });

      item.classList.toggle('open', !isOpen);
    });
  });

  // 7. About page reveal sections
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealIO = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('show');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach((el) => revealIO.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('show'));
  }

  // 8. About page interactive services
  const serviceItems = document.querySelectorAll('.services-list-item');
  const visualStack = document.querySelector('.services-visual-stack');

  if (serviceItems.length && visualStack) {
    let zCounter = 10;
    let activeSrc = visualStack.querySelector('.visual-img')?.getAttribute('src') || '';

    const swapVisual = (item) => {
      const src = item.getAttribute('data-img');
      if (!src || src === activeSrc) return;
      activeSrc = src;

      serviceItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');

      visualStack.querySelectorAll('.visual-img').forEach((img) => {
        img.classList.remove('in');
        img.classList.add('leaving');
        setTimeout(() => img.remove(), 750);
      });

      const incoming = document.createElement('img');
      incoming.src = src;
      incoming.alt = item.getAttribute('data-alt') || '';
      incoming.className = 'visual-img entering';
      incoming.style.zIndex = String(++zCounter);
      visualStack.appendChild(incoming);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          incoming.classList.remove('entering');
          incoming.classList.add('in');
        });
      });
    };

    serviceItems.forEach((item) => {
      item.addEventListener('mouseenter', () => swapVisual(item));
      item.addEventListener('focus', () => swapVisual(item));
      item.addEventListener('click', () => swapVisual(item));
    });
  }
});
