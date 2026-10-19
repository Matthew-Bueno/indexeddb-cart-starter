// db.js: everything that talks to IndexedDB lives in this file.
// cart.js calls these functions. YOU write them, one day at a time.
// Each one throws "not built yet" until you replace that line with your code.

const DB_NAME = "shopDB";
const DB_VERSION = 2;

// ALREADY DONE: IndexedDB answers with events (onsuccess / onerror), not promises.
// promisify() wraps a request in a promise so you can use await, like you did with fetch.
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);  
  });
}

// ---------- Day 1: Open the database ----------
// Opens shopDB. Makes the "cart" store the first time.
// Gives back (a promise for) the open database.
function openDB() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  // Runs only when the database is new or DB_VERSION went up.
  // The ONLY place you can create object stores.
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains("cart")) {
      db.createObjectStore("cart", { keyPath: "id" });
    }
    // Day 3
    if (!db.objectStoreNames.contains("wishlist")) {
      db.createObjectStore("wishlist", { keyPath: "id" });
    }
  };

  return promisify(request);
}

// ---------- Day 2: CREATE ----------
// product: one object from PRODUCTS.
// Puts it in the cart with qty 1, or adds 1 to qty if it's already there.
async function addToCart(product) {
  const db = await openDB();
  const store = db.transaction("cart", "readwrite").objectStore("cart");

  const item = await promisify(store.get(product.id));

  if(item) {
    item.qty = item.qty + 1;
    await promisify(store.put(item));
  } else {
    await promisify(store.add({
      id: product.id,
      name: product.name,
      price: product.price,
      emoji: product.emoji,
      qty: 1,
    }));
  }
}

// ---------- Day 2: READ ----------
// Gives back an array of every item in the cart.
async function getCart() {
  const db = await openDB();
  const store = db.transaction("cart").objectStore("cart");
  // no mode = "readonly"
  return promisify(store.getAll());
}

// ---------- Day 2: UPDATE ----------
// id: which item. amount: 1 or -1.
// Changes that item's qty by amount.
async function changeQuantity(id, amount) {
  const db = await openDB();
  const store = db.transaction("cart", "readwrite").objectStore("cart");

  const item = await promisify(store.get(id));
  item.qty = item.qty + amount;

  if (item.qty <  1){
    await promisify(store.delete(id));
  } else
    await promisify(store.put(item));
}

// ---------- Day 3: DELETE ----------
// id: which item. Takes it out of the cart.
async function removeFromCart(id) {
  const db = await openDB();
  const store = db.transaction("cart", "readwrite").objectStore("cart");

  await promisify(store.delete(id));
}

// Empties the whole cart.
async function clearCart() {
  const db = await openDB();
  const store = db.transaction("cart", "readwrite").objectStore("cart");

  await promisify(store.clear());
}

// ---------- Day 3: Saved for later (you design this one) ----------
async function addToWishlist(product) {
  const db = await openDB();
  const store = db.transaction("wishlist", "readwrite").objectStore("wishlist");
  // put, not add: saving the same thing twice should not be an error
  await promisify(store.put({
    id: product.id,
    name: product.name,
    price: product.price,
    emoji: product.emoji,
  }));
}

async function getWishlist() {
  const db = await openDB();
  const store = db.transaction("wishlist").objectStore("wishlist");
  return promisify(store.getAll());
}

async function removeFromWishlist(id) {
  const db = await openDB();
  const store = db.transaction("wishlist", "readwrite").objectStore("wishlist");
  await promisify(store.delete(id));

}

// ---------- Challenge (optional) ----------
// One transaction, two stores: if any step fails, none of it happens.
async function moveToCart(id) {
  const db = await openDB();
  const tx = db.transaction(["wishlist", "cart"], "readwrite");
  const wishlist = tx.objectStore("wishlist");
  const cart = tx.objectStore("cart");

  const saved = await promisify(wishlist.get(id));
  const item = await promisify(cart.get(id));

  if (item) {
    item.qty = item.qty + 1;
    await promisify(cart.put(item));
  } else {
    saved.qty = 1;
    await promisify(cart.add(saved));
  }

  await promisify(wishlist.delete(id));
}