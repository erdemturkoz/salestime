(() => {
  if (window.__salesTimeWhatsAppLoaded) return;
  window.__salesTimeWhatsAppLoaded = true;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const visible = (el) => el && el.getClientRects().length > 0;
  const textOf = (el) => (el?.innerText || el?.textContent || "").trim();

  function invalidNumberMessage() {
    const body = document.body?.innerText || "";
    const match = body.match(/telefon numarası[^\n]*(?:geçersiz|WhatsApp'ta değil)|phone number[^\n]*(?:invalid|isn't on WhatsApp)/i);
    return match?.[0] || null;
  }

  function findSendButton() {
    const selectors = [
      'button[aria-label="Gönder"]', 'button[aria-label="Send"]',
      'span[data-icon="send"]', '[data-testid="send"]'
    ];
    for (const selector of selectors) {
      const el = [...document.querySelectorAll(selector)].find(visible);
      if (el) return el.closest("button") || el;
    }
    return null;
  }

  function findComposer() {
    const selectors = [
      'footer div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][aria-placeholder]'
    ];
    for (const selector of selectors) {
      const el = [...document.querySelectorAll(selector)].find(visible);
      if (el) return el;
    }
    return null;
  }

  async function sendMessage(expectedMessage) {
    const deadline = Date.now() + 75_000;
    while (Date.now() < deadline) {
      const invalid = invalidNumberMessage();
      if (invalid) return { ok: false, fatal: true, error: invalid };
      const composer = findComposer();
      const button = findSendButton();
      if (composer && button && textOf(composer).length > 0) {
        const expectedTail = String(expectedMessage || "").trim().slice(-80);
        button.click();
        const verifyDeadline = Date.now() + 20_000;
        while (Date.now() < verifyDeadline) {
          await sleep(500);
          if (!textOf(composer)) {
            const outgoing = [...document.querySelectorAll('.message-out, [data-testid="msg-container"]')].slice(-8);
            const matched = outgoing.some((node) => expectedTail && textOf(node).includes(expectedTail));
            if (matched || outgoing.length > 0) return { ok: true, verified: matched ? "message" : "composer" };
          }
        }
        return { ok: false, fatal: false, error: "Gönderim WhatsApp ekranında doğrulanamadı." };
      }
      await sleep(1000);
    }
    return { ok: false, fatal: false, error: "WhatsApp konuşma ekranı hazır değil." };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SEND_SALESTIME_MESSAGE") return;
    sendMessage(message.message).then(sendResponse).catch((error) => sendResponse({ ok: false, fatal: false, error: error.message }));
    return true;
  });
})();
