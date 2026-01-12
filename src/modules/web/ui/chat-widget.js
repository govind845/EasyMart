(function () {
  const backendUrl = window.EASYMART_BACKEND_URL || "http://localhost:3001/api/chat";

  const SESSION_KEY = "easymart_session_id";
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  let isOpen = false;

  function createChatUI() {
    const container = document.createElement("div");
    container.id = "easymart-chat-container";
    container.innerHTML = `
      <div id="easymart-chat-toggle" class="easymart-chat-toggle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <div id="easymart-chat-box" class="easymart-chat-box" style="display: none;">
        <div class="easymart-chat-header">
          <span>Shopping Assistant</span>
          <button id="easymart-chat-close" class="easymart-close-btn">&times;</button>
        </div>
        <div id="easymart-chat-body" class="easymart-chat-body">
          <div class="easymart-welcome-message">
            👋 Hi! I'm your shopping assistant. How can I help you today?
          </div>
        </div>
        <div class="easymart-chat-input-container">
          <input id="easymart-chat-input" class="easymart-chat-input" placeholder="Ask about products..." autocomplete="off"/>
          <button id="easymart-send-btn" class="easymart-send-btn">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    addStyles();

    document.getElementById("easymart-chat-toggle").addEventListener("click", toggleChat);
    document.getElementById("easymart-chat-close").addEventListener("click", toggleChat);
    document.getElementById("easymart-send-btn").addEventListener("click", sendMessage);
    document.getElementById("easymart-chat-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .easymart-product-buttons { display: flex; gap: 8px; margin-top: 10px; }
      .easymart-add-to-cart-btn {
        background: #28a745; color: white; border: none; padding: 8px 14px;
        border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;
        transition: all 0.2s; flex: 1;
      }
      .easymart-add-to-cart-btn:hover { background: #218838; }
      .easymart-add-to-cart-btn:disabled { background: #6c757d; cursor: not-allowed; }
      .easymart-add-to-cart-btn.success { background: #28a745; }
      .easymart-add-to-cart-btn.error { background: #dc3545; }
      .easymart-product-link {
        background: #007bff; color: white !important; text-decoration: none !important;
        padding: 8px 14px; border-radius: 4px; font-size: 13px; font-weight: 500;
        transition: background 0.2s; text-align: center; flex: 1;
      }
      .easymart-product-link:hover { background: #0056b3; }
      .easymart-toast {
        position: fixed; top: 20px; right: 20px; padding: 12px 24px;
        border-radius: 6px; color: white; font-size: 14px; font-weight: 500;
        z-index: 100001; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: easymart-slideIn 0.3s ease;
      }
      .easymart-toast.success { background: #28a745; }
      .easymart-toast.error { background: #dc3545; }
      @keyframes easymart-slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  function toggleChat() {
    isOpen = !isOpen;
    document.getElementById("easymart-chat-box").style.display = isOpen ? "flex" : "none";
    document.getElementById("easymart-chat-toggle").style.display = isOpen ? "none" : "flex";
  }

  async function sendMessage() {
    const input = document.getElementById("easymart-chat-input");
    const userMessage = input.value.trim();
    if (!userMessage) return;

    input.value = "";
    appendMessage("user", userMessage);
    const typingId = showTypingIndicator();

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: userMessage }),
      });

      removeTypingIndicator(typingId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      appendMessage("assistant", data.replyText || data.message || "Sorry, I couldn't process that.");

      if (data.actions) handleActions(data.actions);
    } catch (error) {
      removeTypingIndicator(typingId);
      console.error("[EasyMart] Chat error:", error);
      appendMessage("assistant", "Sorry, I'm having trouble connecting. Please try again.");
    }
  }

  function appendMessage(sender, text) {
    const body = document.getElementById("easymart-chat-body");
    const messageDiv = document.createElement("div");
    messageDiv.className = `easymart-message easymart-message-${sender}`;
    const bubble = document.createElement("div");
    bubble.className = "easymart-message-bubble";
    bubble.textContent = text;
    messageDiv.appendChild(bubble);
    body.appendChild(messageDiv);
    body.scrollTop = body.scrollHeight;
  }

  function showTypingIndicator() {
    const body = document.getElementById("easymart-chat-body");
    const typingDiv = document.createElement("div");
    const typingId = `typing-${Date.now()}`;
    typingDiv.id = typingId;
    typingDiv.className = "easymart-message easymart-message-assistant";
    typingDiv.innerHTML = `<div class="easymart-message-bubble easymart-typing"><span></span><span></span><span></span></div>`;
    body.appendChild(typingDiv);
    body.scrollTop = body.scrollHeight;
    return typingId;
  }

  function removeTypingIndicator(typingId) {
    const el = document.getElementById(typingId);
    if (el) el.remove();
  }

  function handleActions(actions) {
    const body = document.getElementById("easymart-chat-body");
    actions.forEach((action) => {
      if (action.type === "product_card") {
        body.appendChild(createProductCard(action.data));
      }
    });
    body.scrollTop = body.scrollHeight;
  }

  function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "easymart-product-card";
    const productId = product.productId || product.id;
    const title = product.title || product.name || "Product";
    const price = formatPrice(product.price, product.currency);
    const productUrl = product.url || `/detail/${productId}`;

    card.innerHTML = `
      <img src="${product.image || ""}" alt="${title}" onerror="this.style.display='none'" />
      <div class="easymart-product-info">
        <h4>${title}</h4>
        <p class="easymart-product-price">${price}</p>
        <div class="easymart-product-buttons">
          <button class="easymart-add-to-cart-btn" data-product-id="${productId}">Add to Cart</button>
          <a href="${productUrl}" class="easymart-product-link">View Product</a>
        </div>
      </div>
    `;

    card.querySelector(".easymart-add-to-cart-btn").addEventListener("click", (e) => handleAddToCart(e.target, product));
    return card;
  }

  function formatPrice(price, currency = "EUR") {
    if (typeof price === "string" && (price.includes("€") || price.includes("$"))) return price;
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: currency || "EUR" }).format(price || 0);
  }

  /**
   * Add to cart using Shopware's native storefront endpoint
   * This uses the same endpoint as Shopware's "Add to Cart" buttons
   * No context token needed - uses session cookies automatically
   */
  async function addToCartNative(productId, quantity = 1) {
    const formData = new FormData();
    
    // Build line item data (same format as Shopware's native add-to-cart forms)
    formData.append(`lineItems[${productId}][id]`, productId);
    formData.append(`lineItems[${productId}][type]`, "product");
    formData.append(`lineItems[${productId}][referencedId]`, productId);
    formData.append(`lineItems[${productId}][quantity]`, quantity.toString());
    formData.append(`lineItems[${productId}][stackable]`, "1");
    formData.append(`lineItems[${productId}][removable]`, "1");
    formData.append("redirectTo", "frontend.cart.offcanvas");

    console.log("[EasyMart] Adding to cart via native endpoint:", productId);

    const response = await fetch("/checkout/line-item/add", {
      method: "POST",
      body: formData,
      credentials: "include", // Important: sends session cookies
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    console.log("[EasyMart] Add to cart response status:", response.status);

    if (response.ok) {
      return { success: true };
    }
    
    // Try to get error message from response
    try {
      const text = await response.text();
      console.error("[EasyMart] Add to cart error response:", text);
    } catch (e) {}
    
    throw new Error(`HTTP ${response.status}`);
  }

  async function handleAddToCart(button, product) {
    const originalText = button.textContent;
    const productId = product.productId || product.id;

    button.disabled = true;
    button.textContent = "Adding...";

    try {
      // Use Shopware's native add-to-cart endpoint (uses session cookies)
      await addToCartNative(productId, 1);
      
      button.textContent = "✓ Added!";
      button.classList.add("success");
      showToast(`${product.title || "Product"} added to cart!`, "success");
      refreshShopwareCart();

      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove("success");
        button.disabled = false;
      }, 2000);
    } catch (error) {
      console.error("[EasyMart] Add to cart error:", error);
      button.textContent = "Failed";
      button.classList.add("error");
      showToast("Failed to add to cart. Please try again.", "error");

      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove("error");
        button.disabled = false;
      }, 2000);
    }
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `easymart-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function refreshShopwareCart() {
    console.log("[EasyMart] Refreshing Shopware cart...");

    // Method 1: Trigger Shopware's native cart refresh event
    document.dispatchEvent(new CustomEvent("Storefront/CartWidget/onCartRefresh"));
    
    // Method 2: Call Shopware's PluginManager to refresh cart widgets
    if (window.PluginManager) {
      try {
        const cartWidgetInstances = window.PluginManager.getPluginInstances("CartWidget");
        if (cartWidgetInstances) {
          cartWidgetInstances.forEach((instance) => {
            if (instance && typeof instance.fetch === "function") {
              instance.fetch();
              console.log("[EasyMart] CartWidget.fetch() called");
            }
          });
        }

        const offCanvasInstances = window.PluginManager.getPluginInstances("OffCanvasCart");
        if (offCanvasInstances) {
          offCanvasInstances.forEach((instance) => {
            if (instance && typeof instance.fetch === "function") {
              instance.fetch();
              console.log("[EasyMart] OffCanvasCart.fetch() called");
            }
          });
        }
      } catch (e) {
        console.log("[EasyMart] PluginManager refresh error:", e);
      }
    }

    // Method 3: Fetch cart widget HTML to update the badge
    fetch("/widgets/checkout/info", { 
      headers: { "X-Requested-With": "XMLHttpRequest" },
      credentials: "include"
    })
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        // Try multiple selectors for cart count
        const selectors = [
          ".header-cart-total",
          ".cart-quantity", 
          ".header-cart .badge",
          "[data-cart-widget] .badge",
          ".header-cart-badge"
        ];
        
        for (const selector of selectors) {
          const newEl = doc.querySelector(selector);
          const currentEl = document.querySelector(selector);
          if (currentEl && newEl) {
            currentEl.innerHTML = newEl.innerHTML;
            // Animate the update
            currentEl.style.transform = "scale(1.3)";
            setTimeout(() => { currentEl.style.transform = "scale(1)"; }, 200);
            console.log("[EasyMart] Updated cart badge:", selector);
          }
        }
      })
      .catch((err) => {
        console.log("[EasyMart] Cart widget fetch error:", err);
      });
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createChatUI);
  } else {
    createChatUI();
  }

  console.log("[EasyMart] Chat widget loaded");
})();