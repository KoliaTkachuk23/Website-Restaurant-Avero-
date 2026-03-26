const apiUrl = `${window.location.origin}/api/menu`;
const menuContainer = document.getElementById("menuContainer");

let allItems = [];
let activeCategory = null;
let activeSubCategory = null;

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

loadMenu();
