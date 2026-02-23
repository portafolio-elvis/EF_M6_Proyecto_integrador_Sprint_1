'use strict';

let draggedCard   = null;
let dragFromList  = null;
let dragFromBoard = null;

// afterMove runs synchronously inside the transition callback,
// guaranteeing the count update sees the already-moved card.
function moveCardToColumn(card, targetCol, afterMove) {
  const doMove = () => {
    targetCol.appendChild(card);
    if (afterMove) afterMove();
  };

  if ('startViewTransition' in document) {
    document.startViewTransition(doMove);
  } else {
    doMove();
  }
}

function updateCount(listEl) {
  const badge = listEl.querySelector('.kanban-list-count');
  if (badge) badge.textContent = listEl.querySelectorAll('.kanban-card').length;
}

function persistMove(cardId, fromBoardId, fromListId, toBoardId, toListId) {
  fetch('/mover-tarjeta', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, fromBoardId, fromListId, toBoardId, toListId })
  })
    .then(r => r.json())
    .then(data => { if (!data.ok) location.reload(); })
    .catch(() => location.reload());
}

// ── Desktop Drag & Drop ──────────────────────────────
function initDesktopDrag() {
  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      draggedCard   = card;
      dragFromList  = card.dataset.listId;
      dragFromBoard = card.dataset.boardId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      if (draggedCard) draggedCard.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      draggedCard = null;
    });
  });

  document.querySelectorAll('.kanban-cards').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });

    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      if (!draggedCard) return;

      const toListId  = col.dataset.listId;
      const toBoardId = col.dataset.boardId;
      if (toListId === dragFromList && toBoardId === dragFromBoard) return;

      // Capture everything before any async work
      const card        = draggedCard;
      const cardId      = card.dataset.cardId;
      const fromBoardId = dragFromBoard;
      const fromListId  = dragFromList;
      const fromListEl  = card.closest('.kanban-list');
      const toListEl    = col.closest('.kanban-list');

      draggedCard   = null;
      dragFromList  = null;
      dragFromBoard = null;

      moveCardToColumn(card, col, () => {
        card.classList.remove('dragging');
        card.dataset.listId  = toListId;
        card.dataset.boardId = toBoardId;
        updateCount(fromListEl);
        updateCount(toListEl);
      });

      persistMove(cardId, fromBoardId, fromListId, toBoardId, toListId);
    });
  });
}

// ── Touch Drag ───────────────────────────────────────
let touchCard      = null;
let touchClone     = null;
let touchFromList  = null;
let touchFromBoard = null;

function initTouchDrag() {
  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('touchstart', e => {
      // Don't hijack touches on the edit button
      if (e.target.closest('[data-edit-btn]')) return;

      touchCard      = card;
      touchFromList  = card.dataset.listId;
      touchFromBoard = card.dataset.boardId;

      const rect = card.getBoundingClientRect();
      touchClone = card.cloneNode(true);
      touchClone.classList.add('touch-clone');
      touchClone.style.width  = rect.width  + 'px';
      touchClone.style.left   = rect.left   + 'px';
      touchClone.style.top    = rect.top    + 'px';
      document.body.appendChild(touchClone);

      card.classList.add('dragging');
    }, { passive: true });
  });

  document.addEventListener('touchmove', e => {
    if (!touchClone) return;
    e.preventDefault();

    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - touchClone.offsetWidth  / 2) + 'px';
    touchClone.style.top  = (touch.clientY - touchClone.offsetHeight / 2) + 'px';

    touchClone.style.visibility = 'hidden';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    touchClone.style.visibility = 'visible';

    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
    const col = el?.closest('.kanban-cards');
    if (col) col.classList.add('drag-over');
  }, { passive: false });

  document.addEventListener('touchend', e => {
    if (!touchCard || !touchClone) return;

    const touch = e.changedTouches[0];
    touchClone.style.visibility = 'hidden';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    touchClone.style.visibility = 'visible';

    const col = el?.closest('.kanban-cards');

    if (col) {
      const toListId  = col.dataset.listId;
      const toBoardId = col.dataset.boardId;

      if (toListId !== touchFromList || toBoardId !== touchFromBoard) {
        const card       = touchCard;
        const cardId     = card.dataset.cardId;
        const fromBoard  = touchFromBoard;
        const fromList   = touchFromList;
        const fromListEl = card.closest('.kanban-list');
        const toListEl   = col.closest('.kanban-list');

        moveCardToColumn(card, col, () => {
          card.dataset.listId  = toListId;
          card.dataset.boardId = toBoardId;
          updateCount(fromListEl);
          updateCount(toListEl);
        });

        persistMove(cardId, fromBoard, fromList, toBoardId, toListId);
      }
    }

    document.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
    touchCard.classList.remove('dragging');
    touchClone.remove();
    touchClone     = null;
    touchCard      = null;
    touchFromList  = null;
    touchFromBoard = null;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDesktopDrag();
  initTouchDrag();
});
