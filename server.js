// Автоматизована система кав'ярні «Солодкий куточок» (продаж десертів).
//
// Запуск:  npm start   (або  node server.js)   ->   http://127.0.0.1:5000
import { createServer } from 'node:http';

import { config } from './src/config.js';
import { Context } from './src/core/context.js';
import { HttpError } from './src/core/errors.js';
import { Router } from './src/core/router.js';
import { SessionStore } from './src/core/sessions.js';
import { STATIC_PREFIX, serveStatic } from './src/core/static.js';
import { openDatabase } from './src/db.js';
import { registerAdminRoutes } from './src/routes/admin.js';
import { registerKioskRoutes } from './src/routes/kiosk.js';
import { registerOrderRoutes } from './src/routes/orders.js';
import { registerPublicRoutes } from './src/routes/public.js';
import { registerQueueRoutes } from './src/routes/queue.js';
import { registerReportRoutes } from './src/routes/reports.js';
import { ERROR_TEXTS, errorView } from './src/views/error.js';

// база створюється / оновлюється під час запуску
const db = await openDatabase();
const sessions = new SessionStore(config.sessionTtlMs);

const router = new Router();
for (const register of [
  registerPublicRoutes, registerKioskRoutes, registerOrderRoutes, registerQueueRoutes,
  registerAdminRoutes, registerReportRoutes,
]) {
  register(router);
}

async function handle(ctx) {
  const { method } = ctx.req;
  const { pathname } = ctx.url;

  if (pathname.startsWith(STATIC_PREFIX) && (method === 'GET' || method === 'HEAD')) {
    return serveStatic(ctx);
  }
  const found = router.match(method, pathname);
  if (!found) throw new HttpError(router.allows(pathname) ? 405 : 404);
  ctx.params = found.params;
  return found.handler(ctx);
}

function handleError(ctx, err) {
  if (ctx.res.headersSent) {
    ctx.res.destroy(err);
    return;
  }
  const status = err instanceof HttpError ? err.status : 500;
  if (status === 413) {
    ctx.flash('Файл фото завеликий (максимум 5 МБ).', 'error');
    ctx.res.setHeader('Connection', 'close');
    return ctx.back('/admin/desserts');
  }
  if (status === 500) console.error(err);
  const text = (err instanceof HttpError && err.message.startsWith('HTTP') === false && err.message)
    || ERROR_TEXTS.get(status) || 'Помилка.';
  ctx.render(errorView, { title: `Помилка ${status}`, code: status, text }, status);
}

const server = createServer(async (req, res) => {
  const ctx = new Context(req, res, { db, sessions });
  try {
    await handle(ctx);
  } catch (err) {
    try {
      handleError(ctx, err);
    } catch (fatal) {
      console.error(fatal);
      res.destroy();
    }
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Кав'ярня «Солодкий куточок» працює: http://${config.host}:${config.port}`);
  console.log('Зупинити сервер — Ctrl+C');
});

// коректне завершення: закриваємо сервер і базу
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close();
    server.closeAllConnections();
    db.close();
    process.exit(0);
  });
}
