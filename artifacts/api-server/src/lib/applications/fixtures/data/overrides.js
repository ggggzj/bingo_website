/* ============================================================
   人工 / Claude 维护的补充信息。按「key」匹配 data/applications.js 里的记录。
   重新跑 import_simplify.py 不会动这个文件。
   ============================================================ */

window.JOB_OVERRIDES = {

  "Zoom|Software Engineer": {
    status: "closed",
    stage: "简历被拒",
    notes: "2026-09-23 拒信：identified other candidates who are better aligned。这条 Simplify 里没记录，是从邮件里发现的。",
  },

  "workday:visa/Visa/Software-Engineer_REF088530W-3": {
    status: "closed",
    stage: "拒信 · eligibility requirements",
  },

  "https://example.com/a-posting-that-no-longer-exists": {
    status: "closed",
    notes: "这条的 key 对不上任何一条申请 —— 读取时必须报出来，不能悄悄吞掉。",
  },
};
