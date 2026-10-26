(() => {
  const triggers = [...document.querySelectorAll('[data-lightbox-image]')];
  if (!triggers.length || typeof HTMLDialogElement === 'undefined') return;

  const dialog = document.createElement('dialog');
  dialog.className = 'docs-lightbox';
  dialog.setAttribute('aria-label', 'Enlarged screenshot');

  const panel = document.createElement('div');
  panel.className = 'docs-lightbox-panel';

  const image = document.createElement('img');
  image.className = 'docs-lightbox-image';

  const caption = document.createElement('p');
  caption.className = 'docs-lightbox-caption';

  const close = document.createElement('button');
  close.className = 'docs-lightbox-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close enlarged screenshot');
  close.textContent = '×';

  panel.append(image, caption, close);
  dialog.append(panel);
  document.body.append(dialog);

  let returnFocus = null;

  const closeDialog = () => {
    if (dialog.open) dialog.close();
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const thumbnail = trigger.querySelector('img');
      returnFocus = trigger;
      image.src = trigger.href;
      image.alt = thumbnail?.alt ?? '';
      caption.textContent = trigger.dataset.lightboxCaption ?? '';
      caption.hidden = !caption.textContent;
      dialog.showModal();
      close.focus();
    });
  });

  close.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    image.removeAttribute('src');
    returnFocus?.focus();
    returnFocus = null;
  });
})();
