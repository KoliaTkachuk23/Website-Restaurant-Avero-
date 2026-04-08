const apiUrl = `${window.location.origin}/api/menu`;
const webOrderApiUrl = `${window.location.origin}/api/weborder`
const menuContainer = document.getElementById("menuContainer");

let allItems = [];
let activeCategory = null;
let activeSubCategory = null;
let cart = [];
let isCartOpen = false;
let qrToken = null;
let currentTableId = null;

function readTokenFromUrl(){
    const params = new URLSearchParams(window.location.search);
    qrToken = params.get("t");

    console.log("QR token =", qrToken);
}


async function resolveTableByToken() {
    if(!qrToken){
        currentTableId = null;
        return;
    }

    try{
        const response = await fetch(`${window.location.origin}/api/weborder/resolve-table?token=${encodeURIComponent(qrToken)}`);

        if(!response.ok){
            throw new Error("Не вдалось визначити стіл по токену");

        }

        const data = await response.json();
        currentTableId = data.tableId ?? null;

        console.log("currentTableId= ", currentTableId);
    }catch(error){
         console.error("Помилка визначення столу:", error);
        currentTableId = null;
    }
}

async function loadMenu() {
    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error("Не вдалося отримати дані з API");
        }

        allItems = await response.json();

        if (!allItems || allItems.length === 0) {
            menuContainer.innerHTML = `<div class="empty-state">Меню поки порожнє.</div>`;
            return;
        }

        const categories = getCategories(allItems);
        activeCategory = categories[0] || null;

        const subCategories = getSubCategories(allItems, activeCategory);
        activeSubCategory = subCategories[0] || null;

        renderLayout();
    }
    catch (error) {
        console.error(error);
        menuContainer.innerHTML = `
            <div class="error-state">
                Помилка завантаження меню. Перевір API та підключення: ${error.message}
            </div>
        `;
    }
}

function getCategories(items) {
    return [...new Set(items.map(x => x.category || "Інше"))];
}

function getSubCategories(items, category) {
    return [
        ...new Set(
            items
                .filter(x => (x.category || "Інше") === category)
                .map(x => x.subCategory || "Без підкатегорії")
        )
    ];
}

function getFilteredItems() {
    return allItems.filter(item => {
        const category = item.category || "Інше";
        const subCategory = item.subCategory || "Без підкатегорії";

        return category === activeCategory && subCategory === activeSubCategory;
    });
}

function renderLayout() {
    menuContainer.innerHTML = `
        <section class="menu-layout">
            <aside id="categoryNav" class="category-nav"></aside>
            <div class="menu-main">
                <div id="subcategoryNav" class="subcategory-nav"></div>
                <div id="menuGrid" class="menu-grid"></div>
            </div>
        </section>
    `;

    renderCategories();
    renderSubCategories();
    renderItems();
}

function renderCategories() {
    const container = document.getElementById("categoryNav");
    const categories = getCategories(allItems);

    container.innerHTML = `
        <h2 class="nav-title">Категорії</h2>
        ${categories.map(category => `
            <button class="nav-btn ${category === activeCategory ? "active" : ""}"
                    onclick="selectCategory('${escapeJs(category)}')">
                ${escapeHtml(category)}
            </button>
        `).join("")}
    `;
}

function renderSubCategories() {
    const container = document.getElementById("subcategoryNav");
    const subCategories = getSubCategories(allItems, activeCategory);

    if (!subCategories.includes(activeSubCategory)) {
        activeSubCategory = subCategories[0] || null;
    }

    container.innerHTML = `
        <h3 class="subnav-title">${escapeHtml(activeCategory || "")}</h3>
        <div class="subnav-buttons">
            ${subCategories.map(sub => `
                <button class="subnav-btn ${sub === activeSubCategory ? "active" : ""}"
                        onclick="selectSubCategory('${escapeJs(sub)}')">
                    ${escapeHtml(sub)}
                </button>
            `).join("")}
        </div>
    `;
}

