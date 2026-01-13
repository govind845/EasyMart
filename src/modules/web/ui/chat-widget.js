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
      /* Base Chat Widget Styles */
      #easymart-chat-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 100000;
      }
      
      .easymart-chat-toggle {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .easymart-chat-toggle:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
      }
      
      .easymart-chat-box {
        width: 380px;
        max-width: calc(100vw - 40px);
        height: 550px;
        max-height: calc(100vh - 100px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .easymart-chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        font-weight: 600;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .easymart-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.2s;
        line-height: 1;
      }
      
      .easymart-close-btn:hover {
        opacity: 1;
      }
      
      .easymart-chat-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8f9fa;
      }
      
      .easymart-welcome-message {
        background: white;
        padding: 12px 16px;
        border-radius: 12px;
        margin-bottom: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .easymart-message {
        margin-bottom: 12px;
        display: flex;
      }
      
      .easymart-message-user {
        justify-content: flex-end;
      }
      
      .easymart-message-assistant {
        justify-content: flex-start;
      }
      
      .easymart-message-bubble {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .easymart-message-user .easymart-message-bubble {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-bottom-right-radius: 4px;
      }
      
      .easymart-message-assistant .easymart-message-bubble {
        background: white;
        color: #333;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .easymart-chat-input-container {
        padding: 12px 16px;
        background: white;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 10px;
      }
      
      .easymart-chat-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #e0e0e0;
        border-radius: 20px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      
      .easymart-chat-input:focus {
        border-color: #667eea;
      }
      
      .easymart-send-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
        transition: opacity 0.2s;
      }
      
      .easymart-send-btn:hover {
        opacity: 0.9;
      }
      
      /* Typing Indicator */
      .easymart-typing {
        display: flex;
        gap: 4px;
        padding: 12px 16px !important;
      }
      
      .easymart-typing span {
        width: 8px;
        height: 8px;
        background: #999;
        border-radius: 50%;
        animation: easymart-bounce 1.4s infinite ease-in-out both;
      }
      
      .easymart-typing span:nth-child(1) { animation-delay: -0.32s; }
      .easymart-typing span:nth-child(2) { animation-delay: -0.16s; }
      
      @keyframes easymart-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      /* Product Card Styles */
      .easymart-product-card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        margin: 12px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .easymart-product-image-container {
        position: relative;
        width: 100%;
      }
      
      .easymart-product-card img {
        width: 100%;
        height: 140px;
        object-fit: cover;
        display: block;
      }
      
      .easymart-in-cart-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        background: #28a745;
        color: white;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
        box-shadow: 0 2px 8px rgba(40, 167, 69, 0.4);
        animation: easymart-badgePop 0.3s ease;
      }
      
      .easymart-in-cart-badge svg {
        stroke: white;
      }
      
      @keyframes easymart-badgePop {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); opacity: 1; }
      }
      
      .easymart-product-info {
        padding: 12px;
      }
      
      .easymart-product-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 6px;
      }
      
      .easymart-product-info h4 {
        margin: 0;
        font-size: 15px;
        color: #333;
        flex: 1;
      }
      
      .easymart-product-price {
        font-weight: 600;
        color: #667eea;
        font-size: 16px;
        margin: 0 0 10px 0;
      }
      
      /* Quantity Controls */
      .easymart-quantity-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      
      .easymart-quantity-label {
        font-size: 13px;
        color: #666;
      }
      
      .easymart-quantity-controls {
        display: flex;
        align-items: center;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        overflow: hidden;
      }
      
      .easymart-qty-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: #f8f9fa;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        color: #333;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .easymart-qty-btn:hover:not(:disabled) {
        background: #e9ecef;
      }
      
      .easymart-qty-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .easymart-qty-input {
        width: 45px;
        height: 32px;
        border: none;
        border-left: 1px solid #e0e0e0;
        border-right: 1px solid #e0e0e0;
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        -moz-appearance: textfield;
      }
      
      .easymart-qty-input::-webkit-outer-spin-button,
      .easymart-qty-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      
      /* Product Buttons */
      .easymart-product-buttons {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }
      
      .easymart-add-to-cart-btn {
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      
      .easymart-add-to-cart-btn:hover:not(:disabled) {
        background: #218838;
      }
      
      .easymart-add-to-cart-btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
      }
      
      .easymart-add-to-cart-btn.success {
        background: #28a745;
      }
      
      .easymart-add-to-cart-btn.error {
        background: #dc3545;
      }
      
      .easymart-product-link {
        background: #007bff;
        color: white !important;
        text-decoration: none !important;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        transition: background 0.2s;
        text-align: center;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .easymart-product-link:hover {
        background: #0056b3;
      }
      
      /* Cart Display in Chat Styles */
      .easymart-cart-display {
        background: white;
        border-radius: 12px;
        margin: 12px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      
      .easymart-cart-display-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 16px;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .easymart-cart-display-header svg {
        width: 18px;
        height: 18px;
      }
      
      .easymart-cart-display-items {
        max-height: 300px;
        overflow-y: auto;
      }
      
      .easymart-cart-display-item {
        display: flex;
        padding: 12px;
        border-bottom: 1px solid #f0f0f0;
        gap: 12px;
        align-items: center;
      }
      
      .easymart-cart-display-item:last-child {
        border-bottom: none;
      }
      
      .easymart-cart-display-item-image {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        object-fit: cover;
        background: #f5f5f5;
        flex-shrink: 0;
      }
      
      .easymart-cart-display-item-info {
        flex: 1;
        min-width: 0;
      }
      
      .easymart-cart-display-item-title {
        font-size: 13px;
        font-weight: 500;
        color: #333;
        margin: 0 0 4px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .easymart-cart-display-item-price {
        font-size: 12px;
        color: #667eea;
        font-weight: 600;
        margin: 0;
      }
      
      .easymart-cart-display-item-qty {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .easymart-cart-display-qty-controls {
        display: flex;
        align-items: center;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .easymart-cart-display-qty-btn {
        width: 26px;
        height: 26px;
        border: none;
        background: #f8f9fa;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: #333;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .easymart-cart-display-qty-btn:hover:not(:disabled) {
        background: #e9ecef;
      }
      
      .easymart-cart-display-qty-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .easymart-cart-display-qty-input {
        width: 32px;
        height: 26px;
        border: none;
        border-left: 1px solid #e0e0e0;
        border-right: 1px solid #e0e0e0;
        text-align: center;
        font-size: 12px;
        font-weight: 500;
        -moz-appearance: textfield;
      }
      
      .easymart-cart-display-qty-input::-webkit-outer-spin-button,
      .easymart-cart-display-qty-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      
      .easymart-cart-display-delete {
        background: none;
        border: none;
        color: #dc3545;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .easymart-cart-display-delete:hover {
        background: #ffebee;
      }
      
      .easymart-cart-display-delete svg {
        width: 16px;
        height: 16px;
      }
      
      .easymart-cart-display-footer {
        background: #f8f9fa;
        padding: 12px 16px;
        border-top: 1px solid #e9ecef;
      }
      
      .easymart-cart-display-totals {
        margin-bottom: 12px;
      }
      
      .easymart-cart-display-subtotal,
      .easymart-cart-display-total {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        margin-bottom: 4px;
      }
      
      .easymart-cart-display-subtotal {
        color: #666;
      }
      
      .easymart-cart-display-total {
        font-weight: 600;
        font-size: 15px;
        color: #333;
        padding-top: 8px;
        border-top: 1px dashed #ddd;
        margin-top: 8px;
      }
      
      .easymart-cart-display-checkout {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 10px 16px;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white !important;
        text-decoration: none !important;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .easymart-cart-display-checkout:hover {
        opacity: 0.9;
      }
      
      .easymart-cart-display-checkout svg {
        width: 16px;
        height: 16px;
      }
      
      .easymart-cart-empty-display {
        padding: 30px 20px;
        text-align: center;
        color: #666;
      }
      
      .easymart-cart-empty-display svg {
        width: 48px;
        height: 48px;
        stroke: #ccc;
        margin-bottom: 12px;
      }
      
      .easymart-cart-empty-display p {
        margin: 0 0 4px 0;
        font-weight: 500;
        color: #333;
      }
      
      .easymart-cart-empty-display span {
        font-size: 13px;
      }
      
      .easymart-cart-display-loading {
        padding: 30px 20px;
        text-align: center;
        color: #666;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      /* Delete Button */
      .easymart-delete-btn {
        background: #ffebee;
        border: 1px solid #ffcdd2;
        color: #dc3545;
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .easymart-delete-btn:hover {
        background: #dc3545;
        border-color: #dc3545;
        color: white;
      }
      
      .easymart-delete-btn svg {
        width: 18px;
        height: 18px;
        stroke: currentColor;
        fill: none;
      }
      
      /* Toast Notifications */
      .easymart-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 100001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: easymart-slideIn 0.3s ease;
      }
      
      .easymart-toast.success { background: #28a745; }
      .easymart-toast.error { background: #dc3545; }
      .easymart-toast.info { background: #17a2b8; }
      
      @keyframes easymart-slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      /* Loading Spinner */
      .easymart-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top-color: currentColor;
        border-radius: 50%;
        animation: easymart-spin 0.8s linear infinite;
      }
      
      .easymart-spinner-large {
        width: 32px;
        height: 32px;
        border-width: 3px;
        border-color: #e0e0e0;
        border-top-color: #667eea;
      }
      
      @keyframes easymart-spin {
        to { transform: rotate(360deg); }
      }
      
      /* Confirmation Dialog */
      .easymart-confirm-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100002;
        animation: easymart-fadeIn 0.2s ease;
      }
      
      @keyframes easymart-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .easymart-confirm-dialog {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 320px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        animation: easymart-scaleIn 0.2s ease;
      }
      
      @keyframes easymart-scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      .easymart-confirm-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
      }
      
      .easymart-confirm-message {
        font-size: 14px;
        color: #666;
        margin-bottom: 20px;
      }
      
      .easymart-confirm-buttons {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      .easymart-confirm-cancel {
        padding: 8px 16px;
        border: 1px solid #e0e0e0;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .easymart-confirm-cancel:hover { background: #f8f9fa; }
      
      .easymart-confirm-delete {
        padding: 8px 16px;
        border: none;
        background: #dc3545;
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }
      
      .easymart-confirm-delete:hover { background: #c82333; }
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
      const replyText = data.replyText || data.message || "Sorry, I couldn't process that.";
      appendMessage("assistant", replyText);

      // Handle actions if present
      if (data.actions && data.actions.length > 0) {
        handleActions(data.actions);
      }
      
      // Auto-detect cart display intent from response text or context
      const isCartIntent = 
        data.context?.intent === "view_cart" ||
        data.context?.intent === "checkout" ||
        replyText.toLowerCase().includes("here's what's in your cart") ||
        replyText.toLowerCase().includes("your cart") ||
        (userMessage.toLowerCase().includes("cart") && 
         (userMessage.toLowerCase().includes("view") || 
          userMessage.toLowerCase().includes("show") || 
          userMessage.toLowerCase().includes("see") ||
          userMessage.toLowerCase().includes("check") ||
          userMessage.toLowerCase().includes("my cart")));
      
      // If cart intent detected but no display_cart action was sent, auto-display cart
      const hasCartAction = data.actions?.some(a => a.type === "display_cart");
      
      if (isCartIntent && !hasCartAction) {
        console.log("[EasyMart] Cart intent detected, auto-displaying cart...");
        displayCartInChat({ showCheckoutButton: data.context?.intent === "checkout" });
      }
      
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
      } else if (action.type === "cart_item") {
        body.appendChild(createCartItemCard(action.data));
      } else if (action.type === "display_cart") {
        // Display cart in chat
        displayCartInChat(action.data);
      } else if (action.type === "clear_cart") {
        handleClearCart();
      }
    });
    body.scrollTop = body.scrollHeight;
  }

  /**
   * Display cart summary in chat
   */
  async function displayCartInChat(options = {}) {
    const body = document.getElementById("easymart-chat-body");
    
    console.log("[EasyMart] displayCartInChat called with options:", options);
    
    // Create cart display container
    const cartDisplay = document.createElement("div");
    cartDisplay.className = "easymart-cart-display";
    cartDisplay.id = `cart-display-${Date.now()}`;
    
    // Show loading state
    cartDisplay.innerHTML = `
      <div class="easymart-cart-display-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        Your Cart
      </div>
      <div class="easymart-cart-display-loading">
        <span class="easymart-spinner easymart-spinner-large"></span>
        <span>Loading your cart...</span>
      </div>
    `;
    
    body.appendChild(cartDisplay);
    body.scrollTop = body.scrollHeight;
    
    try {
      // Fetch cart data
      console.log("[EasyMart] Fetching cart data...");
      const cartData = await fetchCartData();
      console.log("[EasyMart] Cart data received:", cartData);
      renderCartDisplay(cartDisplay, cartData, options);
    } catch (error) {
      console.error("[EasyMart] Failed to load cart:", error);
      cartDisplay.innerHTML = `
        <div class="easymart-cart-display-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          Your Cart
        </div>
        <div class="easymart-cart-empty-display">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>Could not load cart</p>
          <span>Please try again</span>
        </div>
      `;
    }
    
    body.scrollTop = body.scrollHeight;
  }

  /**
   * Fetch cart data from Shopware
   */
  async function fetchCartData() {
    console.log("[EasyMart] fetchCartData: Starting to fetch cart...");
    
    // Try offcanvas endpoint first (most reliable)
    try {
      console.log("[EasyMart] Trying /checkout/offcanvas...");
      const response = await fetch("/checkout/offcanvas", {
        method: "GET",
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      
      console.log("[EasyMart] Offcanvas response status:", response.status);
      
      if (response.ok) {
        const html = await response.text();
        console.log("[EasyMart] Offcanvas HTML length:", html.length);
        const cartData = parseCartFromHtml(html);
        console.log("[EasyMart] Parsed cart data:", cartData);
        return cartData;
      }
    } catch (e) {
      console.log("[EasyMart] Offcanvas fetch failed:", e);
    }
    
    // Try store API
    try {
      console.log("[EasyMart] Trying /store-api/checkout/cart...");
      const response = await fetch("/store-api/checkout/cart", {
        method: "GET",
        credentials: "include",
        headers: { 
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json"
        },
      });
      
      console.log("[EasyMart] Store API response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("[EasyMart] Store API cart data:", data);
        return data;
      }
    } catch (e) {
      console.log("[EasyMart] Store API fetch failed:", e);
    }
    
    throw new Error("Could not fetch cart data");
  }

  /**
   * Parse cart data from HTML
   */
  function parseCartFromHtml(html) {
    console.log("[EasyMart] parseCartFromHtml: Parsing HTML...");
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    const items = [];
    
    // Try multiple selectors for different Shopware themes
    const selectors = [
      ".line-item",
      ".line-item-product",
      ".cart-item", 
      "[data-line-item-id]",
      ".cart-item-row"
    ];
    
    let cartItemElements = [];
    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      console.log(`[EasyMart] Selector "${selector}" found:`, elements.length, "elements");
      if (elements.length > 0) {
        cartItemElements = elements;
        break;
      }
    }
    
    console.log("[EasyMart] Total cart item elements found:", cartItemElements.length);
    
    cartItemElements.forEach((el, index) => {
      // Try multiple ways to get the line item ID
      let id = el.dataset.lineItemId || 
               el.getAttribute("data-line-item-id") || 
               el.dataset.id ||
               el.getAttribute("data-id");
      
      // If still no ID, try to find it from a child element or form input
      if (!id) {
        const idInput = el.querySelector("input[name*='lineItems'][name*='[id]']") ||
                        el.querySelector("input[name*='id']") ||
                        el.querySelector("[data-line-item-id]");
        if (idInput) {
          id = idInput.value || idInput.dataset.lineItemId;
        }
      }
      
      // Try to find ID from the delete or quantity form
      if (!id) {
        const form = el.querySelector("form");
        if (form) {
          const action = form.getAttribute("action") || "";
          const idMatch = action.match(/\/([a-f0-9]{32})/i);
          if (idMatch) {
            id = idMatch[1];
          }
        }
      }
      
      // Try to find ID from any link that contains the product ID
      if (!id) {
        const links = el.querySelectorAll("a[href*='/detail/']");
        links.forEach(link => {
          const href = link.getAttribute("href") || "";
          const idMatch = href.match(/\/detail\/([a-f0-9]{32})/i);
          if (idMatch && !id) {
            id = idMatch[1];
          }
        });
      }
      
      // Try multiple selectors for title
      const titleSelectors = [
        ".line-item-label a",
        ".line-item-label",
        ".line-item-details a",
        ".line-item-details-container a",
        ".cart-item-label",
        ".line-item-name",
        ".product-name a",
        ".product-title",
        "a.line-item-img-link + .line-item-details a"
      ];
      
      let title = null;
      for (const sel of titleSelectors) {
        const titleEl = el.querySelector(sel);
        if (titleEl) {
          title = titleEl.textContent?.trim();
          if (title && title.length > 0 && !title.includes("\n")) {
            console.log(`[EasyMart] Found title with selector "${sel}":`, title);
            break;
          }
        }
      }
      
      // Clean up title if it has extra whitespace
      if (title) {
        title = title.replace(/\s+/g, ' ').trim();
      }
      
      // Try multiple selectors for unit price (single item price)
      const unitPriceSelectors = [
        ".line-item-unit-price-value",
        ".line-item-unit-price .line-item-price-value",
        ".line-item-single-price",
        ".line-item-unit-price"
      ];
      
      let unitPriceText = null;
      for (const sel of unitPriceSelectors) {
        const priceEl = el.querySelector(sel);
        if (priceEl) {
          // Get only the price value, not labels
          const priceValue = priceEl.querySelector(".line-item-price-value") || priceEl;
          unitPriceText = priceValue.textContent?.trim();
          // Extract just the price (e.g., "€20.00" from "Unit price: €20.00")
          const priceMatch = unitPriceText?.match(/[€$£]?\s*[\d.,]+\s*[€$£]?/);
          if (priceMatch) {
            unitPriceText = priceMatch[0].trim();
            console.log(`[EasyMart] Found unit price with selector "${sel}":`, unitPriceText);
            break;
          }
        }
      }
      
      // Try multiple selectors for total price
      const totalPriceSelectors = [
        ".line-item-total-price-value",
        ".line-item-total-price .line-item-price-value",
        ".line-item-price",
        ".line-item-total-price"
      ];
      
      let totalPriceText = unitPriceText; // Default to unit price
      for (const sel of totalPriceSelectors) {
        const priceEl = el.querySelector(sel);
        if (priceEl) {
          const priceValue = priceEl.querySelector(".line-item-price-value") || priceEl;
          const text = priceValue.textContent?.trim();
          const priceMatch = text?.match(/[€$£]?\s*[\d.,]+\s*[€$£]?/);
          if (priceMatch) {
            totalPriceText = priceMatch[0].trim();
            console.log(`[EasyMart] Found total price with selector "${sel}":`, totalPriceText);
            break;
          }
        }
      }
      
      // Try multiple selectors for quantity
      const qtySelectors = [
        "input.line-item-quantity-input",
        "input[name*='quantity']",
        "input.js-offcanvas-cart-change-quantity",
        ".line-item-quantity input[type='number']",
        ".line-item-quantity-input",
        "select.line-item-quantity-select"
      ];
      
      let quantity = "1";
      for (const sel of qtySelectors) {
        const qtyEl = el.querySelector(sel);
        if (qtyEl) {
          quantity = qtyEl.value || qtyEl.textContent?.trim() || "1";
          if (quantity && !isNaN(parseInt(quantity))) {
            console.log(`[EasyMart] Found quantity with selector "${sel}":`, quantity);
            break;
          }
        }
      }
      
      // Try to get quantity from text if input not found
      if (quantity === "1") {
        const qtyText = el.querySelector(".line-item-quantity-number, .quantity-number");
        if (qtyText) {
          quantity = qtyText.textContent?.trim() || "1";
        }
      }
      
      // Try multiple selectors for image
      const imgSelectors = [
        ".line-item-img-link img",
        ".line-item-img",
        "img.cart-item-img",
        ".line-item-image img",
        "img"
      ];
      
      let image = "";
      for (const sel of imgSelectors) {
        const imgEl = el.querySelector(sel);
        if (imgEl) {
          image = imgEl.src || imgEl.dataset.src || imgEl.getAttribute("srcset")?.split(" ")[0] || "";
          if (image) {
            break;
          }
        }
      }
      
      console.log(`[EasyMart] Item ${index} parsed:`, { 
        id, 
        title, 
        unitPrice: unitPriceText, 
        totalPrice: totalPriceText, 
        quantity,
        hasImage: !!image 
      });
      
      // Add item if we have at least an ID or title
      if (id || title) {
        items.push({ 
          id: id || `item-${index}`, 
          label: title || "Product",
          unitPrice: parsePrice(unitPriceText),
          totalPrice: parsePrice(totalPriceText),
          quantity: parseInt(quantity) || 1, 
          image 
        });
      }
    });
    
    // Get totals - try multiple selectors
    const subtotalSelectors = [
      ".offcanvas-cart-summary-subtotal .col-auto:last-child",
      ".summary-value-subtotal",
      ".checkout-aside-summary-value",
      ".cart-subtotal",
      ".offcanvas-summary-subtotal .summary-value",
      ".summary-subtotal .summary-value"
    ];
    
    const totalSelectors = [
      ".offcanvas-cart-summary-total .col-auto:last-child",
      ".summary-value-total",
      ".checkout-aside-summary-total .checkout-aside-summary-value",
      ".cart-total",
      ".offcanvas-summary-total .summary-value",
      ".summary-total .summary-value"
    ];
    
    let subtotalText = null;
    let totalText = null;
    
    for (const sel of subtotalSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        const text = el.textContent?.trim();
        const priceMatch = text?.match(/[€$£]?\s*[\d.,]+\s*[€$£]?/);
        if (priceMatch) {
          subtotalText = priceMatch[0].trim();
          console.log(`[EasyMart] Found subtotal with selector "${sel}":`, subtotalText);
          break;
        }
      }
    }
    
    for (const sel of totalSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        const text = el.textContent?.trim();
        const priceMatch = text?.match(/[€$£]?\s*[\d.,]+\s*[€$£]?/);
        if (priceMatch) {
          totalText = priceMatch[0].trim();
          console.log(`[EasyMart] Found total with selector "${sel}":`, totalText);
          break;
        }
      }
    }
    
    // If no totals found, calculate from items
    const subtotal = parsePrice(subtotalText) || items.reduce((sum, item) => sum + (item.totalPrice || item.unitPrice * item.quantity), 0);
    const total = parsePrice(totalText) || subtotal;
    
    console.log("[EasyMart] Parsed totals - Subtotal:", subtotal, "Total:", total);
    console.log("[EasyMart] Final parsed items:", items.length);
    
    return {
      lineItems: items,
      price: { positionPrice: subtotal, totalPrice: total || subtotal }
    };
  }

  /**
   * Parse price string to number
   */
  function parsePrice(str) {
    if (!str) return 0;
    if (typeof str === "number") return str;
    const cleaned = str.replace(/[^\d,.-]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  }

  /**
   * Render cart display with items
   */
  function renderCartDisplay(container, cartData, options = {}) {
    const items = cartData.lineItems || [];
    const showCheckout = options.showCheckoutButton !== false;
    
    if (items.length === 0) {
      container.innerHTML = `
        <div class="easymart-cart-display-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          Your Cart
        </div>
        <div class="easymart-cart-empty-display">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <p>Your cart is empty</p>
          <span>Add some products to get started!</span>
        </div>
      `;
      return;
    }
    
    const subtotal = cartData.price?.positionPrice || 0;
    const total = cartData.price?.totalPrice || subtotal;
    
    container.innerHTML = `
      <div class="easymart-cart-display-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        Your Cart (${items.length} item${items.length > 1 ? 's' : ''})
      </div>
      <div class="easymart-cart-display-items">
        ${items.map(item => createCartDisplayItem(item)).join("")}
      </div>
      <div class="easymart-cart-display-footer">
        <div class="easymart-cart-display-totals">
          <div class="easymart-cart-display-subtotal">
            <span>Subtotal:</span>
            <span>${formatPrice(subtotal)}</span>
          </div>
          <div class="easymart-cart-display-total">
            <span>Total:</span>
            <span>${formatPrice(total)}</span>
          </div>
        </div>
        ${showCheckout ? `
          <a href="/checkout/confirm" class="easymart-cart-display-checkout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            Proceed to Checkout
          </a>
        ` : ''}
      </div>
    `;
    
    // Add event listeners for quantity and delete buttons
    container.querySelectorAll(".easymart-cart-display-item").forEach(itemEl => {
      const lineItemId = itemEl.dataset.lineItemId;
      const qtyInput = itemEl.querySelector(".easymart-cart-display-qty-input");
      const decreaseBtn = itemEl.querySelector(".easymart-cart-qty-decrease");
      const increaseBtn = itemEl.querySelector(".easymart-cart-qty-increase");
      const deleteBtn = itemEl.querySelector(".easymart-cart-display-delete");
      
      decreaseBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        const currentVal = parseInt(qtyInput.value) || 1;
        if (currentVal > 1) {
          const newVal = currentVal - 1;
          qtyInput.value = newVal;
          await updateCartDisplayItemQuantity(lineItemId, newVal, container);
        }
      });
      
      increaseBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        const currentVal = parseInt(qtyInput.value) || 1;
        const newVal = currentVal + 1;
        qtyInput.value = newVal;
        await updateCartDisplayItemQuantity(lineItemId, newVal, container);
      });
      
      qtyInput?.addEventListener("change", async () => {
        const val = Math.max(1, parseInt(qtyInput.value) || 1);
        qtyInput.value = val;
        await updateCartDisplayItemQuantity(lineItemId, val, container);
      });
      
      deleteBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        await deleteCartDisplayItem(lineItemId, itemEl, container);
      });
    });
  }

  /**
   * Create HTML for a cart display item
   */
  function createCartDisplayItem(item) {
    const id = item.id || item.lineItemId;
    const title = item.label || item.title || item.name || "Product";
    const unitPrice = item.unitPrice || item.price || 0;
    const quantity = item.quantity || 1;
    const totalPrice = item.totalPrice || (unitPrice * quantity);
    const image = item.cover?.url || item.image || "";
    
    return `
      <div class="easymart-cart-display-item" data-line-item-id="${id}">
        <img src="${image}" alt="${title}" class="easymart-cart-display-item-image" 
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f5f5f5%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2230%22>?</text></svg>'"/>
        <div class="easymart-cart-display-item-info">
          <p class="easymart-cart-display-item-title">${title}</p>
          <p class="easymart-cart-display-item-price">${formatPrice(unitPrice)} × ${quantity} = ${formatPrice(totalPrice)}</p>
        </div>
        <div class="easymart-cart-display-item-qty">
          <div class="easymart-cart-display-qty-controls">
            <button type="button" class="easymart-cart-display-qty-btn easymart-cart-qty-decrease" ${quantity <= 1 ? 'disabled' : ''}>−</button>
            <input type="number" class="easymart-cart-display-qty-input" value="${quantity}" min="1" data-original-qty="${quantity}"/>
            <button type="button" class="easymart-cart-display-qty-btn easymart-cart-qty-increase">+</button>
          </div>
          <button type="button" class="easymart-cart-display-delete" title="Remove">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Update cart display item quantity
   */
  async function updateCartDisplayItemQuantity(lineItemId, quantity, container) {
    try {
      await updateCartItemQuantityNative(lineItemId, quantity);
      
      // Wait for server to process
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refresh cart display
      const cartData = await fetchCartData();
      renderCartDisplay(container, cartData);
      
      refreshShopwareCart();
      showToast("Cart updated", "success");
      
    } catch (error) {
      console.error("[EasyMart] Update quantity error:", error);
      showToast("Failed to update quantity", "error");
      
      // Refresh to show current state
      const cartData = await fetchCartData();
      renderCartDisplay(container, cartData);
    }
  }

  /**
   * Delete item from cart display
   */
  async function deleteCartDisplayItem(lineItemId, itemEl, container) {
    itemEl.style.opacity = "0.5";
    
    try {
      await deleteCartItemNative(lineItemId);
      
      // Wait for server to process
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refresh cart display
      const cartData = await fetchCartData();
      renderCartDisplay(container, cartData);
      
      refreshShopwareCart();
      showToast("Item removed", "info");
      
    } catch (error) {
      console.error("[EasyMart] Delete error:", error);
      itemEl.style.opacity = "1";
      showToast("Failed to remove item", "error");
    }
  }

  /**
   * Handle clear cart action
   */
  async function handleClearCart() {
    try {
      const cartData = await fetchCartData();
      const items = cartData.lineItems || [];
      
      // Delete all items
      for (const item of items) {
        await deleteCartItemNative(item.id);
      }
      
      refreshShopwareCart();
      showToast("Cart cleared", "info");
      
    } catch (error) {
      console.error("[EasyMart] Clear cart error:", error);
      showToast("Failed to clear cart", "error");
    }
  }

  /**
   * Create a product card with quantity selector
   */
  function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "easymart-product-card";
    const productId = product.productId || product.id;
    const lineItemId = product.lineItemId || productId;
    const title = product.title || product.name || "Product";
    const price = formatPrice(product.price, product.currency);
    const productUrl = product.url || `/detail/${productId}`;
    const maxQuantity = product.availableStock || product.maxQuantity || 99;
    const minQuantity = product.minPurchase || 1;
    const currentQuantity = product.quantity || minQuantity;
    const isInCart = product.inCart || false;

    card.innerHTML = `
      <div class="easymart-product-image-container">
        <img src="${product.image || ""}" alt="${title}" onerror="this.style.display='none'" />
        <span class="easymart-in-cart-badge" style="display: ${isInCart ? 'flex' : 'none'};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          In Cart
        </span>
      </div>
      <div class="easymart-product-info">
        <div class="easymart-product-header">
          <h4>${title}</h4>
          <button type="button" class="easymart-delete-btn" data-line-item-id="${lineItemId}" data-product-id="${productId}" data-product-title="${title}" title="Remove from cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
        <p class="easymart-product-price">${price}</p>
        <div class="easymart-quantity-container">
          <span class="easymart-quantity-label">Quantity:</span>
          <div class="easymart-quantity-controls">
            <button type="button" class="easymart-qty-btn easymart-qty-decrease" data-product-id="${productId}">−</button>
            <input type="number" class="easymart-qty-input" value="${currentQuantity}" min="${minQuantity}" max="${maxQuantity}" data-product-id="${productId}" />
            <button type="button" class="easymart-qty-btn easymart-qty-increase" data-product-id="${productId}">+</button>
          </div>
        </div>
        <div class="easymart-product-buttons">
          <button class="easymart-add-to-cart-btn" data-product-id="${productId}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span class="easymart-btn-text">${isInCart ? 'Update Cart' : 'Add to Cart'}</span>
          </button>
          <a href="${productUrl}" class="easymart-product-link">View</a>
        </div>
      </div>
    `;

    // Quantity control event listeners
    const qtyInput = card.querySelector(".easymart-qty-input");
    const decreaseBtn = card.querySelector(".easymart-qty-decrease");
    const increaseBtn = card.querySelector(".easymart-qty-increase");

    decreaseBtn.addEventListener("click", () => {
      const currentVal = parseInt(qtyInput.value) || minQuantity;
      if (currentVal > minQuantity) {
        qtyInput.value = currentVal - 1;
        updateQuantityButtonStates(card, minQuantity, maxQuantity);
      }
    });

    increaseBtn.addEventListener("click", () => {
      const currentVal = parseInt(qtyInput.value) || minQuantity;
      if (currentVal < maxQuantity) {
        qtyInput.value = currentVal + 1;
        updateQuantityButtonStates(card, minQuantity, maxQuantity);
      }
    });

    qtyInput.addEventListener("change", () => {
      let val = parseInt(qtyInput.value) || minQuantity;
      val = Math.max(minQuantity, Math.min(maxQuantity, val));
      qtyInput.value = val;
      updateQuantityButtonStates(card, minQuantity, maxQuantity);
    });

    updateQuantityButtonStates(card, minQuantity, maxQuantity);

    card.querySelector(".easymart-add-to-cart-btn").addEventListener("click", (e) => {
      const quantity = parseInt(qtyInput.value) || 1;
      handleAddToCart(e.target.closest(".easymart-add-to-cart-btn"), product, quantity, card);
    });

    const deleteBtn = card.querySelector(".easymart-delete-btn");
    deleteBtn.addEventListener("click", () => {
      const lineItemId = deleteBtn.dataset.lineItemId;
      const productTitle = deleteBtn.dataset.productTitle;
      showDeleteConfirmation(lineItemId, productTitle, card);
    });

    return card;
  }

  function updateQuantityButtonStates(card, min, max) {
    const qtyInput = card.querySelector(".easymart-qty-input");
    const decreaseBtn = card.querySelector(".easymart-qty-decrease");
    const increaseBtn = card.querySelector(".easymart-qty-increase");
    const currentVal = parseInt(qtyInput.value) || min;

    if (decreaseBtn) decreaseBtn.disabled = currentVal <= min;
    if (increaseBtn) increaseBtn.disabled = currentVal >= max;
  }

  function createCartItemCard(item) {
    const card = document.createElement("div");
    card.className = "easymart-cart-item";
    card.id = `cart-item-${item.id}`;
    
    const title = item.label || item.title || item.name || "Product";
    const price = formatPrice(item.unitPrice || item.price, item.currency);
    const totalPrice = formatPrice(item.totalPrice || (item.unitPrice * item.quantity), item.currency);
    const quantity = item.quantity || 1;

    card.innerHTML = `
      <div class="easymart-cart-item-header">
        <span class="easymart-cart-item-title">${title}</span>
        <button type="button" class="easymart-delete-btn" data-line-item-id="${item.id}" title="Remove from cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
      <div class="easymart-cart-item-details">
        <span class="easymart-cart-item-price">${price} × ${quantity} = ${totalPrice}</span>
      </div>
    `;

    card.querySelector(".easymart-delete-btn").addEventListener("click", () => {
      showDeleteConfirmation(item.id, title, card);
    });

    return card;
  }

  function showDeleteConfirmation(lineItemId, itemTitle, cardElement) {
    const overlay = document.createElement("div");
    overlay.className = "easymart-confirm-overlay";
    overlay.innerHTML = `
      <div class="easymart-confirm-dialog">
        <div class="easymart-confirm-title">Remove Item</div>
        <div class="easymart-confirm-message">Are you sure you want to remove "${itemTitle}" from your cart?</div>
        <div class="easymart-confirm-buttons">
          <button type="button" class="easymart-confirm-cancel">Cancel</button>
          <button type="button" class="easymart-confirm-delete">Remove</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".easymart-confirm-cancel").addEventListener("click", () => overlay.remove());
    overlay.querySelector(".easymart-confirm-delete").addEventListener("click", () => {
      overlay.remove();
      handleDeleteCartItem(lineItemId, cardElement);
    });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  }

  function formatPrice(price, currency = "EUR") {
    if (typeof price === "string" && (price.includes("€") || price.includes("$"))) return price;
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: currency || "EUR" }).format(price || 0);
  }

  async function addToCartNative(productId, quantity = 1) {
    const formData = new FormData();
    formData.append(`lineItems[${productId}][id]`, productId);
    formData.append(`lineItems[${productId}][type]`, "product");
    formData.append(`lineItems[${productId}][referencedId]`, productId);
    formData.append(`lineItems[${productId}][quantity]`, quantity.toString());
    formData.append(`lineItems[${productId}][stackable]`, "1");
    formData.append(`lineItems[${productId}][removable]`, "1");
    formData.append("redirectTo", "frontend.cart.offcanvas");

    const response = await fetch("/checkout/line-item/add", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (response.ok) return { success: true };
    throw new Error(`HTTP ${response.status}`);
  }

  async function updateCartItemQuantityNative(lineItemId, quantity) {
    const formData = new FormData();
    formData.append("quantity", quantity.toString());

    const response = await fetch(`/checkout/line-item/change-quantity/${lineItemId}`, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (response.ok) return { success: true };
    throw new Error(`HTTP ${response.status}`);
  }

  async function deleteCartItemNative(lineItemId) {
    const response = await fetch(`/checkout/line-item/delete/${lineItemId}`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (response.ok) return { success: true };
    throw new Error(`HTTP ${response.status}`);
  }

  async function handleAddToCart(button, product, quantity = 1, card = null) {
    const originalHTML = button.innerHTML;
    const productId = product.productId || product.id;

    button.disabled = true;
    button.innerHTML = `<span class="easymart-spinner"></span> Adding...`;

    try {
      await addToCartNative(productId, quantity);
      
      button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg> Added!`;
      button.classList.add("success");
      showToast(`${product.title || "Product"} added to cart!`, "success");
      refreshShopwareCart();

      if (card) {
        const badge = card.querySelector(".easymart-in-cart-badge");
        if (badge) badge.style.display = "flex";
      }

      setTimeout(() => {
        button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span class="easymart-btn-text">Update Cart</span>`;
        button.classList.remove("success");
        button.disabled = false;
      }, 2000);
    } catch (error) {
      console.error("[EasyMart] Add to cart error:", error);
      button.innerHTML = "Failed";
      button.classList.add("error");
      showToast("Failed to add to cart", "error");

      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.classList.remove("error");
        button.disabled = false;
      }, 2000);
    }
  }

  async function handleDeleteCartItem(lineItemId, cardElement) {
    cardElement.style.opacity = "0.5";
    cardElement.style.pointerEvents = "none";

    try {
      await deleteCartItemNative(lineItemId);
      
      const badge = cardElement.querySelector(".easymart-in-cart-badge");
      const addToCartBtn = cardElement.querySelector(".easymart-add-to-cart-btn");
      
      if (badge && addToCartBtn) {
        badge.style.display = "none";
        addToCartBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span class="easymart-btn-text">Add to Cart</span>`;
        
        const qtyInput = cardElement.querySelector(".easymart-qty-input");
        if (qtyInput) qtyInput.value = 1;
        
        cardElement.style.opacity = "1";
        cardElement.style.pointerEvents = "auto";
      } else {
        cardElement.style.transition = "all 0.3s ease";
        cardElement.style.transform = "translateX(100%)";
        cardElement.style.opacity = "0";
        setTimeout(() => cardElement.remove(), 300);
      }
      
      showToast("Item removed from cart", "info");
      refreshShopwareCart();

    } catch (error) {
      console.error("[EasyMart] Delete item error:", error);
      cardElement.style.opacity = "1";
      cardElement.style.pointerEvents = "auto";
      showToast("Failed to remove item", "error");
    }
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `easymart-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "easymart-slideIn 0.3s ease reverse";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function refreshShopwareCart() {
    document.dispatchEvent(new CustomEvent("Storefront/CartWidget/onCartRefresh"));
    
    if (window.PluginManager) {
      try {
        const cartWidgets = window.PluginManager.getPluginInstances("CartWidget");
        cartWidgets?.forEach(instance => instance?.fetch?.());
        
        const offCanvas = window.PluginManager.getPluginInstances("OffCanvasCart");
        offCanvas?.forEach(instance => instance?.fetch?.());
      } catch (e) {}
    }

    fetch("/widgets/checkout/info", { 
      headers: { "X-Requested-With": "XMLHttpRequest" },
      credentials: "include"
    })
      .then(res => res.text())
      .then(html => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        [".header-cart-total", ".cart-quantity", ".header-cart .badge"].forEach(sel => {
          const newEl = doc.querySelector(sel);
          const curEl = document.querySelector(sel);
          if (curEl && newEl) {
            curEl.innerHTML = newEl.innerHTML;
            curEl.style.transform = "scale(1.3)";
            setTimeout(() => curEl.style.transform = "scale(1)", 200);
          }
        });
      })
      .catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createChatUI);
  } else {
    createChatUI();
  }

  console.log("[EasyMart] Chat widget loaded (v3.0 - with cart display in chat)");
})();