"use strict";
(() => {
  const scriptEndpoint = document.currentScript?.dataset.resultsApi;
  function resultsEndpoint() {
    const configured = document.documentElement.dataset.resultsApi || scriptEndpoint;
    if (!configured) return "/api/results";
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Invalid results endpoint");
    }
    return url.href;
  }
  let current = null;
  function storageKey() {
    return "oncloud-nine:counted-run:2:" + (document.documentElement.dataset.theme || "live");
  }
  function restore() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey()));
      if (saved && /^[0-9a-f]{32}$/.test(saved.id) && Number.isSafeInteger(saved.revision) &&
          saved.revision >= 0 && typeof saved.answers === "string" && typeof saved.eligible === "boolean") {
        return saved;
      }
    } catch { /* The current in-memory run also works with storage disabled. */ }
    return null;
  }

  function remember() {
    try { sessionStorage.setItem(storageKey(), JSON.stringify(current)); } catch {}
  }
  function newRun() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const id = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
    current = {id, revision: 0, answers: "", eligible: window.CloudQuiz.ready === true};
    remember();
  }
  function attach(panel, item, answers) {
    const notice = document.createElement("p");
    notice.className = "result-count";
    notice.setAttribute("role", "status");
    panel.append(notice);
    current ??= restore();
    if (!window.CloudQuiz.ready || !current?.eligible) {
      notice.textContent = "排练模式 · 本次结果不计入统计";
      return;
    }
    if (location.protocol === "file:" || document.documentElement.hasAttribute("data-portable")) {
      notice.textContent = "离线试玩 · 本次结果不计入统计";
      return;
    }

    const signature = answers.join("");
    if (current.answers !== signature) {
      current.answers = signature;
      current.revision += 1;
      remember();
    }
    // Keep this payload stable across retries, even after a different round starts.
    const body = JSON.stringify({runId: current.id, revision: current.revision, answers, expectedId: item.id});
    const run = current;
    async function submit() {
      notice.textContent = "正在读取同类结果次数…";
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 10000);
      try {
        const response = await fetch(resultsEndpoint(), {
          method: "POST", headers: {"Content-Type": "application/json"}, body, signal: abort.signal,
          credentials: "omit"
        });
        if (response.status === 409) {
          const failure = await response.json();
          notice.textContent = failure.error === "result_changed"
            ? "题库已更新，刷新页面后可重新测试。"
            : "本轮已记录更新后的选择。";
          return;
        }
        if (!response.ok) throw new Error("Unavailable statistics");
        const data = await response.json();
        if (data.mode === "rehearsal") {
          run.eligible = false;
          if (run === current) remember();
          notice.textContent = "排练模式 · 本次结果不计入统计";
        } else if (data.mode === "live" && data.id === item.id && Number.isSafeInteger(data.count) && data.count > 0) {
          notice.textContent = "这个人格已出现 " + data.count + " 次（含本次）";
        } else { throw new Error("Invalid result count"); }
      } catch {
        notice.textContent = "暂时读不到统计。";
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "quiet";
        retry.textContent = "重试";
        retry.addEventListener("click", submit, {once: true});
        notice.append(retry);
      } finally { clearTimeout(timeout); }
    }
    submit();
  }
  window.QuizCounts = {attach, newRun};
})();