function renderItems() {
    const grid = document.getElementById("menuGrid");
    const items = getFilteredItems();

    if (!items.length) {
        grid.innerHTML = `<div class="empty-state">У цій підкатегорії ще немає позицій меню.</div>`;
        return;
    }

    grid.innerHTML = items.map(item => `
        <article class="menu-card">
            ${createImageBlock(item)}
            <div class="menu-body">
                <div>
                    <h4 class="menu-name">${escapeHtml(item.name || "")}</h4>
                    <p class="menu-description">${escapeHtml(item.description || "")}</p>
                </div>
                <div class="menu-footer">
                    <div class="menu-price">${formatPrice(item.price)} грн</div>
                </div>
                <button class="add-to-cart-btn" onclick="addToCart(${item.id})">
                Додати в кошик
                </button>
            </div>
        </article>
    `).join("");
}

function selectCategory(category) {
    activeCategory = category;
    const subCategories = getSubCategories(allItems, activeCategory);
    activeSubCategory = subCategories[0] || null;

    renderCategories();
    renderSubCategories();
    renderItems();
}

function selectSubCategory(subCategory) {
    activeSubCategory = subCategory;
    renderSubCategories();
    renderItems();
}

function createImageBlock(item) {
    if (item.imagePath) {
        const imageUrl = `${window.location.origin}${item.imagePath}`;
        return `
            <div class="menu-image-wrap">
                <img
                    src="${imageUrl}"
                    alt="${escapeHtml(item.name || "Страва")}"
                    class="menu-image"
                    onerror="this.remove(); this.parentElement.innerHTML = '<div class=&quot;menu-image-placeholder&quot;>Немає фото</div>';"
                />
            </div>
        `;
    }

    return `
        <div class="menu-image-wrap">
            <div class="menu-image-placeholder">Немає фото</div>
        </div>
    `;
}

function formatPrice(value) {
    if (value === null || value === undefined || value === "") {
        return "0";
    }

    return Number(value).toLocaleString("uk-UA");
}


function addToCart(itemId) {
   

    const menuItem = allItems.find(x => x.id === itemId);

    if (!menuItem) {
        console.log("menuItem не знайдено");
        return;
    }

    const existing = cart.find(x => x.id === itemId);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: menuItem.id,
            name: menuItem.name,
            price: Number(menuItem.price || 0),
            quantity: 1
        });
    }

    console.log("cart =", cart);
    renderCart();
}

function decreaseCartItem(itemId)
{
    const item = cart.find(x => x.id === itemId);
    if(!item) return;

    item.quantity -= 1;

    if(item.quantity <= 0) {
        cart = cart.filter(x => x.id !== itemId)
    }

    renderCart();

}


function increaseCartItem(itemId){
    const item = cart.find(x => x.id === itemId);
    if(!item) return;

    item.quantity += 1;
    renderCart();
}

