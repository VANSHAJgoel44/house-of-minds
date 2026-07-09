/* ==========================================================================
   The House of Minds - Contact Page Enhancements
   Contact form submission only; shared navigation and footer behavior live in script.js.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');
  const contactStatus = document.getElementById('contactFormStatus');

  if (!contactForm || !contactStatus) return;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    contactStatus.textContent = 'Sending your message...';
    contactStatus.className = 'form-status';

    setTimeout(() => {
      contactStatus.textContent = 'Thank you! We will get back to you shortly.';
      contactStatus.className = 'form-status success';
      contactForm.reset();

      setTimeout(() => {
        contactStatus.textContent = '';
        contactStatus.className = 'form-status';
      }, 5000);
    }, 800);
  });
});
