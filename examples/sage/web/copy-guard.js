const editable = node => node?.closest?.('input,textarea,[contenteditable="true"]');
document.addEventListener('copy', event => {
  if (!editable(event.target) && !editable(document.activeElement)) event.preventDefault();
});
