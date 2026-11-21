"use strict";
(() => {
  const engine = window.CloudQuiz;
  const main = document.getElementById("main");
  const editions = {
    live:  { name: "快乐云上线", lines: ["快乐云", "上线"], ground: "#1047ce", ink: "#fffdf2", accent: "#dcf637" },
    which: { name: "今天哪朵云？", lines: ["今天", "哪朵云？"], ground: "#faf4df", ink: "#143b86", accent: "#2958b0" },
    match: { name: "云上对个号", lines: ["云上", "对个号"], ground: "#d9ee4c", ink: "#142e67", accent: "#133883" }
  };
  const queryTheme = new URLSearchParams(location.search).get("theme");
  const theme = Object.hasOwn(editions, queryTheme) ? queryTheme : "live";
  const edition = editions[theme];
  const storageKey = theme === "live" ? "oncloud-nine:preview:1" : "mdi:cloud:" + theme + ":1";
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = edition.ground;
  document.getElementById("edition-label").textContent = edition.name + "　/　设创生活测试";
  document.querySelector(".monogram").setAttribute("aria-label", edition.name + "首页");
  const labels = ["A", "B"];
  let answers = [];
  let playing = false;
  let previousChoice = null;
  const picker = document.createElement("details");
  if (!engine.ready) {
    picker.className = "edition-picker";
    picker.append(node("summary", "", "切换首页方案"));
    const nav = node("nav");
    nav.setAttribute("aria-label", "试玩首页方案");
    for (const [key, variant] of Object.entries(editions)) {
      const link = node("a", "", variant.name);
      link.href = "?theme=" + key;
      if (key === theme) link.setAttribute("aria-current", "page");
      nav.append(link);
    }
    picker.append(nav);
    document.querySelector("footer").append(picker);
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function button(title, className, onClick) {
    const element = node("button", className, title);
    element.type = "button";
    element.addEventListener("click", onClick);
    return element;
  }

  function artworkSource(pose) {
    if (location.protocol !== "file:" && !document.documentElement.hasAttribute("data-portable"))
      return "assets/cloud-host.svg#"+pose;
    const svg=document.querySelector("#local-cloud-art").content.firstElementChild.cloneNode(true);
    svg.setAttribute("viewBox",svg.querySelector("#"+pose).getAttribute("viewBox"));
    return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(svg));
  }

  function figure(pose) {
    const wrapper = node("div", "figure");
    wrapper.setAttribute("aria-hidden", "true");
    const cloud = node("img");
    cloud.src = artworkSource(pose);
    cloud.alt = "";
    wrapper.append(node("span", "ring"), cloud, node("span", "spark"));
    return wrapper;
  }

  function remember() {
    try {
      if (playing) sessionStorage.setItem(storageKey, JSON.stringify({
        revision: engine.revision, answers, previousChoice
      }));
      else sessionStorage.removeItem(storageKey);
    } catch { /* The page also works with browser storage disabled. */ }
  }

  function showHome() {
    playing = false;
    previousChoice = null;
    picker.hidden = false;
    picker.open = false;
    answers = [];
    remember();
    const screen = node("section", "landing");
    document.title = edition.name + " · MD&I 设创生活测试";
    const mark = node("h1", "wordmark");
    mark.setAttribute("aria-label", edition.name);
    edition.lines.forEach(text => mark.append(node("span", "", text)));
    const bottom = node("div", "land-bottom");
    const intro = node("div");
    intro.append(node("h2", "", "设创生活测试"), node("p", "", "6–9 道二选一　/　8 种人格"));
    bottom.append(intro, button(engine.ready ? "开始测试" : "开始试玩", "action", start));
    screen.append(mark, figure("idle"), bottom);
    main.replaceChildren(screen);
  }

  function start() {
    window.QuizCounts?.newRun();
    playing = true;
    answers = [];
    previousChoice = null;
    remember();
    render(true);
  }

  function previous() {
    if (!answers.length) { showHome(); main.focus(); return; }
    previousChoice = answers.pop();
    remember();
    render(true);
  }

  function focusedHeading() {
    const heading = main.querySelector("h1");
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
    window.scrollTo({top:0,behavior:"instant"});
  }

  function questionPanel(q, step, extraCount) {
    const panel = node("div", "panel");
    const row = node("div", "step");
    const extra = step > 6;
    const total = extra ? 6 + extraCount : 6;
    row.append(node("span", "", extra ? "云的追问" : "情境选择"), node("output", "", step + " / " + total));
    const progress = node("div", "progress");
    progress.setAttribute("aria-hidden", "true");
    for (let i=1; i<=total; i++) progress.append(node("span", i < step ? "done" : i === step ? "active" : ""));
    const title = node("h1", q.text ? "" : "empty", q.text || "情境问题待填");
    const choices = node("div", "answers");
    q.options.forEach((text, i) => {
      const pick = button("", "answer", () => {
        if (!choices.isConnected) return;
        previousChoice = null;
        answers.push(i);
        remember();
        render(true);
      });
      pick.append(node("span", "letter", labels[i]), node("span", "", text || "选项待填"));
      if (i === previousChoice) pick.append(node("small", "last-pick", "上次选择"));
      choices.append(pick);
    });
    panel.append(row, progress, title, choices, button(answers.length ? "上一题" : "返回首页", "quiet", previous));
    return panel;
  }

  async function drawResultCard(item) {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    const c = canvas.getContext("2d");
    function wrap(text, font) {
      c.font = font;
      const lines = [];
      let line = "";
      for (const ch of text) {
        if (ch === "\n" || (line && c.measureText(line + ch).width > 780)) {
          lines.push(line);
          line = "";
        }
        if (ch !== "\n") line += ch;
      }
      lines.push(line);
      return lines;
    }
    const titleFont = "bold 64px sans-serif";
    const reasonFont = "34px sans-serif";
    const titles = wrap(item.title || "人格外号待填", titleFont);
    const reasons = wrap(item.reason || "一句话解释待填", reasonFont);
    const reasonY = 745 + (titles.length - 1) * 75 + 68;
    const footerY = reasonY + (reasons.length - 1) * 48 + 68;
    const qrSize = 328;
    const qrY = footerY + 30;
    canvas.height = qrY + qrSize + 54;
    c.fillStyle = edition.ground;
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = edition.ink;
    c.font = 'bold 75px "Microsoft YaHei","PingFang SC",sans-serif';
    c.fillText(edition.name, 58, 113);
    c.fillRect(60, 148, 780, 2);
    const cloud = new Image();
    cloud.src = artworkSource("reveal");
    await cloud.decode();
    c.drawImage(cloud, 120, 151, 660, 454);
    c.fillStyle = edition.accent;
    c.font = "600 29px sans-serif";
    c.fillText("MD&I  /  设创生活测试", 60, 653);
    c.fillStyle = edition.ink;
    c.font = titleFont;
    titles.forEach((line, i) => c.fillText(line, 60, 745 + 75 * i));
    c.font = reasonFont;
    reasons.forEach((line, i) => c.fillText(line, 60, reasonY + 48 * i));
    c.fillRect(60, footerY, 780, 2);
    c.font = "bold 31px sans-serif";
    c.fillText(item.traits.join("  /  "), 60, qrY + 49, 422);
    c.font = "bold 43px sans-serif";
    c.fillText("扫码测一测", 60, qrY + qrSize - 15);
    window.QuizQR.draw(c, theme, 840 - qrSize, qrY, qrSize);
    const url = canvas.toDataURL("image/png");
    if (!url.startsWith("data:image/png;")) throw new Error("图片生成失败");
    return url;
  }

  function cardActions(item, hint) {
    const preview = node("details", "card-preview");
    const summary = node("summary", "", "查看原图 · 可长按保存");
    const image = node("img", "card-original");
    image.hidden = true;
    image.alt = edition.name + " · " + (item.title || "人格结果卡");
    preview.append(summary, image);

    // Use one PNG for both native image actions and the download.
    let drawing;
    async function getImage() {
      if (!drawing) drawing = drawResultCard(item);
      try {
        const url = await drawing;
        if (!image.hasAttribute("src")) image.src = url;
        image.hidden = false;
        return url;
      } catch (error) {
        drawing = null;
        throw error;
      }
    }

    const failure = "图片暂时无法生成，可重试或截屏保存。";
    preview.addEventListener("toggle", async () => {
      if (!preview.open) return;
      try {
        await getImage();
        hint.textContent = "";
      } catch {
        hint.textContent = failure;
      }
    });
    const save = button("保存结果卡", "action", async () => {
      save.disabled = true;
      try {
        const url = await getImage();
        const link = node("a");
        link.href = url;
        link.download = edition.name.replace("？", "") + "-" + item.id + ".png";
        document.body.append(link);
        link.click();
        link.remove();
        hint.textContent = "结果卡已生成。";
      } catch {
        hint.textContent = failure;
      } finally {
        save.disabled = false;
      }
    });
    return { save, preview };
  }

  function resultPanel(item) {
    const panel = node("div", "panel result");
    panel.append(node("div", "step", "我的人格结果"), node("h1", item.title ? "" : "empty", item.title || "人格外号待填"), node("p", "reason", item.reason || "一句话解释待填"));
    const tags = node("ul", "traits");
    item.traits.forEach(text => tags.append(node("li", "", text)));
    const actions = node("div", "panel-actions");
    const hint=node("p","hint");
    hint.setAttribute("role","status");
    const {save, preview} = cardActions(item, hint);
    actions.append(save,button("再测一次","quiet",start),button("改上一题","quiet",previous));
    panel.append(tags,actions,preview,hint);
    window.QuizCounts?.attach(panel,item,answers);
    return panel;
  }

  function render(focus) {
    if (!playing) { showHome(); return; }
    picker.hidden = true;
    const state = getScreen(answers);
    document.title = edition.name + " · " + (state.result ? "我的人格结果" : "情境选择");
    const screen = node("section", "flow");
    if (state.result) screen.append(figure("reveal"),resultPanel(state.result));
    else screen.append(figure(answers.length ? "listen" : "idle"),questionPanel(state.question,answers.length+1,state.extraCount));
    main.replaceChildren(screen);
    if (focus) focusedHeading();
  }

  document.querySelector(".monogram").addEventListener("click", event => {
    event.preventDefault();
    showHome();
    main.focus();
  });
  function getScreen(history) {
    const state = engine.getState(history);
    return {question:state.nextQuestion, result:state.result, extraCount:state.followupCount};
  }

  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    // Previously published unversioned sessions all used the empty rehearsal bank.
    const legacy = Array.isArray(saved) && engine.revision === "59dce652e0b739d34431";
    const history = legacy ? saved : saved?.revision === engine.revision ? saved?.answers : null;
    if (Array.isArray(history) && history.length <= 9) {
      getScreen(history);
      answers = history;
      previousChoice = [0,1].includes(saved.previousChoice) ? saved.previousChoice : null;
      playing = true;
    }
  } catch { answers = []; playing = false; }
  render(false);
})();
