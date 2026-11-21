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
      if (playing) sessionStorage.setItem(storageKey, JSON.stringify(answers));
      else sessionStorage.removeItem(storageKey);
    } catch { /* The page also works with browser storage disabled. */ }
  }

  function showHome() {
    playing = false;
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
    remember();
    render(true);
  }

  function previous() {
    if (!answers.length) { showHome(); main.focus(); return; }
    answers.pop();
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
        answers.push(i);
        remember();
        render(true);
      });
      pick.append(node("span", "letter", labels[i]), node("span", "", text || "选项待填"));
      choices.append(pick);
    });
    panel.append(row, progress, title, choices, button(answers.length ? "上一题" : "返回首页", "quiet", previous));
    return panel;
  }

  async function saveResult(item, saveButton, hint) {
    saveButton.disabled = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      const c = canvas.getContext("2d");
      function wrap(text, font) {
        c.font = font;
        const rows = [];
        let row = "";
        for (const ch of text) {
          if (ch === "\n" || (row && c.measureText(row + ch).width > 774)) {
            rows.push(row);
            row = "";
          }
          if (ch !== "\n") row += ch;
        }
        rows.push(row);
        return rows;
      }
      const titleFont = "bold 64px sans-serif";
      const reasonFont = "34px sans-serif";
      const titles = wrap(item.title || "人格外号待填", titleFont);
      const reasons = wrap(item.reason || "一句话解释待填", reasonFont);
      const reasonY = 806 + titles.length * 72 + 18;
      const traitsY = Math.max(1110, reasonY + reasons.length * 46 + 38);
      canvas.height = traitsY + 90;
      c.fillStyle = edition.ground;
      c.fillRect(0,0,canvas.width,canvas.height);
      c.fillStyle = edition.ink; c.font = 'bold 75px "Microsoft YaHei","PingFang SC",sans-serif';
      c.fillText(edition.name,58,115);
      c.strokeStyle = edition.ink; c.lineWidth = 2;
      c.beginPath(); c.moveTo(60,150); c.lineTo(840,150); c.stroke();
      const img = new Image();
      img.src = artworkSource("reveal");
      await img.decode();
      c.drawImage(img,100,168,700,481);
      c.fillStyle = edition.accent; c.font = "600 29px sans-serif";
      c.fillText("MD&I  /  设创生活测试",60,710);
      c.fillStyle=edition.ink; c.font=titleFont;
      titles.forEach((line,i) => c.fillText(line,60,806+72*i));
      c.font=reasonFont;
      reasons.forEach((line,i) => c.fillText(line,60,reasonY+46*i));
      c.fillStyle=edition.accent; c.font="bold 28px sans-serif";
      c.fillText(item.traits.join("   /   "),60,traitsY);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(
        value=>value?resolve(value):reject(new Error("图片生成失败")), "image/png"));
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url; link.download=edition.name.replace("？","")+"-"+item.id+".png";
      document.body.append(link); link.click(); link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      hint.textContent="结果卡已生成。";
    } catch {
      hint.textContent="当前浏览器无法导出图片，可截屏保存结果。";
    } finally { saveButton.disabled=false; }
  }

  function resultPanel(item) {
    const panel = node("div", "panel result");
    panel.append(node("div", "step", "我的人格结果"), node("h1", item.title ? "" : "empty", item.title || "人格外号待填"), node("p", "reason", item.reason || "一句话解释待填"));
    const tags = node("ul", "traits");
    item.traits.forEach(text => tags.append(node("li", "", text)));
    const actions = node("div", "panel-actions");
    const hint=node("p","hint");
    hint.setAttribute("role","status");
    const save=button("保存结果卡","action",()=>saveResult(item,save,hint));
    actions.append(save,button("再测一次","quiet",start),button("改上一题","quiet",previous));
    panel.append(tags,actions,hint);
    window.QuizCounts?.attach(panel,item,answers);
    return panel;
  }

  function render(focus) {
    if (!playing) { showHome(); return; }
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
    if (Array.isArray(saved) && saved.length <= 9) {
      getScreen(saved);
      answers = saved;
      playing = true;
    }
  } catch { answers = []; playing = false; }
  render(false);
})();
