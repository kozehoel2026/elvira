-- Схема бази даних кав'ярні «Солодкий куточок» (SQLite)

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    full_name     TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('admin', 'cashier')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS desserts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    price       REAL    NOT NULL CHECK (price >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active   INTEGER NOT NULL DEFAULT 1,
    image       TEXT    NOT NULL DEFAULT ''   -- ім'я файлу фото в static/img/desserts/
);

-- Замовлення. Два джерела:
--   staff — оформив касир, одразу «done» (виконано);
--   kiosk — оформив сам клієнт: new (готується) -> ready (готове) -> done (видано й оплачено).
-- user_id — працівник, який оформив / видав замовлення (для kiosk до видачі — NULL).
CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER REFERENCES users(id),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    total         REAL    NOT NULL DEFAULT 0,
    status        TEXT    NOT NULL DEFAULT 'done'
                  CHECK (status IN ('new', 'ready', 'done', 'cancelled')),
    customer_note TEXT    NOT NULL DEFAULT '',
    source        TEXT    NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'kiosk')),
    customer_name TEXT    NOT NULL DEFAULT '',   -- ім'я клієнта, щоб покликати
    token         TEXT    NOT NULL DEFAULT '',   -- секретний ключ сторінки відстеження
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dessert_id INTEGER NOT NULL REFERENCES desserts(id),
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    price      REAL    NOT NULL
);
