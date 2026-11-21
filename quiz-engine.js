"use strict";
(() => {
  const content = typeof module !== "undefined" && module.exports
    ? require("./quiz-content.js") : window.CloudQuizContent;
  const axes = {
    sleep: ["早睡", "熬夜"],
    tool: ["偏 AI", "偏手搓"],
    team: ["单干", "组队"]
  };
  const axisKeys = Object.keys(axes);
  function question(id, axis, followup, sides, index) {
    const entry = content?.questions.filter(q => q.axis === axis)[index];
    return {id, axis, followup, sides, text: "", options: ["", ""], ...entry};
  }
  const main = [
    question("Q1","sleep",false,[0,1],0), question("Q2","tool",false,[1,0],0),
    question("Q3","team",false,[0,1],0), question("Q4","sleep",false,[1,0],1),
    question("Q5","tool",false,[0,1],1), question("Q6","team",false,[1,0],1)
  ];
  const followups = [
    question("F1","sleep",true,[0,1],2), question("F2","tool",true,[1,0],2),
    question("F3","team",true,[0,1],2)
  ];
  // IDs encode sleep, tool and team, in that order.
  const personalities = {
    "000": {title:"",reason:""}, "001": {title:"",reason:""},
    "010": {title:"",reason:""}, "011": {title:"",reason:""},
    "100": {title:"",reason:""}, "101": {title:"",reason:""},
    "110": {title:"",reason:""}, "111": {title:"",reason:""}
  };
  Object.assign(personalities, content?.personalities);
  const readiness = {
    questionsReady: content?.issues.questions === 0 &&
      [...main, ...followups].every(q => q.text && q.options.every(Boolean)),
    personalitiesReady: content?.issues.personalities === 0 &&
      Object.values(personalities).every(p => p.title && p.reason)
  };
  function getState(answers = []) {
    if (!Array.isArray(answers) || Array.from(answers).some(value => value !== 0 && value !== 1)) {
      throw new TypeError("答案必须为 0 或 1。");
    }
    const scores = { sleep: 0, tool: 0, team: 0 };
    function score(q, choice) {
      scores[q.axis] += q.sides[choice] === 1 ? 1 : -1;
    }
    main.slice(0, answers.length).forEach((q,i) => score(q,answers[i]));
    const extra = answers.length < main.length ? [] : followups.filter(q => scores[q.axis] === 0);
    const totalQuestions = main.length + extra.length;
    if (answers.length > totalQuestions) throw new RangeError("答案超过本轮题数。");
    extra.slice(0, Math.max(0, answers.length-main.length)).forEach((q,i) => score(q,answers[main.length+i]));
    const nextQuestion = main[answers.length] || extra[answers.length-main.length] || null;
    let result = null;
    if (!nextQuestion) {
      const bits = axisKeys.map(axis => Number(scores[axis] > 0));
      const id = bits.join("");
      result = {id, ...personalities[id], traits:axisKeys.map((axis,i) => axes[axis][bits[i]])};
    }
    return {nextQuestion, result, completed:!nextQuestion, followupCount:extra.length, totalQuestions};
  }
  const ready = readiness.questionsReady && readiness.personalitiesReady;
  const api = {axes, main, followups, personalities, getState, readiness, ready};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.CloudQuiz = api;
})();
