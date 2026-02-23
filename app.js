const express = require('express');
const { engine } = require('express-handlebars');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Motor de plantillas
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    length: arr => Array.isArray(arr) ? arr.length : 0,
    eq: (a, b) => a === b
  }
}));
app.set('view engine', 'hbs');

// ── Rutas GET ──────────────────────────────────────
app.get('/', (req, res) => {
  res.render('home');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/dashboard', (req, res) => {
  const contenido = fs.readFileSync('data.json', 'utf-8');
  const data = JSON.parse(contenido);
  res.render('dashboard', data);
});

// ── Ruta POST: agregar tarjeta ─────────────────────
app.post('/nueva-tarjeta', (req, res) => {
  const { boardId, listId, title, description, prioridad, tag, estado, fecha_inicio, fecha_fin, autor, responsable } = req.body;

  const contenido = fs.readFileSync('data.json', 'utf-8');
  const data = JSON.parse(contenido);

  const board = data.boards.find(b => b.id === parseInt(boardId));
  if (board) {
    const list = board.lists.find(l => l.id === parseInt(listId));
    if (list) {
      let maxId = 0;
      data.boards.forEach(b => b.lists.forEach(l => l.cards.forEach(c => {
        if (c.id > maxId) maxId = c.id;
      })));

      list.cards.push({
        id: maxId + 1,
        title: title.trim(),
        description: (description || '').trim(),
        prioridad: prioridad || 'Task',
        tag: tag || 'TASK',
        estado: estado || 'Backlog',
        fecha_creacion: new Date().toISOString().split('T')[0],
        fecha_inicio: fecha_inicio || '',
        fecha_fin: fecha_fin || '',
        autor: (autor || '').trim(),
        responsable: (responsable || '').trim()
      });
    }
  }

  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  res.redirect('/dashboard');
});

// ── Ruta POST: editar tarjeta ──────────────────────
app.post('/editar-tarjeta', (req, res) => {
  const { cardId, boardId, listId, title, description, prioridad, tag, estado, fecha_inicio, fecha_fin, autor, responsable } = req.body;

  const contenido = fs.readFileSync('data.json', 'utf-8');
  const data = JSON.parse(contenido);

  const board = data.boards.find(b => b.id === parseInt(boardId));
  if (board) {
    const list = board.lists.find(l => l.id === parseInt(listId));
    if (list) {
      const card = list.cards.find(c => c.id === parseInt(cardId));
      if (card) {
        card.title = title.trim();
        card.description = (description || '').trim();
        card.prioridad = prioridad || card.prioridad;
        card.tag = tag || card.tag;
        card.estado = estado || card.estado;
        card.fecha_inicio = fecha_inicio !== undefined ? fecha_inicio : card.fecha_inicio;
        card.fecha_fin = fecha_fin !== undefined ? fecha_fin : card.fecha_fin;
        card.autor = (autor || '').trim();
        card.responsable = (responsable || '').trim();
      }
    }
  }

  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  res.redirect('/dashboard');
});

// ── Ruta POST: mover tarjeta (fetch API, sin recarga) ──
app.post('/mover-tarjeta', (req, res) => {
  const { cardId, fromBoardId, fromListId, toBoardId, toListId } = req.body;

  const contenido = fs.readFileSync('data.json', 'utf-8');
  const data = JSON.parse(contenido);

  const fromBoard = data.boards.find(b => b.id === parseInt(fromBoardId));
  const toBoard   = data.boards.find(b => b.id === parseInt(toBoardId));

  if (!fromBoard || !toBoard) return res.status(400).json({ ok: false, error: 'Board no encontrado' });

  const fromList = fromBoard.lists.find(l => l.id === parseInt(fromListId));
  const toList   = toBoard.lists.find(l => l.id === parseInt(toListId));

  if (!fromList || !toList) return res.status(400).json({ ok: false, error: 'Lista no encontrada' });

  const cardIndex = fromList.cards.findIndex(c => c.id === parseInt(cardId));
  if (cardIndex === -1) return res.status(400).json({ ok: false, error: 'Tarjeta no encontrada' });

  const [card] = fromList.cards.splice(cardIndex, 1);
  toList.cards.push(card);

  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`KanbanPro escuchando en http://localhost:${port}`);
});