function removeCartItem(itemId){
    cart = cart.filter(x => x.id !== itemId);
    renderCart();
}async function checkoutOrder() {
    if (cart.length === 0) {
        alert("Кошик порожній.");
        return;
    }

    const customerName = document.getElementById("customerNameInput")?.value?.trim() || "";
    const comment = document.getElementById("commentInput")?.value?.trim() || "";



    const payload = {
        tableId: currentTableId,
        customerName: customerName,
        comment: comment,
        items: cart.map(item => ({
            menuItemId: item.id,
            quantity: item.quantity
        }))
    };

    console.log("payload =", payload);

    try {
        const response = await fetch(webOrderApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const resultText = await response.text();

        if (!response.ok) {
            throw new Error(resultText || "Не вдалося створити замовлення");
        }

        let result = null;
        try {
            result = JSON.parse(resultText);
        } catch {}

        cart = [];
        renderCart();

        const customerNameInput = document.getElementById("customerNameInput");
        const commentInput = document.getElementById("commentInput");

        if (customerNameInput) customerNameInput.value = "";
        if (commentInput) commentInput.value = "";

        closeCart();

        alert(result?.message
            ? `${result.message}. Номер: ${result.webOrderId}`
            : "Замовлення успішно відправлено.");
    } catch (error) {
        console.error(error);
        alert("Помилка оформлення замовлення: " + error.message);
    }
}

function openCart(){
   const cartSidebar = document.getElementById("cartSidebar");
   const cartOverlay = document.getElementById("cartOverlay");
   
   if(!cartSidebar || !cartOverlay) return;

   cartSidebar.classList.remove("hidden");
   cartOverlay.classList.remove("hidden");
   document.body.style.overflow = "hidden";
   isCartOpen = true;
}

function closeCart(){
     const cartSidebar = document.getElementById("cartSidebar");
   const cartOverlay = document.getElementById("cartOverlay");
   
   if(!cartSidebar || !cartOverlay) return;

   cartSidebar.classList.add("hidden");
   cartOverlay.classList.add("hidden");
   document.body.style.overflow = "";
   isCartOpen = false;

}
 
function toggleCart(){
    if(isCartOpen){
        closeCart();
    }else{
        openCart();
    }
}

function renderCart() {
    const cartItemsEl = document.getElementById("cartItems");
    const cartCountEl = document.getElementById("cartCount");
    const cartTotalEl = document.getElementById("cartTotal");

    const totalCount = cart.reduce((sum, x) => sum + x.quantity, 0);
    const totalPrice = cart.reduce((sum, x) => sum + x.price * x.quantity, 0);

    if (cartCountEl) {
        cartCountEl.textContent = totalCount;
    }

    if (!cartItemsEl || !cartTotalEl) {
        return;
    }

    if (cart.length === 0) {
        cartItemsEl.innerHTML = `<p class="cart-empty">Кошик порожній</p>`;
        cartTotalEl.textContent = `0 грн`;
        return;
    }

    cartItemsEl.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            <div class="cart-item-controls">
                <div class="cart-qty-controls">
                    <button class="cart-qty-btn" onclick="decreaseCartItem(${item.id})">-</button>
                    <span>${item.quantity}</span>
                    <button class="cart-qty-btn" onclick="increaseCartItem(${item.id})">+</button>
                </div>
                <div>${formatPrice(item.price * item.quantity)} грн</div>
            </div>
            <div style="margin-top:10px;">
                <button class="cart-remove-btn" onclick="removeCartItem(${item.id})">Видалити</button>
            </div>
        </div>
    `).join("");

    cartTotalEl.textContent = `${formatPrice(totalPrice)} грн`;
}

function setupCartUi(){

    console.log("setupCartUi called");
    const cartToggleBtn = document.getElementById("cartToggleBtn");
    const closeCartBtn = document.getElementById("closeCartBtn");
    const cartOverlay = document.getElementById("cartOverlay");
    const cartSidebar = document.getElementById("cartSidebar");
    const checkoutBtn = document.getElementById("checkoutBtn");

console.log("cartToggleBtn:", cartToggleBtn);
console.log("closeCartBtn:", closeCartBtn);
console.log("cartOverlay:", cartOverlay);
console.log("cartSidebar:", cartSidebar );

    cartToggleBtn?.addEventListener("click", (e) =>{
        e.preventDefault();
        e.stopPropagation();
        toggleCart();
    });

    closeCartBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeCart();
    });

    cartOverlay?.addEventListener("click", () =>{
        closeCart();
    });
    cartSidebar?.addEventListener("click", (e) => {
        e.stopPropagation();
    });


    checkoutBtn?.addEventListener("click", async(e) =>{
        e.preventDefault();
        e.stopPropagation();
        await checkoutOrder();
    });

    document.addEventListener("keydown", (e) => {
        if(e.key === "Escape" && isCartOpen){
            closeCart();
        } 
    });
}




function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeJs(text) {
    return String(text)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");
}

(async function init() {
    readTokenFromUrl();
    await resolveTableByToken();

    setupCartUi();
    await loadMenu();
    renderCart();
})();
